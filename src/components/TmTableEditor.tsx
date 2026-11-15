import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { TmMachine } from '../domain';
import type { ValidationIssue } from '../engine';
import { stateName } from '../format';
import { buildTmTransitionTable } from '../turingTable';
import AnchoredPopup, { type PopupAnchor } from './AnchoredPopup';
import StateName from './StateName';
import './TmTableEditor.css';

interface TmTableEditorProps {
  machine: TmMachine;
  issues: ValidationIssue[];
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  activeStateIds: string[];
  activeTransitionIds: string[];
  onSelectState: (id: string | null) => void;
  onSelectTransition: (id: string | null) => void;
  onCreateCellTransition: (stateId: string, symbol: string) => void;
  popup?: ReactNode;
  popupAnchor: PopupAnchor | null;
  compactPopup: boolean;
}

export default function TmTableEditor({
  machine,
  issues,
  selectedStateId,
  selectedTransitionId,
  activeStateIds,
  activeTransitionIds,
  onSelectState,
  onSelectTransition,
  onCreateCellTransition,
  popup,
  popupAnchor,
  compactPopup,
}: TmTableEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const repositionRef = useRef<() => void>(() => {});
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 380 });

  const table = useMemo(() => buildTmTransitionTable(machine, issues), [machine, issues]);

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const resolveAnchor = useCallback(
    (container: HTMLElement, anchor: Exclude<PopupAnchor, { kind: 'toolbar' }>) => {
      if (anchor.kind === 'state') {
        return container.querySelector<HTMLElement>(`[data-state-id="${CSS.escape(anchor.id)}"]`);
      }
      if (anchor.kind === 'transition') {
        return container.querySelector<HTMLElement>(`[data-transition-id="${CSS.escape(anchor.id)}"]`);
      }
      return container.querySelector<HTMLElement>(
        `[data-tm-cell="${CSS.escape(`${anchor.stateId}:${anchor.symbol}`)}"]`,
      );
    },
    [],
  );

  useEffect(() => {
    if (!popupAnchor || popupAnchor.kind === 'toolbar' || !stageRef.current) return;
    const target = resolveAnchor(stageRef.current, popupAnchor);
    if (target) {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      repositionRef.current();
    }
  }, [popupAnchor, resolveAnchor]);

  return (
    <section
      className="tm-table-editor"
      aria-label="Tabla de transiciones de la máquina de Turing"
    >
      <div
        ref={stageRef}
        className="tm-table-stage"
        onClick={(event) => {
          if (!(event.target instanceof Element)) return;
          if (event.target.closest('.tm-table-card, .graph-popup')) return;
          onSelectState(null);
        }}
      >
        <h1 className="graph-watermark" title={machine.name || 'Autómata sin nombre'}>
          {machine.name || 'Autómata sin nombre'}
        </h1>

        {machine.states.length === 0 ? (
          <div className="graph-editor__empty">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
              <rect x="8" y="11" width="36" height="30" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 21h36M21 11v30M32 21v20" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <strong>Tu máquina de Turing empieza aquí</strong>
            <p>Agrega un estado para construir la tabla de transición.</p>
          </div>
        ) : (
          <div className="tm-table-card">
            <div className="tm-table-meta">
              <code className="tm-table-signature">δ: Q × Γ → Q × Γ × {'{L, R}'}</code>
              <span className="tm-table-legend">
                Celdas tenues: regla por defecto (r, a, R) · t y r son absorbentes
              </span>
            </div>

            {table.columns.length === 0 ? (
              <p className="tm-table-empty-alphabet">
                Define al menos un símbolo en el alfabeto de cinta Γ desde Configurar modelo.
              </p>
            ) : (
              <div
                className="tm-table-scroll"
                role="region"
                aria-label="Matriz de transición δ"
                tabIndex={0}
                onScroll={() => repositionRef.current()}
              >
                <table className="tm-table">
                  <caption className="sr-only">
                    Tabla de transición de {machine.name || 'la máquina de Turing'} según notación de Kozen
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="tm-table__corner">
                        Estado
                      </th>
                      {table.columns.map((column) => {
                        const roleText = column.isLeftMarker
                          ? 'inicio'
                          : column.isBlank
                            ? 'blanco'
                            : column.outOfAlphabet
                              ? 'fuera de Γ'
                              : '';
                        return (
                          <th
                            key={column.symbol}
                            scope="col"
                            className={`tm-table__col-header${column.outOfAlphabet ? ' is-warning' : ''}`}
                            aria-label={roleText ? `${column.symbol}, ${roleText}` : column.symbol}
                          >
                            <span className="tm-table__col-symbol">{column.symbol}</span>
                            {roleText && (
                              <small className={`tm-table__col-role${column.outOfAlphabet ? ' is-warning' : ''}`}>
                                {roleText}
                              </small>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => {
                      const stateSelected = selectedStateId === row.state.id;
                      const stateActive = activeStateIds.includes(row.state.id);
                      const hasStateIssue = row.issues.length > 0;
                      const displayState = row.state.name || 'sin nombre';
                      const roleLabel = [
                        row.initial && 'inicial',
                        row.accepting && 'de aceptación t',
                        row.rejecting && 'de rechazo r',
                        stateActive && 'activo',
                      ]
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <tr
                          key={row.state.id}
                          className={`tm-table__row${stateActive ? ' is-active' : ''}${row.absorbing ? ' is-absorbing' : ''}`}
                        >
                          <th scope="row" className="tm-table__row-header">
                            <button
                              type="button"
                              className={`tm-table-state${stateSelected ? ' is-selected' : ''}${stateActive ? ' is-active' : ''}${hasStateIssue ? ' has-issue' : ''}`}
                              data-state-id={row.state.id}
                              aria-pressed={stateSelected}
                              aria-label={`Estado ${displayState}${roleLabel ? `, ${roleLabel}` : ''}`}
                              title={hasStateIssue ? row.issues[0] : undefined}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectState(row.state.id);
                              }}
                            >
                              {row.initial && (
                                <svg className="tm-table-state__initial" width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
                                  <path d="M1 6h12M9.5 2 14 6l-4.5 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                              <span className="tm-table-state__name">
                                <StateName name={displayState} />
                              </span>
                              {row.accepting && (
                                <span className="tm-table-state__badge is-accept" title="Estado de aceptación t">
                                  t
                                </span>
                              )}
                              {row.rejecting && (
                                <span className="tm-table-state__badge is-reject" title="Estado de rechazo r">
                                  r
                                </span>
                              )}
                              {stateActive && <span className="tm-table-state__status">Activo</span>}
                            </button>
                          </th>

                          {row.cells.map((cell) => {
                            if (cell.explicit.length > 0) {
                              return (
                                <td key={cell.symbol} className="tm-table__cell">
                                  <div className="tm-table__cell-stack">
                                    {cell.explicit.map((rule) => {
                                      const target = stateName(machine, rule.to);
                                      const isSelected = selectedTransitionId === rule.id;
                                      const isActive = activeTransitionIds.includes(rule.id);
                                      const ruleIssues = table.transitionIssues.get(rule.id);
                                      return (
                                        <button
                                          key={rule.id}
                                          type="button"
                                          className={`tm-table-rule${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}${ruleIssues?.length ? ' has-issue' : ''}`}
                                          data-transition-id={rule.id}
                                          aria-pressed={isSelected}
                                          aria-label={`δ(${displayState}, ${cell.symbol}) = (${target}, ${rule.write}, ${rule.move})${isActive ? ', utilizada en este paso' : ''}`}
                                          title={ruleIssues?.[0]}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onSelectTransition(rule.id);
                                          }}
                                        >
                                          <span className="tm-table-rule__triple">
                                            (<span className="tm-table-rule__state"><StateName name={target} /></span>, {rule.write}, {rule.move})
                                          </span>
                                          {isActive && <span className="tm-table-rule__status">en uso</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            }

                            if (cell.isTerminal) {
                              return (
                                <td key={cell.symbol} className="tm-table__cell is-terminal">
                                  <span
                                    className="tm-table-terminal"
                                    title={row.accepting ? 'Estado de aceptación absorbente' : 'Estado de rechazo absorbente'}
                                    aria-label={
                                      row.accepting
                                        ? `${displayState} es absorbente de aceptación al leer ${cell.symbol}`
                                        : `${displayState} es absorbente de rechazo al leer ${cell.symbol}`
                                    }
                                  >
                                    —
                                  </span>
                                </td>
                              );
                            }

                            const isDefaultActive =
                              cell.defaultRule !== null && activeTransitionIds.includes(cell.defaultRule.activeKey);
                            const isPendingCell =
                              popupAnchor?.kind === 'cell' &&
                              popupAnchor.stateId === cell.stateId &&
                              popupAnchor.symbol === cell.symbol;

                            return (
                              <td key={cell.symbol} className="tm-table__cell">
                                <button
                                  type="button"
                                  className={`tm-table-rule is-default${isPendingCell ? ' is-selected' : ''}${isDefaultActive ? ' is-active' : ''}`}
                                  data-tm-cell={`${cell.stateId}:${cell.symbol}`}
                                  aria-pressed={isPendingCell}
                                  aria-label={
                                    cell.defaultRule
                                      ? `Regla por defecto: δ(${displayState}, ${cell.symbol}) = (${cell.defaultRule.targetName}, ${cell.defaultRule.write}, ${cell.defaultRule.move})${isDefaultActive ? ', utilizada en este paso' : ''}. Pulsa para definir una transición explícita.`
                                      : `Sin regla explícita para δ(${displayState}, ${cell.symbol}). Pulsa para definir.`
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onCreateCellTransition(cell.stateId, cell.symbol);
                                  }}
                                >
                                  <span className="tm-table-rule__triple">
                                    {cell.defaultRule ? (
                                      <>
                                        (<span className="tm-table-rule__state"><StateName name={cell.defaultRule.targetName} /></span>, {cell.defaultRule.write}, {cell.defaultRule.move})
                                      </>
                                    ) : (
                                      '—'
                                    )}
                                  </span>
                                  {isDefaultActive && <span className="tm-table-rule__status">en uso</span>}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <AnchoredPopup
        kind={machine.kind}
        containerRef={stageRef}
        canvasSize={canvasSize}
        popup={popup}
        popupAnchor={popupAnchor}
        compactPopup={compactPopup}
        resolveAnchor={resolveAnchor}
        layoutDeps={machine}
        repositionRef={repositionRef}
      />
    </section>
  );
}
