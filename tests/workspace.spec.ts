import { expect, test, type Page } from '@playwright/test';

const viewport = (page: Page) => page.locator('.graph-canvas').evaluate(canvas => {
  const transform = new DOMMatrix(getComputedStyle(canvas.querySelector('.react-flow__viewport')!).transform);
  const bounds = canvas.getBoundingClientRect();
  return { zoom: transform.a, x: (bounds.width / 2 - transform.e) / transform.a, y: (bounds.height / 2 - transform.f) / transform.a };
});

for (const [width, height] of [[1280, 720], [1366, 768], [768, 900], [390, 667]]) {
  test(`lienzo y burbujas sin desbordamiento a ${width}×${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    const canvas = page.locator('.graph-canvas');
    const toggle = page.locator('#simulation-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.simulator')).toBeHidden();
    await expect(page.locator('.workspace-top, .guide, .guide-link, .graph-editor__hint')).toHaveCount(0);
    await expect(page.locator('.reference-section')).toHaveCount(0);
    await expect(page.locator('.dock-controls > button')).toHaveCount(4);
    for (const panel of ['simulation', 'proof', 'formal', 'theory']) {
      await expect(page.locator(`#${panel}-toggle`)).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator(`#${panel}-toggle`)).toHaveAttribute('aria-controls', `${panel}-content`);
      await expect(page.locator(`#${panel}-content`)).toHaveAttribute('role', 'region');
      await expect(page.locator(`#${panel}-content`)).toHaveAttribute('aria-labelledby', `${panel}-toggle`);
      await expect(page.locator(`#${panel}-content`)).toBeHidden();
      expect((await page.locator(`#${panel}-toggle`).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    if (width <= 480) {
      const legend = (await page.locator('.graph-legend').boundingBox())!;
      const controls = (await page.locator('.dock-controls').boundingBox())!;
      expect(legend.y + legend.height).toBeLessThanOrEqual(controls.y);
    }
    await expect(page.locator('.graph-toolbar h1')).toHaveCSS('font-size', '14px');
    const fullCanvas = (await canvas.boundingBox())!;
    expect(fullCanvas.height).toBeGreaterThan(height * (width > 850 ? .75 : .5));
    await page.screenshot({ path: testInfo.outputPath('lienzo.png') });
    await canvas.locator('.react-flow__node[data-id="q0"]').click();
    const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
    const bubble = (await popup.boundingBox())!;
    expect(bubble.width).toBe(280);
    expect(bubble.x).toBeGreaterThanOrEqual(fullCanvas.x + 11);
    expect(bubble.y).toBeGreaterThanOrEqual(fullCanvas.y + 11);
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(fullCanvas.x + fullCanvas.width - 11);
    expect(bubble.y + bubble.height).toBeLessThanOrEqual(fullCanvas.y + fullCanvas.height - 11);
    expect((await canvas.boundingBox())!.width).toBe(fullCanvas.width);
    await page.screenshot({ path: testInfo.outputPath('burbuja.png') });
    await page.keyboard.press('Escape');
    const before = await viewport(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => (await canvas.boundingBox())!.height).toBeLessThan(fullCanvas.height);
    await expect.poll(async () => Math.abs((await viewport(page)).y - before.y)).toBeLessThan(.1);
    expect((await viewport(page)).zoom).toBe(before.zoom);
    const content = await page.locator('#simulation-content').boundingBox();
    expect(content!.height).toBeLessThanOrEqual(Math.min(height * .4, 340) + 1);
    await page.screenshot({ path: testInfo.outputPath('simulacion.png') });
    await toggle.click();
    await expect.poll(async () => (await canvas.boundingBox())!.height).toBe(fullCanvas.height);
    await expect.poll(async () => Math.abs((await viewport(page)).y - before.y)).toBeLessThan(.1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('los paneles conservan cálculo, entrada, historial y rama en los cuatro modelos', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  const simulator = await page.locator('.simulator').elementHandle();
  for (const model of ['AFD', 'AFN', 'Pila', 'Turing']) {
    await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
    await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
    if (model === 'Pila') await page.getByRole('combobox', { name: 'Rama a inspeccionar', exact: true }).selectOption('1');
    const input = await page.getByLabel('Cadena de entrada', { exact: true }).inputValue();
    const execution = await page.locator('.execution-layout').textContent();
    await page.locator('.history summary').click();
    for (const panel of ['simulation', 'proof', 'formal', 'theory']) {
      await page.locator(`#${panel}-toggle`).click();
      await expect(page.locator('.simulator')).toBeHidden();
      expect(await simulator!.evaluate(element => element.isConnected)).toBe(true);
      await page.locator('#simulation-toggle').click();
      await expect(page.getByLabel('Cadena de entrada', { exact: true })).toHaveValue(input);
      await expect(page.locator('.step-count strong')).toHaveText('1');
      await expect(page.locator('.execution-layout')).toHaveText(execution!);
      await expect(page.locator('.history')).toHaveAttribute('open', '');
      if (model === 'Pila') await expect(page.getByRole('combobox', { name: 'Rama a inspeccionar', exact: true })).toHaveValue('1');
    }
  }
});

test('los cuatro paneles son exclusivos y se abren con teclado', async ({ page }) => {
  await page.goto('');
  for (const [index, panel] of ['simulation', 'proof', 'formal', 'theory'].entries()) {
    const toggle = page.locator(`#${panel}-toggle`);
    await toggle.focus();
    await page.keyboard.press(index === 1 ? 'Space' : 'Enter');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(`#${panel}-content`)).toBeVisible();
    await expect(page.locator('.dock-content:visible')).toHaveCount(1);
    await expect(page.locator('.dock-controls > button[aria-expanded="true"]')).toHaveCount(1);
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('.dock-content:visible')).toHaveCount(0);
  await expect(page.locator('.dock-controls > button[aria-expanded="true"]')).toHaveCount(0);
});

test('la referencia seleccionada permanece abierta y cambia con el modelo', async ({ page }) => {
  await page.goto('');
  const models = [
    ['AFD', 'M = (Q, Σ, δ, s, F)', 'Autómata finito determinista.'],
    ['AFN', 'N = (Q, Σ, Δ, S, F)', 'Autómata finito no determinista.'],
    ['Pila', 'P = (Q, Σ, Γ, δ, s, ⊥, F)', 'Autómata de pila.'],
    ['Turing', 'M = (Q, Σ, Γ, ⊢, ␣, δ, s, t, r)', 'Máquina de Turing.'],
  ];
  for (const panel of ['formal', 'theory']) {
    await page.locator(`#${panel}-toggle`).click();
    for (const [model, tuple, theory] of models) {
      await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
      await expect(page.locator(`#${panel}-toggle`)).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('.dock-content:visible')).toHaveCount(1);
      await expect(page.locator(`#${panel}-content`)).toBeVisible();
      if (panel === 'formal') await expect(page.locator('#formal-content .formula')).toHaveText(tuple);
      else await expect(page.locator('#theory-content .theory strong')).toHaveText(theory);
      await expect(page.locator('.simulator')).toBeHidden();
    }
  }
});

test('la burbuja cambia de lado en el borde y sigue el desplazamiento del lienzo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  const canvas = page.locator('.graph-canvas');
  const state = canvas.locator('.react-flow__node[data-id="q0"]');
  const bounds = (await canvas.boundingBox())!;
  const start = (await state.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 90, bounds.y + bounds.height - 100, { steps: 10 });
  await page.mouse.up();
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await expect(popup).toBeVisible();
  const bubble = (await popup.boundingBox())!;
  const node = (await state.boundingBox())!;
  expect(bubble.x + bubble.width).toBeLessThanOrEqual(node.x - 11);
  expect(bubble.y + bubble.height).toBeLessThanOrEqual(bounds.y + bounds.height - 11);
  const field = await popup.getByLabel('Nombre del estado', { exact: true }).elementHandle();
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 60, bounds.y + 40, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await popup.boundingBox())!.x - bubble.x).toBeCloseTo(40, 0);
  expect(await field!.evaluate(element => element.isConnected)).toBe(true);
});

