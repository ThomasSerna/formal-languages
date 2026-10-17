import { expect, test, type Locator } from '@playwright/test';

async function expectContextualInspector(popup: Locator, graph: Locator) {
  const editor = await graph.boundingBox();
  const canvas = await graph.locator('.graph-canvas').boundingBox();
  const box = await popup.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(editor!.x);
  expect(box!.y).toBeGreaterThanOrEqual(editor!.y);
  expect(box!.x + box!.width).toBeLessThanOrEqual(editor!.x + editor!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(editor!.y + editor!.height + 1);
  expect(canvas!.width).toBeCloseTo(editor!.width, 0);
  expect(box!.width).toBeLessThanOrEqual(320);
  expect(box!.height).toBeLessThan(canvas!.height);
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
  await page.getByRole('button', { name: 'Configurar modelo', exact: true }).click();
  await expect(popup.getByLabel('Nombre del autómata', { exact: true })).toBeFocused();
  await state.click();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(state).toBeFocused();
  await state.click();
  await graph.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
  await expect(popup).toHaveCount(0);
  await page.getByRole('button', { name: 'Agregar transición', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Nueva transición', exact: true })).toBeVisible();
  await popup.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(popup).toHaveCount(0);
});

test('la configuración general conserva los campos de los cuatro modelos', async ({ page }) => {
  await page.goto('');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  const configure = page.getByRole('button', { name: 'Configurar modelo', exact: true });
  const close = page.getByRole('button', { name: 'Cerrar inspector', exact: true });
  await configure.click();
  await expect(popup.getByRole('heading', { name: 'Modelo', exact: true })).toBeVisible();
  await popup.getByLabel('Nombre del autómata', { exact: true }).fill('Modelo de prueba');
  await popup.getByLabel('Alfabeto de entrada · Σ', { exact: true }).fill('a b');
  await close.click();
  await configure.click();
  await expect(popup.getByLabel('Nombre del autómata', { exact: true })).toHaveValue('Modelo de prueba');
  await expect(popup.getByLabel('Alfabeto de entrada · Σ', { exact: true })).toHaveValue('a b');
  await expect(popup.locator('details')).toHaveCount(0);
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
  await graph.getByRole('button', { name: 'Regla 0, de q0 a q0', exact: true }).click();
  await popup.getByRole('button', { name: 'Eliminar transición', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await expect(graph.locator('.react-flow__edge')).toHaveCount(3);
  await graph.locator('.react-flow__node[data-id="q0"]').click();
  await popup.getByRole('button', { name: 'Eliminar estado y sus conexiones', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await expect(graph.locator('.react-flow__node')).toHaveCount(1);
  await expect(graph.locator('.react-flow__edge')).toHaveCount(1);
});

for (const width of [390, 768, 1366]) {
  test(`el inspector contextual permite editar los cuatro modelos a ${width}px`, async ({ page }, testInfo) => {
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
    await expectContextualInspector(popup, graph);
    await page.screenshot({ path: testInfo.outputPath('popup.png') });
    const before = await state.getAttribute('style');
    await state.press('ArrowRight');
    await expect.poll(() => state.getAttribute('style')).not.toBe(before);
    await expectContextualInspector(popup, graph);
    await graph.getByRole('button', { name: 'Acercar el grafo', exact: true }).click();
    await expect(popup).toBeVisible();
    await expectContextualInspector(popup, graph);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const [index, model] of [/^AFN\b/, /^Pila\b/, /^Turing\b/].entries()) {
      await page.getByRole('button', { name: model }).click();
      await graph.getByRole('button', { name: 'Ajustar todos los estados a la vista', exact: true }).click();
      await graph.locator('.react-flow__node').first().press('Enter');
      await expectContextualInspector(popup, graph);
      await expect(popup.getByLabel('Nombre del estado', { exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`model-${index}-state.png`) });
      await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
      await graph.locator('.automaton-transition__label').first().click();
      await expect(popup.getByRole('heading', { name: 'Editar transición', exact: true })).toBeVisible();
      await expectContextualInspector(popup, graph);
      await page.screenshot({ path: testInfo.outputPath(`model-${index}-transition.png`) });
      await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
      await page.getByRole('button', { name: 'Configurar modelo', exact: true }).click();
      await expectContextualInspector(popup, graph);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}

test('cambiar de tamaño conserva la transición sin guardar y la ejecución de los cuatro modelos', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  const graph = page.locator('.graph-editor');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  const readExecution = () => page.evaluate(() => ({
    input: (document.querySelector('#input-word') as HTMLInputElement).value,
    step: document.querySelector('.step-count')?.textContent,
    status: document.querySelector('.run-status')?.textContent,
    configuration: document.querySelector('.configuration-panel')?.textContent,
    explanation: document.querySelector('.step-explanation')?.textContent,
    tape: document.querySelector('.tape')?.textContent ?? null,
    consumed: document.querySelectorAll('.symbol-cell.consumed').length,
    activeStates: Array.from(document.querySelectorAll('.react-flow__node:has(.automaton-state.is-active)'), node => node.getAttribute('data-id')),
    activeRules: Array.from(document.querySelectorAll('.automaton-transition__label.is-active'), node => node.getAttribute('data-transition-id')),
  }));
  for (const model of ['AFD', 'AFN', 'Pila', 'Turing']) {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
    const steps = model === 'Turing' ? 2 : 1;
    for (let step = 0; step < steps; step++) await next.click();
    await expect(page.locator('.step-count strong')).toHaveText(String(steps));
    const execution = await readExecution();
    await page.getByRole('button', { name: 'Agregar transición', exact: true }).click();
    const form = popup.locator('form');
    const destination = form.getByRole('combobox', { name: 'Destino', exact: true });
    await destination.selectOption({ index: 0 });
    await form.getByRole('combobox', { name: 'Lee', exact: true }).selectOption(model === 'Pila' ? 'b' : '1');
    if (model === 'Pila') {
      await form.getByRole('combobox', { name: 'Tope que retira', exact: true }).selectOption('A');
      await form.getByLabel('Reemplaza por', { exact: true }).fill('A⊥');
    }
    if (model === 'Turing') {
      await form.getByRole('combobox', { name: 'Escribe', exact: true }).selectOption('Y');
      await form.getByRole('combobox', { name: 'Mueve', exact: true }).selectOption('L');
    }
    const formElement = await form.elementHandle();
    const field = await destination.elementHandle();
    const readDraft = () => form.locator('input, select').evaluateAll(fields => fields.map(element => (element as HTMLInputElement).value));
    const draft = await readDraft();
    for (const width of [390, 768, 1366]) {
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 900 });
      await expectContextualInspector(popup, graph);
      expect(await formElement!.evaluate(element => element.isConnected && element === document.querySelector('.graph-popup form'))).toBe(true);
      expect(await field!.evaluate(element => element.isConnected && element === document.querySelector('.graph-popup [aria-label="Destino"]'))).toBe(true);
      expect(await readDraft()).toEqual(draft);
      expect(await readExecution()).toEqual(execution);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await popup.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await next.click();
    await expect(page.locator('.step-count strong')).toHaveText(String(steps + 1));
  }
});

test('el estado ofrece roles directos y conserva el campo al escribir', async ({ page }) => {
  await page.goto('');
  const graph = page.locator('.graph-editor');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await graph.locator('.react-flow__node[data-id="q0"]').press('Enter');
  const name = popup.getByLabel('Nombre del estado', { exact: true });
  await expect(name).toBeFocused();
  await expect(popup.locator('details')).toHaveCount(0);
  await expect(popup.getByRole('button', { name: 'Ver modelo', exact: true })).toHaveCount(0);
  const field = await name.elementHandle();
  await name.fill('memoria');
  await name.pressSequentially('0');
  expect(await field!.evaluate(element => element.isConnected && element === document.activeElement)).toBe(true);
  await expect(name).toHaveValue('memoria0');
  await expect(popup.getByRole('button', { name: 'Inicial', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await popup.getByRole('button', { name: 'Aceptación', exact: true }).click();
  await expect(popup.getByRole('button', { name: 'Aceptación', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await graph.locator('.react-flow__node[data-id="q1"]').click();
  await expect(popup.getByRole('heading', { name: 'Estado q1', exact: true })).toBeVisible();
  await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).press('Enter');
  await expect(popup).toHaveCount(0);
  await expect(graph.locator('.react-flow__node[data-id="q1"]')).toBeFocused();
});

test('estado y transición básica mantienen todos sus controles accesibles en el inspector', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  const graph = page.locator('.graph-editor');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await graph.locator('.react-flow__node[data-id="q0"]').click();
  await expect(popup.getByLabel('Nombre del estado', { exact: true })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Inicial', exact: true })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Aceptación', exact: true })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Eliminar estado y sus conexiones', exact: true })).toBeVisible();
  await popup.getByRole('button', { name: 'Eliminar estado y sus conexiones', exact: true }).scrollIntoViewIfNeeded();
  await expect(popup.getByRole('button', { name: 'Eliminar estado y sus conexiones', exact: true })).toBeInViewport();
  await expectContextualInspector(popup, graph);
  await graph.getByRole('button', { name: 'Regla 0, de q0 a q0', exact: true }).click();
  for (const name of ['Origen', 'Destino', 'Lee']) {
    const field = popup.getByRole('combobox', { name, exact: true });
    await field.scrollIntoViewIfNeeded();
    await expect(field).toBeVisible();
    await expect(field).toBeInViewport();
  }
  for (const name of ['Guardar transición', 'Cancelar', 'Eliminar transición']) {
    const button = popup.getByRole('button', { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    await expect(button).toBeInViewport();
  }
  await expect(popup.locator('.explanation')).toHaveCount(0);
  await expectContextualInspector(popup, graph);
});

test('la transición de pila mantiene visible la pista indispensable y sus errores', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: /^Pila / }).click();
  await page.getByRole('button', { name: 'Agregar transición', exact: true }).click();
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  const replacement = popup.getByLabel('Reemplaza por', { exact: true });
  await expect(popup.getByText(/^Primer símbolo = tope; vacío = ε\.?$/)).toBeVisible();
  await expect(replacement).toHaveAccessibleDescription(/^Primer símbolo = tope; vacío = ε\.?$/);
  await replacement.fill('Z');
  await popup.getByRole('button', { name: 'Crear transición', exact: true }).click();
  await expect(popup.getByRole('alert')).toContainText('El reemplazo solo puede contener símbolos de Γ.');
  await expect(popup.locator('details')).toHaveCount(0);
  await expect(popup.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible();
});

test('editar una ecuación de la definición formal regresa al grafo y abre su regla', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
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
  await expect(page.locator('.graph-canvas')).toBeInViewport();
  await expect(page.locator('.simulator')).toBeHidden();
});
