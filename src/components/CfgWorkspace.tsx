import { useEffect, useMemo, useRef, useState } from 'react';
import type { CfgMachine, CfgProduction, Machine } from '../domain';
import { LIMITS } from '../domain';
import {
  buildDerivationSteps,
  canSententialReachTarget,
  computeNullable,
  createInitialManualState,
  deriveCfgString,
  expandManualStep,
  formatProduction,
  formatRhs,
  groupProductionsByLeft,
  parseBnfRule,
  validateCfg,
  validateCfgInput,
  type CfgDerivationStep,
  type CfgParseNode,
  type DerivationStrategy,
  type ManualDerivationState,
} from '../cfg';
import { CFG_PRESETS, EXAMPLE_INPUTS, createBlankMachine } from '../examples';
import { symbolsFromField } from '../format';
import { exportMachine } from '../storage';
import './Simulator.css';
import './CfgWorkspace.css';

interface CfgWorkspaceProps {
  machine: CfgMachine;
  input: string;
  onInput: (input: string) => void;
  onChangeMachine: (next: Machine) => string | null;
  onImportFile: (file?: File) => Promise<void>;
  notice: string;
  onNotice: (message: string) => void;
}

interface PositionedNode {
  node: CfgParseNode;
  x: number;
  y: number;
  isExpanded: boolean;
  isActive: boolean;
  isFuture: boolean;
  children: PositionedNode[];
}

function layoutParseTree(
  root: CfgParseNode,
  expandedSet: Set<string>,
  activeExpandedId: string | undefined,
  showFuture: boolean,
): { positioned: PositionedNode; nodes: PositionedNode[]; edges: { from: PositionedNode; to: PositionedNode; isActive: boolean; isFuture: boolean }[]; minX: number; maxX: number; maxY: number; leafYield: string } {
  const LEAF_GAP = 62;
  const LEVEL_GAP = 68;
  let leafIndex = 0;

  const nodes: PositionedNode[] = [];
  const edges: { from: PositionedNode; to: PositionedNode; isActive: boolean; isFuture: boolean }[] = [];
  const yieldParts: string[] = [];

  const build = (node: CfgParseNode, depth: number, parentExpanded: boolean, isFromActiveParent: boolean): PositionedNode => {
    const isExpanded = expandedSet.has(node.id);
    const isFuture = !parentExpanded;
    const isActive = node.id === activeExpandedId || isFromActiveParent;

    const visibleChildren =
      node.children.length > 0 && (showFuture || isExpanded)
        ? node.children.map((child) => build(child, depth + 1, isExpanded, node.id === activeExpandedId))
        : [];

    let x: number;
    if (visibleChildren.length === 0) {
      x = leafIndex * LEAF_GAP;
      leafIndex++;
      if (!isFuture) {
        if (node.isEpsilon) {
          // ε no aporta símbolos a la frontera final.
        } else {
          yieldParts.push(node.symbol);
        }
      }
    } else {
      x = (visibleChildren[0].x + visibleChildren[visibleChildren.length - 1].x) / 2;
    }

    const positioned: PositionedNode = {
      node,
      x,
      y: depth * LEVEL_GAP,
      isExpanded,
      isActive,
      isFuture,
      children: visibleChildren,
    };

    nodes.push(positioned);
    for (const child of visibleChildren) {
      edges.push({
        from: positioned,
        to: child,
        isActive: node.id === activeExpandedId,
        isFuture: child.isFuture,
      });
    }
    return positioned;
  };

  const positioned = build(root, 0, true, false);
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x));
  const maxY = Math.max(...nodes.map((n) => n.y));
  return {
    positioned,
    nodes,
    edges,
    minX,
    maxX,
    maxY,
    leafYield: yieldParts.join('') || 'ε',
  };
}

