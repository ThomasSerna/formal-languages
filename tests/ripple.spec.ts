import { expect, test } from '@playwright/test';

test('pulsar y arrastrar el fondo crea ondas fijas sin bloquear el paneo', async ({ page }) => {
  await page.goto('');
  await page.addStyleTag({ content: '.canvas-ripple { animation-play-state: paused !important; }' });
  const canvas = page.locator('.graph-canvas');
  const pane = canvas.locator('.react-flow__pane');
  const waves = canvas.locator('.canvas-ripple');
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveCount(1);
  await expect(waves.first()).toHaveCSS('left', '20px');
  await expect(waves.first()).toHaveCSS('top', '20px');
  await expect(canvas.locator('.canvas-ripples')).toHaveCSS('pointer-events', 'none');
  await expect(canvas.locator('.canvas-ripples')).toHaveAttribute('aria-hidden', 'true');
  const before = await canvas.locator('.react-flow__viewport').getAttribute('style');
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + 45, bounds.y + 45);
  await page.mouse.down();
  await expect(waves).toHaveCount(2);
  await page.mouse.move(bounds.x + 105, bounds.y + 85, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => canvas.locator('.react-flow__viewport').getAttribute('style')).not.toBe(before);
  await expect(waves.first()).toHaveCSS('left', '20px');
  await expect(waves.first()).toHaveCSS('top', '20px');
  for (let index = 0; index < 5; index++) await pane.click({ position: { x: 20 + index * 10, y: 20 } });
  await expect(waves).toHaveCount(4);
  await waves.evaluateAll(elements => elements.forEach(element => element.getAnimations().forEach(animation => animation.finish())));
  await expect(waves).toHaveCount(0);
});

test('los elementos del autómata, controles y otros punteros no producen ondas', async ({ page }) => {
  await page.goto('');
  await page.addStyleTag({ content: '.canvas-ripple { animation-play-state: paused !important; }' });
  const canvas = page.locator('.graph-canvas');
  const waves = canvas.locator('.canvas-ripple');
  await canvas.locator('.react-flow__node').first().click();
  await page.getByLabel('Nombre del estado', { exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar inspector', exact: true }).click();
  await canvas.locator('.automaton-transition__label').first().click();
  await page.keyboard.press('Escape');
  for (const selector of ['.react-flow__handle', '.react-flow__edge-interaction']) {
    await canvas.locator(selector).first().dispatchEvent('pointerdown', { isPrimary: true, button: 0 });
  }
  await canvas.getByRole('button', { name: 'Acercar el grafo', exact: true }).click();
  const pane = canvas.locator('.react-flow__pane');
  await pane.dispatchEvent('pointerdown', { isPrimary: true, button: 2 });
  await pane.dispatchEvent('pointerdown', { isPrimary: false, button: 0, pointerType: 'touch' });
  await expect(waves).toHaveCount(0);
});

test('las ondas se limpian y respetan cambios de movimiento reducido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  const pane = page.locator('.react-flow__pane');
  const waves = page.locator('.canvas-ripple');
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveCount(1);
  await expect(waves).toHaveCount(0);
  await page.addStyleTag({ content: '.canvas-ripple { animation-play-state: paused !important; }' });
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(waves).toHaveCount(0);
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveCount(0);
});
