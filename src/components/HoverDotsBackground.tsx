import { useEffect, useRef } from 'react';

export type HoverPoint = { x: number; y: number; startedAt: number };

const CELL_SIZE = 16;
const HOVER_DURATION = 650;
const HOVER_RADIUS = 110;

export default function HoverDotsBackground({
  points,
  activeCursor,
  onExpire,
}: {
  points: HoverPoint[];
  activeCursor: { x: number; y: number } | null;
  onExpire: (cutoff: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvasRef.current;
    const context = surface?.getContext('2d');
    if (!surface || !context) return;

    const parent = surface.parentElement;
    if (!parent) return;

    let width = parent.clientWidth || window.innerWidth;
    let height = parent.clientHeight || window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = parent.clientWidth || window.innerWidth;
      height = parent.clientHeight || window.innerHeight;
      surface.width = Math.ceil(width * ratio);
      surface.height = Math.ceil(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      const columns = Math.ceil(width / CELL_SIZE);
      const rows = Math.ceil(height / CELL_SIZE);

      const activePoints = reducedMotion
        ? []
        : points.filter((point) => now - point.startedAt < HOVER_DURATION);

      for (let row = 0; row < rows; row++) {
        const y = (row + 0.5) * CELL_SIZE;
        for (let col = 0; col < columns; col++) {
          const x = (col + 0.5) * CELL_SIZE;
          let intensity = 0;

          if (!reducedMotion && activeCursor) {
            const dist = Math.hypot(x - activeCursor.x, y - activeCursor.y);
            if (dist < HOVER_RADIUS) {
              intensity = Math.max(intensity, Math.exp(-((dist / 48) ** 2)));
            }
          }

          for (const point of activePoints) {
            const dist = Math.hypot(x - point.x, y - point.y);
            if (dist > HOVER_RADIUS) continue;
            const elapsed = Math.max(0, now - point.startedAt);
            const fade = Math.max(0, 1 - elapsed / HOVER_DURATION);
            const spatial = Math.exp(-((dist / 46) ** 2));
            intensity = Math.max(intensity, spatial * fade);
          }

          context.beginPath();
          if (intensity > 0.04) {
            const radius = 1.45 + intensity * 1.35;
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fillStyle = `rgba(106, 69, 184, ${(0.18 + intensity * 0.68).toFixed(3)})`;
            context.fill();
          } else {
            context.arc(x, y, 1.35, 0, Math.PI * 2);
            context.fillStyle = 'rgba(106, 69, 184, 0.14)';
            context.fill();
          }
        }
      }

      if (!reducedMotion && points.some((point) => now - point.startedAt >= HOVER_DURATION)) {
        onExpire(now - HOVER_DURATION);
      }

      if (!reducedMotion && (activePoints.length > 0 || activeCursor !== null)) {
        frame = requestAnimationFrame(draw);
      }
    };

    draw(performance.now());

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [points, activeCursor, onExpire]);

  const hasActivity = points.length > 0 || activeCursor !== null;

  return (
    <canvas
      ref={canvasRef}
      className="landing-dots-canvas"
      data-hover-active={hasActivity ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
}