test('el enlace de salto abre la bandeja y plegarla pausa la reproducción', async ({ page }) => {
  await page.goto('');
  await page.locator('#formal-toggle').click();
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#formal-content')).toBeHidden();
  await expect(page.locator('#simulation-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Cadena de entrada', { exact: true })).toBeFocused();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('000000');
  await page.getByLabel('Velocidad', { exact: true }).selectOption('300');
  await page.clock.install();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await page.locator('#simulation-toggle').click();
  await page.clock.runFor(900);
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await page.locator('#simulation-toggle').click();
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  for (const [index, panel] of ['formal', 'theory'].entries()) {
    await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
    await page.clock.runFor(300);
    await expect(page.locator('.step-count strong')).toHaveText(String(index + 2));
    await page.locator(`#${panel}-toggle`).click();
    await page.clock.runFor(900);
    await expect(page.locator('.step-count strong')).toHaveText(String(index + 2));
    await page.locator('#simulation-toggle').click();
    await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  }
});

test('los botones de roles conservan la multiplicidad de cada modelo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  for (const model of ['AFD', 'AFN', 'Pila', 'Turing']) {
    await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
    await page.getByRole('button', { name: 'Ajustar todos los estados a la vista', exact: true }).click();
    const graph = page.locator('.graph-canvas');
    let acceptingCount = await graph.locator('.automaton-state.is-accepting').count();
    for (const index of [0, 1]) {
      await graph.locator('.react-flow__node').nth(index).click();
      const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
      for (const name of ['Inicial', 'Aceptación']) {
        const role = popup.getByRole('button', { name, exact: true });
        if (await role.getAttribute('aria-pressed') !== 'true') {
          if (name === 'Aceptación') acceptingCount++;
          await role.click();
        }
        await expect(role).toHaveAttribute('aria-pressed', 'true');
      }
      if (model === 'Turing') {
        await popup.getByRole('button', { name: 'Rechazo', exact: true }).click();
        await expect(popup.getByRole('button', { name: 'Rechazo', exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
      await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
    }
    await expect(graph.locator('.automaton-state__initial')).toHaveCount(model === 'AFN' ? 2 : 1);
    if (model === 'Turing') {
      await expect(graph.locator('.automaton-state.is-accepting')).toHaveCount(1);
      await expect(graph.locator('.automaton-state__role').filter({ hasText: 'r' })).toHaveCount(1);
    } else await expect(graph.locator('.automaton-state.is-accepting')).toHaveCount(acceptingCount);
  }
});
