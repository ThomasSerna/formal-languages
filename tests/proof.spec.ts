import { expect, test, type Locator, type Page } from '@playwright/test';

const proof = (page: Page) => page.locator('#proof-content');
const button = (region: Locator, name: string) => region.getByRole('button', { name, exact: true });

async function openProof(page: Page) {
  await page.getByRole('button', { name: 'Comprobar lenguaje', exact: true }).click();
  await expect(proof(page)).toBeVisible();
}

async function compareParity(page: Page) {
  await openProof(page);
  await button(proof(page), 'Comprobar').click();
  await expect(proof(page).getByText('Coinciden', { exact: true })).toBeVisible();
}

test('el constructor comprueba la paridad del ejemplo AFD sin etapas de prueba formal', async ({ page }) => {
  await page.goto('');
  const region = proof(page);
  await compareParity(page);
  await expect(region).toContainText('Equivalencia comprobada · 2 parejas alcanzables.');
  await expect(button(region, 'Construir prueba')).toHaveCount(0);
  await expect(region.locator('.proof-stages')).toHaveCount(0);
});

test('una afirmación falsa entrega ε como contraejemplo y lo transfiere a la simulación', async ({ page }) => {
  await page.goto('');
  const region = proof(page);
  await openProof(page);
  await region.getByRole('combobox', { name: 'Condición', exact: true }).selectOption('length');
  await region.getByRole('combobox', { name: 'Resto', exact: true }).selectOption('1');
  await button(region, 'Comprobar').click();
  await expect(region.getByText('No coinciden', { exact: true })).toBeVisible();
  await button(region, 'Probar esta cadena').click();
  await expect(page.locator('#simulation-content')).toBeVisible();
  await expect(region).toBeHidden();
  await expect(page.getByLabel('Cadena de entrada', { exact: true })).toHaveValue('');
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
});

test('el contraejemplo mínimo no vacío sincroniza los dos recorridos y la regla del grafo', async ({ page }) => {
  await page.goto('');
  await openProof(page);
  const region = proof(page);
  await region.getByRole('combobox', { name: 'Condición', exact: true }).selectOption('length');
  await button(region, 'Comprobar').click();
  await expect(region.getByText('No coinciden', { exact: true })).toBeVisible();
  await expect(region.locator('.counterexample-word code')).toHaveText('0');
  await expect(region.locator('.proof-trace')).toContainText('Paso 0 de 1');
  await expect(region.locator('.comparison-lanes')).toContainText('Autómata: acepta');
  await expect(region.locator('.comparison-lanes')).toContainText('Lenguaje: no pertenece');
  await button(region, 'Siguiente en el contraejemplo').click();
  await expect(region.locator('.proof-trace')).toContainText('Paso 1 de 1');
  await expect(region.locator('.comparison-lanes')).toContainText('Autómata: acepta');
  await expect(region.locator('.comparison-lanes')).toContainText('Lenguaje: no pertenece');
  await expect(page.locator('.automaton-transition__label[data-transition-id="d0"]')).toHaveClass(/is-active/);
  await expect(button(region, 'Siguiente en el contraejemplo')).toBeDisabled();
  await button(region, 'Anterior en el contraejemplo').click();
  await expect(region.locator('.proof-trace')).toContainText('Paso 0 de 1');
});

test('una expresión regular comprueba el AFN', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: /^AFN\b/ }).click();
  const region = proof(page);
  await openProof(page);
  await button(region, 'Expresión regular').click();
  const expression = region.getByLabel('Expresión regular', { exact: true });
  await expression.fill('(0+1)*01');
  await button(region, 'Comprobar').click();
  await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
  await expect(region).toContainText('Equivalencia comprobada');
  await expect(button(region, 'Construir prueba')).toHaveCount(0);
});

test('la entrada regular vacía queda pendiente y una expresión incompleta explica el error', async ({ page }) => {
  await page.goto('');
  await openProof(page);
  const region = proof(page);
  await button(region, 'Expresión regular').click();
  const expression = region.getByLabel('Expresión regular', { exact: true });
  await expression.fill('');
  await expect(button(region, 'Comprobar')).toBeDisabled();
  await expression.fill('(0+');
  await button(region, 'Comprobar').click();
  await expect(region.getByRole('alert')).toBeVisible();
  await expect(region.getByText('Coinciden', { exact: true })).toHaveCount(0);
});

