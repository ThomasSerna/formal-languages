import { expect, test } from '@playwright/test';
import { LIMITS, type FiniteMachine, type PdaMachine } from '../src/domain';
import { EXAMPLES } from '../src/examples';

test('el teclado de símbolos añade, borra Unicode completo y respeta el límite de entrada', async ({ page }) => {
  const machine = structuredClone(EXAMPLES.dfa) as FiniteMachine;
  machine.alphabet = ['😀', 'a'];
  machine.transitions = machine.transitions.map(edge => ({ ...edge, read: edge.read === '0' ? '😀' : 'a' }));
  await page.addInitScript(machine => localStorage.setItem('formal-languages:v1:dfa', JSON.stringify(machine)), machine);
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  const input = page.getByLabel('Cadena de entrada', { exact: true });
  const emoji = page.getByRole('button', { name: 'Añadir 😀', exact: true });
  const letter = page.getByRole('button', { name: 'Añadir a', exact: true });
  const remove = page.getByRole('button', { name: 'Borrar último símbolo', exact: true });
  await page.getByRole('button', { name: 'Usar ε', exact: true }).click();
  await emoji.focus();
  await page.keyboard.press('Enter');
  await letter.click();
  await emoji.click();
  await expect(input).toHaveValue('😀a😀');
  await remove.click();
  await expect(input).toHaveValue('😀a');
  await remove.click();
  await expect(input).toHaveValue('😀');
  await input.fill('😀'.repeat(LIMITS.input));
  await expect(emoji).toBeDisabled();
  await expect(letter).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await remove.click();
  await expect(emoji).toBeEnabled();
  await letter.click();
  await expect(input).toHaveValue('😀'.repeat(LIMITS.input - 1) + 'a');
  await expect(letter).toBeDisabled();
  await input.fill('😀'.repeat(LIMITS.input + 1));
  await expect(page.getByRole('alert')).toContainText(`hasta ${LIMITS.input} símbolos`);
  await expect(page.getByRole('button', { name: 'Paso siguiente', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Usar ε', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(remove).toBeDisabled();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
});

for (const [width, height] of [[1366, 768], [768, 900], [390, 667]]) {
  test(`cada modelo construye su entrada con Σ y permite probar ε a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    await page.locator('#simulation-toggle').click();
    for (const [model, symbol] of [['AFD', '0'], ['AFN', '0'], ['Pila', 'a'], ['Turing', '0']]) {
      await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
      const input = page.getByLabel('Cadena de entrada', { exact: true });
      await page.getByRole('button', { name: 'Usar ε', exact: true }).click();
      await expect(input).toHaveValue('');
      await page.getByRole('button', { name: `Añadir ${symbol}`, exact: true }).click();
      await expect(input).toHaveValue(symbol);
      await expect(page.getByRole('button', { name: 'Paso siguiente', exact: true })).toBeEnabled();
      if (model === 'Turing') {
        await expect(page.locator('.input-preview')).toHaveCount(0);
        await expect(page.locator('.tape-cell[aria-label="Celda 1: 0"]')).toBeVisible();
      }
      await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
      await expect(page.getByRole('slider', { name: 'Recorrer pasos calculados', exact: true })).toHaveAttribute('max', '1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${model.toLowerCase()}.png`) });
    }
  });
}

test('el recorrido visita únicamente pasos calculados y conserva la entrada', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('010');
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  for (let step = 0; step < 3; step++) await next.click();
  const timeline = page.getByRole('slider', { name: 'Recorrer pasos calculados', exact: true });
  await expect(timeline).toHaveAttribute('max', '3');
  await timeline.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.step-count strong')).toHaveText('0');
  await expect(page.locator('.symbol-cell.consumed')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await expect(page.locator('.symbol-cell.consumed')).toHaveCount(1);
  await expect(timeline).toHaveAttribute('aria-valuetext', 'Paso 1 de 3');
  await next.click();
  await expect(page.locator('.step-count strong')).toHaveText('2');
  await expect(timeline).toHaveAttribute('max', '3');
  await timeline.focus();
  await page.keyboard.press('End');
  await expect(page.locator('.step-count strong')).toHaveText('3');
  await expect(page.getByLabel('Cadena de entrada', { exact: true })).toHaveValue('010');
});

