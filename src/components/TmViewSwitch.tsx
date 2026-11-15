export type TmViewMode = 'graph' | 'table';

interface TmViewSwitchProps {
  view: TmViewMode;
  onChange: (view: TmViewMode) => void;
}

export default function TmViewSwitch({ view, onChange }: TmViewSwitchProps) {
  return (
    <div
      className="tm-view-switch"
      data-view={view}
      role="group"
      aria-label="Vista de la máquina de Turing"
    >
      <div className="nimbus-glass" aria-hidden="true" />
      <div className="tm-view-switch__track">
        <button
          type="button"
          className={view === 'graph' ? 'active' : undefined}
          aria-pressed={view === 'graph'}
          onClick={() => onChange('graph')}
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="4.5" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="13.5" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7.2 9h3.6m-1.4-1.6L11 9l-1.6 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Grafo</span>
        </button>
        <button
          type="button"
          className={view === 'table' ? 'active' : undefined}
          aria-pressed={view === 'table'}
          onClick={() => onChange('table')}
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="2.5" y="3.5" width="13" height="11" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.5 7.5h13M7 3.5v11M11.5 7.5v7" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <span>Tabla</span>
        </button>
      </div>
    </div>
  );
}
