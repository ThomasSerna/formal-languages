import { useEffect, useRef, useState } from 'react';
import type { FiniteMachine } from '../domain';
import { LIMITS } from '../domain';
import { compareLanguage, semanticKey } from '../languages';
import type { ComparisonResult, LanguageSpec } from '../languages';
import './LanguageProof.css';

export type ProofActivity = { kind: 'dfa' | 'nfa'; key: string; states: string[]; transitionIds: string[]; step: number };
type Props = { machine: FiniteMachine; active: boolean; visible: boolean; onHighlight: (activity: ProofActivity) => void; onTryWord: (word: string) => void };
const conditionNames = { count: 'Cantidad de un símbolo', length: 'Longitud', prefix: 'Comienza con', suffix: 'Termina en', contains: 'Contiene' };

export default function LanguageProof({ machine, active, visible, onHighlight, onTryWord }: Props) {
  const key = semanticKey(machine);
  const latestKey = useRef(key);
  latestKey.current = key;
  const request = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<'builder' | 'regex'>('builder');
  const [condition, setCondition] = useState<keyof typeof conditionNames>('count');
  const [symbol, setSymbol] = useState(machine.alphabet.includes('1') ? '1' : machine.alphabet[0] ?? '');
  const [modulus, setModulus] = useState(2);
  const [remainder, setRemainder] = useState(0);
  const [word, setWord] = useState('');
  const [source, setSource] = useState('');
  const [comparison, setComparison] = useState<{ key: string; result: ComparisonResult } | null>(null);
  const [checking, setChecking] = useState(false);
  const [traceIndex, setTraceIndex] = useState(0);
  const [foundationOpen, setFoundationOpen] = useState(false);
  const [referencePage, setReferencePage] = useState(0);
  const result = comparison?.key === key ? comparison.result : null;
  const certificate = result?.status === 'equivalent' ? result.certificate : null;

  function invalidate() {
    request.current?.abort(); request.current = null;
    setChecking(false); setComparison(null); setTraceIndex(0); setReferencePage(0);
  }
  useEffect(() => { invalidate(); }, [key]); // A certificate belongs to the mathematical definition, not its layout.
  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!active) return;
    let states: string[] = [], transitionIds: string[] = [];
    if (result?.status === 'different') {
      const frame = result.trace[traceIndex];
      if (frame) { states = frame.states; transitionIds = frame.transitionIds; }
    }
    onHighlight({ kind: machine.kind, key, states, transitionIds, step: traceIndex });
  }, [active, key, machine.kind, result, traceIndex, onHighlight]);

  const spec: LanguageSpec = mode === 'regex' ? { kind: 'regex', source }
    : condition === 'count' ? { kind: 'count', symbol, modulus, remainder }
      : condition === 'length' ? { kind: 'length', modulus, remainder }
        : { kind: condition, word };
  const description = mode === 'regex' ? source || 'Expresión pendiente'
    : condition === 'count' || condition === 'length'
      ? `${condition === 'count' ? `Cantidad de «${symbol || '…'}»` : 'Longitud'}: ${modulus === 2 ? remainder === 0 ? 'par' : 'impar' : `resto ${remainder} al dividir entre ${modulus}`}`
      : `${conditionNames[condition]} «${word || '…'}»`;
  const notation = mode === 'regex' ? source || '…'
    : condition === 'count' || condition === 'length' ? `L = {w ∈ Σ* | ${condition === 'count' ? `#${symbol || '…'}(w)` : '|w|'} ≡ ${remainder} (mod ${modulus})}`
      : condition === 'prefix' ? `L = {${word || 'u'}}Σ*` : condition === 'suffix' ? `L = Σ*{${word || 'u'}}` : `L = Σ*{${word || 'u'}}Σ*`;

  async function compare() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setChecking(true); setComparison(null); setTraceIndex(0);
    const requestedKey = key;
    try {
      const value = await compareLanguage(machine, spec, controller.signal);
      if (request.current === controller && !controller.signal.aborted && latestKey.current === requestedKey) setComparison({ key: requestedKey, result: value });
    } catch {
      if (request.current === controller && !controller.signal.aborted) setComparison({ key: requestedKey, result: { status: 'inconclusive', message: 'No se pudo completar el cálculo. La comprobación puede iniciarse de nuevo.' } });
    } finally {
      if (request.current === controller) { request.current = null; setChecking(false); }
    }
  }
  const stateSet = (ids: string[]) => ids.length ? `{${ids.map(id => machine.states.find(state => state.id === id)?.name ?? id).join(', ')}}` : '∅';
  const errorIndex = result?.status === 'invalid' && result.position !== undefined ? Math.max(0, result.position - 1) : null;

  if (!visible) return null;
  return <section className="language-proof" aria-label={`Comprobación ${machine.kind === 'dfa' ? 'AFD' : 'AFN'}`}>
    <form onSubmit={event => { event.preventDefault(); void compare(); }}>
      <div className="proof-mode" role="group" aria-label="Forma de describir el lenguaje"><button type="button" aria-pressed={mode === 'builder'} onClick={() => { if (mode !== 'builder') { invalidate(); setMode('builder'); } }}>Constructor</button><button type="button" aria-pressed={mode === 'regex'} onClick={() => { if (mode !== 'regex') { invalidate(); setMode('regex'); } }}>Expresión regular</button></div>
      {mode === 'builder' ? <div className="language-fields">
        <label>Condición<select value={condition} onChange={event => { invalidate(); setCondition(event.target.value as keyof typeof conditionNames); }}>{Object.entries(conditionNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {(condition === 'count' || condition === 'length') ? <>
          {condition === 'count' && <label>Símbolo contado<select value={symbol} onChange={event => { invalidate(); setSymbol(event.target.value); }}><option value="" disabled>Elegir símbolo</option>{machine.alphabet.map(letter => <option value={letter} key={letter}>{letter}</option>)}</select></label>}
          <label>Módulo<select value={modulus} onChange={event => { invalidate(); const next = Number(event.target.value); setModulus(next); setRemainder(Math.min(remainder, next - 1)); }}>{Array.from({ length: 9 }, (_, i) => i + 2).map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Resto<select value={remainder} onChange={event => { invalidate(); setRemainder(Number(event.target.value)); }}>{Array.from({ length: modulus }, (_, i) => <option key={i}>{i}</option>)}</select></label>
        </> : <div className="language-word"><label htmlFor={`${machine.kind}-language-word`}>Palabra</label><input id={`${machine.kind}-language-word`} value={word} onChange={event => { invalidate(); setWord(event.target.value); }} autoComplete="off" /><span className="proof-symbols">{machine.alphabet.map(letter => <button type="button" key={letter} aria-label={`Añadir ${letter} a la palabra`} disabled={Array.from(word).length >= 32} onClick={() => { invalidate(); setWord(word + letter); }}>{letter}</button>)}</span></div>}
      </div> : <div className="regex-editor"><label htmlFor={`${machine.kind}-regular-expression`}>Expresión regular</label><input id={`${machine.kind}-regular-expression`} value={source} aria-invalid={result?.status === 'invalid' || undefined} aria-describedby={`${machine.kind}-regex-help${result?.status === 'invalid' ? ` ${machine.kind}-language-error` : ''}`} onChange={event => { invalidate(); setSource(event.target.value); }} autoComplete="off" spellCheck={false} placeholder="(0+1)*01" /><div className="proof-symbols">{[...machine.alphabet.filter(letter => !['+', '*', '(', ')', 'ε', '∅', '\\'].includes(letter)), '+', '*', '(', ')', 'ε', '∅'].map(letter => <button type="button" key={letter} aria-label={`Añadir ${letter} a la expresión`} onClick={() => { invalidate(); setSource(source + (/\s/u.test(letter) ? `\\${letter}` : letter)); }}>{letter}</button>)}</div><small id={`${machine.kind}-regex-help`}>+ unión · ab concatenación · * repetición · \ literal</small></div>}
      {mode === 'builder' && <div className="language-summary"><span>{description}</span><code>{notation}</code></div>}
      <div className="proof-actions"><button className="primary" disabled={checking || (mode === 'regex' && !source.trim())} type="submit">{checking ? 'Comprobando…' : 'Comprobar'}</button>{checking && <button type="button" onClick={() => { request.current?.abort(); request.current = null; setChecking(false); setComparison({ key, result: { status: 'inconclusive', message: 'Cálculo cancelado. La comparación sigue pendiente.' } }); }}>Cancelar cálculo</button>}</div>
    </form>
    {result && <div className={`comparison-status result-${result.status}`} role={result.status === 'invalid' ? 'alert' : 'status'} id={`${machine.kind}-language-error`}>
      <strong>{result.status === 'equivalent' ? 'Coinciden' : result.status === 'different' ? 'No coinciden' : result.status === 'invalid' ? 'Revisar lenguaje o modelo' : 'Sin concluir'}</strong>
      {(result.status === 'invalid' || result.status === 'inconclusive') && <p>{result.message}</p>}
      {result.status === 'invalid' && errorIndex !== null && mode === 'regex' && <code className="regex-location">{Array.from(source).slice(0, errorIndex).join('')}<mark>{Array.from(source)[errorIndex] ?? ' fin '}</mark>{Array.from(source).slice(errorIndex + 1).join('')}</code>}
      {result.status === 'equivalent' && <span>Equivalencia comprobada · {result.certificate.pairs.length} parejas alcanzables.</span>}
    </div>}
    {result?.status === 'different' && <div className="counterexample">
      <div className="counterexample-word"><span>Contraejemplo mínimo</span><code>{result.word || 'ε'}</code></div>
      <div className="comparison-lanes" role="group" aria-label="Resultado de la cadena completa"><span>Autómata: <strong>{result.trace.at(-1)?.acceptsLeft ? 'acepta' : 'rechaza'}</strong></span><span>Lenguaje: <strong>{result.trace.at(-1)?.acceptsRight ? 'pertenece' : 'no pertenece'}</strong></span></div>
      <div className="proof-trace"><button type="button" disabled={!traceIndex} onClick={() => setTraceIndex(traceIndex - 1)} aria-label="Anterior en el contraejemplo">Anterior</button><span>Paso {traceIndex} de {result.trace.length - 1} · {result.trace[traceIndex]?.symbol ?? 'ε'}<br /><code>{stateSet(result.trace[traceIndex]?.states ?? [])} ↔ {result.trace[traceIndex]?.referenceLabel}</code></span><button type="button" disabled={traceIndex === result.trace.length - 1} onClick={() => setTraceIndex(traceIndex + 1)} aria-label="Siguiente en el contraejemplo">Siguiente</button></div>
      {result.trace.length > 1 && <input className="proof-trace-range" type="range" aria-label="Paso del contraejemplo" min="0" max={result.trace.length - 1} value={traceIndex} onChange={event => setTraceIndex(Number(event.target.value))} />}
      {Array.from(result.word).length <= LIMITS.input ? <button type="button" onClick={() => onTryWord(result.word)}>Probar esta cadena</button> : <p>El recorrido completo está disponible aquí; la cadena supera los {LIMITS.input} símbolos del simulador.</p>}
    </div>}
    <details className="proof-foundation" onToggle={event => setFoundationOpen(event.currentTarget.open)}><summary>Ver fundamento</summary><p>R relaciona configuraciones alcanzables de ambos autómatas. La pareja inicial pertenece a R y cada símbolo lleva una pareja de R a otra pareja de R.</p><p>Por inducción sobre |w|, toda palabra mantiene sus ejecuciones en R. Como la aceptación coincide en cada pareja, se aceptan exactamente las mismas palabras. Los prefijos de referencia no sustituyen esta comprobación universal.</p>
      {certificate && foundationOpen && <div className="proof-reference"><table><caption>Relación R y transiciones del lenguaje</caption><thead><tr><th>Pareja</th><th>Autómata</th><th>Lenguaje</th><th>Aceptación</th>{certificate.alphabet.map(letter => <th key={letter}>{letter}</th>)}</tr></thead><tbody>{certificate.pairs.slice(referencePage * 50, (referencePage + 1) * 50).map((item, offset) => { const index = referencePage * 50 + offset; return <tr key={index}><th>{index + 1}</th><td>{stateSet(item.left)}</td><td>{item.rightLabel}</td><td>{item.acceptsRight ? 'Sí' : 'No'}</td>{certificate.alphabet.map(letter => <td key={letter}>{item.successors[letter] + 1}</td>)}</tr>; })}</tbody></table>{certificate.pairs.length > 50 && <div className="proof-actions"><button type="button" disabled={referencePage === 0} onClick={() => setReferencePage(referencePage - 1)}>Parejas anteriores</button><span>Página {referencePage + 1} de {Math.ceil(certificate.pairs.length / 50)}</span><button type="button" disabled={(referencePage + 1) * 50 >= certificate.pairs.length} onClick={() => setReferencePage(referencePage + 1)}>Parejas siguientes</button></div>}</div>}
      <a href="https://www.cs.cornell.edu/courses/cs6861/2024sp/Handouts/ACLec2-6.pdf" target="_blank" rel="noreferrer">Kozen · transición extendida e inducción</a>
    </details>
  </section>;
}
