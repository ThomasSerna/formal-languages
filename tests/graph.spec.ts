import { expect, test } from '@playwright/test';

test('el grafo conserva la selección, permite mover con teclado y dibuja autolazos y recíprocas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  const graph = page.locator('.graph-editor');
  await expect(graph.locator('.react-flow__node')).toHaveCount(2);
  await expect(graph.locator('.react-flow__edge')).toHaveCount(4);
  await expect(graph.locator('.automaton-state__initial')).toHaveCount(1);
  await expect(graph.locator('.automaton-state.is-accepting')).toHaveCount(1);

  const state = graph.locator('.react-flow__node[data-id="q0"]');
  await state.click();
  await expect(page.getByRole('heading', { name: 'Estado q0', exact: true })).toBeVisible();
  const position = await state.getAttribute('style');
  await state.press('ArrowRight');
  await expect.poll(() => state.getAttribute('style')).not.toBe(position);
  await expect(page.getByRole('heading', { name: 'Estado q0', exact: true })).toBeVisible();

  const paths = await graph.locator('.automaton-transition').evaluateAll((elements) => elements.map((element) => element.getAttribute('d') ?? ''));
  expect(paths.filter((path) => path.includes(' C '))).toHaveLength(2);
  const reciprocalPaths = paths.filter((path) => path.includes(' Q '));
  expect(reciprocalPaths).toHaveLength(2);
  expect(reciprocalPaths[0]).not.toBe(reciprocalPaths[1]);
  expect(paths.every((path) => path.length > 0 && !path.includes('NaN'))).toBe(true);
  expect(errors).toEqual([]);
});

test('cada regla agrupada se selecciona por separado y los puntos crean una conexión', async ({ page }) => {
  await page.goto('./');
  await page.locator('.model-nav button').nth(1).click();
  const graph = page.locator('.graph-editor');
  await expect(graph.locator('.react-flow__node')).toHaveCount(4);

  const group = graph.locator('.automaton-transition__labels')
    .filter({ has: page.getByRole('button', { name: 'Regla 0', exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Regla 1', exact: true }) });
  await expect(group).toHaveCount(1);
  await group.getByRole('button', { name: 'Regla 1', exact: true }).click();
  await expect(group.getByRole('button', { name: 'Regla 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Editar transición', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Lee', exact: true })).toHaveValue('1');

  const source = graph.locator('.react-flow__node[data-id="s"] .react-flow__handle[data-handleid="out"]');
  const target = graph.locator('.react-flow__node[data-id="q2"] .react-flow__handle[data-handleid="in"]');
  await source.click();
  await target.click();
  await expect(page.getByRole('heading', { name: 'Una nueva conexión', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Origen', exact: true })).toHaveValue('s');
  await expect(page.getByRole('combobox', { name: 'Destino', exact: true })).toHaveValue('q2');
  await page.getByRole('button', { name: 'Crear transición', exact: true }).click();
  await expect(graph.locator('.react-flow__edge')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'Editar transición', exact: true })).toBeVisible();

  await source.dragTo(target);
  await expect(page.getByRole('heading', { name: 'Una nueva conexión', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Origen', exact: true })).toHaveValue('s');
  await expect(page.getByRole('combobox', { name: 'Destino', exact: true })).toHaveValue('q2');
});
