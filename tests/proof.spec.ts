import { expect, test, type Locator, type Page } from '@playwright/test';

const proof = (page: Page) => page.locator('#proof-content');
const button = (region: Locator, name: string) => region.getByRole('button', { name, exact: true });

async function openProof(page: Page) {
  await page.getByRole('button', { name: 'Demostrar lenguaje', exact: true }).click();
  await expect(proof(page)).toBeVisible();
}

async function compareParity(page: Page) {
  await openProof(page);
  await button(proof(page), 'Comprobar').click();
  await expect(proof(page).getByText('Coinciden', { exact: true })).toBeVisible();
}

async function chooseStates(region: Locator, names: string[]) {
  for (const name of names) await button(region, name).click();
}

test('la inducción completa la paridad y conserva las respuestas incorrectas como ejercicios pendientes', async ({ page }) => {
  await page.goto('');
  const region = proof(page);
  await compareParity(page);
  await button(region, 'Construir prueba').click();

  await button(region, 'Comprobar base').click();
  await expect(button(region, 'Comprobar base')).toBeVisible();
  await expect(region.locator('.proof-feedback')).toContainText('La base incluye');
  await expect(button(region, 'Aceptación')).toBeDisabled();
  await expect(region.getByText('Prueba completada', { exact: true })).toHaveCount(0);
  await button(region, 'Incluir q0').click();
  await expect(button(region, 'Incluir q0')).toHaveAttribute('aria-pressed', 'true');
  await button(region, 'Comprobar base').click();
  await button(region, 'Continuar al paso inductivo').click();

  await expect(region.getByText('Caso 1 de 2', { exact: true })).toBeVisible();
  await button(region, 'Comprobar transiciones').click();
  await expect(button(region, 'Comprobar transiciones')).toBeVisible();
  await expect(region.locator('.proof-feedback')).toContainText('Cada símbolo requiere su conjunto completo');
  await expect(button(region, 'Siguiente caso')).toHaveCount(0);
  await chooseStates(region, ['Destino q0 al leer 0', 'Destino q1 al leer 1']);
  await button(region, 'Comprobar transiciones').click();
  await button(region, 'Siguiente caso').click();
  await expect(region.getByText('Caso 2 de 2', { exact: true })).toBeVisible();
  await expect(button(region, 'Aceptación')).toBeDisabled();
  await chooseStates(region, ['Destino q1 al leer 0', 'Destino q0 al leer 1']);
  await button(region, 'Comprobar transiciones').click();
  await button(region, 'Siguiente caso').click();

  await button(region, 'Ambos rechazan').click();
  await button(region, 'Comprobar aceptación').click();
  await expect(button(region, 'Comprobar aceptación')).toBeVisible();
  await expect(region.locator('.proof-feedback')).toContainText('basta un estado final activo');
  await expect(region.getByText('Prueba completada', { exact: true })).toHaveCount(0);
  await button(region, 'Ambos aceptan').click();
  await button(region, 'Comprobar aceptación').click();
  await button(region, 'Siguiente caso').click();
  await button(region, 'Ambos rechazan').click();
  await button(region, 'Comprobar aceptación').click();
  await button(region, 'Finalizar prueba').click();
  await expect(region.getByText('Prueba completada', { exact: true })).toBeVisible();
  await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
});

test('una afirmación falsa entrega ε como contraejemplo y lo transfiere a la simulación', async ({ page }) => {
  await page.goto('');
  const region = proof(page);
  await openProof(page);
  await region.getByRole('combobox', { name: 'Condición', exact: true }).selectOption('length');
  await region.getByRole('combobox', { name: 'Resto', exact: true }).selectOption('1');
  await button(region, 'Comprobar').click();
  await expect(region.getByText('No coinciden', { exact: true })).toBeVisible();
  await expect(button(region, 'Construir prueba')).toHaveCount(0);
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

test('una expresión regular certifica el AFN y la base requiere toda la clausura ε', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: /^AFN\b/ }).click();
  const region = proof(page);
  await openProof(page);
  await button(region, 'Expresión regular').click();
  const expression = region.getByLabel('Expresión regular', { exact: true });
  await expression.fill('(0+1)*01');
  await button(region, 'Comprobar').click();
  await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
  await button(region, 'Construir prueba').click();
  await button(region, 'Incluir s').click();
  await button(region, 'Comprobar base').click();
  await expect(button(region, 'Comprobar base')).toBeVisible();
  await button(region, 'Incluir q0').click();
  await button(region, 'Comprobar base').click();
  await button(region, 'Continuar al paso inductivo').click();
  await expect(button(region, 'Comprobar transiciones')).toBeVisible();
  await expect(button(region, 'Comprobar base')).toHaveCount(0);
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
  await expect(button(region, 'Construir prueba')).toHaveCount(0);
});

