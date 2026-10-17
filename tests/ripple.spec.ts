import { expect, test, type Locator, type Page } from '@playwright/test';

async function pauseClock(page: Page) {
  await page.clock.install({ time: new Date('2026-10-16T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-16T12:00:01Z'));
}

async function paintedPixels(layer: Locator) {
  return layer.evaluate((canvas: HTMLCanvasElement) => {
    const { data, width } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    const ratio = canvas.width / canvas.getBoundingClientRect().width;
    let count = 0;
    let maxDistance = 0;
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] <= 8) continue;
      count++;
      const pixel = (index - 3) / 4;
      maxDistance = Math.max(maxDistance, Math.hypot((pixel % width) / ratio - 20, Math.floor(pixel / width) / ratio - 20));
    }
    return { count, maxDistance };
  });
}

test('pulsar y arrastrar el fondo crea ondas fijas sin bloquear el paneo', async ({ page }) => {
  await page.goto('');
  await pauseClock(page);
  const canvas = page.locator('.graph-canvas');
  const pane = canvas.locator('.react-flow__pane');
  const waves = canvas.locator('canvas.canvas-ripples');
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveAttribute('data-ripples', '1');
  await expect(waves).toHaveCSS('pointer-events', 'none');
  await expect(waves).toHaveAttribute('aria-hidden', 'true');
  expect(await waves.evaluate(layer => layer.closest('.react-flow__viewport'))).toBeNull();
  const layerBounds = await waves.boundingBox();
  const before = await canvas.locator('.react-flow__viewport').getAttribute('style');
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + 45, bounds.y + 45);
  await page.mouse.down();
  await expect(waves).toHaveAttribute('data-ripples', '2');
  await page.mouse.move(bounds.x + 105, bounds.y + 85, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => canvas.locator('.react-flow__viewport').getAttribute('style')).not.toBe(before);
  expect(await waves.boundingBox()).toEqual(layerBounds);
  for (let index = 0; index < 5; index++) await pane.click({ position: { x: 20 + index * 10, y: 20 } });
  await expect(waves).toHaveAttribute('data-ripples', '4');
  await page.clock.runFor(1820);
  await expect(waves).toHaveAttribute('data-ripples', '0');
  expect((await paintedPixels(waves)).count).toBe(0);
});

test('los elementos del autómata, controles y otros punteros no producen ondas', async ({ page }) => {
  await page.goto('');
  await pauseClock(page);
  const canvas = page.locator('.graph-canvas');
  const waves = canvas.locator('.canvas-ripples');
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
  await expect(waves).toHaveAttribute('data-ripples', '0');
  await pane.click({ position: { x: 20, y: 20 } });
  await page.clock.runFor(160);
  const picture = await waves.evaluate((layer: HTMLCanvasElement) => layer.toDataURL());
  await canvas.getByRole('button', { name: 'Alejar el grafo', exact: true }).click();
  await expect(waves).toHaveAttribute('data-ripples', '1');
  expect(await waves.evaluate((layer: HTMLCanvasElement) => layer.toDataURL())).toBe(picture);
});

test('las ondas se limpian y respetan cambios de movimiento reducido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('');
  await pauseClock(page);
  const pane = page.locator('.react-flow__pane');
  const waves = page.locator('.canvas-ripples');
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveAttribute('data-ripples', '0');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveAttribute('data-ripples', '1');
  await page.clock.runFor(1820);
  await expect(waves).toHaveAttribute('data-ripples', '0');
  await pane.click({ position: { x: 20, y: 20 } });
  await page.clock.runFor(160);
  expect((await paintedPixels(waves)).count).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(waves).toHaveAttribute('data-ripples', '0');
  expect((await paintedPixels(waves)).count).toBe(0);
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(waves).toHaveAttribute('data-ripples', '0');
});

for (const [width, height] of [[1366, 768], [390, 667]]) {
  test(`la textura se expande y desaparece a ${width}×${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('');
    await pauseClock(page);
    const layer = page.locator('canvas.canvas-ripples');
    await page.locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
    await page.clock.runFor(120);
    const start = await paintedPixels(layer);
    expect(start.count).toBeGreaterThan(100);
    await page.screenshot({ path: testInfo.outputPath('onda-120ms.png') });
    await page.clock.runFor(480);
    const expanded = await paintedPixels(layer);
    expect(expanded.maxDistance).toBeGreaterThan(start.maxDistance + 80);
    await page.screenshot({ path: testInfo.outputPath('onda-600ms.png') });
    await page.clock.runFor(700);
    await page.screenshot({ path: testInfo.outputPath('onda-1300ms.png') });
    await page.clock.runFor(520);
    await expect(layer).toHaveAttribute('data-ripples', '0');
    expect((await paintedPixels(layer)).count).toBe(0);
    const blank = await layer.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    await page.clock.runFor(600);
    expect(await layer.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(blank);
  });
}

test('el canvas se adapta al tamaño y termina cada onda sin borrar las siguientes', async ({ page }) => {
  await page.goto('');
  await pauseClock(page);
  const pane = page.locator('.react-flow__pane');
  const layer = page.locator('canvas.canvas-ripples');
  await pane.click({ position: { x: 20, y: 20 } });
  await page.clock.runFor(1000);
  await pane.click({ position: { x: 20, y: 20 } });
  await expect(layer).toHaveAttribute('data-ripples', '2');
  await page.setViewportSize({ width: 390, height: 667 });
  await page.clock.runFor(32);
  await expect.poll(() => layer.evaluate((canvas: HTMLCanvasElement) => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    return canvas.width === Math.ceil(bounds.width * ratio) && canvas.height === Math.ceil(bounds.height * ratio);
  })).toBe(true);
  await page.clock.runFor(800);
  await expect(layer).toHaveAttribute('data-ripples', '1');
  expect((await paintedPixels(layer)).count).toBeGreaterThan(0);
  await page.clock.runFor(1000);
  await expect(layer).toHaveAttribute('data-ripples', '0');
  expect((await paintedPixels(layer)).count).toBe(0);
});
