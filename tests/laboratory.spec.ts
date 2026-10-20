import { test, expect } from '@playwright/test';

test('el ejemplo AFD avanza, retrocede y acepta; la entrada inválida explica el error', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('');
  await expect(page.locator('.graph-toolbar h1')).toHaveText('Cantidad par de unos');
  await expect(page.locator('.simulator')).toBeHidden();
  expect((await page.locator('.graph-canvas').boundingBox())!.height).toBeGreaterThan(550);
  await page.locator('#simulation-toggle').click();
  const graph = await page.locator('.graph-canvas').boundingBox();
  expect(graph!.width).toBeGreaterThanOrEqual(1000);
  expect(graph!.height).toBeGreaterThanOrEqual(260);
  expect(graph!.y + graph!.height).toBeLessThanOrEqual(768);
  const simulator = await page.locator('.simulator').boundingBox();
  expect(simulator!.y).toBeGreaterThanOrEqual(graph!.y + graph!.height);
  expect(simulator!.y + simulator!.height).toBeLessThanOrEqual(768);
  await expect(page.getByRole('button', { name: 'Paso siguiente' })).toBeInViewport();
  await expect(page.locator('.configuration-panel')).toBeInViewport();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('11');
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.locator('.step-count')).toContainText('1 de 2');
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.locator('.step-count')).toContainText('0 de 2');
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('2');
  await expect(page.getByRole('alert')).toContainText('no pertenece');
  await expect(page.getByRole('button', { name: 'Paso siguiente' })).toBeDisabled();
});

test('los cuatro modelos ejecutan; Turing restaura la cinta al retroceder una escritura', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^AFN / }).click();
  await expect(page.locator('.state-chips .state-chip')).toHaveCount(2);
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('01');
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
  await page.getByRole('button', { name: /^Pila / }).click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('ab');
  for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
  await page.getByRole('button', { name: /^Turing / }).click();
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  const beforeWrite = await page.locator('.tape').textContent();
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.locator('.tape')).toContainText('X');
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.locator('.tape')).toHaveText(beforeWrite!);
  await page.getByRole('button', { name: 'Paso siguiente' }).click();
  await expect(page.locator('.tape')).toContainText('X');
  await page.getByLabel('Velocidad', { exact: true }).selectOption('300');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada', { timeout: 20000 });
});

