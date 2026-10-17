import { expect, test } from '@playwright/test';

test('los autolazos reinician solo sus capas decorativas y conservan controles, selección y foco', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('000');
  const graph = page.locator('.graph-editor');
  const state = graph.locator('.react-flow__node[data-id="q0"]');
  await state.click();
  const name = page.getByLabel('Nombre del estado', { exact: true });
  await name.focus();
  const stateNode = await state.elementHandle();
  const edgeNode = await graph.locator('.react-flow__edge[data-id="transition-d0"]').elementHandle();
  const nameInput = await name.elementHandle();
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  const nextButton = await next.elementHandle();
  let previousStatePulse = await graph.locator('.automaton-state__pulse').elementHandle();
  let previousEdgePulse = null;

  for (let step = 1; step <= 3; step++) {
    // Click without moving focus, so a remounted inspector field cannot hide behind button focus.
    await next.evaluate(button => button.click());
    await expect(graph.locator('.automaton-state__pulse')).toHaveAttribute('data-step', String(step));
    await expect(graph.locator('.automaton-transition__pulse')).toHaveAttribute('data-step', String(step));
    expect(await previousStatePulse!.evaluate(node => node.isConnected)).toBe(false);
    if (previousEdgePulse) expect(await previousEdgePulse.evaluate(node => node.isConnected)).toBe(false);
    expect(await stateNode!.evaluate(node => node.isConnected)).toBe(true);
    expect(await edgeNode!.evaluate(node => node.isConnected)).toBe(true);
    expect(await nextButton!.evaluate(node => node.isConnected)).toBe(true);
    expect(await nameInput!.evaluate(node => node.isConnected && node === document.activeElement)).toBe(true);
    await expect(state).toHaveClass(/selected/);
    await expect(name).toHaveValue('q0');
    previousStatePulse = await graph.locator('.automaton-state__pulse').elementHandle();
    previousEdgePulse = await graph.locator('.automaton-transition__pulse').elementHandle();
  }

  await expect(graph.locator('.automaton-state__pulse')).toHaveCount(1);
  await expect(graph.locator('.automaton-transition__pulse')).toHaveCount(1);
  await expect(page.locator('.run-status')).toHaveText('Aceptada');
});

test('AFN muestra juntas las reglas y los estados del mismo paso', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^AFN / }).click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('00');
  const graph = page.locator('.graph-editor');
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });

  for (let step = 1; step <= 2; step++) {
    await next.click();
    await expect(page.locator('.state-chips .state-chip')).toHaveText(['q0', 'q1']);
    await expect(graph.locator('.automaton-state.is-active')).toHaveCount(2);
    await expect(graph.locator('.automaton-transition__pulse')).toHaveCount(2);
    await expect(graph.locator('.automaton-transition__label.is-active')).toHaveCount(2);
    await expect(graph.locator('.automaton-state__pulse')).toHaveCount(2);
    expect(await graph.locator('.automaton-state__pulse, .automaton-transition__pulse')
      .evaluateAll(elements => elements.map(element => element.getAttribute('data-step')))).toEqual(Array(4).fill(String(step)));
  }
});

test('la pila permite inspeccionar ambas ramas sin cambiar el cálculo ni remontar el selector', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByRole('button', { name: /^Pila / }).click();
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  const branches = page.getByRole('combobox', { name: 'Rama a inspeccionar', exact: true });
  await expect(branches.locator('option')).toHaveCount(2);
  await expect(page.locator('.automaton-transition__pulse')).toHaveCount(2);
  await expect(page.locator('.stack-view > code')).toHaveText('A⊥');
  const branchSelect = await branches.elementHandle();
  const pulse = await page.locator('.react-flow__node[data-id="p"] .automaton-state__pulse').elementHandle();

  await branches.selectOption('1');
  await expect(page.locator('.stack-view > code')).toHaveText('⊥');
  await expect(page.locator('.step-count strong')).toHaveText('1');
  expect(await branchSelect!.evaluate(node => node.isConnected)).toBe(true);
  expect(await pulse!.evaluate(node => node.isConnected)).toBe(true);
  await branches.selectOption('0');
  await expect(page.locator('.stack-view > code')).toHaveText('A⊥');
});

test('retroceder, consultar el historial y reiniciar restauran la configuración sin bloquear controles', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('010');
  const next = page.getByRole('button', { name: 'Paso siguiente', exact: true });
  for (let step = 0; step < 3; step++) await next.click();
  await page.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(page.locator('.step-count strong')).toHaveText('2');
  await expect(page.locator('.configuration-panel .state-chip')).toHaveText('q1');
  await expect(page.locator('.symbol-cell.consumed')).toHaveCount(2);
  await expect(next).toBeEnabled();

  await page.locator('.history summary').click();
  await page.locator('.history button').filter({ has: page.getByText('Paso 1', { exact: true }) }).click();
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await expect(page.locator('.configuration-panel .state-chip')).toHaveText('q0');
  await expect(page.locator('.symbol-cell.consumed')).toHaveCount(1);
  await expect(page.locator('.automaton-transition__pulse')).toHaveCount(1);
  await expect(page.locator('.automaton-transition__pulse')).toHaveAttribute('data-step', '1');

  await page.getByRole('button', { name: 'Reiniciar', exact: true }).click();
  await expect(page.locator('.step-count strong')).toHaveText('0');
  await expect(page.locator('.symbol-cell.consumed')).toHaveCount(0);
  await expect(page.locator('.history')).toHaveCount(0);
  await expect(page.locator('.automaton-transition__pulse')).toHaveCount(0);
  await expect(page.locator('.automaton-state__pulse')).toHaveCount(1);
  await expect(next).toBeEnabled();
});

