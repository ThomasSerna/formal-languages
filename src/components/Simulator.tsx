import { useEffect, useState } from 'react';
import type { Machine } from '../domain';
import type { Run } from '../engine';
import { stateName, word } from '../format';

export interface TraceItem { step: number; message: string; status: string }
interface Props {
  machine: Machine; input: string; onInput: (input: string) => void;
  run: Run | null; error: string | null; playing: boolean; speed: number;
  onSpeed: (speed: number) => void; onNext: () => void; onPrevious: () => void;
  onReset: () => void; onTogglePlay: () => void;
  trace: TraceItem[]; cursor: number; onSeek: (index: number) => void;
}

const STATUS_LABEL = { running: 'En curso', accepted: 'Aceptada', rejected: 'Rechazada', inconclusive: 'Resultado inconcluso' };

export default function Simulator(props: Props) {
  const { machine, run, input, error } = props;
  const [branch, setBranch] = useState(0);
  useEffect(() => setBranch(0), [run?.step, machine.kind]);
  const config = run?.configurations[branch] ?? run?.configurations[0];
  const symbols = Array.from(input);
  const inputIndex = config?.inputIndex ?? (machine.kind === 'dfa' || machine.kind === 'nfa' ? Math.min(run?.step ?? 0, symbols.length) : 0);
  const canAdvance = !!run && !error && (run.status === 'running' || props.cursor < props.trace.length - 1);
  const status = !run ? 'Sin ejecutar' : run.step === 0 && run.status === 'running' ? 'Lista para empezar' : STATUS_LABEL[run.status];
  const motionKey = `${machine.kind}:${run?.step ?? 0}:${branch}`;
  return <section className="simulator" aria-labelledby="simulation-heading">
    <div className="simulation-top">
      <div className="simulation-input"><h2 id="simulation-heading">Prueba una cadena</h2><label className="sr-only" htmlFor="input-word">Cadena de entrada</label><div className="input-with-action"><input id="input-word" value={input} onChange={event => props.onInput(event.target.value)} placeholder="Vacío representa ε" spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? 'input-error' : 'input-help'} /><button onClick={() => props.onInput('')} title="Probar la cadena vacía">Usar ε</button></div><p className="field-hint" id="input-help">Símbolos de Σ = {'{'}{machine.alphabet.join(', ')}{'}'}. Vacío = ε.</p></div>
      <div className="playback"><div className="playback-buttons"><button disabled={!run || props.cursor === 0} onClick={props.onPrevious}>Anterior</button><button className="primary next-step" disabled={!canAdvance} onClick={props.onNext}>Paso siguiente <span aria-hidden="true">→</span></button><button disabled={!canAdvance && !props.playing} onClick={props.onTogglePlay}>{props.playing ? 'Pausar' : 'Reproducir'}</button><button onClick={props.onReset}>Reiniciar</button></div><label className="speed-control">Velocidad<select aria-label="Velocidad" value={props.speed} onChange={event => props.onSpeed(Number(event.target.value))}><option value={1400}>Lenta</option><option value={800}>Normal</option><option value={300}>Rápida</option></select></label></div>
    </div>
    {error && <p className="form-error" id="input-error" role="alert">{error}</p>}
    <div className="run-overview"><span className={`run-status ${run?.status ?? 'idle'}`}><span key={`${machine.kind}:${run?.status ?? 'idle'}`} className="status-dot" aria-hidden="true" />{status}</span><span className="step-count">Paso <strong>{run?.step ?? 0}</strong>{machine.kind !== 'tm' && <> · {inputIndex} de {symbols.length} símbolos</>}</span></div>
    <div className="execution-layout">
      <div className="execution-main">
        <div className="symbol-strip" aria-label={machine.kind === 'tm' ? 'Entrada inicial de la cinta' : 'Posición en la entrada'}>{symbols.length ? symbols.map((symbol, index) => <span key={index} className={`symbol-cell ${machine.kind !== 'tm' ? index < inputIndex ? 'consumed' : index === inputIndex ? 'current-symbol' : '' : ''}`}><small>{index + 1}</small>{symbol}</span>) : <span className="empty-symbol">ε <small>cadena vacía</small></span>}<span className="word-end" title="Fin de la entrada">fin</span></div>
        <p className="step-explanation" aria-live="polite" aria-atomic="true">{run?.message ?? 'Completa los datos del modelo para comenzar la simulación.'}</p>
        {machine.kind === 'tm' && config && <div className="tape-area"><div className="configuration-heading"><strong>Cinta de trabajo</strong><span>Cabezal en {config.head ?? 0}</span></div><div className="tape" aria-label="Cinta y posición del cabezal">{Array.from({ length: 12 }, (_, offset) => Math.max(0, (config.head ?? 0) - 4) + offset).map(index => { const value = config.tape?.[index] ?? (index === 0 ? machine.leftMarker : machine.blankSymbol); return <div key={index} className={`tape-cell ${index === config.head ? 'head-cell' : ''}`} aria-label={`Celda ${index}: ${value}${index === config.head ? ', cabezal' : ''}`}><small>{index}</small><span key={value} className="configuration-value">{value}</span>{index === config.head && <b key={motionKey} className="head-label">cabezal</b>}</div>; })}<span className="tape-continuation" aria-label="La cinta continúa a la derecha">···</span></div></div>}
      </div>
      <div className="configuration-panel"><div className="configuration-heading"><strong>{machine.kind === 'nfa' ? 'Estados activos' : machine.kind === 'pda' ? 'Configuraciones activas' : 'Estado actual'}</strong></div>
        {machine.kind === 'nfa' ? <div className="state-chips">{run?.configurations.length ? run.configurations.map(item => <span className="state-chip" key={item.stateId}><span key={motionKey} className="configuration-value">{stateName(machine, item.stateId)}</span></span>) : <code>∅</code>}</div> : machine.kind === 'pda' ? <>
          {!!run?.configurations.length && <label className="branch-label">Rama a inspeccionar<select value={branch} onChange={event => setBranch(Number(event.target.value))}>{run.configurations.map((item, index) => <option value={index} key={index}>{index + 1}. {stateName(machine, item.stateId)} · posición {item.inputIndex} · {word(item.stack ?? [])}</option>)}</select></label>}
          <div className="stack-view"><span className="field-hint">Tope a la izquierda</span><code><span key={motionKey} className="configuration-value">{config ? word(config.stack ?? []) : '∅'}</span></code><span className="field-hint">Pendiente: <code>{word(symbols.slice(config?.inputIndex ?? 0))}</code></span></div>
          <p className="field-hint">{run?.configurations.length ?? 0} ramas activas. Basta una aceptante.</p>
        </> : <span className="state-chip large"><span key={motionKey} className="configuration-value">{config ? stateName(machine, config.stateId) : '—'}</span></span>}
        <p className="field-hint">{machine.kind === 'dfa' ? 'El contorno azul del grafo indica dónde estás.' : machine.kind === 'nfa' ? 'Todos estos caminos se exploran a la vez.' : machine.kind === 'tm' ? 'Una transición puede escribir y volver a una celda anterior.' : 'Cada rama conserva su propia pila y posición de entrada.'}</p>
      </div>
    </div>
    {props.trace.length > 1 && <details className="history"><summary>Historial de cálculo <span>{props.trace.length - 1} pasos</span></summary><ol>{props.trace.slice(Math.max(0, props.cursor - 5), Math.max(6, props.cursor + 1)).map((entry, offset) => { const index = Math.max(0, props.cursor - 5) + offset; return <li key={index}><button className={index === props.cursor ? 'current-history' : ''} onClick={() => props.onSeek(index)}><strong>Paso {entry.step}</strong><span>{entry.message}</span></button></li>; })}</ol></details>}
  </section>;
}
