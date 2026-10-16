import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Machine, MachineKind } from './domain';
import { createRun, stepRun, validateInput, validateMachine } from './engine';
import type { Run } from './engine';
import { createBlankMachine, EXAMPLES, EXAMPLE_INPUTS } from './examples';
import { exportMachine, loadDraft, parseMachineJson, saveDraft } from './storage';
import { MODEL_NAMES, MODEL_SHORT, ruleLabel, stateName, tuple } from './format';
import GraphEditor from './components/GraphEditor';
import Inspector from './components/Inspector';
import Simulator from './components/Simulator';

const KINDS: MachineKind[] = ['dfa', 'nfa', 'pda', 'tm'];
const MODEL_DESCRIPTIONS: Record<MachineKind, string> = { dfa: 'Un símbolo, un camino.', nfa: 'Varios caminos, una posibilidad.', pda: 'Una memoria en forma de pila.', tm: 'Lee, escribe y vuelve atrás.' };
type TapeChange = { index: number; before: string | undefined; after: string | undefined };
type Entry = { run: Run; change?: TapeChange };
type Simulation = { current: Run; entries: Entry[]; cursor: number };

// Keep tape edits, not a complete copy of a growing tape for every history entry.
function historyRun(run: Run): Run {
  return { ...run, configurations: run.configurations.map(({ tape: _tape, ...config }) => config) };
}
function tapeChange(before: Run, after: Run): TapeChange | undefined {
  const index = before.configurations[0]?.head;
  if (index === undefined) return undefined;
  const previous = before.configurations[0]?.tape?.[index];
  const next = after.configurations[0]?.tape?.[index];
  return previous === next ? undefined : { index, before: previous, after: next };
}
function seekSimulation(sim: Simulation, target: number): Simulation {
  if (target === sim.cursor) return sim;
  const tape = sim.current.configurations[0]?.tape;
  if (!tape) return { ...sim, cursor: target, current: sim.entries[target].run };
  const restored = { ...tape };
  const direction = target > sim.cursor ? 1 : -1;
  for (let cursor = sim.cursor; cursor !== target; cursor += direction) {
    const change = sim.entries[direction > 0 ? cursor + 1 : cursor].change;
    if (change) {
      const value = direction > 0 ? change.after : change.before;
      if (value === undefined) delete restored[change.index]; else restored[change.index] = value;
    }
  }
  const current = sim.entries[target].run;
  return { ...sim, cursor: target, current: { ...current, configurations: current.configurations.map(config => ({ ...config, tape: restored })) } };
}