test('la reproducción rápida se pausa y cambia de modelo sin dejar temporizadores de avance', async ({ page }) => {
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('000000');
  await page.getByLabel('Velocidad', { exact: true }).selectOption('300');
  await page.clock.install({ time: new Date('2026-10-16T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-16T00:01:00Z'));
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await expect(page.locator('.automaton-transition__pulse')).toHaveAttribute('data-step', '1');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.clock.runFor(900);
  await expect(page.locator('.step-count strong')).toHaveText('1');
  await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.locator('.step-count strong')).toHaveText('2');
  await expect(page.locator('.automaton-transition__pulse')).toHaveAttribute('data-step', '2');

  await page.getByRole('button', { name: /^AFN / }).click();
  await page.clock.runFor(900);
  await expect(page.locator('.model-nav')).toHaveAttribute('data-model', 'nfa');
  await expect(page.locator('.step-count strong')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
  await expect(page.locator('.automaton-transition__pulse')).toHaveCount(1);
  await expect(page.locator('.automaton-transition__pulse')).toHaveAttribute('data-step', '0');
  await expect(page.locator('.state-chips .state-chip')).toHaveText(['s', 'q0']);
});

test('el movimiento reducido funciona al cargar y al cambiar la preferencia, conservando las señales activas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.getByLabel('Cadena de entrada', { exact: true }).fill('000');
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  const statePulse = page.locator('.automaton-state__pulse');
  const edgePulse = page.locator('.automaton-transition__pulse');
  const nav = page.locator('.model-nav');

  for (const pulse of [statePulse, edgePulse]) {
    await expect(pulse).toHaveCSS('animation-name', 'none');
    await expect(pulse).toHaveCSS('pointer-events', 'none');
    await expect(pulse).toHaveAttribute('aria-hidden', 'true');
  }
  expect(await nav.evaluate(element => getComputedStyle(element, '::before').transitionDuration)).toBe('0s');
  await expect(page.locator('.automaton-state.is-active')).toHaveCount(1);
  await expect(page.locator('.automaton-state__status')).toHaveText('Activo');
  await expect(page.locator('.automaton-transition__label.is-active')).toHaveCount(1);
  await expect(page.locator('.configuration-value')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.symbol-cell').first()).toHaveCSS('transition-duration', '0s');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(statePulse).not.toHaveCSS('animation-name', 'none');
  await expect(edgePulse).not.toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Paso siguiente', exact: true }).click();
  await expect(edgePulse).toHaveAttribute('data-step', '2');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(statePulse).toHaveCSS('animation-name', 'none');
  await expect(edgePulse).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.automaton-state.is-active')).toHaveCount(1);
  await expect(page.locator('.automaton-transition.is-active')).toHaveCount(1);
  await expect(page.locator('.configuration-value')).toHaveCSS('animation-name', 'none');
  const before = await nav.evaluate(element => getComputedStyle(element, '::before').transform);
  await page.getByRole('button', { name: /^AFN / }).click();
  expect(await nav.evaluate(element => getComputedStyle(element, '::before').transform)).not.toBe(before);
  expect(await nav.evaluate(element => getComputedStyle(element, '::before').transitionDuration)).toBe('0s');
});

test('el inspector conserva el campo al escribir y cancela su aparición al reducir el movimiento', async ({ page }) => {
  await page.addInitScript(() => {
    const recorder = window as typeof window & { inspectorAnimations: Animation[] };
    recorder.inspectorAnimations = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this.classList.contains('inspector-body')) {
        animation.pause();
        recorder.inspectorAnimations.push(animation);
      }
      return animation;
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await page.locator('#simulation-toggle').click();
  await page.locator('.react-flow__node[data-id="q0"]').click();
  const name = page.getByLabel('Nombre del estado', { exact: true });
  await name.fill('memoria');
  const field = await name.elementHandle();
  await name.pressSequentially('0');
  expect(await field!.evaluate(element => element.isConnected && element === document.activeElement)).toBe(true);
  await expect(name).toHaveValue('memoria0');
  expect(await page.evaluate(() => (window as typeof window & { inspectorAnimations: Animation[] }).inspectorAnimations.length)).toBe(0);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('.react-flow__node[data-id="q1"]').click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { inspectorAnimations: Animation[] }).inspectorAnimations.length)).toBe(1);
  await expect(page.getByRole('heading', { name: 'Estado q1', exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => (window as typeof window & { inspectorAnimations: Animation[] }).inspectorAnimations[0].playState)).toBe('idle');
  await page.locator('.react-flow__node[data-id="q0"]').click();
  await expect(name).toHaveValue('memoria0');
  expect(await page.evaluate(() => (window as typeof window & { inspectorAnimations: Animation[] }).inspectorAnimations.length)).toBe(1);
});
