import { expect, test, type Locator, type Page } from '@playwright/test';

async function openTuringLab(page: Page) {
  await page.goto('./#lab');
  await page.getByRole('navigation').getByRole('button', { name: 'Turing' }).click();
  await expect(page.locator('.tm-view-switch')).toBeVisible();
}

async function openSimulation(page: Page) {
  const toggle = page.locator('#simulation-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(page.locator('#simulation-content')).toBeVisible();
}

function viewportTransformParts(transform: string): { x: number; y: number; zoom: number } {
  const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
  if (!match) throw new Error(`Transformación inesperada: ${transform}`);
  return { x: Number(match[1]), y: Number(match[2]), zoom: Number(match[3]) };
}

test.describe('Máquina de Turing: vista grafo y tabla sincronizadas', () => {
  test('muestra el selector Grafo | Tabla solo en Turing', async ({ page }) => {
    await page.goto('./#lab');

    for (const model of ['AFD', 'AFN', 'Pila']) {
      await page.getByRole('navigation').getByRole('button', { name: model }).click();
      await expect(page.locator('.tm-view-switch')).toHaveCount(0);
    }

    await page.getByRole('navigation').getByRole('button', { name: 'Turing' }).click();
    const viewSwitch = page.locator('.tm-view-switch');
    await expect(viewSwitch).toBeVisible();
    await expect(viewSwitch.getByRole('button', { name: 'Grafo' })).toHaveAttribute('aria-pressed', 'true');
    await expect(viewSwitch.getByRole('button', { name: 'Tabla' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('muestra el ejemplo de Kozen con columnas Γ, reglas explícitas, por defecto y filas t/r absorbentes', async ({ page }) => {
    await openTuringLab(page);
    await page.locator('.tm-view-switch').getByRole('button', { name: 'Tabla' }).click();

    const table = page.locator('.tm-table');
    await expect(table).toBeVisible();
    await expect(page.locator('.tm-table-signature')).toContainText('δ: Q × Γ → Q × Γ × {L, R}');

    const headers = await table.locator('thead th').allTextContents();
    expect(headers.map((text) => text.replace(/\s+/g, ' ').trim())).toEqual([
      'Estado',
      '0',
      '1',
      'X',
      'Y',
      '⊢inicio',
      '␣blanco',
    ]);

    const rowStateIds = await table.locator('tbody .tm-table-state').evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('data-state-id')),
    );
    expect(rowStateIds).toEqual(['s', 'q0', 'q1', 'q2', 'q3', 't', 'r']);

    await expect(table.locator('[data-state-id="s"] .tm-table-state__initial')).toBeVisible();
    await expect(table.locator('[data-state-id="t"] .tm-table-state__badge')).toHaveText('t');
    await expect(table.locator('[data-state-id="r"] .tm-table-state__badge')).toHaveText('r');

    // Explicit rules: δ(s, ⊢) = (q0, ⊢, R) and δ(q0, 0) = (q1, X, R)
    const rowS = table.locator('tbody tr').nth(0);
    const rowQ0 = table.locator('tbody tr').nth(1);
    await expect(rowS.locator('td').nth(4).locator('.tm-table-rule')).toContainText('(q0, ⊢, R)');
    await expect(rowQ0.locator('td').nth(0).locator('.tm-table-rule')).toContainText('(q1, X, R)');

    // Omitted rule (s, 1) renders Kozen implicit default (r, 1, R)
    const defaultCell = table.locator('[data-tm-cell="s:1"]');
    await expect(defaultCell).toHaveClass(/is-default/);
    await expect(defaultCell).toContainText('(r, 1, R)');

    // Absorbing states t and r render non-editable terminal markers
    for (const rowIndex of [5, 6]) {
      const terminalRow = table.locator('tbody tr').nth(rowIndex);
      await expect(terminalRow.locator('.tm-table-terminal')).toHaveCount(6);
      await expect(terminalRow.locator('td button')).toHaveCount(0);
    }
  });

  test('sincroniza ediciones en ambos sentidos Tabla ↔ Grafo y conserva el encuadre del grafo', async ({ page }) => {
    await openTuringLab(page);

    // Record initial s node screen position before zooming/editing
    const initialSNodeBox = await page.locator('.react-flow__node[data-id="s"]').boundingBox();
    expect(initialSNodeBox).not.toBeNull();

    // Switch to Tabla and edit the automaton
    await page.locator('.tm-view-switch').getByRole('button', { name: 'Tabla' }).click();
    await page.getByRole('button', { name: 'Agregar estado' }).click();

    const dialog = page.getByRole('dialog', { name: 'Inspector del autómata' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nombre del estado').fill('q8');
    await expect(page.locator('.tm-table-state', { hasText: 'q8' })).toBeVisible();

    // Validate left marker protection when creating from omitted (q0, ⊢)
    await page.locator('[data-tm-cell="q0:⊢"]').click();
    await expect(dialog.getByRole('heading', { name: 'Nueva transición' })).toBeVisible();
    await dialog.getByLabel('Escribe').selectOption('0');
    await dialog.getByRole('button', { name: 'Crear transición' }).click();
    await expect(dialog.getByRole('alert')).toContainText('marcador izquierdo');

    // Close and create an explicit rule from muted default cell (s, 1) -> (q8, Y, L)
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await page.locator('[data-tm-cell="s:1"]').click();
    await expect(dialog.getByLabel('Origen')).toHaveValue('s');
    await expect(dialog.getByLabel('Lee')).toHaveValue('1');
    await expect(dialog.getByLabel('Escribe')).toHaveValue('1');
    await dialog.getByLabel('Destino').selectOption({ label: 'q8' });
    await dialog.getByLabel('Escribe').selectOption('Y');
    await dialog.getByLabel('Mueve').selectOption('L');
    await dialog.getByRole('button', { name: 'Crear transición' }).click();

    await expect(page.locator('[data-tm-cell="s:1"]')).toHaveCount(0);
    const createdRule = page.locator('.tm-table tbody tr').first().locator('td').nth(1).locator('[data-transition-id]');
    await expect(createdRule).toContainText('(q8, Y, L)');

    // Verify change in Formal Definition too
    await page.locator('#formal-toggle').click();
    await expect(page.locator('#formal-content')).toContainText('δ(s, 1) = (q8, Y, L)');

    // Switch back to Grafo and confirm node q8 and new edge appear while s stays intact
    await page.locator('.tm-view-switch').getByRole('button', { name: 'Grafo' }).click();
    const graphNodeQ8 = page.locator('.react-flow__node-state', { hasText: 'q8' });
    await expect(graphNodeQ8).toBeVisible();
    await expect(page.getByRole('button', { name: 'Regla 1 → Y, L, de s a q8' })).toBeVisible();
    await expect(page.locator('.react-flow__node[data-id="s"]')).toBeVisible();

    // Zoom twice in Grafo and edit state q8 -> q9 from Graph view
    const zoomIn = page.locator('.react-flow__controls-zoomin');
    await zoomIn.click();
    await zoomIn.click();

    await graphNodeQ8.click();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nombre del estado').fill('q9');
    await page.getByRole('button', { name: 'Cerrar inspector' }).click();

    const savedTransform = await page.locator('.react-flow__viewport').evaluate((el) => (el as HTMLElement).style.transform);
    const savedParts = viewportTransformParts(savedTransform);

    // Verify q9 appears in Tabla, delete the custom rule, and verify return to default
    await page.locator('.tm-view-switch').getByRole('button', { name: 'Tabla' }).click();
    await expect(page.locator('.tm-table-state', { hasText: 'q9' })).toBeVisible();
    const ruleInTable = page.locator('.tm-table tbody tr').first().locator('td').nth(1).locator('[data-transition-id]');
    await expect(ruleInTable).toContainText('(q9, Y, L)');
    await ruleInTable.click();
    await dialog.getByRole('button', { name: 'Eliminar transición' }).click();
    await expect(page.locator('[data-tm-cell="s:1"]')).toContainText('(r, 1, R)');

    // Switch back to Grafo and assert pan/zoom viewport was preserved
    await page.locator('.tm-view-switch').getByRole('button', { name: 'Grafo' }).click();
    await expect(page.getByRole('button', { name: 'Regla 1 → Y, L, de s a q9' })).toHaveCount(0);
    await expect(async () => {
      const restoredTransform = await page.locator('.react-flow__viewport').evaluate((el) => (el as HTMLElement).style.transform);
      const restoredParts = viewportTransformParts(restoredTransform);
      expect(Math.abs(restoredParts.zoom - savedParts.zoom)).toBeLessThan(0.02);
      expect(Math.abs(restoredParts.x - savedParts.x)).toBeLessThan(2);
      expect(Math.abs(restoredParts.y - savedParts.y)).toBeLessThan(2);
    }).toPass();
  });

  test('sincroniza simulación continua, regla explícita y regla por defecto de Kozen entre vistas', async ({ page }) => {
    await openTuringLab(page);
    await openSimulation(page);

    // Case A: start in Grafo on input 0011, switch to Tabla mid-run, advance, switch back
    await page.locator('#input-word').fill('0011');
    const nextButton = page.getByRole('button', { name: 'Paso siguiente' });
    await nextButton.click(); // step 1: (s, ⊢) -> (q0, ⊢, R)
    await nextButton.click(); // step 2: (q0, 0) -> (q1, X, R)
    await expect(page.locator('.step-count')).toContainText('Paso 2');
    await expect(page.locator('.react-flow__node[data-id="q1"] .automaton-state')).toHaveClass(/is-active/);

    await page.locator('.tm-view-switch').getByRole('button', { name: 'Tabla' }).click();
    await expect(page.locator('.step-count')).toContainText('Paso 2');
    await expect(page.locator('.tape')).toBeVisible();
    await expect(page.locator('[data-state-id="q1"]')).toHaveClass(/is-active/);
    await expect(page.locator('[data-state-id="q1"] .tm-table-state__status')).toHaveText('Activo');
    const step2Rule = page.locator('.tm-table tbody tr').nth(1).locator('td').nth(0).locator('.tm-table-rule');
    await expect(step2Rule).toHaveClass(/is-active/);
    await expect(step2Rule).toContainText('en uso');

    await nextButton.click(); // step 3 in Tabla: δ(q1, 0) = (q1, 0, R)
    await expect(page.locator('.step-count')).toContainText('Paso 3');
    await expect(page.locator('[data-state-id="q1"]')).toHaveClass(/is-active/);

    await page.locator('.tm-view-switch').getByRole('button', { name: 'Grafo' }).click();
    await expect(page.locator('.step-count')).toContainText('Paso 3');
    await expect(page.locator('.react-flow__node[data-id="q1"] .automaton-state')).toHaveClass(/is-active/);

    // Case B: rejected input '1' activates Kozen's omitted default rule δ(q0, 1) = (r, 1, R)
    await page.locator('.tm-view-switch').getByRole('button', { name: 'Tabla' }).click();
    await page.locator('#input-word').fill('1');
    await nextButton.click(); // step 1: δ(s, ⊢) = (q0, ⊢, R)
    await nextButton.click(); // step 2: δ(q0, 1) = (r, 1, R) [omitted default]

    await expect(page.locator('.run-status')).toContainText('Rechazada');
    await expect(page.locator('[data-state-id="r"]')).toHaveClass(/is-active/);
    const defaultRule = page.locator('[data-tm-cell="q0:1"]');
    await expect(defaultRule).toHaveClass(/is-active/);
    await expect(defaultRule).toContainText('en uso');
  });

  test('soporta teclado, movimiento reducido y mantiene el diseño sin desbordamiento en escritorio, tablet y móvil', async ({ page }) => {
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 768, height: 900 },
      { width: 390, height: 667 },
    ]) {
      await page.setViewportSize(viewport);
      await openTuringLab(page);
      await page.locator('.tm-view-switch').getByRole('button', { name: 'Tabla' }).click();

      // Switch pill must not overlap navbar or toolbar, and page must not overflow horizontally
      const layoutCheck = await page.evaluate(() => {
        const nav = document.querySelector('.liquid-navbar-shell')?.getBoundingClientRect();
        const sw = document.querySelector('.tm-view-switch')?.getBoundingClientRect();
        const overlapY = nav && sw ? Math.min(nav.bottom, sw.bottom) - Math.max(nav.top, sw.top) : 0;
        const overlapX = nav && sw ? Math.min(nav.right, sw.right) - Math.max(nav.left, sw.left) : 0;
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          navSwOverlap: overlapX > 2 && overlapY > 2,
        };
      });
      expect(layoutCheck.scrollWidth).toBeLessThanOrEqual(layoutCheck.innerWidth);
      expect(layoutCheck.navSwOverlap).toBe(false);

      // Popup fits completely within .tm-table-editor bounds
      await page.locator('[data-state-id="s"]').click();
      const popup = page.getByRole('dialog', { name: 'Inspector del autómata' });
      await expect(popup).toBeVisible();
      const editorBox = await page.locator('.tm-table-editor').boundingBox();
      const popupBox = await popup.boundingBox();
      expect(editorBox).not.toBeNull();
      expect(popupBox).not.toBeNull();
      if (editorBox && popupBox) {
        expect(popupBox.x).toBeGreaterThanOrEqual(editorBox.x - 1);
        expect(popupBox.y).toBeGreaterThanOrEqual(editorBox.y - 1);
        expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(editorBox.x + editorBox.width + 1);
        expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(editorBox.y + editorBox.height + 1);
      }
    }

    // Keyboard & prefers-reduced-motion flow
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openTuringLab(page);
    const tableButton: Locator = page.locator('.tm-view-switch').getByRole('button', { name: 'Tabla' });
    await tableButton.focus();
    await page.keyboard.press('Enter');
    await expect(tableButton).toHaveAttribute('aria-pressed', 'true');

    const stateButton = page.locator('[data-state-id="s"]');
    await stateButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Inspector del autómata' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Inspector del autómata' })).toHaveCount(0);
  });
});