function CfgParseTreeSvg({
  tree,
  expandedNodeIds,
  activeExpandedId,
  nextTargetNodeId,
  showFuture,
  stepByNodeId,
  onSelectStep,
  label,
}: {
  tree: CfgParseNode;
  expandedNodeIds: string[];
  activeExpandedId?: string;
  nextTargetNodeId?: string;
  showFuture: boolean;
  stepByNodeId?: Map<string, number>;
  onSelectStep?: (stepIndex: number) => void;
  label: string;
}) {
  const expandedSet = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);
  const layout = useMemo(
    () => layoutParseTree(tree, expandedSet, activeExpandedId, showFuture),
    [tree, expandedSet, activeExpandedId, showFuture],
  );

  const padX = 56;
  const padTop = 36;
  const padBottom = 40;
  const rawWidth = Math.max(220, layout.maxX - layout.minX + padX * 2);
  const centerOffset = (rawWidth - (layout.maxX - layout.minX)) / 2 - layout.minX;
  const viewWidth = rawWidth;
  const viewHeight = Math.max(170, layout.maxY + padTop + padBottom);

  return (
    <svg
      className="cfg-tree-svg"
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {layout.edges.map((edge) => {
        const x1 = edge.from.x + centerOffset;
        const y1 = edge.from.y + padTop + 18;
        const x2 = edge.to.x + centerOffset;
        const y2 = edge.to.y + padTop - (edge.to.node.isTerminal ? 15 : 18);
        const midY = (y1 + y2) / 2;
        return (
          <path
            key={`${edge.from.node.id}-${edge.to.node.id}`}
            className={`cfg-tree-edge${edge.isActive ? ' is-active' : ''}${edge.isFuture ? ' is-future' : ''}`}
            d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
          />
        );
      })}

      {layout.nodes.map((item) => {
        const cx = item.x + centerOffset;
        const cy = item.y + padTop;
        const targetStep = stepByNodeId?.get(item.node.id);
        const isInteractive = targetStep !== undefined && onSelectStep !== undefined && !item.isFuture;
        const isNextTarget = item.node.id === nextTargetNodeId && !item.isFuture;

        return (
          <g
            key={item.node.id}
            className={[
              'cfg-tree-node-group',
              item.isActive ? 'is-active' : '',
              item.isExpanded && !item.isActive ? 'is-expanded-past' : '',
              item.isFuture ? 'is-future' : '',
              item.node.isEpsilon ? 'is-epsilon' : '',
              isInteractive ? 'is-interactive' : '',
            ].filter(Boolean).join(' ')}
            transform={`translate(${cx}, ${cy})`}
            onClick={() => {
              if (isInteractive) onSelectStep(targetStep);
            }}
          >
            {item.node.isTerminal ? (
              <>
                <rect
                  className="cfg-tree-leaf-rect"
                  x={-15}
                  y={-14}
                  width={30}
                  height={28}
                  rx={6}
                />
                <text className="cfg-tree-label-t" x={0} y={0}>
                  {item.node.symbol}
                </text>
              </>
            ) : (
              <>
                <circle
                  className="cfg-tree-node-circle"
                  cx={0}
                  cy={0}
                  r={18}
                  strokeDasharray={isNextTarget ? '4 2' : undefined}
                />
                <text className="cfg-tree-label-nt" x={0} y={0}>
                  {item.node.symbol}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ProductionRhsTokens({ right, ntSet }: { right: string[]; ntSet: Set<string> }) {
  if (!right.length) return <span>ε</span>;
  return (
    <>
      {right.map((sym, index) => (
        <span key={`${sym}-${index}`} className={ntSet.has(sym) ? 'cfg-sym-nt' : undefined}>
          {sym}
        </span>
      ))}
    </>
  );
}

export default function CfgWorkspace({
  machine,
  input,
  onInput,
  onChangeMachine,
  onImportFile,
  notice,
  onNotice,
}: CfgWorkspaceProps) {
  const [mode, setMode] = useState<'guided' | 'manual'>('guided');
  const [strategy, setStrategy] = useState<DerivationStrategy>('leftmost');
  const [treeIndex, setTreeIndex] = useState(0);
  const [compareTrees, setCompareTrees] = useState(false);
  const [showFutureTree, setShowFutureTree] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);

  const [manualState, setManualState] = useState<ManualDerivationState>(() => createInitialManualState(machine));
  const [manualCursor, setManualCursor] = useState(0);
  const [manualTargetNodeId, setManualTargetNodeId] = useState<string | null>('m0');

  const [bnfInput, setBnfInput] = useState('');
  const [bnfError, setBnfError] = useState('');
  const [confirmReplace, setConfirmReplace] = useState<'blank' | 'example' | null>(null);

  const importRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDetailsElement>(null);

  const issues = useMemo(() => validateCfg(machine), [machine]);
  const inputError = useMemo(() => validateCfgInput(machine, input), [machine, input]);
  const ntSet = useMemo(() => new Set(machine.nonterminals), [machine.nonterminals]);
  const nullable = useMemo(() => [...computeNullable(machine)], [machine]);
  const groups = useMemo(
    () => groupProductionsByLeft(machine.nonterminals, machine.productions),
    [machine.nonterminals, machine.productions],
  );

  const derivation = useMemo(() => deriveCfgString(machine, input), [machine, input]);

  const activeTreeIndex = Math.min(treeIndex, Math.max(0, derivation.trees.length - 1));
  const selectedTree = derivation.trees[activeTreeIndex];

  const guidedSteps = useMemo(() => {
    if (!selectedTree) return [];
    return buildDerivationSteps(selectedTree, strategy, machine);
  }, [selectedTree, strategy, machine]);

  // Reiniciar el cursor guiado cuando cambia la gramática, cadena o estrategia.
  useEffect(() => {
    setPlaying(false);
    setCursor(0);
    setTreeIndex(0);
    setCompareTrees(false);
  }, [machine, input, strategy]);

  // Reiniciar el estado manual cuando cambia la gramática.
  useEffect(() => {
    const fresh = createInitialManualState(machine);
    setManualState(fresh);
    setManualCursor(0);
    setManualTargetNodeId(fresh.steps[0]?.nextTargetNodeId ?? null);
  }, [machine]);

  // Reproducción automática en modo guiado.
  useEffect(() => {
    if (!playing || mode !== 'guided') return;
    if (cursor >= guidedSteps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setCursor((c) => Math.min(c + 1, guidedSteps.length - 1));
    }, speed);
    return () => window.clearTimeout(timer);
  }, [playing, mode, cursor, guidedSteps.length, speed]);

  // Pausar si la pestaña pasa a segundo plano.
  useEffect(() => {
    const stop = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', stop);
    return () => document.removeEventListener('visibilitychange', stop);
  }, []);

  const currentGuidedStep: CfgDerivationStep | undefined = guidedSteps[cursor];
  const currentManualStep: CfgDerivationStep | undefined = manualState.steps[manualCursor];
  const activeStep = mode === 'guided' ? currentGuidedStep : currentManualStep;

  const activeProductionId = activeStep?.production?.id;

  const guidedStepByNodeId = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of guidedSteps) {
      if (s.expandedNodeId) map.set(s.expandedNodeId, s.step);
    }
    return map;
  }, [guidedSteps]);

  const manualStepByNodeId = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of manualState.steps) {
      if (s.expandedNodeId) map.set(s.expandedNodeId, s.step);
    }
    return map;
  }, [manualState.steps]);

  const manualSelectedToken = useMemo(() => {
    if (mode !== 'manual' || manualCursor !== manualState.steps.length - 1) return undefined;
    const tokens = currentManualStep?.sentential ?? [];
    const exact = tokens.find((t) => !t.isTerminal && t.nodeId === manualTargetNodeId);
    return exact ?? tokens.find((t) => !t.isTerminal);
  }, [mode, manualCursor, manualState.steps.length, currentManualStep, manualTargetNodeId]);

  const manualNonterminalCount = useMemo(
    () => (currentManualStep?.sentential ?? []).filter((t) => !t.isTerminal).length,
    [currentManualStep],
  );

  const manualReachable = useMemo(() => {
    if (mode !== 'manual' || !currentManualStep || issues.length || inputError) return false;
    return canSententialReachTarget(currentManualStep.sentential, input, derivation.chart);
  }, [mode, currentManualStep, issues.length, inputError, input, derivation.chart]);

  const manualDerivedWord = currentManualStep?.formula === 'ε' ? '' : currentManualStep?.formula ?? '';
  const manualFinished = mode === 'manual' && manualNonterminalCount === 0;
  const manualMatchedTarget = manualFinished && !inputError && manualDerivedWord === input;

  const symbols = Array.from(input);

  const statusInfo = useMemo(() => {
    if (issues.length || inputError) return { className: 'inconclusive', label: 'Sin ejecutar' };
    if (mode === 'manual') {
      if (manualFinished) {
        return manualMatchedTarget
          ? { className: 'accepted', label: 'Aceptada' }
          : { className: 'rejected', label: 'Cadena distinta' };
      }
      return { className: 'running', label: 'En curso' };
    }
    if (!derivation.accepted) return { className: 'rejected', label: 'Rechazada' };
    if (cursor === 0 && guidedSteps.length > 1) return { className: 'running', label: 'Lista para empezar' };
    if (cursor === guidedSteps.length - 1) return { className: 'accepted', label: 'Aceptada' };
    return { className: 'running', label: 'En curso' };
  }, [issues.length, inputError, mode, manualFinished, manualMatchedTarget, derivation.accepted, cursor, guidedSteps.length]);

  const handleApplyManualProduction = (prod: CfgProduction) => {
    if (!manualSelectedToken || manualSelectedToken.symbol !== prod.left) return;
    if (manualState.steps.length > LIMITS.cfgDerivationSteps) {
      onNotice(`La derivación manual alcanzó el límite de ${LIMITS.cfgDerivationSteps} pasos.`);
      return;
    }
    const next = expandManualStep(manualState, manualSelectedToken.nodeId, prod, machine);
    setManualState(next);
    const nextCursor = next.steps.length - 1;
    setManualCursor(nextCursor);
    setManualTargetNodeId(next.steps[nextCursor]?.nextTargetNodeId ?? null);
  };

  const handleAddBnfRule = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseBnfRule(bnfInput, machine.nonterminals, machine.alphabet);
    if (parsed.error || !parsed.rule) {
      setBnfError(parsed.error ?? 'Regla inválida.');
      return;
    }
    const nextNonterminals = [...machine.nonterminals, ...parsed.discoveredNonterminals];
    const nextAlphabet = [...machine.alphabet, ...parsed.discoveredTerminals];
    if (nextNonterminals.length > LIMITS.cfgNonterminals) {
      setBnfError(`El límite es ${LIMITS.cfgNonterminals} símbolos no terminales.`);
      return;
    }
    if (machine.productions.length + parsed.rule.alternatives.length > LIMITS.cfgProductions) {
      setBnfError(`El límite es ${LIMITS.cfgProductions} producciones.`);
      return;
    }

    const newProds: CfgProduction[] = [];
    for (const alt of parsed.rule.alternatives) {
      const exists = machine.productions.some(
        (p) => p.left === parsed.rule!.left && p.right.length === alt.length && p.right.every((s, i) => s === alt[i]),
      );
      if (!exists) {
        newProds.push({
          id: crypto.randomUUID(),
          left: parsed.rule.left,
          right: alt,
        });
      }
    }

    onChangeMachine({
      ...machine,
      nonterminals: nextNonterminals,
      alphabet: nextAlphabet,
      startSymbol: machine.startSymbol || parsed.rule.left,
      productions: [...machine.productions, ...newProds],
    });
    setBnfInput('');
    setBnfError('');
  };

  const handleDeleteProduction = (id: string) => {
    onChangeMachine({
      ...machine,
      productions: machine.productions.filter((p) => p.id !== id),
    });
  };

  const handleReplace = (action: 'blank' | 'example') => {
    const next = action === 'blank' ? createBlankMachine('cfg') : structuredClone(CFG_PRESETS[0].machine);
    const err = onChangeMachine(next);
    if (action === 'example') onInput(EXAMPLE_INPUTS.cfg);
    setConfirmReplace(null);
    onNotice(err ?? (action === 'blank' ? 'Gramática nueva lista para definir producciones.' : 'Ejemplo de Kozen restaurado.'));
  };

  const canAdvanceGuided = mode === 'guided' && !issues.length && !inputError && derivation.accepted && cursor < guidedSteps.length - 1;

  return (
    <div
      className="cfg-workspace"
      onPointerDownCapture={(event) => {
        if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
          fileMenuRef.current.open = false;
        }
      }}
    >
      <aside className="cfg-sidebar" aria-label="Definición de la gramática libre de contexto">
        <div className="cfg-sidebar-header">
          <div className="cfg-doc-row">
            <label className="sr-only" htmlFor="cfg-grammar-name">Nombre de la gramática</label>
            <input
              id="cfg-grammar-name"
              className="cfg-name-input"
              value={machine.name}
              maxLength={100}
              onChange={(event) => onChangeMachine({ ...machine, name: event.target.value })}
              placeholder="Nombre de la gramática"
            />
            <details
              ref={fileMenuRef}
              className="cfg-file-menu"
              onKeyDown={(event) => {
                if (event.key === 'Escape' && event.currentTarget.open) {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector('summary')?.focus();
                }
              }}
              onClickCapture={(event) => {
                if ((event.target as HTMLElement).closest('button')) {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector('summary')?.focus();
                }
              }}
            >
              <summary>
                Archivo
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="m4 5.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="file-menu-actions">
                <button type="button" onClick={() => importRef.current?.click()}>Importar</button>
                <button type="button" onClick={() => exportMachine(machine)}>Exportar JSON</button>
                <hr />
                <button type="button" onClick={() => setConfirmReplace('example')}>Cargar ejemplo</button>
                <button type="button" onClick={() => setConfirmReplace('blank')}>Crear desde cero</button>
              </div>
            </details>
            <input
              ref={importRef}
              className="sr-only"
              type="file"
              accept=".json,application/json"
              aria-label="Importar gramática JSON"
              onChange={async (event) => {
                await onImportFile(event.target.files?.[0]);
                if (importRef.current) importRef.current.value = '';
              }}
            />
          </div>

          <div className="cfg-presets" role="group" aria-label="Ejemplos de Kozen">
            {CFG_PRESETS.map((preset) => {
              const active = machine.name === preset.machine.name;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`cfg-preset-btn${active ? ' active' : ''}`}
                  title={preset.description}
                  onClick={() => {
                    onChangeMachine(structuredClone(preset.machine));
                    onInput(preset.sampleInput);
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="cfg-sidebar-scroll">
          <section className="cfg-section-card" aria-label="Conjuntos N, Σ y S">
            <div className="cfg-section-heading">
              <h2>Vocabulario y símbolo inicial</h2>
              <span className="cfg-tuple-badge">G = (N, Σ, P, S)</span>
            </div>
            <div className="cfg-vocab-grid">
              <label>
                No terminales · N
                <input
                  value={machine.nonterminals.join(' ')}
                  aria-label="No terminales N"
                  onChange={(event) => {
                    const nextNt = symbolsFromField(event.target.value);
                    const nextStart = nextNt.includes(machine.startSymbol) ? machine.startSymbol : nextNt[0] ?? '';
                    onChangeMachine({ ...machine, nonterminals: nextNt, startSymbol: nextStart });
                  }}
                />
              </label>
              <label>
                Terminales · Σ
                <input
                  value={machine.alphabet.join(' ')}
                  aria-label="Terminales Σ"
                  onChange={(event) => onChangeMachine({ ...machine, alphabet: symbolsFromField(event.target.value) })}
                />
              </label>
            </div>
            {machine.nonterminals.length > 0 && (
              <div className="cfg-start-row" role="group" aria-label="Símbolo inicial S">
                <span>Símbolo inicial S:</span>
                {machine.nonterminals.map((nt) => (
                  <button
                    key={nt}
                    type="button"
                    className="cfg-start-chip"
                    aria-pressed={machine.startSymbol === nt}
                    aria-label={`Definir ${nt} como símbolo inicial`}
                    onClick={() => onChangeMachine({ ...machine, startSymbol: nt })}
                  >
                    {nt}
                  </button>
                ))}
              </div>
            )}
          </section>

          {issues.length > 0 && (
            <div className="cfg-validation-box" role="status">
              <strong>Completa la gramática antes de probar cadenas:</strong>
              <ul>
                {issues.slice(0, 6).map((issue, idx) => (
                  <li key={idx}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="cfg-section-card" aria-label="Producciones P">
            <div className="cfg-section-heading">
              <h2>Producciones · P</h2>
              <span className="cfg-tuple-badge">{machine.productions.length} {machine.productions.length === 1 ? 'regla' : 'reglas'}</span>
            </div>

            {groups.length > 0 ? (
              <div className="cfg-bnf-groups">
                {groups.map((group) => (
                  <div key={group.left} className="cfg-bnf-row">
                    <div className="cfg-bnf-lhs" aria-label={`Producciones de ${group.left}`}>
                      <span>{group.left}</span>
                      <span className="cfg-arrow" aria-hidden="true">→</span>
                    </div>
                    <div className="cfg-bnf-rhs-list">
                      {group.productions.map((prod, idx) => {
                        const isActive = prod.id === activeProductionId;
                        const isManualCandidate =
                          mode === 'manual' &&
                          manualSelectedToken?.symbol === prod.left &&
                          manualCursor === manualState.steps.length - 1;
                        return (
                          <span key={prod.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {idx > 0 && <span className="cfg-bnf-sep" aria-hidden="true">|</span>}
                            <span
                              className={[
                                'cfg-prod-pill-wrap',
                                isActive ? 'is-active' : '',
                                isManualCandidate && !isActive ? 'is-manual-ready' : '',
                              ].filter(Boolean).join(' ')}
                              data-production-id={prod.id}
                            >
                              <button
                                type="button"
                                className="cfg-prod-pill"
                                aria-label={`${formatProduction(prod)}${isActive ? ', aplicada en este paso' : ''}`}
                                onClick={() => {
                                  if (isManualCandidate) {
                                    handleApplyManualProduction(prod);
                                  } else if (mode === 'guided') {
                                    const match = guidedSteps.find((s) => s.production?.id === prod.id);
                                    if (match) {
                                      setPlaying(false);
                                      setCursor(match.step);
                                    }
                                  }
                                }}
                              >
                                <ProductionRhsTokens right={prod.right} ntSet={ntSet} />
                                {isActive && <span className="cfg-prod-status">en uso</span>}
                              </button>
                              <button
                                type="button"
                                className="cfg-prod-del"
                                aria-label={`Eliminar producción ${formatProduction(prod)}`}
                                title="Eliminar producción"
                                onClick={() => handleDeleteProduction(prod.id)}
                              >
                                ×
                              </button>
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="field-hint">Aún no hay producciones. Agrega una regla BNF abajo (por ejemplo, S -&gt; aSb | ε).</p>
            )}

            <form className="cfg-bnf-form" onSubmit={handleAddBnfRule}>
              <label htmlFor="cfg-bnf-input" className="sr-only">Agregar producción BNF</label>
              <div className="cfg-bnf-input-row">
                <input
                  id="cfg-bnf-input"
                  value={bnfInput}
                  onChange={(event) => {
                    setBnfInput(event.target.value);
                    if (bnfError) setBnfError('');
                  }}
                  placeholder="S -> aSb | ε"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button type="submit" className="primary">Agregar</button>
              </div>
              <div className="cfg-quick-chips" role="group" aria-label="Insertar símbolo en la regla">
                {['->', '|', 'ε', ...machine.nonterminals, ...machine.alphabet].map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setBnfInput((prev) => `${prev}${token === '->' || token === '|' ? ` ${token} ` : token}`)}
                    aria-label={`Insertar ${token}`}
                  >
                    {token}
                  </button>
                ))}
              </div>
              {bnfError && <p className="form-error" role="alert">{bnfError}</p>}
            </form>
          </section>
        </div>
      </aside>

      <section className="cfg-stage" aria-label="Escenario interactivo de derivación">
        {notice && (
          <div className="cfg-notice-banner" role="status">
            <span>{notice}</span>
            <button type="button" className="text-button" onClick={() => onNotice('')}>Cerrar aviso</button>
          </div>
        )}

        {confirmReplace && (
          <div className="cfg-replace-banner" role="group" aria-label="Confirmar reemplazo">
            <span>Se reemplazará el borrador de GLC.</span>
            <div className="button-row">
              <button type="button" onClick={() => exportMachine(machine)}>Exportar borrador</button>
              <button type="button" className="primary" onClick={() => handleReplace(confirmReplace)}>
                {confirmReplace === 'blank' ? 'Abrir gramática vacía' : 'Restaurar ejemplo'}
              </button>
              <button type="button" onClick={() => setConfirmReplace(null)}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="cfg-control-card">
          <div className="cfg-control-top">
            <div className="cfg-input-cluster">
              <label className="sr-only" htmlFor="input-word">Cadena de entrada</label>
              <div className="cfg-input-row">
                <div className="input-with-action">
                  <input
                    id="input-word"
                    value={input}
                    onChange={(event) => onInput(event.target.value)}
                    placeholder="ε"
                    spellCheck={false}
                    autoComplete="off"
                    aria-invalid={!!inputError}
                    aria-describedby={inputError ? 'cfg-input-error' : undefined}
                  />
                  <button
                    type="button"
                    disabled={!symbols.length}
                    onClick={() => onInput(symbols.slice(0, -1).join(''))}
                    aria-label="Borrar último símbolo"
                    title="Borrar último símbolo"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M7 4h10v12H7l-5-6 5-6ZM9 7l5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => onInput('')} aria-label="Usar ε" title="Probar la cadena vacía">ε</button>
                </div>

                <div className="input-alphabet" role="group" aria-label="Añadir símbolos">
                  <span aria-hidden="true">Σ</span>
                  {machine.alphabet.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      disabled={symbols.length >= LIMITS.cfgInput}
                      onClick={() => onInput(input + sym)}
                      aria-label={`Añadir ${sym}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
              {inputError && <p className="form-error" id="cfg-input-error" role="alert">{inputError}</p>}
            </div>

            <div className="cfg-mode-cluster">
              <div className="cfg-segmented" role="group" aria-label="Modo de derivación">
                <button
                  type="button"
                  aria-pressed={mode === 'guided'}
                  onClick={() => {
                    setMode('guided');
                    setPlaying(false);
                  }}
                >
                  Guiado
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'manual'}
                  onClick={() => {
                    setMode('manual');
                    setPlaying(false);
                  }}
                >
                  Manual
                </button>
              </div>

              {mode === 'guided' && (
                <div className="cfg-segmented" role="group" aria-label="Orden de derivación">
                  <button
                    type="button"
                    aria-pressed={strategy === 'leftmost'}
                    onClick={() => setStrategy('leftmost')}
                    title="Derivación más a la izquierda"
                  >
                    Izquierda (→<sub>L</sub>)
                  </button>
                  <button
                    type="button"
                    aria-pressed={strategy === 'rightmost'}
                    onClick={() => setStrategy('rightmost')}
                    title="Derivación más a la derecha"
                  >
                    Derecha (→<sub>R</sub>)
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="cfg-playback-row">
            <div className="cfg-status-group">
              <span className={`run-status ${statusInfo.className}`}>
                <span className="status-dot" aria-hidden="true" />
                {statusInfo.label}
              </span>
              <span className="step-count">
                {mode === 'guided'
                  ? <>Paso <strong>{cursor}</strong> de {Math.max(0, guidedSteps.length - 1)}</>
                  : <>Paso manual <strong>{manualCursor}</strong> de {manualState.steps.length - 1}</>}
              </span>
              {nullable.length > 0 && (
                <span className="field-hint" style={{ margin: 0 }}>
                  Anulables: <code>{`{${nullable.join(', ')}}`}</code>
                </span>
              )}
            </div>

            {mode === 'guided' ? (
              <div className="playback">
                <div className="playback-buttons">
                  <button
                    type="button"
                    disabled={cursor === 0}
                    onClick={() => {
                      setPlaying(false);
                      setCursor((c) => Math.max(0, c - 1));
                    }}
                    aria-label="Anterior"
                    title="Anterior"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 4v12M15 5l-7 5 7 5V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="primary play-control"
                    disabled={!canAdvanceGuided && !playing}
                    onClick={() => setPlaying((p) => !p)}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      {playing
                        ? <path d="M7 4v12M13 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        : <path d="m6 4 10 6-10 6V4Z" fill="currentColor" strokeLinejoin="round" />}
                    </svg>
                    {playing ? 'Pausar' : 'Reproducir'}
                  </button>
                  <button
                    type="button"
                    className="next-step"
                    disabled={!canAdvanceGuided}
                    onClick={() => {
                      setPlaying(false);
                      setCursor((c) => Math.min(guidedSteps.length - 1, c + 1));
                    }}
                    aria-label="Paso siguiente"
                    title="Paso siguiente"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M15 4v12M5 5l7 5-7 5V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={cursor === 0 && !playing}
                    onClick={() => {
                      setPlaying(false);
                      setCursor(0);
                    }}
                    aria-label="Reiniciar"
                    title="Reiniciar"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4 8a6 6 0 1 1 0 4M4 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <label className="speed-control">
                  <span className="sr-only">Velocidad</span>
                  <select aria-label="Velocidad" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                    <option value={1400}>Lenta</option>
                    <option value={800}>Normal</option>
                    <option value={300}>Rápida</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="button-row">
                <button
                  type="button"
                  disabled={manualCursor === 0}
                  onClick={() => setManualCursor((c) => Math.max(0, c - 1))}
                >
                  Paso anterior
                </button>
                <button
                  type="button"
                  disabled={manualState.steps.length <= 1}
                  onClick={() => {
                    const fresh = createInitialManualState(machine);
                    setManualState(fresh);
                    setManualCursor(0);
                    setManualTargetNodeId(fresh.steps[0]?.nextTargetNodeId ?? null);
                  }}
                >
                  Reiniciar a {machine.startSymbol || 'S'}
                </button>
              </div>
            )}
          </div>

          {mode === 'guided' && guidedSteps.length > 1 && (
            <div className="cfg-timeline-row">
              <span>Paso 0</span>
              <label className="sr-only" htmlFor="execution-timeline">Recorrer pasos calculados</label>
              <input
                id="execution-timeline"
                type="range"
                min={0}
                max={guidedSteps.length - 1}
                step={1}
                value={cursor}
                onChange={(event) => {
                  setPlaying(false);
                  setCursor(Number(event.target.value));
                }}
              />
              <span>{guidedSteps.length - 1}</span>
            </div>
          )}
        </div>

        {mode === 'guided' && derivation.ambiguous && (
          <div className="cfg-ambiguity-banner" role="region" aria-label="Ambigüedad detectada">
            <span>
              <strong>Ambigüedad detectada:</strong> «{input || 'ε'}» admite al menos {derivation.trees.length} árboles de derivación distintos.
            </span>
            <div className="cfg-segmented" role="group" aria-label="Seleccionar árbol de derivación">
              {derivation.trees.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-pressed={!compareTrees && activeTreeIndex === idx}
                  onClick={() => {
                    setCompareTrees(false);
                    setTreeIndex(idx);
                    setCursor(0);
                    setPlaying(false);
                  }}
                >
                  Árbol {idx + 1}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={compareTrees}
                onClick={() => setCompareTrees((v) => !v)}
              >
                Comparar árboles
              </button>
            </div>
          </div>
        )}

        <div className="cfg-sentential-card" aria-label="Forma sentencial actual">
          <div className="cfg-sentential-header">
            <h3>Forma sentencial</h3>
            {activeStep?.production ? (
              <span className="cfg-step-formula">
                Regla: {formatProduction(activeStep.production)}
              </span>
            ) : (
              <span className="cfg-step-formula">Símbolo inicial: {machine.startSymbol || '—'}</span>
            )}
          </div>

          <div className="cfg-ribbon" role="list" aria-label="Símbolos de la forma sentencial">
            {activeStep?.sentential.length ? (
              activeStep.sentential.map((token) => {
                const isSelectedManual = mode === 'manual' && manualSelectedToken?.nodeId === token.nodeId;
                const isTarget = mode === 'guided' ? token.status === 'target' : isSelectedManual;
                const isSpawned = token.status === 'spawned' && (activeStep.step > 0);
                const classes = [
                  'cfg-token',
                  token.isTerminal ? 'is-terminal' : 'is-nonterminal',
                  token.symbol === 'ε' ? 'is-epsilon' : '',
                  isTarget ? 'is-target' : '',
                  isSpawned ? 'is-spawned' : '',
                ].filter(Boolean).join(' ');

                if (!token.isTerminal && mode === 'manual' && manualCursor === manualState.steps.length - 1) {
                  return (
                    <button
                      key={token.nodeId}
                      type="button"
                      className={classes}
                      aria-pressed={isSelectedManual}
                      aria-label={`Expandir no terminal ${token.symbol}`}
                      onClick={() => setManualTargetNodeId(token.nodeId)}
                    >
                      {isTarget && <span className="cfg-token-badge">Seleccionado</span>}
                      {token.symbol}
                    </button>
                  );
                }

                return (
                  <span key={token.nodeId} role="listitem" className={classes}>
                    {isTarget && <span className="cfg-token-badge">Siguiente</span>}
                    {token.symbol}
                  </span>
                );
              })
            ) : (
              <span className="field-hint" style={{ margin: 0 }}>
                {derivation.message}
              </span>
            )}
          </div>

          {activeStep && activeStep.step > 0 && activeStep.targetSymbol && (
            <div className="cfg-rewrite-breakdown" aria-live="polite" aria-atomic="true">
              <span>Derivación en este paso:</span>
              <span className="cfg-rewrite-part">{activeStep.prefix}</span>
              <span className="cfg-rewrite-part is-focus">{activeStep.targetSymbol}</span>
              <span className="cfg-rewrite-part">{activeStep.suffix}</span>
              <span aria-hidden="true">→</span>
              <span className="cfg-rewrite-part">{activeStep.prefix}</span>
              <span className="cfg-rewrite-part is-focus">{activeStep.replacement}</span>
              <span className="cfg-rewrite-part">{activeStep.suffix}</span>
            </div>
          )}

          {activeStep && activeStep.step === 0 && (
            <p className="field-hint" style={{ margin: 0 }} aria-live="polite" aria-atomic="true">
              {mode === 'guided' && !derivation.accepted ? derivation.message : activeStep.message}
            </p>
          )}

          {mode === 'manual' && (
            <div className="cfg-manual-picker">
              <div className="cfg-manual-picker__top">
                {manualSelectedToken ? (
                  <span>
                    Aplicar producción sobre <strong>{manualSelectedToken.symbol}</strong>
                    {!issues.length && !inputError && (
                      <> · {manualReachable ? `Esta forma sentencial aún puede derivar «${input || 'ε'}».` : `Sin ruta hacia «${input || 'ε'}» desde esta forma sentencial.`}</>
                    )}
                  </span>
                ) : manualFinished ? (
                  <span>
                    {manualMatchedTarget
                      ? `Derivación completada: S ⇒* ${input || 'ε'}.`
                      : `Derivación terminal alcanzada: «${manualDerivedWord || 'ε'}» (objetivo: «${input || 'ε'}»).`}
                  </span>
                ) : (
                  <span>Navega al último paso manual para seguir expandiendo no terminales.</span>
                )}
              </div>

              {manualSelectedToken && (
                <div className="cfg-manual-options">
                  {machine.productions
                    .filter((p) => p.left === manualSelectedToken.symbol)
                    .map((prod) => {
                      const preview = expandManualStep(manualState, manualSelectedToken.nodeId, prod, machine);
                      const last = preview.steps[preview.steps.length - 1];
                      const viable = !issues.length && !inputError && canSententialReachTarget(last.sentential, input, derivation.chart);
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          className="cfg-manual-option"
                          onClick={() => handleApplyManualProduction(prod)}
                        >
                          <span>{formatProduction(prod)}</span>
                          {!issues.length && !inputError && (
                            <span className={`cfg-manual-hint ${viable ? 'is-viable' : 'is-dead'}`}>
                              {viable ? 'conduce a w' : 'otra cadena'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cfg-visual-split">
          <section className="cfg-tree-card" aria-label="Árbol de derivación">
            <div className="cfg-panel-head">
              <h3>Árbol de derivación {mode === 'guided' && derivation.trees.length > 1 && !compareTrees ? `(Árbol ${activeTreeIndex + 1})` : ''}</h3>
              {mode === 'guided' && selectedTree && (
                <div className="cfg-tree-controls">
                  <label>
                    <input
                      type="checkbox"
                      checked={showFutureTree}
                      onChange={(event) => setShowFutureTree(event.target.checked)}
                    />
                    Mostrar árbol completo
                  </label>
                </div>
              )}
            </div>

            <div className="cfg-tree-body">
              {mode === 'guided' && compareTrees && derivation.trees.length >= 2 ? (
                <div className="cfg-tree-compare-grid">
                  {derivation.trees.slice(0, 2).map((altTree, idx) => {
                    const allIds = buildDerivationSteps(altTree, strategy, machine).at(-1)?.expandedNodeIds ?? [];
                    return (
                      <div key={idx} className="cfg-tree-pane">
                        <span className="cfg-tree-pane-title">Árbol {idx + 1}</span>
                        <CfgParseTreeSvg
                          tree={altTree}
                          expandedNodeIds={allIds}
                          showFuture={true}
                          label={`Árbol de derivación ${idx + 1} para ${input || 'ε'}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : mode === 'guided' && selectedTree && currentGuidedStep ? (
                <CfgParseTreeSvg
                  tree={selectedTree}
                  expandedNodeIds={currentGuidedStep.expandedNodeIds}
                  activeExpandedId={currentGuidedStep.expandedNodeId}
                  nextTargetNodeId={currentGuidedStep.nextTargetNodeId}
                  showFuture={showFutureTree}
                  stepByNodeId={guidedStepByNodeId}
                  onSelectStep={(stepIdx) => {
                    setPlaying(false);
                    setCursor(stepIdx);
                  }}
                  label={`Árbol de derivación en el paso ${cursor}`}
                />
              ) : mode === 'manual' && currentManualStep ? (
                <CfgParseTreeSvg
                  tree={manualState.root}
                  expandedNodeIds={currentManualStep.expandedNodeIds}
                  activeExpandedId={currentManualStep.expandedNodeId}
                  nextTargetNodeId={manualSelectedToken?.nodeId}
                  showFuture={false}
                  stepByNodeId={manualStepByNodeId}
                  onSelectStep={(stepIdx) => setManualCursor(stepIdx)}
                  label={`Árbol de derivación manual en el paso ${manualCursor}`}
                />
              ) : (
                <div className="cfg-tree-empty">
                  <p>{issues.length || inputError ? 'Corrige la gramática o la cadena de entrada para construir el árbol.' : derivation.message}</p>
                </div>
              )}
            </div>

            {((mode === 'guided' && selectedTree && currentGuidedStep) || (mode === 'manual' && currentManualStep)) && (
              <div className="cfg-yield-bar">
                <span>Frontera (yield) actual:</span>
                <code>{activeStep?.formula ?? machine.startSymbol}</code>
              </div>
            )}
          </section>

          <section className="cfg-trace-card" aria-label="Secuencia de derivación">
            <div className="cfg-panel-head">
              <h3>Secuencia de derivación</h3>
              <span className="cfg-tuple-badge">
                {mode === 'guided' ? (strategy === 'leftmost' ? '→_L' : '→_R') : '→_G'}
              </span>
            </div>
            <ol className="cfg-trace-list">
              {(mode === 'guided' ? guidedSteps : manualState.steps).map((step) => {
                const isCurrent = mode === 'guided' ? step.step === cursor : step.step === manualCursor;
                return (
                  <li key={step.step} className="cfg-trace-item">
                    <button
                      type="button"
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => {
                        if (mode === 'guided') {
                          setPlaying(false);
                          setCursor(step.step);
                        } else {
                          setManualCursor(step.step);
                        }
                      }}
                    >
                      <span className="cfg-trace-step-num">{step.step}</span>
                      <span className="cfg-trace-formula">
                        {step.step === 0 ? step.formula : `${strategy === 'rightmost' && mode === 'guided' ? '→_R' : mode === 'guided' ? '→_L' : '⇒'} ${step.formula}`}
                      </span>
                      {step.production && <span className="cfg-trace-rule">{formatProduction(step.production)}</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </section>
    </div>
  );
}
