import { expect, test, type Page } from '@playwright/test';

type RecordedWindow = Window & { popupAnimations: Animation[] };

async function holdPopupMotion(page: Page) {
  await page.addInitScript(() => {
    const recorder = window as typeof window & { popupAnimations: Animation[] };
    recorder.popupAnimations = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this.classList.contains('graph-popup__surface')) {
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
        recorder.popupAnimations.push(animation);
      }
      return animation;
    };
  });
}

test('la burbuja nace del ancla y conserva campos y superficie al editar', async ({ page }) => {
  await holdPopupMotion(page);
  await page.goto('');
  const state = page.locator('.react-flow__node[data-id="q0"]');
  await state.click();
  const popup = page.locator('.graph-popup');
  const surface = await popup.locator('.graph-popup__surface').elementHandle();
  const name = popup.getByLabel('Nombre del estado', { exact: true });
  const field = await name.elementHandle();
  const origin = await popup.evaluate(panel => {
    const anchor = document.querySelector('.react-flow__node[data-id="q0"]')!.getBoundingClientRect();
    const bounds = panel.getBoundingClientRect();
    const actual = getComputedStyle(panel.querySelector('.graph-popup__surface')!).transformOrigin.split(' ').map(parseFloat);
    return {
      actual,
      expected: [Math.max(0, Math.min(bounds.width, anchor.x + anchor.width / 2 - bounds.x)), Math.max(0, Math.min(bounds.height, anchor.y + anchor.height / 2 - bounds.y))],
    };
  });
  origin.actual.forEach((value, index) => expect(value).toBeCloseTo(origin.expected[index], 0));
  await name.fill('memoria');
  await name.pressSequentially('0');
  expect(await field!.evaluate(element => element.isConnected && element === document.activeElement)).toBe(true);
  expect(await surface!.evaluate(element => element.isConnected)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations.length)).toBe(1);
  await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations[0].finish());
  await expect(popup.locator('.graph-popup__surface')).toHaveCSS('transform', 'none');
  await expect(popup.locator('.graph-popup__surface')).toHaveCSS('opacity', '1');
  await expect(name).toHaveValue('memoria0');
});

test('cerrar congela y desactiva el panel; reabrir descarta una transición cancelada', async ({ page }) => {
  await holdPopupMotion(page);
  await page.goto('');
  const add = page.getByRole('button', { name: 'Agregar transición', exact: true });
  await add.click();
  const popup = page.locator('.graph-popup');
  const destination = popup.getByRole('combobox', { name: 'Destino', exact: true });
  const original = await destination.inputValue();
  await destination.selectOption(original === 'q0' ? 'q1' : 'q0');
  const canceledField = await destination.elementHandle();
  await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations[0].finish());
  const before = await popup.boundingBox();
  await popup.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(popup).toHaveAttribute('data-state', 'closing');
  await expect(popup).toHaveAttribute('inert', '');
  await expect(popup).toHaveAttribute('aria-hidden', 'true');
  await expect(popup).toHaveCSS('pointer-events', 'none');
  await expect(page.getByRole('dialog', { name: 'Inspector del autómata' })).toHaveCount(0);
  expect(await popup.boundingBox()).toEqual(before);
  await expect(popup.locator('h2')).toHaveText('Nueva transición');
  await add.click();
  await expect(popup).toHaveAttribute('data-state', 'open');
  await expect(popup).not.toHaveAttribute('inert', '');
  await expect(destination).toHaveValue(original);
  expect(await canceledField!.evaluate(element => element.isConnected)).toBe(false);
  expect(await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations[1].playState)).toBe('idle');
  await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations.at(-1)!.finish());
  await expect(page.getByRole('dialog', { name: 'Inspector del autómata' })).toBeVisible();
});

test('Escape interrumpe la entrada y la apertura por teclado es inmediata', async ({ page }) => {
  await holdPopupMotion(page);
  await page.goto('');
  const state = page.locator('.react-flow__node[data-id="q0"]');
  await state.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.graph-popup')).toHaveCount(0);
  await expect(state).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations[0].playState)).toBe('idle');
  const configure = page.getByRole('button', { name: 'Configurar modelo', exact: true });
  await configure.focus();
  await configure.press('Enter');
  await expect(page.getByLabel('Nombre del autómata', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations.length)).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.graph-popup')).toHaveCount(0);
  await expect(configure).toBeFocused();
});

test('movimiento reducido resuelve de inmediato entradas y salidas, incluso al cambiar en caliente', async ({ page }) => {
  await holdPopupMotion(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  const configure = page.getByRole('button', { name: 'Configurar modelo', exact: true });
  const popup = page.locator('.graph-popup');
  await configure.click();
  expect(await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations.length)).toBe(0);
  await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await configure.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations[0].playState)).toBe('idle');
  await expect(popup.locator('.graph-popup__surface')).toHaveCSS('transform', 'none');
  await expect(page.getByLabel('Nombre del autómata', { exact: true })).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
  await expect(popup).toHaveAttribute('data-state', 'closing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(popup).toHaveCount(0);
});

test('cambiar de modelo descarta la salida pendiente sin reabrir el inspector anterior', async ({ page }) => {
  await holdPopupMotion(page);
  await page.goto('');
  await page.locator('.react-flow__node[data-id="q0"]').click();
  await page.locator('.graph-popup').getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
  await expect(page.locator('.graph-popup')).toHaveAttribute('data-state', 'closing');
  await page.getByRole('button', { name: /^AFN / }).click();
  await expect(page.locator('.graph-popup')).toHaveCount(0);
  await expect(page.locator('.model-nav')).toHaveAttribute('data-model', 'nfa');
  expect(await page.evaluate(() => (window as unknown as RecordedWindow).popupAnimations.every(animation => animation.playState === 'idle'))).toBe(true);
});
