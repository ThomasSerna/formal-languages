import { useState } from 'react';
import type { MachineKind } from '../domain';
import { MODEL_NAMES, MODEL_SHORT } from '../format';
import HoverDotsBackground from './HoverDotsBackground';
import LiquidGlassNavbar from './LiquidGlassNavbar';

const KINDS: MachineKind[] = ['dfa', 'nfa', 'pda', 'tm'];
const MODEL_DESCRIPTIONS: Record<MachineKind, string> = {
  dfa: 'Un símbolo, un camino.',
  nfa: 'Varios caminos, una posibilidad.',
  pda: 'Una memoria en forma de pila.',
  tm: 'Lee, escribe y vuelve atrás.',
};

export default function LandingHero({
  kind,
  onEnterLab,
  onGoHome,
}: {
  kind: MachineKind;
  onEnterLab: (kind?: MachineKind) => void;
  onGoHome: () => void;
}) {
  const [modelsOpen, setModelsOpen] = useState(false);

  return (
    <section
      className="landing-screen"
      aria-label="Presentación del laboratorio de autómatas"
    >
      <LiquidGlassNavbar
        kind={kind}
        activeView="landing"
        onSelectModel={(selected) => onEnterLab(selected)}
        onGoHome={onGoHome}
      />
      <HoverDotsBackground />
      <div className="landing-ambient" aria-hidden="true" />

      <div className="landing-content">
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
