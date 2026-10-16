import { expect, test, type Locator } from '@playwright/test';

async function expectInsideGraph(popup: Locator, graph: Locator) {
  const canvas = await graph.boundingBox();
  const box = await popup.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(canvas!.x);
  expect(box!.y).toBeGreaterThanOrEqual(canvas!.y);
  expect(box!.x + box!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(canvas!.y + canvas!.height + 1);
}

test('el inspector aparece al seleccionar y cierra con Escape o el fondo del grafo', async ({ page }) => {
  await page.goto('');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  const graph = page.locator('.graph-editor');
  const state = graph.locator('.react-flow__node[data-id="q0"]');
  await expect(popup).toHaveCount(0);
  await state.click();
  await expect(popup.getByRole('heading', { name: 'Estado q0', exact: true })).toBeVisible();
  await expect(state).toBeFocused();
  await popup.getByRole('button', { name: 'Ver modelo', exact: true }).click();
  await expect(popup.getByLabel('Nombre del autómata', { exact: true })).toBeFocused();
  await state.click();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(state).toBeFocused();
  await state.click();
  await graph.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
  await expect(popup).toHaveCount(0);
  await page.getByRole('button', { name: 'Agregar transición', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Una nueva conexión', exact: true })).toBeVisible();
  await popup.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(popup).toHaveCount(0);
});

test('la configuración general conserva los campos de los cuatro modelos', async ({ page }) => {
  await page.goto('');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  const configure = page.getByRole('button', { name: 'Configurar modelo', exact: true });
  const close = page.getByRole('button', { name: 'Cerrar inspector', exact: true });
  await configure.click();
  await popup.getByLabel('Nombre del autómata', { exact: true }).fill('Modelo de prueba');
  await popup.getByLabel('Alfabeto de entrada · Σ', { exact: true }).fill('a b');
  await close.click();
  await configure.click();
  await expect(popup.getByLabel('Nombre del autómata', { exact: true })).toHaveValue('Modelo de prueba');
  await expect(popup.getByLabel('Alfabeto de entrada · Σ', { exact: true })).toHaveValue('a b');
  await popup.getByRole('button', { name: 'Definición formal', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Del dibujo a la definición', exact: true })).toBeVisible();
  await configure.click();
  await expect(popup.getByLabel('Nombre del autómata', { exact: true })).toHaveValue('Modelo de prueba');
  await close.click();
  await page.getByRole('button', { name: /^AFN / }).click();
  await configure.click();
  await expect(popup.getByLabel('Alfabeto de entrada · Σ', { exact: true })).toBeVisible();
  await close.click();
  await page.getByRole('button', { name: /^Pila / }).click();
  await configure.click();
  await popup.getByLabel('Alfabeto de pila · Γ', { exact: true }).fill('A B ⊥');
  await popup.getByLabel('Símbolo inicial de pila', { exact: true }).fill('B');
  await close.click();
  await configure.click();
  await expect(popup.getByLabel('Alfabeto de pila · Γ', { exact: true })).toHaveValue('A B ⊥');
  await expect(popup.getByLabel('Símbolo inicial de pila', { exact: true })).toHaveValue('B');
  await close.click();
  await page.getByRole('button', { name: /^Turing / }).click();
  await configure.click();
  const tapeAlphabet = popup.getByLabel('Alfabeto de cinta · Γ', { exact: true });
  const nextAlphabet = `${await tapeAlphabet.inputValue()} Z`;
  await tapeAlphabet.fill(nextAlphabet);
  await close.click();
  await configure.click();
  await expect(tapeAlphabet).toHaveValue(nextAlphabet);
});

test('eliminar una transición o un estado cierra su inspector', async ({ page }) => {
  await page.goto('');
  const graph = page.locator('.graph-editor');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await graph.getByRole('button', { name: 'Regla 0', exact: true }).first().click();
  await popup.getByRole('button', { name: 'Eliminar transición', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await expect(graph.locator('.react-flow__edge')).toHaveCount(3);
  await graph.locator('.react-flow__node[data-id="q0"]').click();
  await popup.getByRole('button', { name: 'Eliminar estado y sus conexiones', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await expect(graph.locator('.react-flow__node')).toHaveCount(1);
  await expect(graph.locator('.react-flow__edge')).toHaveCount(1);
});

for (const width of [390, 1366]) {
  test(`el popup sigue al estado y permanece dentro del lienzo a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    const graph = page.locator('.graph-editor');
    const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
    const state = graph.locator('.react-flow__node[data-id="q0"]');
    await expect(state).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('editor.png') });
    await state.click();
    await expect(popup).toBeVisible();
    await expectInsideGraph(popup, graph);
    await page.screenshot({ path: testInfo.outputPath('popup.png') });
    const before = await popup.boundingBox();
    await state.press('ArrowRight');
    if (width > 600) await expect.poll(async () => (await popup.boundingBox())!.x).toBeGreaterThan(before!.x);
    await expectInsideGraph(popup, graph);
    await graph.getByRole('button', { name: 'Acercar el grafo', exact: true }).click();
    await expect(popup).toBeVisible();
    await expectInsideGraph(popup, graph);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('editar una ecuación de la definición formal regresa al grafo y abre su regla', async ({ page }) => {
  await page.goto('');
  const definition = page.locator('.reference-section > details').filter({ has: page.locator('summary', { hasText: 'Definición formal' }) });
  if (await definition.getAttribute('open') === null) await definition.locator('summary').click();
  await expect(definition.locator('table')).toHaveCount(0);
  await expect(definition).toContainText('δ(q0, 0) = q0');
  await definition.getByRole('button', { name: /^Editar transición / }).first().click();
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await expect(popup.getByRole('heading', { name: 'Editar transición', exact: true })).toBeVisible();
  await expect(popup).toBeInViewport();
  await expect(popup.getByRole('combobox', { name: 'Lee', exact: true })).toHaveValue('0');
  await expect(popup.getByRole('combobox', { name: 'Origen', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(popup.getByRole('combobox', { name: 'Destino', exact: true })).toBeFocused();
  await expect(popup.getByRole('combobox', { name: 'Destino', exact: true })).toBeInViewport();
  await expect(page.locator('.simulator')).not.toBeInViewport();
});
