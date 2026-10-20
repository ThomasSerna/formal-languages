import { useEffect, useRef, useState } from 'react';
import type { Machine } from '../domain';
import { LIMITS } from '../domain';
import type { Run } from '../engine';
import { stateName } from '../format';
import './Simulator.css';

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
  const stackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (stackRef.current) stackRef.current.scrollTop = 0; }, [config?.stack, run?.step]);
  const symbols = Array.from(input);
  const inputIndex = config?.inputIndex ?? (machine.kind === 'dfa' || machine.kind === 'nfa' ? Math.min(run?.step ?? 0, symbols.length) : 0);
  const canAdvance = !!run && !error && (run.status === 'running' || props.cursor < props.trace.length - 1);
  const status = !run ? 'Sin ejecutar' : run.step === 0 && run.status === 'running' ? 'Lista para empezar' : STATUS_LABEL[run.status];
  const motionKey = `${machine.kind}:${run?.step ?? 0}:${branch}`;
  return <section className={`simulator simulator-${machine.kind}`} aria-label="Simulación de la cadena">
    <div className="simulation-top">
      <div className="simulation-input">
        <label className="sr-only" htmlFor="input-word">Cadena de entrada</label>
        <div className="input-with-action"><input id="input-word" value={input} onChange={event => props.onInput(event.target.value)} placeholder="ε" spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? 'input-error' : 'input-help'} /><button disabled={!symbols.length} onClick={() => props.onInput(symbols.slice(0, -1).join(''))} aria-label="Borrar último símbolo" title="Borrar último símbolo"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 4h10v12H7l-5-6 5-6ZM9 7l5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button><button onClick={() => props.onInput('')} aria-label="Usar ε" title="Probar la cadena vacía">ε</button></div>
        <div className="input-alphabet" role="group" aria-label="Añadir símbolos"><span aria-hidden="true">Σ</span>{machine.alphabet.map(symbol => <button key={symbol} disabled={symbols.length >= LIMITS.input} onClick={() => props.onInput(input + symbol)} aria-label={`Añadir ${symbol}`} title={`Añadir ${symbol}`}>{symbol}</button>)}</div>
        <p className="sr-only" id="input-help">Entrada vacía: ε. Hasta {LIMITS.input} símbolos.</p>
      </div>
      <div className="playback"><div className="playback-buttons">
        <button disabled={!run || props.cursor === 0} onClick={props.onPrevious} aria-label="Anterior" title="Anterior"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 4v12M15 5l-7 5 7 5V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <button className="primary play-control" disabled={!canAdvance && !props.playing} onClick={props.onTogglePlay}><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">{props.playing ? <path d="M7 4v12M13 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <path d="m6 4 10 6-10 6V4Z" fill="currentColor" strokeLinejoin="round" />}</svg>{props.playing ? 'Pausar' : 'Reproducir'}</button>
        <button className="next-step" disabled={!canAdvance} onClick={props.onNext} aria-label="Paso siguiente" title="Paso siguiente"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M15 4v12M5 5l7 5-7 5V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <button onClick={props.onReset} aria-label="Reiniciar" title="Reiniciar"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 8a6 6 0 1 1 0 4M4 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div><label className="speed-control"><span className="sr-only">Velocidad</span><select aria-label="Velocidad" value={props.speed} onChange={event => props.onSpeed(Number(event.target.value))}><option value={1400}>Lenta</option><option value={800}>Normal</option><option value={300}>Rápida</option></select></label></div>
    </div>
    {error && <p className="form-error" id="input-error" role="alert">{error}</p>}
    <div className="run-overview"><span className={`run-status ${run?.status ?? 'idle'}`}><span key={`${machine.kind}:${run?.status ?? 'idle'}`} className="status-dot" aria-hidden="true" />{status}</span><span className="step-count">Paso <strong>{run?.step ?? 0}</strong>{machine.kind !== 'tm' && <> · {inputIndex} de {symbols.length} símbolos</>}</span></div>
    <div className="execution-layout">
      <div className="execution-main">
        {machine.kind !== 'tm' && <div className="input-preview"><div className="symbol-strip" aria-label="Posición en la entrada">{symbols.length ? symbols.map((symbol, index) => <span key={index} className={`symbol-cell ${index < inputIndex ? 'consumed' : index === inputIndex ? 'current-symbol' : ''}`} aria-current={index === inputIndex ? 'step' : undefined}><small>{index + 1}</small>{symbol}</span>) : <span className="empty-symbol">ε <small>cadena vacía</small></span>}<span className="word-end" title="Fin de la entrada">fin</span></div></div>}
        {machine.kind === 'tm' && config && <div className="tape-area"><div className="configuration-heading"><strong>Cinta de trabajo</strong><span>Cabezal en {config.head ?? 0}</span></div><div className="tape" aria-label="Cinta y posición del cabezal">{Array.from({ length: 12 }, (_, offset) => Math.max(0, (config.head ?? 0) - 4) + offset).map(index => { const value = config.tape?.[index] ?? (index === 0 ? machine.leftMarker : machine.blankSymbol); return <div key={index} className={`tape-cell ${index === config.head ? 'head-cell' : ''}`} aria-label={`Celda ${index}: ${value}${index === config.head ? ', cabezal' : ''}`}><small>{index}</small><span key={value} className="configuration-value">{value}</span>{index === config.head && <b key={motionKey} className="head-label">cabezal</b>}</div>; })}<span className="tape-continuation" aria-label="La cinta continúa a la derecha">···</span></div></div>}
      </div>
      <div className={`configuration-panel${machine.kind === 'pda' ? ' branch-panel' : ''}`}><div className="configuration-heading"><strong>{machine.kind === 'nfa' ? 'Estados activos' : machine.kind === 'pda' ? 'Ramas' : 'Estado actual'}</strong>{machine.kind === 'pda' && <span>{run?.configurations.length ?? 0} activas</span>}</div>
        {machine.kind === 'nfa' ? <div className="state-chips">{run?.configurations.length ? run.configurations.map(item => <span className="state-chip" key={item.stateId}><span key={motionKey} className="configuration-value">{stateName(machine, item.stateId)}</span></span>) : <code>∅</code>}</div> : machine.kind === 'pda' ? <>
          {!!run?.configurations.length && <label className="branch-label"><span className="sr-only">Rama a inspeccionar</span><select value={branch} onChange={event => setBranch(Number(event.target.value))}>{run.configurations.map((item, index) => <option value={index} key={index}>{index + 1}. {stateName(machine, item.stateId)} · posición {item.inputIndex}</option>)}</select></label>}
        </> : <span className="state-chip large"><span key={motionKey} className="configuration-value">{config ? stateName(machine, config.stateId) : '—'}</span></span>}
      </div>
      {machine.kind === 'pda' && <section className="configuration-panel stack-panel" aria-labelledby="stack-heading">
        <div className="configuration-heading"><strong id="stack-heading">Pila</strong></div>
        <div className="stack-scroll" ref={stackRef} role="region" aria-label="Pila de la rama seleccionada" tabIndex={0}>
          {config?.stack?.length ? <ol className="stack-cells" role="list" aria-label="Símbolos de la pila, del tope al fondo">
            {config.stack.map((symbol, index, stack) => <li key={`${stack.length - index}:${symbol}`} className={`stack-cell${index === 0 ? ' stack-top' : ''}`} aria-label={`${symbol}${index === 0 ? ', tope' : ''}`}>
              <span className="stack-symbol">{symbol}</span>{index === 0 && <small className="stack-top-label" key={motionKey}>Tope</small>}
            </li>)}
          </ol> : <p className="stack-empty">{config ? 'Pila vacía' : 'Sin configuración'}</p>}
        </div>
      </section>}
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{status}{run && `. ${run.message}`}</p>
    {run?.status === 'inconclusive' && <p className="run-notice">{run.message}</p>}
    {props.trace.length > 1 && <div className="execution-timeline"><span aria-hidden="true">Paso 0</span><label className="sr-only" htmlFor="execution-timeline">Recorrer pasos calculados</label><input id="execution-timeline" type="range" min={0} max={props.trace.length - 1} step={1} value={props.cursor} aria-valuetext={`Paso ${run?.step ?? 0} de ${props.trace[props.trace.length - 1].step}`} onChange={event => props.onSeek(Number(event.target.value))} /><span aria-hidden="true">{props.trace[props.trace.length - 1].step}</span></div>}
    {run && <details className="step-detail"><summary>Detalle del paso</summary><p className="step-explanation">{run.message}</p></details>}
    {props.trace.length > 1 && <details className="history"><summary>Historial de cálculo <span>{props.trace.length - 1} {props.trace.length === 2 ? 'paso' : 'pasos'}</span></summary><ol>{props.trace.slice(Math.max(0, props.cursor - 5), Math.max(6, props.cursor + 1)).map((entry, offset) => { const index = Math.max(0, props.cursor - 5) + offset; return <li key={index}><button className={index === props.cursor ? 'current-history' : ''} onClick={() => props.onSeek(index)}><strong>Paso {entry.step}</strong><span>{entry.message}</span></button></li>; })}</ol></details>}
  </section>;
}
