import { expect, test } from '@playwright/test';
import type { PdaMachine } from '../src/domain';
import { LIMITS } from '../src/domain';
import { EXAMPLES } from '../src/examples';

test('los bloques apilan y desapilan símbolos repetidos, y restauran el historial y el inicio', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Pila / }).click();
  const symbols = page.locator('.stack-symbol');
  const cells = page.getByRole('list', { name: 'Símbolos de la pila, del tope al fondo' }).getByRole('listitem');
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  await expect(symbols).toHaveText(['⊥']);
  const base = await cells.first().elementHandle();
  await next.click();
  await expect(symbols).toHaveText(['A', '⊥']);
  const firstA = await cells.first().elementHandle();
  await next.click();
  await expect(symbols).toHaveText(['A', 'A', '⊥']);
  expect(await cells.nth(1).evaluate((node, previous) => node === previous, firstA)).toBe(true);
  expect(await cells.last().evaluate((node, previous) => node === previous, base)).toBe(true);
  const positions = await cells.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().y));
  expect(positions[0]).toBeLessThan(positions[1]);
  expect(positions[1]).toBeLessThan(positions[2]);
  await expect(cells.first()).toHaveAccessibleName('A, tope');
  await next.click();
  await expect(symbols).toHaveText(['A', '⊥']);
  expect(await cells.first().evaluate((node, previous) => node === previous, firstA)).toBe(true);
  await expect(page.locator('.stack-top-label')).toHaveText('Tope');
  await next.click();
  await expect(symbols).toHaveText(['⊥']);
  await next.click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');

  const previous = page.getByRole('button', { name: 'Anterior', exact: true });
  await previous.click();
  await previous.click();
  await expect(symbols).toHaveText(['A', '⊥']);
  await page.locator('.history summary').click();
  await page.locator('.history button').filter({ has: page.getByText('Paso 2', { exact: true }) }).click();
  await expect(symbols).toHaveText(['A', 'A', '⊥']);
  await next.click();
  await expect(symbols).toHaveText(['A', '⊥']);
  await page.getByRole('button', { name: 'Reiniciar', exact: true }).click();
  await expect(symbols).toHaveText(['⊥']);
  await expect(cells.first()).toHaveAccessibleName('⊥, tope');
  await expect(page.locator('.history')).toHaveCount(0);
});

test('la pila sigue la reproducción y respeta cambios de movimiento reducido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Pila / }).click();
  await expect(page.locator('.stack-cell')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.stack-top-label')).toHaveCSS('animation-name', 'none');
  await page.getByLabel('Velocidad', { exact: true }).selectOption('300');
  await page.clock.install({ time: new Date('2026-10-16T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-16T00:01:00Z'));
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.locator('.stack-symbol')).toHaveText(['A', '⊥']);
  await page.clock.runFor(300);
  await expect(page.locator('.stack-symbol')).toHaveText(['A', 'A', '⊥']);
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.clock.runFor(900);
  await expect(page.locator('.step-count strong')).toHaveText('2');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(page.locator('.stack-cell').first()).toHaveCSS('animation-name', 'stack-push');
  await expect(page.locator('.stack-top-label')).toHaveCSS('animation-name', 'configuration-update');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.stack-cell').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.stack-top-label')).toHaveCSS('animation-name', 'none');
});

