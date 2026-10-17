import { useEffect, useRef } from 'react';

export type CanvasRipple = { id: number; x: number; y: number; startedAt: number };

const DURATION = 1800;
const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export default function CanvasRipples({ ripples, width, height, onExpire }: {
  ripples: CanvasRipple[];
  width: number;
  height: number;
  onExpire: (ids: number[]) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvas.current;
    const context = surface?.getContext('2d');
    if (!surface || !context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    surface.width = Math.ceil(width * ratio);
    surface.height = Math.ceil(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!ripples.length || !width || !height) return;
    // Rasterize the stable character grid once; animate only its small opacity mask.
    const texture = document.createElement('canvas');
    texture.width = surface.width;
    texture.height = surface.height;
    const text = texture.getContext('2d')!;
    text.setTransform(ratio, 0, 0, ratio, 0, 0);
    text.font = '9px Consolas, "Liberation Mono", monospace';
    text.textBaseline = 'middle';
    text.fillStyle = getComputedStyle(surface).color;
    const columns = Math.ceil(width / 7);
    const rows = Math.ceil(height / 12);
    const mask = document.createElement('canvas');
    mask.width = columns;
    mask.height = rows;
    const maskContext = mask.getContext('2d')!;
    const pixels = maskContext.createImageData(columns, rows);
    context.imageSmoothingEnabled = false;

    const cells: { x: number; y: number; intensity: number; warp: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = 1 + column * 7;
        const y = 6 + row * 12;
        const seed = (Math.imul(column + 1, 374761393) + Math.imul(row + 1, 668265263)) >>> 0;
        const hash = Math.imul(seed ^ (seed >>> 13), 1274126177) >>> 0;
        text.fillText(CHARACTERS[hash % CHARACTERS.length], x, y);
        cells.push({
          x, y,
          intensity: .65 + (hash % 100) / 285,
          warp: Math.sin(x * .013 + Math.sin(y * .01) * 2) * 32 + Math.sin(y * .019 + x * .004) * 24,
        });
      }
    }
    const band = Math.max(120, Math.min(width, height) * .28);
    const fields = ripples.map(ripple => ({
      ...ripple,
      reach: Math.hypot(Math.max(ripple.x, width - ripple.x), Math.max(ripple.y, height - ripple.y)),
      distances: cells.map(cell => Math.hypot(cell.x - ripple.x, cell.y - ripple.y) + cell.warp),
    }));
    let frame = 0;
    const draw = (now: number) => {
      const expired = fields.filter(ripple => now - ripple.startedAt >= DURATION);
      const active = fields.filter(ripple => now - ripple.startedAt < DURATION).map(ripple => {
        const elapsed = Math.max(0, now - ripple.startedAt);
        return {
          distances: ripple.distances,
          radius: elapsed / DURATION * (ripple.reach + band * 2),
          opacity: Math.min(1, elapsed / 100) * Math.min(1, (DURATION - elapsed) / 600),
        };
      });
      context.clearRect(0, 0, width, height);
      for (let index = 0; index < cells.length && active.length; index++) {
        const cell = cells[index];
        let opacity = 0;
        for (const ripple of active) {
          const distance = ripple.distances[index] - ripple.radius;
          if (Math.abs(distance) > band * 2.5) continue;
          const envelope = Math.exp(-((distance / band) ** 2));
          const crest = (.5 + .5 * Math.cos(distance / 29)) ** 2;
          opacity += envelope * (.18 + .82 * crest) * ripple.opacity;
        }
        pixels.data[index * 4 + 3] = opacity < .03 ? 0 : Math.min(.42, opacity * .42 * cell.intensity) * 255;
      }
      if (active.length) {
        maskContext.putImageData(pixels, 0, 0);
        context.drawImage(texture, 0, 0, width, height);
        context.globalCompositeOperation = 'destination-in';
        context.drawImage(mask, 0, 0, columns * 7, rows * 12);
        context.globalCompositeOperation = 'source-over';
      }
      if (expired.length) onExpire(expired.map(ripple => ripple.id));
      if (active.length) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
  }, [ripples, width, height, onExpire]);

  return <canvas ref={canvas} className="canvas-ripples" data-ripples={ripples.length} aria-hidden="true" />;
}