test('recorrer la cinta restaura escrituras y pausa la reproducción', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Turing\b/ }).click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('01');
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  const initialTape = await page.locator('.tape').textContent();
  for (let step = 0; step < 3; step++) await next.click();
  const writtenTape = await page.locator('.tape').textContent();
  expect(writtenTape).toContain('X');
  expect(writtenTape).toContain('Y');
  const timeline = page.getByRole('slider', { name: 'Recorrer pasos calculados', exact: true });
  await timeline.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.tape')).toHaveText(initialTape!);
  await page.keyboard.press('End');
  await expect(page.locator('.tape')).toHaveText(writtenTape!);
  await page.clock.install({ time: new Date('2026-10-19T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-19T00:01:00Z'));
  await page.getByLabel('Velocidad', { exact: true }).selectOption('300');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await timeline.focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  await page.clock.runFor(900);
  await expect(page.locator('.step-count strong')).toHaveText('0');
  await expect(page.locator('.tape')).toHaveText(initialTape!);
});

test('el recorrido de la pila distingue pasos ε de símbolos consumidos', async ({ page }) => {
  const machine = structuredClone(EXAMPLES.pda) as PdaMachine;
  machine.transitions = [
    { id: 'epsilon', from: 'p', to: 'q', read: '', pop: '⊥', push: ['A', '⊥'] },
    { id: 'consume', from: 'q', to: 'f', read: 'a', pop: 'A', push: [] },
  ];
  await page.addInitScript(machine => localStorage.setItem('formal-languages:v1:pda', JSON.stringify(machine)), machine);
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Pila\b/ }).click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('a');
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  await next.click();
  await expect(page.locator('.stack-symbol')).toHaveText(['A', '⊥']);
  await expect(page.locator('.symbol-cell.consumed')).toHaveCount(0);
  await next.click();
  await expect(page.locator('.stack-symbol')).toHaveText(['⊥']);
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
  const timeline = page.getByRole('slider', { name: 'Recorrer pasos calculados', exact: true });
  await expect(timeline).toHaveAttribute('max', '2');
  await timeline.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.stack-symbol')).toHaveText(['⊥']);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.step-count')).toContainText('0 de 1');
  await expect(page.locator('.stack-symbol')).toHaveText(['A', '⊥']);
  await page.keyboard.press('End');
  await expect(page.locator('.step-count')).toContainText('1 de 1');
  await expect(page.locator('.stack-symbol')).toHaveText(['⊥']);
});

test('el detalle del paso es opcional y conserva el anuncio accesible', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  for (const model of ['AFD', 'AFN', 'Pila', 'Turing']) {
    await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
    const detail = page.locator('.step-detail');
    await expect(detail).not.toHaveAttribute('open', '');
    await expect(detail.locator('.step-explanation')).toBeHidden();
    await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
    const message = await detail.locator('.step-explanation').textContent();
    await expect(page.locator('.simulator > [aria-live="polite"]')).toContainText(message!);
    await detail.locator('summary').click();
    await expect(detail.locator('.step-explanation')).toBeVisible();
    await detail.locator('summary').click();
  }
});

test('un límite inconcluso mantiene su motivo visible con el detalle cerrado', async ({ page }) => {
  const machine = structuredClone(EXAMPLES.pda) as PdaMachine;
  machine.transitions = [
    { id: 'fill', from: 'p', to: 'p', read: '', pop: '⊥', push: [...Array(LIMITS.pdaStack - 1).fill('A'), '⊥'] },
    { id: 'overflow', from: 'p', to: 'p', read: '', pop: 'A', push: ['A', 'A'] },
  ];
  await page.addInitScript(machine => localStorage.setItem('formal-languages:v1:pda', JSON.stringify(machine)), machine);
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Pila\b/ }).click();
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  await next.click();
  await next.click();
  await expect(page.locator('.run-status')).toHaveText('Resultado inconcluso');
  await expect(page.locator('.run-notice')).toBeVisible();
  await expect(page.locator('.run-notice')).toContainText(`${LIMITS.pdaStack} símbolos en la pila`);
  await expect(page.locator('.run-notice')).toContainText('Esto no demuestra rechazo');
  await expect(page.locator('.step-detail')).not.toHaveAttribute('open', '');
});