test('una pila vacía se distingue de una ejecución sin configuración', async ({ page }) => {
  const machine = structuredClone(EXAMPLES.pda) as PdaMachine;
  machine.transitions = [{ id: 'empty', from: 'p', to: 'q', read: 'a', pop: '⊥', push: [] }];
  await page.addInitScript(machine => localStorage.setItem('formal-languages:v1:pda', JSON.stringify(machine)), machine);
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Pila / }).click();
  const input = page.getByLabel('Cadena de entrada', { exact: true });
  await input.fill('x');
  await expect(page.locator('.stack-empty')).toHaveText('Sin configuración');
  await input.fill('a');
  await expect(page.locator('.stack-symbol')).toHaveText(['⊥']);
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  await next.click();
  await expect(page.locator('.stack-empty')).toHaveText('Pila vacía');
  await expect(page.locator('.stack-cell, .stack-top-label')).toHaveCount(0);
  await next.click();
  await expect(page.locator('.run-status')).toHaveText('Rechazada');
  await expect(page.locator('.stack-empty')).toHaveText('Sin configuración');
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.locator('.stack-empty')).toHaveText('Pila vacía');
  await page.getByRole('button', { name: 'Reiniciar', exact: true }).click();
  await expect(page.locator('.stack-symbol')).toHaveText(['⊥']);
});

test('el reemplazo conserva el orden y los símbolos Unicode completos', async ({ page }) => {
  const machine = structuredClone(EXAMPLES.pda) as PdaMachine;
  machine.stackAlphabet.push('B', '😀');
  machine.transitions = [{ id: 'replace', from: 'p', to: 'q', read: 'a', pop: '⊥', push: ['😀', 'B', 'A', '⊥'] }];
  await page.addInitScript(machine => localStorage.setItem('formal-languages:v1:pda', JSON.stringify(machine)), machine);
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Pila / }).click();
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(page.locator('.stack-symbol')).toHaveText(['😀', 'B', 'A', '⊥']);
  await expect(page.getByRole('listitem', { name: '😀, tope', exact: true })).toBeVisible();
});

for (const [width, height] of [[1366, 768], [375, 667]]) {
  test(`la pila máxima permite desplazamiento por teclado y recupera el tope a ${width}×${height}`, async ({ page }, testInfo) => {
    const machine = structuredClone(EXAMPLES.pda) as PdaMachine;
    machine.transitions = [
      { id: 'grow', from: 'p', to: 'p', read: 'a', pop: '⊥', push: [...Array(LIMITS.pdaStack - 1).fill('A'), '⊥'] },
      { id: 'pop', from: 'p', to: 'q', read: 'b', pop: 'A', push: [] },
    ];
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(machine => localStorage.setItem('formal-languages:v1:pda', JSON.stringify(machine)), machine);
    await page.goto('');
    await page.locator('#simulation-toggle').click();
    await page.getByRole('button', { name: /^Pila\b/ }).click();
    await page.getByLabel('Cadena de entrada', { exact: true }).fill('ab');
    const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
    await next.click();
    await expect(page.locator('.stack-cell')).toHaveCount(LIMITS.pdaStack);
    const stack = page.getByRole('region', { name: 'Pila de la rama seleccionada' });
    await stack.scrollIntoViewIfNeeded();
    expect((await stack.boundingBox())!.height).toBe(184);
    const branches = await page.locator('.branch-panel').boundingBox();
    const stackPanel = await page.locator('.stack-panel').boundingBox();
    const inputPanel = await page.locator('.execution-main').boundingBox();
    expect(branches!.width).toBeLessThanOrEqual(260);
    expect(branches!.width).toBeLessThan(inputPanel!.width);
    expect(stackPanel!.x).toBeGreaterThanOrEqual(branches!.x + branches!.width);
    expect(stackPanel!.y).toBeCloseTo(branches!.y, 0);
    expect(await page.locator('.stack-panel').evaluate(node => node.parentElement?.classList.contains('execution-layout'))).toBe(true);
    await stack.focus();
    await page.keyboard.press('End');
    await expect.poll(() => stack.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator('.stack-symbol').last()).toBeInViewport();
    await next.click();
    await expect(page.locator('.stack-cell')).toHaveCount(LIMITS.pdaStack - 1);
    await expect.poll(() => stack.evaluate(node => node.scrollTop)).toBe(0);
    await stack.scrollIntoViewIfNeeded();
    await expect(page.locator('.stack-top-label')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('pila-larga.png') });
  });
}
