import { useEffect, useState } from 'react';
import type { MachineKind } from '../domain';
import { MODEL_SHORT } from '../format';
import RandomLetterSwap from './RandomLetterSwap';

const KINDS: MachineKind[] = ['dfa', 'nfa', 'pda', 'tm'];
const MODEL_DESCRIPTIONS: Record<MachineKind, string> = {
  dfa: 'Un símbolo, un camino.',
  nfa: 'Varios caminos, una posibilidad.',
  pda: 'Una memoria en forma de pila.',
  tm: 'Lee, escribe y vuelve atrás.',
};

export default function LiquidGlassNavbar({
  kind,
  onSelectModel,
  onGoHome,
}: {
  kind: MachineKind;
  onSelectModel: (kind: MachineKind) => void;
  onGoHome: () => void;
}) {
  const [homeSeed, setHomeSeed] = useState(0);
  const [seeds, setSeeds] = useState<Record<MachineKind, number>>({
    dfa: 0,
    nfa: 0,
    pda: 0,
    tm: 0,
  });
  const [swappingKey, setSwappingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!swappingKey) return;
    const timer = window.setTimeout(() => setSwappingKey(null), 380);
    return () => window.clearTimeout(timer);
  }, [swappingKey]);

  return (
    <div className="liquid-navbar-shell" role="banner">
      <svg width="0" height="0" className="liquid-svg-defs" aria-hidden="true">
        <defs>
          <filter id="nimbus-refract" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.04" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div className="nimbus-glass" aria-hidden="true" />

      <a
        className="liquid-home-btn"
        href={import.meta.env.BASE_URL}
        aria-label="Inicio"
        onClick={(event) => {
          event.preventDefault();
          setHomeSeed((s) => s + 1);
          setSwappingKey('home');
          onGoHome();
        }}
        onPointerEnter={() => setHomeSeed((s) => s + 1)}
      >
        <svg className="liquid-nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <RandomLetterSwap label="Inicio" seed={homeSeed} swapping={swappingKey === 'home'} />
      </a>

      <span className="liquid-nav-divider" aria-hidden="true" />

      <nav className="model-nav nimbus-nav" data-model={kind} data-tone="light" aria-label="Tipo de autómata">
        {KINDS.map((item) => (
          <button
            key={item}
            type="button"
            className={`nimbus-item${item === kind ? ' active' : ''}`}
            aria-current={item === kind ? 'page' : undefined}
            onClick={() => {
              setSeeds((prev) => ({ ...prev, [item]: prev[item] + 1 }));
              setSwappingKey(item);
              onSelectModel(item);
            }}
            onPointerEnter={() => setSeeds((prev) => ({ ...prev, [item]: prev[item] + 1 }))}
          >
            <span className="model-abbr">
              <RandomLetterSwap
                label={MODEL_SHORT[item]}
                seed={seeds[item]}
                swapping={swappingKey === item}
              />
            </span>
            <span className="sr-only model-description"> {MODEL_DESCRIPTIONS[item]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