test('los paneles y cambios de modelo conservan la prueba; mover o renombrar estados conserva el certificado', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('110');
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await compareParity(page);
  const region = proof(page);
  await button(region, 'Construir prueba').click();
  await button(region, 'Incluir q0').click();
  await button(region, 'Comprobar base').click();
  await button(region, 'Continuar al paso inductivo').click();
  await button(region, 'Destino q0 al leer 0').click();
  for (const panel of ['formal', 'theory', 'simulation']) {
    await page.locator(`#${panel}-toggle`).click();
    await expect(region).toBeHidden();
    if (panel === 'simulation') {
      await expect(page.getByLabel('Cadena de entrada', { exact: true })).toHaveValue('110');
      await expect(page.locator('.step-count strong')).toHaveText('1');
    }
    await openProof(page);
    await expect(button(region, 'Destino q0 al leer 0')).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: /^AFN\b/ }).click();
  await region.getByRole('combobox', { name: 'Condición', exact: true }).selectOption('suffix');
  await page.getByRole('button', { name: /^AFD\b/ }).click();
  await expect(button(region, 'Destino q0 al leer 0')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^AFN\b/ }).click();
  await expect(region.getByRole('combobox', { name: 'Condición', exact: true })).toHaveValue('suffix');
  await page.getByRole('button', { name: /^AFD\b/ }).click();

  const state = page.locator('.react-flow__node[data-id="q0"]');
  const before = await state.getAttribute('style');
  await state.click();
  await state.press('ArrowRight');
  await expect.poll(() => state.getAttribute('style')).not.toBe(before);
  await expect(button(region, 'Comprobar transiciones')).toBeVisible();
  await state.press('Enter');
  const inspector = page.getByRole('dialog', { name: 'Inspector del autómata' });
  await inspector.getByLabel('Nombre del estado', { exact: true }).fill('par');
  await expect(button(region, 'Destino par al leer 0')).toHaveAttribute('aria-pressed', 'true');
  await expect(region.getByText('Coinciden', { exact: true })).toBeVisible();
  await inspector.getByRole('button', { name: 'Aceptación', exact: true }).click();
  await expect(region.getByText('Coinciden', { exact: true })).toHaveCount(0);
  await expect(button(region, 'Comprobar transiciones')).toHaveCount(0);
  await expect(button(region, 'Comprobar')).toBeVisible();
});

test('abrir la demostración pausa la reproducción y los modelos generales explican su alcance', async ({ page }) => {
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
    await expect(proof(page)).toBeVisible();
    await expect(proof(page)).toContainText(/AFD.*AFN/);
    await expect(button(proof(page), 'Comprobar')).toHaveCount(0);
    await expect(proof(page).getByText('Ver fundamento', { exact: true })).toBeVisible();
  }
});

for (const width of [390, 768, 1366]) {
  test(`la demostración se opera por teclado y respeta el lienzo a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('');
    await expect(page.locator('.app-footer, .laboratory-tools')).toHaveCount(0);
    await expect(page.getByText('Aprender es recorrer el camino.', { exact: true })).toHaveCount(0);
    const controls = page.locator('.dock-controls > button');
    await expect(controls).toHaveCount(4);
    for (const [index, name] of ['Probar cadena', 'Demostrar lenguaje', 'Definición formal', 'Entender este modelo'].entries()) {
      await expect(controls.nth(index)).toHaveAccessibleName(name);
      const bounds = await controls.nth(index).boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
    }
    const toggle = page.getByRole('button', { name: 'Demostrar lenguaje', exact: true });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(proof(page)).toHaveAttribute('aria-labelledby', 'proof-toggle');
    await expect(page.locator('.dock-content:visible')).toHaveCount(1);
    await button(proof(page), 'Comprobar').focus();
    await page.keyboard.press('Enter');
    await expect(proof(page).getByText('Coinciden', { exact: true })).toBeVisible();
    await button(proof(page), 'Construir prueba').focus();
    await page.keyboard.press('Enter');
    await button(proof(page), 'Incluir q0').focus();
    await page.keyboard.press('Space');
    await expect(button(proof(page), 'Incluir q0')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const canvas = (await page.locator('.graph-canvas').boundingBox())!;
    const dock = (await page.locator('.simulation-dock').boundingBox())!;
    expect(canvas.height).toBeGreaterThan(200);
    expect(dock.y).toBeGreaterThanOrEqual(canvas.y + canvas.height - 1);
    expect(dock.y + dock.height).toBeLessThanOrEqual(901);
    await page.screenshot({ path: testInfo.outputPath('demostracion-base.png') });
  });
}
