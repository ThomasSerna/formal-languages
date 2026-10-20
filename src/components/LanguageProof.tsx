import { useEffect, useRef, useState } from 'react';
import type { FiniteMachine } from '../domain';
import { LIMITS } from '../domain';
import { checkAcceptance, checkBase, checkStep, compareLanguage, finiteActivity, isProofComplete, semanticKey } from '../languages';
import type { ComparisonResult, LanguageSpec } from '../languages';
import './LanguageProof.css';

export type ProofActivity = { kind: 'dfa' | 'nfa'; key: string; states: string[]; transitionIds: string[]; step: number };
type Stage = 'language' | 'base' | 'step' | 'acceptance' | 'done';
type Progress = { base: boolean; steps: boolean[]; acceptance: boolean[] };
type Answer = boolean | 'different';
type Props = { machine: FiniteMachine; active: boolean; visible: boolean; onHighlight: (activity: ProofActivity) => void; onTryWord: (word: string) => void };
const STAGES = [['language', 'Lenguaje'], ['base', 'Base'], ['step', 'Paso inductivo'], ['acceptance', 'Aceptación']] as const;
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
  const [stage, setStage] = useState<Stage>('language');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [pairIndex, setPairIndex] = useState(0);
  const [selectedBase, setSelectedBase] = useState<string[]>([]);
  const [stepAnswers, setStepAnswers] = useState<Record<number, Record<string, string[]>>>({});
  const [acceptanceAnswers, setAcceptanceAnswers] = useState<Record<number, Answer>>({});
  const [focusSymbol, setFocusSymbol] = useState(machine.alphabet[0] ?? '');
  const [traceIndex, setTraceIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [answerCorrect, setAnswerCorrect] = useState(false);
  const [foundationOpen, setFoundationOpen] = useState(false);
  const [referencePage, setReferencePage] = useState(0);
  const result = comparison?.key === key ? comparison.result : null;
  const certificate = result?.status === 'equivalent' ? result.certificate : null;
  const pair = certificate?.pairs[pairIndex];
  const answers = stepAnswers[pairIndex] ?? {};

  function invalidate() {
    request.current?.abort(); request.current = null;
    setChecking(false); setComparison(null); setProgress(null); setStage('language');
    setFeedback(''); setAnswerCorrect(false); setTraceIndex(0); setReferencePage(0);
  }
  useEffect(() => { invalidate(); }, [key]); // A certificate belongs to the mathematical definition, not its layout.
  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!active) return;
    let states: string[] = [], transitionIds: string[] = [];
    if (result?.status === 'different') {
      const frame = result.trace[traceIndex];
      if (frame) { states = frame.states; transitionIds = frame.transitionIds; }
    } else if (certificate && pair && stage !== 'language') {
      states = stage === 'base' ? selectedBase : pair.left;
      if (stage === 'base' && progress?.base) ({ states, transitionIds } = finiteActivity(machine, machine.initialStateIds));
      if (stage === 'step' && focusSymbol && progress?.steps[pairIndex]) {
        ({ states, transitionIds } = finiteActivity(machine, pair.left, focusSymbol));
      }
    }
    onHighlight({ kind: machine.kind, key, states, transitionIds, step: traceIndex + pairIndex * (machine.alphabet.length + 1) + machine.alphabet.indexOf(focusSymbol) + (progress?.steps[pairIndex] ? 1 : 0) });
  }, [active, key, machine, result, certificate, pair, stage, selectedBase, focusSymbol, pairIndex, progress, traceIndex, onHighlight]);

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
    setChecking(true); setComparison(null); setProgress(null); setFeedback(''); setTraceIndex(0);
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
  function startProof() {
    if (!certificate) return;
    if (progress) {
      const step = progress.steps.indexOf(false), acceptance = progress.acceptance.indexOf(false);
      setStage(!progress.base ? 'base' : step >= 0 ? 'step' : acceptance >= 0 ? 'acceptance' : 'done');
      setPairIndex(step >= 0 ? step : acceptance >= 0 ? acceptance : 0);
    } else {
      setProgress({ base: false, steps: certificate.pairs.map(() => !certificate.alphabet.length), acceptance: certificate.pairs.map(() => false) });
      setStage('base'); setPairIndex(0); setSelectedBase([]); setStepAnswers({}); setAcceptanceAnswers({});
    }
    setFeedback(''); setAnswerCorrect(false);
  }
  function verify(correct: boolean, success: string, hint: string) { setAnswerCorrect(correct); setFeedback(correct ? success : hint); }
  function nextCase() {
    if (!certificate || !progress) return;
    setFeedback(''); setAnswerCorrect(false);
    if (pairIndex + 1 < certificate.pairs.length) setPairIndex(pairIndex + 1);
    else if (stage === 'step') { const remaining = progress.steps.indexOf(false); setStage(remaining < 0 ? 'acceptance' : 'step'); setPairIndex(Math.max(0, remaining)); }
    else if (isProofComplete(certificate, progress)) setStage('done');
  }
  function toggleAnswer(letter: string, id: string) {
    const current = answers[letter] ?? [];
    setStepAnswers(all => ({ ...all, [pairIndex]: { ...answers, [letter]: current.includes(id) ? current.filter(value => value !== id) : [...current, id] } }));
    setProgress(value => value && ({ ...value, steps: value.steps.map((verified, index) => index === pairIndex ? false : verified) }));
    setFocusSymbol(letter); setFeedback('');
  }
  const stateSet = (ids: string[]) => ids.length ? `{${ids.map(id => machine.states.find(state => state.id === id)?.name ?? id).join(', ')}}` : '∅';
  const completeSteps = progress?.steps.every(Boolean) ?? false;
  const errorIndex = result?.status === 'invalid' && result.position !== undefined ? Math.max(0, result.position - 1) : null;

  if (!visible) return null;
  return <section className="language-proof" aria-label={`Demostración ${machine.kind === 'dfa' ? 'AFD' : 'AFN'}`}>
    <nav className="proof-stages" aria-label="Etapas de demostración">{STAGES.map(([id, label]) => <button type="button" key={id} aria-current={stage === id || (id === 'acceptance' && stage === 'done') ? 'step' : undefined} disabled={id !== 'language' && (!certificate || !progress || (id === 'step' && !progress.base) || (id === 'acceptance' && (!progress.base || !completeSteps)))} onClick={() => { setStage(id); setPairIndex(0); setFeedback(''); }}>{label}</button>)}</nav>
    {certificate && stage !== 'language' && <div className="proof-certified"><strong>Coinciden</strong><span>Equivalencia comprobada · {certificate.pairs.length} parejas.</span></div>}

    {stage === 'language' && <>
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
        {result.status === 'equivalent' && <><span>Equivalencia comprobada · {result.certificate.pairs.length} parejas alcanzables.</span><button type="button" onClick={startProof}>{progress ? 'Continuar prueba' : 'Construir prueba'}</button></>}
      </div>}
      {result?.status === 'different' && <div className="counterexample">
        <div className="counterexample-word"><span>Contraejemplo mínimo</span><code>{result.word || 'ε'}</code></div>
        <div className="comparison-lanes" role="group" aria-label="Resultado de la cadena completa"><span>Autómata: <strong>{result.trace.at(-1)?.acceptsLeft ? 'acepta' : 'rechaza'}</strong></span><span>Lenguaje: <strong>{result.trace.at(-1)?.acceptsRight ? 'pertenece' : 'no pertenece'}</strong></span></div>
        <div className="proof-trace"><button type="button" disabled={!traceIndex} onClick={() => setTraceIndex(traceIndex - 1)} aria-label="Anterior en el contraejemplo">Anterior</button><span>Paso {traceIndex} de {result.trace.length - 1} · {result.trace[traceIndex]?.symbol ?? 'ε'}<br /><code>{stateSet(result.trace[traceIndex]?.states ?? [])} ↔ {result.trace[traceIndex]?.referenceLabel}</code></span><button type="button" disabled={traceIndex === result.trace.length - 1} onClick={() => setTraceIndex(traceIndex + 1)} aria-label="Siguiente en el contraejemplo">Siguiente</button></div>
        {result.trace.length > 1 && <input className="proof-trace-range" type="range" aria-label="Paso del contraejemplo" min="0" max={result.trace.length - 1} value={traceIndex} onChange={event => setTraceIndex(Number(event.target.value))} />}
        {Array.from(result.word).length <= LIMITS.input ? <button type="button" onClick={() => onTryWord(result.word)}>Probar esta cadena</button> : <p>El recorrido completo está disponible aquí; la cadena supera los {LIMITS.input} símbolos del simulador.</p>}
      </div>}
    </>}

    {certificate && progress && stage !== 'language' && stage !== 'done' && <>
      <div className="proof-case"><strong>{stage === 'base' ? 'Antes de leer: ε' : `Caso ${pairIndex + 1} de ${certificate.pairs.length}`}</strong><span>Autómata <code>{stage === 'base' && !progress.base ? '?' : stateSet(stage === 'base' ? certificate.pairs[0].left : pair?.left ?? [])}</code><span aria-hidden="true"> ↔ </span>Lenguaje <code>{stage === 'base' ? certificate.pairs[0].rightLabel : pair?.rightLabel}</code></span></div>
      {stage === 'base' && <>
        <p>Seleccionar todos los estados activos al inicio, incluidos los alcanzables por ε.</p>
        <div className="proof-state-choices" role="group" aria-label="Estados de la base">{machine.states.map(state => <button type="button" key={state.id} aria-label={`Incluir ${state.name}`} aria-pressed={selectedBase.includes(state.id)} onClick={() => { setSelectedBase(selectedBase.includes(state.id) ? selectedBase.filter(id => id !== state.id) : [...selectedBase, state.id]); setProgress({ ...progress, base: false }); setFeedback(''); }}>{state.name}</button>)}</div>
        <div className="proof-actions"><button type="button" className="primary" onClick={() => { const correct = checkBase(certificate, selectedBase); verify(correct, 'Pareja inicial registrada en R.', 'La base incluye los iniciales y toda su clausura ε.'); if (correct) setProgress({ ...progress, base: true }); }}>Comprobar base</button>{progress.base && <button type="button" onClick={() => { setStage(certificate.alphabet.length ? 'step' : 'acceptance'); setPairIndex(0); setFeedback(''); }}>Continuar al paso inductivo</button>}</div>
      </>}
      {stage === 'step' && pair && <>
        <p>Completar los destinos para cada símbolo. La pareja sucesora debe pertenecer a R.</p>
        <div className="proof-transition-answers">{certificate.alphabet.map(letter => <fieldset key={letter} onFocus={() => setFocusSymbol(letter)} onMouseEnter={() => setFocusSymbol(letter)}><legend>Al leer {letter}</legend><div className="proof-state-choices">{machine.states.map(state => <button type="button" key={state.id} aria-label={`Destino ${state.name} al leer ${letter}`} aria-pressed={answers[letter]?.includes(state.id) ?? false} onClick={() => toggleAnswer(letter, state.id)}>{state.name}</button>)}<button type="button" aria-label={`Destino vacío al leer ${letter}`} aria-pressed={answers[letter]?.length === 0} onClick={() => { setStepAnswers(all => ({ ...all, [pairIndex]: { ...answers, [letter]: [] } })); setProgress({ ...progress, steps: progress.steps.map((value, index) => index === pairIndex ? false : value) }); setFocusSymbol(letter); setFeedback(''); }}>∅</button></div>{progress.steps[pairIndex] && <button type="button" className="proof-return text-button" onClick={() => { setPairIndex(pair.successors[letter]); setFeedback(''); }}>Pareja {pair.successors[letter] + 1} · {pair.successors[letter] <= pairIndex ? 'retorno en R' : 'registrada en R'}</button>}</fieldset>)}</div>
        <div className="proof-actions"><button type="button" className="primary" onClick={() => { const correct = checkStep(certificate, pairIndex, answers); verify(correct, 'Todos los sucesores de este caso pertenecen a R.', 'Falta un destino o sobra un estado. Cada símbolo requiere su conjunto completo, incluida la clausura ε.'); if (correct) setProgress({ ...progress, steps: progress.steps.map((value, index) => index === pairIndex ? true : value) }); }}>Comprobar transiciones</button>{progress.steps[pairIndex] && <button type="button" onClick={nextCase}>Siguiente caso</button>}<small>{progress.steps.filter(Boolean).length} de {certificate.pairs.length} casos comprobados</small></div>
      </>}
      {stage === 'acceptance' && pair && <>
        <p>¿Coinciden las condiciones de aceptación de esta pareja?</p>
        <div className="proof-state-choices" role="group" aria-label="Aceptación de la pareja">{([[true, 'Ambos aceptan'], [false, 'Ambos rechazan'], ['different', 'Difieren']] as const).map(([value, label]) => <button type="button" key={label} aria-pressed={acceptanceAnswers[pairIndex] === value} onClick={() => { setAcceptanceAnswers(all => ({ ...all, [pairIndex]: value })); setProgress({ ...progress, acceptance: progress.acceptance.map((verified, index) => index === pairIndex ? false : verified) }); setFeedback(''); }}>{label}</button>)}</div>
        <div className="proof-actions"><button type="button" className="primary" onClick={() => { const choice = acceptanceAnswers[pairIndex]; const correct = choice !== undefined && checkAcceptance(certificate, pairIndex, choice); verify(correct, 'Aceptación coincidente en esta pareja.', 'En el autómata basta un estado final activo; el estado de referencia debe coincidir.'); if (correct) setProgress({ ...progress, acceptance: progress.acceptance.map((value, index) => index === pairIndex ? true : value) }); }}>Comprobar aceptación</button>{progress.acceptance[pairIndex] && <button type="button" onClick={nextCase}>{pairIndex + 1 === certificate.pairs.length ? 'Finalizar prueba' : 'Siguiente caso'}</button>}</div>
      </>}
      {feedback && <p className={`proof-feedback ${answerCorrect ? 'is-correct' : 'needs-answer'}`} role="status">{feedback}</p>}
    </>}
    {certificate && progress && stage === 'done' && isProofComplete(certificate, progress) && <div className="proof-complete" role="status"><strong>Prueba completada</strong><p>La base, todos los pasos y la aceptación están verificados.</p><code>L(autómata) = L(afirmado)</code><button type="button" onClick={() => setStage('language')}>Volver al lenguaje</button></div>}
    <details className="proof-foundation" onToggle={event => setFoundationOpen(event.currentTarget.open)}><summary>Ver fundamento</summary><p>R relaciona configuraciones alcanzables de ambos autómatas. La pareja inicial pertenece a R y cada símbolo lleva una pareja de R a otra pareja de R.</p><p>Por inducción sobre |w|, toda palabra mantiene sus ejecuciones en R. Como la aceptación coincide en cada pareja, se aceptan exactamente las mismas palabras. Los prefijos de referencia no sustituyen esta comprobación universal.</p>
      {certificate && foundationOpen && <div className="proof-reference"><table><caption>Relación R y transiciones del lenguaje</caption><thead><tr><th>Pareja</th><th>Autómata</th><th>Lenguaje</th><th>Aceptación</th>{certificate.alphabet.map(letter => <th key={letter}>{letter}</th>)}</tr></thead><tbody>{certificate.pairs.slice(referencePage * 50, (referencePage + 1) * 50).map((item, offset) => { const index = referencePage * 50 + offset; return <tr key={index}><th>{index + 1}</th><td>{stateSet(item.left)}</td><td>{item.rightLabel}</td><td>{item.acceptsRight ? 'Sí' : 'No'}</td>{certificate.alphabet.map(letter => <td key={letter}>{item.successors[letter] + 1}</td>)}</tr>; })}</tbody></table>{certificate.pairs.length > 50 && <div className="proof-actions"><button type="button" disabled={referencePage === 0} onClick={() => setReferencePage(referencePage - 1)}>Parejas anteriores</button><span>Página {referencePage + 1} de {Math.ceil(certificate.pairs.length / 50)}</span><button type="button" disabled={(referencePage + 1) * 50 >= certificate.pairs.length} onClick={() => setReferencePage(referencePage + 1)}>Parejas siguientes</button></div>}</div>}
      <a href="https://www.cs.cornell.edu/courses/cs6861/2024sp/Handouts/ACLec2-6.pdf" target="_blank" rel="noreferrer">Kozen · transición extendida e inducción</a>
    </details>
  </section>;
}
