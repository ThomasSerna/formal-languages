import { expect, test } from '@playwright/test';

test('navega a GLC desde el inicio y anima derivaciones izquierda y derecha con árbol progresivo', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('');

  await page.getByRole('button', { name: 'Explorar autómatas', exact: true }).click();
  const cfgCard = page.locator('.landing-model-card', { hasText: 'GLC' });
  await expect(cfgCard).toBeVisible();
  await cfgCard.click();

  await expect(page.locator('.model-nav')).toHaveAttribute('data-model', 'cfg');
  await expect(page.locator('.cfg-workspace')).toBeVisible();
  await expect(page.getByLabel('Cadena de entrada', { exact: true })).toHaveValue('aabb');

  // En el paso 0 solo está la raíz S en la cinta y en el árbol SVG.
  await expect(page.locator('.cfg-ribbon .cfg-token')).toHaveCount(1);
  await expect(page.locator('.cfg-ribbon')).toContainText('S');
  await expect(page.locator('.cfg-tree-svg .cfg-tree-node-group')).toHaveCount(1);
  await expect(page.locator('.run-status')).toHaveText('Lista para empezar');

  // Avanzar paso 1: S -> aSb
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(page.locator('.step-count')).toContainText('Paso 1 de 3');
  await expect(page.locator('.cfg-yield-bar code')).toHaveText('aSb');
  await expect(page.locator('.cfg-prod-pill-wrap.is-active .cfg-prod-status')).toHaveText('en uso');
  await expect(page.locator('.cfg-tree-svg .cfg-tree-node-group')).toHaveCount(4);

  // Completar la derivación hasta aceptación.
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
  await expect(page.locator('.cfg-yield-bar code')).toHaveText('aabb');

  // Retroceder un paso y verificar actualización sincronizada.
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.locator('.step-count')).toContainText('Paso 2 de 3');
  await expect(page.locator('.cfg-yield-bar code')).toHaveText('aaSbb');

  // Cambiar a derivación más a la derecha y verificar definición formal.
  await page.getByRole('button', { name: /Derecha/ }).click();
  await expect(page.locator('.cfg-trace-card .cfg-tuple-badge')).toHaveText('→_R');
  await page.locator('#formal-toggle').click();
  await expect(page.locator('#formal-content .formula')).toHaveText('G = (N, Σ, P, S)');
  await expect(page.locator('#formal-content')).toContainText('S → aSb | ε');
});

test('detecta rechazo, valida símbolos fuera de Σ y compara árboles en gramáticas ambiguas', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('#lab');
  await page.getByRole('button', { name: /^GLC\b/ }).click();

  const input = page.getByLabel('Cadena de entrada', { exact: true });
  await input.fill('aab');
  await expect(page.locator('.run-status')).toHaveText('Rechazada');
  await expect(page.locator('.cfg-tree-empty')).toContainText('no pertenece a L(G)');

  await input.fill('ax');
  await expect(page.locator('#cfg-input-error')).toContainText('no pertenece al alfabeto terminal Σ');

  // Seleccionar ejemplo ambiguo de Kozen (E -> E+E | E*E | (E) | a).
  await page.getByRole('button', { name: 'Ambigüedad a+a*a', exact: true }).click();
  await expect(input).toHaveValue('a+a*a');
  await expect(page.locator('.cfg-ambiguity-banner')).toBeVisible();

  await page.getByRole('button', { name: 'Árbol 2', exact: true }).click();
  await expect(page.locator('.cfg-tree-card h3')).toContainText('Árbol 2');

  await page.getByRole('button', { name: 'Comparar árboles', exact: true }).click();
  await expect(page.locator('.cfg-tree-compare-grid .cfg-tree-svg')).toHaveCount(2);
});

test('permite derivación manual interactiva y edición de producciones BNF', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('#lab');
  await page.getByRole('button', { name: /^GLC\b/ }).click();

  const input = page.getByLabel('Cadena de entrada', { exact: true });
  await input.fill('ab');

  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await expect(page.locator('.cfg-manual-picker')).toBeVisible();

  // Expandir S -> aSb y luego S -> ε.
  await page.locator('.cfg-manual-option', { hasText: 'S → aSb' }).click();
  await expect(page.locator('.cfg-yield-bar code')).toHaveText('aSb');
  await page.locator('.cfg-ribbon button.cfg-token.is-nonterminal').click();
  await page.locator('.cfg-manual-option', { hasText: 'S → ε' }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
  await expect(page.locator('.cfg-yield-bar code')).toHaveText('ab');

  // Agregar nueva producción BNF personalizada y probar cadena derivada.
  await page.locator('#cfg-bnf-input').fill('S -> c');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.locator('.cfg-bnf-groups')).toContainText('c');
  await page.getByRole('button', { name: 'Guiado', exact: true }).click();
  await input.fill('c');
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
});

for (const [width, height] of [[1366, 768], [768, 900], [390, 667]]) {
  test(`GLC sin desbordamiento horizontal a ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('#lab');
    await page.getByRole('button', { name: /^GLC\b/ }).click();
    await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
    await expect(page.locator('.cfg-tree-svg')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