test('los paneles y cambios de modelo conservan la comprobación; mover o renombrar estados conserva el resultado', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('110');
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await compareParity(page);
  const region = proof(page);
  for (const panel of ['formal', 'theory', 'simulation']) {
    await page.locator(`#${panel}-toggle`).click();
    await expect(region).toBeHidden();
    if (panel === 'simulation') {
      await expect(page.getByLabel('Cadena de entrada', { exact: true })).toHaveValue('110');
      await expect(page.locator('.step-count strong')).toHaveText('1');
    }
    await openProof(page);
    await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: /^AFN\b/ }).click();
  await region.getByRole('combobox', { name: 'Condición', exact: true }).selectOption('suffix');
  await page.getByRole('button', { name: /^AFD\b/ }).click();
  await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^AFN\b/ }).click();
  await expect(region.getByRole('combobox', { name: 'Condición', exact: true })).toHaveValue('suffix');
  await page.getByRole('button', { name: /^AFD\b/ }).click();

  const state = page.locator('.react-flow__node[data-id="q0"]');
  const before = await state.getAttribute('style');
  await state.click();
  await state.press('ArrowRight');
  await expect.poll(() => state.getAttribute('style')).not.toBe(before);
  await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
  await state.press('Enter');
  const inspector = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await inspector.getByLabel('Nombre del estado', { exact: true }).fill('par');
  await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
  await inspector.getByRole('button', { name: 'Aceptación', exact: true }).click();
  await expect(region.getByText('Coinciden', { exact: true })).toHaveCount(0);
  await expect(button(region, 'Comprobar')).toBeVisible();
});

test('abrir la comprobación pausa la reproducción y la opción solo aparece en AFD y AFN', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('000000');
  await page.getByLabel('Velocidad', { exact: true }).selectOption('300');
  await page.clock.install();
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await openProof(page);
  await page.clock.runFor(900);
  await page.locator('#simulation-toggle').click();
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  await openProof(page);
  for (const model of ['Pila', 'Turing']) {
    await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
    await expect(page.getByRole('button', { name: 'Comprobar lenguaje', exact: true })).toHaveCount(0);
    await expect(page.locator('.dock-controls > button')).toHaveCount(3);
    await expect(proof(page)).toBeHidden();
  }
  for (const model of ['AFD', 'AFN']) {
    await page.getByRole('button', { name: new RegExp(`^${model}\\b`) }).click();
    await expect(page.getByRole('button', { name: 'Comprobar lenguaje', exact: true })).toBeVisible();
    await expect(page.locator('.dock-controls > button')).toHaveCount(4);
  }
});

for (const width of [390, 768, 1366]) {
  test(`la comprobación se opera por teclado y respeta el lienzo a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    await expect(page.locator('.app-footer, .laboratory-tools')).toHaveCount(0);
    await expect(page.getByText('Aprender es recorrer el camino.', { exact: true })).toHaveCount(0);
    const controls = page.locator('.dock-controls > button');
    await expect(controls).toHaveCount(4);
    for (const [index, name] of ['Probar cadena', 'Comprobar lenguaje', 'Definición formal', 'Entender este modelo'].entries()) {
      await expect(controls.nth(index)).toHaveAccessibleName(name);
      const bounds = await controls.nth(index).boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    const toggle = page.getByRole('button', { name: 'Comprobar lenguaje', exact: true });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(proof(page)).toHaveAttribute('aria-labelledby', 'proof-toggle');
    await expect(page.locator('.dock-content:visible')).toHaveCount(1);
    await button(proof(page), 'Comprobar').focus();
    await page.keyboard.press('Enter');
    await expect(proof(page).getByText('Coinciden', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const canvas = (await page.locator('.graph-canvas').boundingBox())!;
    const dock = (await page.locator('.simulation-dock').boundingBox())!;
    expect(canvas.height).toBeGreaterThan(200);
    expect(dock.y).toBeGreaterThanOrEqual(canvas.y + canvas.height - 1);
    expect(dock.y + dock.height).toBeLessThanOrEqual(901);
    await page.screenshot({ path: testInfo.outputPath('comprobacion-lenguaje.png') });
  });
}