test('crear un grafo desde cero, editar roles y conservar el borrador', async ({ page }) => {
  await page.goto('');
  await page.locator('.file-menu > summary').click();
  await page.getByRole('button', { name: 'Crear desde cero', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir lienzo vacío' }).click();
  await page.getByRole('button', { name: 'Agregar estado', exact: true }).click();
  await page.getByLabel('Nombre del estado', { exact: true }).fill('par');
  await page.getByRole('button', { name: 'Aceptación', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar transición', exact: true }).click();
  await page.getByLabel('Origen', { exact: true }).selectOption({ label: 'par' });
  await page.getByLabel('Destino', { exact: true }).selectOption({ label: 'par' });
  await page.getByLabel('Lee', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Crear transición', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar transición', exact: true }).click();
  await page.getByLabel('Lee', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Crear transición', exact: true }).click();
  await expect(page.locator('.validation')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.automaton-state__name')).toHaveText('par');
  await expect(page.locator('.automaton-transition__label')).toHaveCount(2);
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: 'Usar ε' }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
});

test('exportar e importar JSON y preservar el grafo ante un archivo inválido', async ({ page }) => {
  await page.goto('');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.file-menu > summary').click();
  await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.locator('.file-menu > summary').click();
  const importChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await (await importChooser).setFiles(path!);
  await expect(page.getByRole('status').filter({ hasText: 'Archivo importado' })).toBeVisible();
  await page.locator('.file-menu > summary').click();
  const invalidChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await (await invalidChooser).setFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":99}') });
  await expect(page.getByRole('status').filter({ hasText: 'versión' })).toBeVisible();
  await expect(page.locator('.automaton-state')).toHaveCount(2);
});

test('un fallo al guardar se mantiene visible al reemplazar el borrador', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Sin espacio', 'QuotaExceededError'); };
  });
  await page.goto('');
  await page.locator('.file-menu > summary').click();
  await page.getByRole('button', { name: 'Crear desde cero', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir lienzo vacío' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'almacenamiento del navegador está lleno' })).toBeVisible();
  await page.locator('.file-menu > summary').click();
  await expect(page.getByRole('button', { name: 'Exportar JSON', exact: true })).toBeEnabled();
});

test('Archivo se opera por teclado y cierra al elegir, pulsar Escape o tocar fuera', async ({ page }) => {
  await page.goto('');
  const menu = page.locator('.file-menu');
  const summary = menu.locator('summary');
  await summary.focus();
  await summary.press('Enter');
  await expect(menu).toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('button', { name: 'Importar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await summary.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('button', { name: 'Exportar JSON', exact: true })).toBeFocused();
  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.json$/);
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await summary.press('Enter');
  await page.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
  await expect(menu).not.toHaveAttribute('open', '');
});

test('los avisos del modelo y las referencias respetan el editor y la barra inferior', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('');
  const configure = page.getByRole('button', { name: 'Configurar modelo', exact: true });
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await configure.click();
  await popup.getByLabel('Alfabeto de entrada · Σ', { exact: true }).fill('a b');
  await expect(page.locator('.validation-count')).toBeVisible();
  await page.locator('#simulation-toggle').click();
  await expect(page.locator('.validation')).toHaveAttribute('open', '');
  await expect(page.locator('.validation li')).not.toHaveCount(0);
  await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();

  await expect(page.locator('#formal-reference')).toBeHidden();
  for (const panel of ['simulation', 'formal']) {
    if (panel === 'formal') await page.locator('#formal-toggle').click();
    const toolbar = (await page.locator('.graph-toolbar').boundingBox())!;
    const canvas = (await page.locator('.graph-canvas').boundingBox())!;
    const dock = (await page.locator('.simulation-dock').boundingBox())!;
    const header = (await page.locator('.simulation-dock-header').boundingBox())!;
    const content = (await page.locator(`#${panel}-content`).boundingBox())!;
    expect(canvas.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height);
    expect(dock.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
    expect(content.y).toBeGreaterThanOrEqual(header.y + header.height);
    expect(content.y + content.height).toBeLessThanOrEqual(dock.y + dock.height);
    expect(content.height).toBeLessThanOrEqual(720 * .4 + 1);
    expect(dock.y + dock.height).toBeLessThanOrEqual(720);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.locator('#formal-reference')).toBeVisible();
  await expect(page.locator('#simulation-content')).toBeHidden();
  await expect(page.locator('#formal-content .formal-definition')).toBeVisible();
  await expect(page.locator('.app-footer, .laboratory-tools')).toHaveCount(0);
  await configure.click();
  await expect(popup.getByLabel('Alfabeto de entrada · Σ', { exact: true })).toHaveValue('a b');
});

test('en móvil abrir el modelo o seleccionar un estado lleva el inspector a la vista', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto('');
  const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await page.getByRole('button', { name: 'Configurar modelo', exact: true }).click();
  await expect(popup.getByRole('heading', { name: 'Modelo', exact: true })).toBeInViewport();
  await expect(popup.getByLabel('Nombre del autómata', { exact: true })).toBeInViewport();
  await expect(popup.getByLabel('Nombre del autómata', { exact: true })).toBeFocused();
  await expect(popup.getByRole('button', { name: 'Cerrar inspector', exact: true })).toBeInViewport();
  await popup.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();

  await page.locator('.react-flow__node[data-id="q0"]').click();
  await expect(popup.getByRole('heading', { name: 'Estado q0', exact: true })).toBeInViewport();
  await expect(popup.getByLabel('Nombre del estado', { exact: true })).toBeInViewport();
  await expect(popup.getByRole('button', { name: 'Cerrar inspector', exact: true })).toBeInViewport();
});

for (const width of [390, 768, 1366]) {
  test(`sin desbordamiento y con operación por teclado a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    await page.locator('#simulation-toggle').click();
    for (const model of ['AFD', 'AFN', 'Pila', 'Turing']) {
      await page.getByRole('button', { name: new RegExp(`^${model}(?:\\s|$)`) }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.getByRole('button', { name: 'Paso siguiente' })).toBeEnabled();
    }
    await page.getByRole('button', { name: 'Agregar estado', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Nombre del estado', { exact: true })).toBeVisible();
    await page.getByLabel('Nombre del estado', { exact: true }).fill('teclado');
    await expect(page.locator('.automaton-state__name', { hasText: 'teclado' })).toBeVisible();
  });
}
