import { useEffect, useRef } from 'react';

const CELL_SIZE = 16;
const HOVER_RADIUS = 115;
const BASE_RADIUS = 1.35;
const GROW_RADIUS = 1.45;
const BASE_ALPHA = 0.14;
const GROW_ALPHA = 0.68;

function distToSegmentSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 0.0001) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

export default function HoverDotsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvasRef.current;
    const context = surface?.getContext('2d');
    const parent = surface?.parentElement;
    if (!surface || !context || !parent) return;

    let width = parent.clientWidth || window.innerWidth;
    let height = parent.clientHeight || window.innerHeight;
    let columns = Math.ceil(width / CELL_SIZE);
    let rows = Math.ceil(height / CELL_SIZE);
    let intensities = new Float32Array(columns * rows);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = mediaQuery.matches;

    let cursorActive = false;
    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let frame = 0;
    let lastTime = 0;

    const renderFrame = (now: number) => {
      frame = 0;
      const dt = lastTime > 0 ? Math.min(48, Math.max(1, now - lastTime)) : 16;
      lastTime = now;

      const prevX = smoothX;
      const prevY = smoothY;
      if (cursorActive) {
        const follow = 1 - Math.exp(-dt * 0.035);
        smoothX += (targetX - smoothX) * follow;
        smoothY += (targetY - smoothY) * follow;
      }

      const decay = Math.exp(-dt * 0.0042);
      const attack = 1 - Math.exp(-dt * 0.028);
      const radiusSq = HOVER_RADIUS * HOVER_RADIUS;

      const minCol = cursorActive
        ? Math.max(0, Math.floor((Math.min(prevX, smoothX) - HOVER_RADIUS) / CELL_SIZE))
        : 0;
      const maxCol = cursorActive
        ? Math.min(columns - 1, Math.ceil((Math.max(prevX, smoothX) + HOVER_RADIUS) / CELL_SIZE))
        : -1;
      const minRow = cursorActive
        ? Math.max(0, Math.floor((Math.min(prevY, smoothY) - HOVER_RADIUS) / CELL_SIZE))
        : 0;
      const maxRow = cursorActive
        ? Math.min(rows - 1, Math.ceil((Math.max(prevY, smoothY) + HOVER_RADIUS) / CELL_SIZE))
        : -1;

      context.clearRect(0, 0, width, height);

      // Batch all resting dots into a single draw call for maximum frame rate stability
      context.beginPath();
      const activeCells: number[] = [];
      let hasActiveDots = false;

      for (let row = 0; row < rows; row++) {
        const y = (row + 0.5) * CELL_SIZE;
        const rowOffset = row * columns;
        const inRowRange = !reducedMotion && cursorActive && row >= minRow && row <= maxRow;

        for (let col = 0; col < columns; col++) {
          const idx = rowOffset + col;
          const x = (col + 0.5) * CELL_SIZE;
          let val = reducedMotion ? 0 : intensities[idx] * decay;

          if (inRowRange && col >= minCol && col <= maxCol) {
            const dSq = distToSegmentSq(x, y, prevX, prevY, smoothX, smoothY);
            if (dSq < radiusSq) {
              const dist = Math.sqrt(dSq);
              const u = 1 - dist / HOVER_RADIUS;
              const target = u * u * (3 - 2 * u);
              if (target > val) {
                val += (target - val) * attack;
              }
            }
          }

          if (val > 0.002) {
            intensities[idx] = val;
            activeCells.push(idx);
            hasActiveDots = true;
          } else {
            intensities[idx] = 0;
            context.moveTo(x + BASE_RADIUS, y);
            context.arc(x, y, BASE_RADIUS, 0, Math.PI * 2);
          }
        }
      }

      context.fillStyle = `rgba(106, 69, 184, ${BASE_ALPHA})`;
      context.fill();

      for (let i = 0; i < activeCells.length; i++) {
        const idx = activeCells[i];
        const val = intensities[idx];
        const row = Math.floor(idx / columns);
        const col = idx - row * columns;
        const x = (col + 0.5) * CELL_SIZE;
        const y = (row + 0.5) * CELL_SIZE;
        const r = BASE_RADIUS + val * GROW_RADIUS;
        const alpha = BASE_ALPHA + val * GROW_ALPHA;

        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fillStyle = `rgba(106, 69, 184, ${alpha.toFixed(3)})`;
        context.fill();
      }

      const activeState = !reducedMotion && (cursorActive || hasActiveDots);
      surface.dataset.hoverActive = activeState ? 'true' : 'false';

      if (activeState) {
        frame = requestAnimationFrame(renderFrame);
      } else {
        lastTime = 0;
      }
    };

    const scheduleFrame = () => {
      if (!frame) {
        frame = requestAnimationFrame(renderFrame);
      }
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth || window.innerWidth;
      height = parent.clientHeight || window.innerHeight;
      const nextCols = Math.ceil(width / CELL_SIZE);
      const nextRows = Math.ceil(height / CELL_SIZE);
      if (nextCols !== columns || nextRows !== rows) {
        columns = nextCols;
        rows = nextRows;
        intensities = new Float32Array(columns * rows);
      }
      surface.width = Math.ceil(width * ratio);
      surface.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderFrame(performance.now());
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const bounds = parent.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      if (!cursorActive) {
        smoothX = x;
        smoothY = y;
      }
      targetX = x;
      targetY = y;
      cursorActive = true;
      surface.dataset.hoverActive = 'true';
      scheduleFrame();
    };

    const onPointerLeave = () => {
      cursorActive = false;
      scheduleFrame();
    };

    const onMotionChange = () => {
      reducedMotion = mediaQuery.matches;
      if (reducedMotion) {
        cursorActive = false;
        intensities.fill(0);
        surface.dataset.hoverActive = 'false';
      }
      scheduleFrame();
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    parent.addEventListener('pointermove', onPointerMove, { passive: true });
    parent.addEventListener('pointerleave', onPointerLeave, { passive: true });
    mediaQuery.addEventListener('change', onMotionChange);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      parent.removeEventListener('pointermove', onPointerMove);
      parent.removeEventListener('pointerleave', onPointerLeave);
      mediaQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="landing-dots-canvas"
      data-hover-active="false"
      aria-hidden="true"
    />
  );
}
