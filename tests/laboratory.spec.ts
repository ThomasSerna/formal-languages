import { test, expect } from '@playwright/test';

test('el ejemplo AFD avanza, retrocede y acepta; la entrada inválida explica el error', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('');
  await expect(page.getByRole('heading', { name: 'Autómata finito determinista', exact: true })).toBeVisible();
  const graph = await page.locator('.graph-editor').boundingBox();
  expect(graph!.width).toBeGreaterThanOrEqual(1300);
  expect(graph!.height).toBeGreaterThan(384);
  expect(graph!.y + graph!.height).toBeLessThanOrEqual(768);
  const simulator = await page.locator('.simulator').boundingBox();
  expect(simulator!.y).toBeGreaterThanOrEqual(768);
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
  await page.getByRole('button', { name: 'Crear desde cero', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir lienzo vacío' }).click();
  await page.getByRole('button', { name: 'Agregar estado', exact: true }).click();
  await page.getByLabel('Nombre del estado', { exact: true }).fill('par');
  await page.getByLabel('Estado de aceptación', { exact: true }).check();
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
  await expect(page.locator('.graph-size')).toContainText('1 estados · 2 reglas');
  await page.getByRole('button', { name: 'Usar ε' }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
});

test('exportar e importar JSON y preservar el grafo ante un archivo inválido', async ({ page }) => {
  await page.goto('');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByLabel('Importar autómata JSON').setInputFiles(path!);
  await expect(page.getByRole('status').filter({ hasText: 'Archivo importado' })).toBeVisible();
  await page.getByLabel('Importar autómata JSON').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":99}') });
  await expect(page.getByRole('status').filter({ hasText: 'versión' })).toBeVisible();
  await expect(page.locator('.automaton-state')).toHaveCount(2);
});

test('un fallo al guardar se mantiene visible al reemplazar el borrador', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Sin espacio', 'QuotaExceededError'); };
  });
  await page.goto('');
  await page.getByRole('button', { name: 'Crear desde cero', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir lienzo vacío' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'almacenamiento del navegador está lleno' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar JSON', exact: true })).toBeEnabled();
});

for (const width of [390, 768, 1366]) {
  test(`sin desbordamiento y con operación por teclado a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
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
