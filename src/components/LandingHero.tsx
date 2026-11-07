import { useCallback, useEffect, useState } from 'react';
import type { MachineKind } from '../domain';
import { MODEL_NAMES, MODEL_SHORT } from '../format';
import HoverDotsBackground, { type HoverPoint } from './HoverDotsBackground';

const KINDS: MachineKind[] = ['dfa', 'nfa', 'pda', 'tm'];
const MODEL_DESCRIPTIONS: Record<MachineKind, string> = {
  dfa: 'Un símbolo, un camino.',
  nfa: 'Varios caminos, una posibilidad.',
  pda: 'Una memoria en forma de pila.',
  tm: 'Lee, escribe y vuelve atrás.',
};

export default function LandingHero({
  onEnterLab,
}: {
  onEnterLab: (kind?: MachineKind) => void;
}) {
  const [points, setPoints] = useState<HoverPoint[]>([]);
  const [activeCursor, setActiveCursor] = useState<{ x: number; y: number } | null>(null);
  const [modelsOpen, setModelsOpen] = useState(false);

  const expirePoints = useCallback((cutoff: number) => {
    setPoints((current) => current.filter((point) => point.startedAt > cutoff));
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clearHover = () => {
      if (preference.matches) {
        setPoints([]);
        setActiveCursor(null);
      }
    };
    preference.addEventListener('change', clearHover);
    return () => preference.removeEventListener('change', clearHover);
  }, []);

  return (
    <section
      className="landing-screen"
      aria-label="Presentación del laboratorio de autómatas"
      onPointerMove={(event) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const now = performance.now();
        setActiveCursor({ x, y });
        setPoints((current) => {
          const last = current[current.length - 1];
          if (last && Math.hypot(x - last.x, y - last.y) < 10 && now - last.startedAt < 28) {
            return current;
          }
          return [...current.slice(-20), { x, y, startedAt: now }];
        });
      }}
      onPointerLeave={() => setActiveCursor(null)}
    >
      <HoverDotsBackground points={points} activeCursor={activeCursor} onExpire={expirePoints} />
      <div className="landing-ambient" aria-hidden="true" />

      <div className="landing-content">
        <div className="landing-badge">
          <span>Laboratorio interactivo · Lenguajes formales</span>
          <button
            type="button"
            className="landing-badge__action"
            onClick={() => setModelsOpen((open) => !open)}
          >
            <span>Ver modelos</span>
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden="true">
              <path
                d="M3.959 9.5h11.083m0 0L9.501 3.958M15.042 9.5l-5.541 5.54"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <h1 className="landing-title">Construye y ejecuta autómatas paso a paso</h1>

        <p className="landing-subtitle">
          Define estados y reglas de transición, simula cadenas símbolo a símbolo y comprueba lenguajes formales sobre un lienzo interactivo basado en Kozen.
        </p>

        <div className="landing-actions">
          <button
            type="button"
            className="landing-btn-primary"
            onClick={() => onEnterLab()}
          >
            Abrir laboratorio
          </button>
          <button
            type="button"
            className="landing-btn-secondary"
            aria-expanded={modelsOpen}
            aria-controls="landing-models-grid"
            onClick={() => setModelsOpen((open) => !open)}
          >
            <span>Explorar modelos</span>
            <svg width="6" height="8" viewBox="0 0 6 8" fill="none" aria-hidden="true">
              <path
                d="M1.25.5 4.75 4l-3.5 3.5"
                stroke="currentColor"
                strokeOpacity=".5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div
          id="landing-models-grid"
          className="landing-models"
          hidden={!modelsOpen}
          role="region"
          aria-label="Modelos disponibles"
        >
          {KINDS.map((item) => (
            <button
              key={item}
              type="button"
              className="landing-model-card"
              onClick={() => onEnterLab(item)}
            >
              <span className="landing-model-card__abbr">{MODEL_SHORT[item]}</span>
              <strong className="landing-model-card__name">{MODEL_NAMES[item]}</strong>
              <span className="landing-model-card__desc">{MODEL_DESCRIPTIONS[item]}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
