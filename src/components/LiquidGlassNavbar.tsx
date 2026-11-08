import type { MachineKind } from '../domain';
import { MODEL_SHORT } from '../format';

const KINDS: MachineKind[] = ['dfa', 'nfa', 'pda', 'tm'];
const MODEL_DESCRIPTIONS: Record<MachineKind, string> = {
  dfa: 'Un símbolo, un camino.',
  nfa: 'Varios caminos, una posibilidad.',
  pda: 'Una memoria en forma de pila.',
  tm: 'Lee, escribe y vuelve atrás.',
};

export default function LiquidGlassNavbar({
  kind,
  activeView = 'lab',
  onSelectModel,
  onGoHome,
}: {
  kind: MachineKind;
  activeView?: 'landing' | 'lab';
  onSelectModel: (kind: MachineKind) => void;
  onGoHome: () => void;
}) {
  const isLab = activeView === 'lab';

  return (
    <div className="liquid-navbar-shell" role="banner">
      <div className="nimbus-glass" aria-hidden="true" />

      <a
        className={`liquid-home-btn${!isLab ? ' active' : ''}`}
        href={import.meta.env.BASE_URL}
        aria-label="Inicio"
        aria-current={!isLab ? 'page' : undefined}
        onClick={(event) => {
          event.preventDefault();
          onGoHome();
        }}
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
        <span>Inicio</span>
      </a>

      <span className="liquid-nav-divider" aria-hidden="true" />

      <nav
        className="model-nav nimbus-nav"
        data-model={kind}
        data-active={isLab ? 'true' : 'false'}
        data-tone="light"
        aria-label="Tipo de autómata"
      >
        {KINDS.map((item) => {
          const isActive = isLab && item === kind;
          return (
            <button
              key={item}
              type="button"
              className={`nimbus-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectModel(item)}
            >
              <span className="model-abbr">{MODEL_SHORT[item]}</span>
              <span className="sr-only model-description"> {MODEL_DESCRIPTIONS[item]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