export default function App() {
  const [machines, setMachines] = useState<Record<MachineKind, Machine>>(() => Object.fromEntries(KINDS.map(kind => [kind, loadDraft(kind) ?? structuredClone(EXAMPLES[kind])])) as Record<MachineKind, Machine>);
  const [kind, setKind] = useState<MachineKind>('dfa');
  const [inputs, setInputs] = useState({ ...EXAMPLE_INPUTS });
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [addingTransition, setAddingTransition] = useState(false);
  const [guide, setGuide] = useState(true);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [notice, setNotice] = useState('');
  const [confirmReplace, setConfirmReplace] = useState<'blank' | 'example' | null>(null);
  const [newConnection, setNewConnection] = useState<{from: string; to: string} | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const machine = machines[kind];
  const input = inputs[kind];
  const issues = useMemo(() => validateMachine(machine), [machine]);
  const inputError = useMemo(() => validateInput(machine, input), [machine, input]);
  const initialRun = useMemo(() => issues.length || inputError ? null : createRun(machine, input), [machine, input, issues.length, inputError]);
  const run = simulation?.current ?? initialRun;
  const reset = useCallback(() => { setPlaying(false); setSimulation(null); }, []);

  function changeMachine(next: Machine, layoutOnly = false) {
    if (!layoutOnly) reset();
    setMachines(current => ({ ...current, [next.kind]: next }));
    const error = saveDraft(next);
    if (error) setNotice(error);
    return error;
  }
  function selectState(id: string | null) { setSelectedStateId(id); setSelectedTransitionId(null); setAddingTransition(false); setNewConnection(null); }
  function selectTransition(id: string | null) { setSelectedTransitionId(id); setSelectedStateId(null); setAddingTransition(false); setNewConnection(null); }
  function selectModel(next: MachineKind) {
    reset(); setKind(next); setSelectedStateId(null); setSelectedTransitionId(null); setAddingTransition(false); setConfirmReplace(null); setNewConnection(null); setNotice('');
  }
  function replaceMachine(action: 'blank' | 'example') {
    const next = action === 'blank' ? createBlankMachine(kind) : structuredClone(EXAMPLES[kind]);
    const saveError = changeMachine(next); setSelectedStateId(null); setSelectedTransitionId(null); setAddingTransition(false); setConfirmReplace(null);
    if (action === 'example') setInputs(current => ({ ...current, [kind]: EXAMPLE_INPUTS[kind] }));
    setNotice(saveError ?? (action === 'blank' ? 'Lienzo nuevo. Agrega un estado para comenzar.' : 'Ejemplo restaurado. Puedes editarlo libremente.'));
  }
  function addState() {
    if (machine.states.length >= 50) return setNotice('El documento permite hasta 50 estados.');
    let number = machine.states.length;
    while (machine.states.some(state => state.name === `q${number}`)) number++;
    const id = crypto.randomUUID();
    changeMachine({ ...machine, states: [...machine.states, { id, name: `q${number}`, x: 100 + (machine.states.length % 4) * 150, y: 100 + Math.floor(machine.states.length / 4) * 130 }], initialStateIds: machine.states.length === 0 ? [id] : machine.initialStateIds });
    selectState(id);
  }
  const nextStep = useCallback(() => {
    setSimulation(previous => {
      const base = previous ?? (initialRun ? { current: initialRun, entries: [{ run: kind === 'tm' ? historyRun(initialRun) : initialRun }], cursor: 0 } : null);
      if (!base) return null;
      if (base.cursor < base.entries.length - 1) return seekSimulation(base, base.cursor + 1);
      if (base.current.status !== 'running') return base;
      const next = stepRun(machine, base.current);
      return { current: next, cursor: base.cursor + 1, entries: [...base.entries, { run: kind === 'tm' ? historyRun(next) : next, change: tapeChange(base.current, next) }] };
    });
  }, [initialRun, kind, machine]);
  useEffect(() => {
    if (!playing) return;
    if (!run || (run.status !== 'running' && (!simulation || simulation.cursor === simulation.entries.length - 1))) { setPlaying(false); return; }
    const timer = window.setTimeout(nextStep, speed);
    return () => window.clearTimeout(timer);
  }, [playing, run, nextStep, simulation, speed]);
  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => document.removeEventListener('visibilitychange', stopWhenHidden);
  }, []);

  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('El archivo supera el límite de 1 MB.');
      const imported = parseMachineJson(await file.text());
      // Preserve the current draft before replacing it with an imported document.
      exportMachine(machines[imported.kind]);
      const saveError = changeMachine(imported); selectModel(imported.kind); setNotice(saveError ?? 'Archivo importado. Se descargó una copia del borrador anterior.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo leer el archivo JSON.'); }
    if (importRef.current) importRef.current.value = '';
  }

  return <>
    <a className="skip-link" href="#simulation-heading">Ir a la simulación</a>
    <header className="app-header"><a className="brand" href={import.meta.env.BASE_URL} aria-label="Autómata, inicio"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M9 23L18 10L28 23" /><circle cx="9" cy="25" r="5" /><circle cx="18" cy="9" r="5" /><circle cx="28" cy="25" r="5" /></svg><span>autómata<span className="brand-subtitle">Laboratorio de lenguajes formales</span></span></a><div className="header-actions"><button className="text-button" onClick={() => setGuide(value => !value)}>{guide ? 'Ocultar guía' : 'Mostrar guía'}</button><span className="header-divider" /><button onClick={() => importRef.current?.click()}>Importar</button><button onClick={() => exportMachine(machine)}>Exportar JSON</button><input ref={importRef} className="sr-only" type="file" accept=".json,application/json" aria-label="Importar autómata JSON" onChange={event => void importFile(event.target.files?.[0])} /></div></header>
    <main className="app-main">
      <nav className="model-nav" data-model={kind} aria-label="Tipo de autómata">{KINDS.map(item => <button key={item} className={item === kind ? 'active' : ''} aria-current={item === kind ? 'page' : undefined} onClick={() => selectModel(item)}><span className="model-abbr">{MODEL_SHORT[item]}</span><span className="model-description">{MODEL_DESCRIPTIONS[item]}</span></button>)}</nav>
      <div className="page-title"><div><h1>{MODEL_NAMES[kind]}</h1><p>Construye el grafo. Sigue el cálculo. Entiende cada paso.</p></div><span className="notation-tag">{tuple(machine)}</span></div>
      {guide && <div className="guide"><span className="guide-number">1</span><p><strong>Aprende probando.</strong> Usa «Paso siguiente» para seguir la cadena. Selecciona un estado o una flecha para descubrir qué significa y cambiarlo.</p><button className="text-button" onClick={() => setGuide(false)}>Entendido</button></div>}
      {notice && <div className="notice" role="status"><span>{notice}</span><button className="text-button" onClick={() => setNotice('')}>Cerrar aviso</button></div>}
      <section className={`workspace workspace-${kind}`} aria-label="Editor del autómata">
        <div className="workspace-top"><div className="document-title"><span className="document-dot" /><h2>{machine.name || 'Autómata sin nombre'}</h2><span className="editable-label">Editable</span></div><div className="document-actions"><button className="text-button" onClick={() => setConfirmReplace('example')}>Cargar ejemplo</button><button onClick={() => setConfirmReplace('blank')}>Crear desde cero</button></div></div>
        {confirmReplace && <div className="replace-confirm" role="group" aria-label="Confirmar reemplazo"><p>Se reemplazará el borrador de {MODEL_SHORT[kind]}. Puedes exportarlo antes para conservarlo.</p><div className="button-row"><button onClick={() => exportMachine(machine)}>Exportar borrador</button><button className="primary" onClick={() => replaceMachine(confirmReplace)}>{confirmReplace === 'blank' ? 'Abrir lienzo vacío' : 'Restaurar ejemplo'}</button><button onClick={() => setConfirmReplace(null)}>Cancelar</button></div></div>}
        <div className="workspace-grid"><div className="graph-column"><div className="graph-toolbar"><div className="button-row"><button onClick={addState}>Agregar estado</button><button disabled={!machine.states.length} onClick={() => { setSelectedTransitionId(null); setAddingTransition(true); setNewConnection(null); }}>Agregar transición</button></div><span className="graph-size">{machine.states.length} estados · {machine.transitions.length} reglas</span></div>
          <GraphEditor machine={machine} selectedStateId={selectedStateId} selectedTransitionId={selectedTransitionId} activeStateIds={run?.configurations.map(config => config.stateId) ?? []} activeTransitionIds={run?.transitionIds ?? []} onSelectState={selectState} onSelectTransition={selectTransition} onMoveState={(id, x, y) => changeMachine({ ...machine, states: machine.states.map(state => state.id === id ? { ...state, x, y } : state) }, true)} onConnect={(from, to) => { setSelectedStateId(from); setSelectedTransitionId(null); setNewConnection({ from, to }); setAddingTransition(true); }} />
          <div className="graph-footer"><div className="graph-legend"><span><i className="legend-initial" />Inicial</span><span><i className="legend-final" />Aceptación</span><span><i className="legend-active" />Activo</span></div><span>Arrastra para mover · conecta desde los puntos</span></div>
          <div className="compact-playback"><div><span>Entrada <code>{input || 'ε'}</code> · paso {run?.step ?? 0}</span><a href="#simulation-heading">Cambiar cadena</a></div><button className="primary" aria-label="Avanzar en el grafo" disabled={!run || run.status !== 'running'} onClick={() => { setPlaying(false); nextStep(); }}>Paso siguiente →</button>{run?.configurations.length ? <p className="compact-configuration">{kind === 'nfa' ? `Activos: ${run.configurations.map(config => stateName(machine, config.stateId)).join(', ')}` : `${stateName(machine, run.configurations[0].stateId)}${kind === 'pda' ? ` · pila: ${run.configurations[0].stack?.join('') || 'ε'} · posición: ${run.configurations[0].inputIndex} · ${run.configurations.length} ramas` : kind === 'tm' ? ` · cabezal: ${run.configurations[0].head} · lee: ${run.configurations[0].tape?.[run.configurations[0].head ?? 0] ?? (machine.kind === 'tm' ? machine.blankSymbol : '')}` : ` · posición: ${run.configurations[0].inputIndex}`}`}</p> : null}<p>{run?.message ?? 'Completa el modelo para ejecutar.'}</p></div>
        </div><Inspector key={kind} machine={machine} selectedStateId={selectedStateId} selectedTransitionId={selectedTransitionId} addingTransition={addingTransition} onChange={changeMachine} onSelectState={selectState} onSelectTransition={selectTransition} onCancelTransition={() => { setAddingTransition(false); setNewConnection(null); }} connection={newConnection} /></div>
      </section>
      {issues.length > 0 && <details className="validation" open><summary>Completa el modelo antes de ejecutar · {issues.length} {issues.length === 1 ? 'detalle' : 'detalles'}</summary><ul>{issues.slice(0, 12).map((issue, index) => <li key={index}><button onClick={() => { if (issue.transitionId) selectTransition(issue.transitionId); else if (issue.stateId) selectState(issue.stateId); else selectState(null); }}>{issue.message}</button></li>)}</ul>{issues.length > 12 && <p>Hay {issues.length - 12} detalles adicionales. Completa los primeros para continuar.</p>}</details>}
      <Simulator machine={machine} input={input} onInput={value => { reset(); setInputs(current => ({ ...current, [kind]: value })); }} run={run} error={inputError || (issues.length ? 'Completa los detalles del modelo que aparecen arriba.' : null)} playing={playing} speed={speed} onSpeed={setSpeed} onNext={() => { setPlaying(false); nextStep(); }} onPrevious={() => { setPlaying(false); setSimulation(previous => previous && previous.cursor > 0 ? seekSimulation(previous, previous.cursor - 1) : previous); }} onReset={reset} onTogglePlay={() => setPlaying(value => !value)} trace={simulation?.entries.map(entry => ({ step: entry.run.step, status: entry.run.status, message: entry.run.message })) ?? []} cursor={simulation?.cursor ?? 0} onSeek={index => { setPlaying(false); setSimulation(previous => previous ? seekSimulation(previous, index) : null); }} />
      <section className="reference-section" aria-label="Representación textual"><details><summary>Estados y transiciones <span>Alternativa accesible al grafo</span></summary><div className="text-model"><div><h3>Estados · Q</h3><div className="state-list">{machine.states.map(state => <button key={state.id} onClick={() => selectState(state.id)}>{state.name}{machine.initialStateIds.includes(state.id) ? ' · inicial' : ''}{machine.acceptingStateIds.includes(state.id) ? ' · acepta' : ''}{machine.kind === 'tm' && machine.rejectStateId === state.id ? ' · rechaza' : ''}</button>)}{!machine.states.length && <p>Agrega el primer estado desde la barra de herramientas.</p>}</div></div><div className="transition-table-wrap"><h3>Reglas · {kind === 'nfa' ? 'Δ' : 'δ'}</h3><table><thead><tr><th>Origen</th><th>Regla</th><th>Destino</th><th><span className="sr-only">Acción</span></th></tr></thead><tbody>{machine.transitions.map(rule => <tr key={rule.id}><td>{stateName(machine, rule.from)}</td><td><code>{ruleLabel(rule)}</code></td><td>{stateName(machine, rule.to)}</td><td><button className="text-button" aria-label={`Editar transición ${stateName(machine, rule.from)} ${ruleLabel(rule)} ${stateName(machine, rule.to)}`} onClick={() => selectTransition(rule.id)}>Editar</button></td></tr>)}</tbody></table>{kind === 'tm' && <p className="field-hint">Toda regla omitida δ(p, a) = (r, a, R). Los estados t y r conservan su estado y el símbolo, y mueven R; la simulación se detiene al entrar en ellos.</p>}</div></div></details><details><summary>Entender este modelo <span>Notación y criterios de aceptación</span></summary><div className="theory"><p><strong>{MODEL_NAMES[kind]}.</strong> {kind === 'dfa' ? 'Tiene exactamente una transición por cada par estado–símbolo. Un estado final solo acepta cuando ya no queda entrada. Durante la construcción puedes guardar un borrador incompleto; para ejecutarlo, δ debe estar definida en todo Q × Σ.' : kind === 'nfa' ? 'Mantiene un conjunto de estados posibles, comenzando por S. Cada símbolo actualiza ese conjunto. La clausura ε añade todos los estados alcanzables sin consumir entrada, incluso al inicio y al final. Se acepta si algún estado activo pertenece a F al terminar la cadena.' : kind === 'pda' ? 'La configuración incluye estado, entrada pendiente y contenido de la pila. Una transición retira el tope A y lo reemplaza por una palabra γ de Γ*. El extremo izquierdo de γ queda arriba. ε permite no leer entrada o retirar sin reemplazar; no significa que se pueda ignorar el tope. Aquí aceptamos por estado final con la entrada consumida, aunque la pila no esté vacía.' : 'Tiene una cinta infinita hacia la derecha. La configuración inicial pone el cabezal sobre el marcador ⊢ y la entrada a su derecha; las otras celdas contienen blanco ␣. Una regla lee, escribe, mueve L o R y cambia de estado. El marcador nunca se sobrescribe ni se cruza. Alcanzar t acepta; alcanzar r rechaza. Una ejecución puede no terminar.'}</p><p>ε es la cadena vacía; ∅ es un conjunto sin elementos. Un resultado inconcluso indica que la simulación alcanzó un límite de recursos, y no demuestra rechazo.</p><a href="https://sites.google.com/site/sergiosramirezrico/eafit/si2002-st0270?authuser=0" target="_blank" rel="noreferrer">Ver material del curso</a></div></details></section>
      <footer className="app-footer"><span>Aprender es recorrer el camino.</span><span>Basado en <a href="https://www.cs.cornell.edu/courses/cs6861/2024sp/Handouts/ACLec2-6.pdf" target="_blank" rel="noreferrer">Kozen · Automata and Computability</a></span><span>Borradores en este navegador</span></footer>
    </main>
  </>;
}
