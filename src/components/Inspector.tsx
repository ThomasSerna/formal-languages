import { useEffect, useRef, useState } from 'react';
import type { Machine, State, Transition } from '../domain';
import { MODEL_SHORT, ruleLabel, stateName, symbolsFromField, tuple, word } from '../format';

interface Props {
  machine: Machine;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  addingTransition: boolean;
  connection?: { from: string; to: string } | null;
  onChange: (machine: Machine) => void;
  onSelectState: (id: string | null) => void;
  onSelectTransition: (id: string | null) => void;
  onCancelTransition: () => void;
}

function TransitionForm({ machine, transition, initialFrom, initialTo, onSave, onCancel }: {
  machine: Machine; transition?: Transition; initialFrom?: string; initialTo?: string;
  onSave: (transition: Transition) => void; onCancel: () => void;
}) {
  const [from, setFrom] = useState(transition?.from ?? initialFrom ?? machine.states[0]?.id ?? '');
  const [to, setTo] = useState(transition?.to ?? initialTo ?? machine.states[1]?.id ?? machine.states[0]?.id ?? '');
  const [read, setRead] = useState(transition?.read ?? machine.alphabet[0] ?? '');
  const [pop, setPop] = useState(transition && 'pop' in transition ? transition.pop : machine.kind === 'pda' ? machine.initialStackSymbol : '');
  const [push, setPush] = useState(transition && 'push' in transition ? transition.push.join('') : '');
  const [write, setWrite] = useState(transition && 'write' in transition ? transition.write : machine.kind === 'tm' ? machine.tapeAlphabet[0] ?? '' : '');
  const [move, setMove] = useState<'L' | 'R'>(transition && 'move' in transition ? transition.move : 'R');
  const [error, setError] = useState('');
  const reads = machine.kind === 'tm' ? machine.tapeAlphabet : machine.alphabet;
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!from || !to) return setError('Agrega primero un estado de origen y uno de destino.');
    if (read === '' && (machine.kind === 'dfa' || machine.kind === 'tm')) return setError('Selecciona un símbolo de lectura.');
    if (machine.kind === 'dfa' || machine.kind === 'tm') {
      if (machine.transitions.some(rule => rule.id !== transition?.id && rule.from === from && rule.read === read)) {
        return setError(`${stateName(machine, from)} ya tiene una regla para ${read}. Edita esa regla o elige otro símbolo.`);
      }
    }
    const base = { id: transition?.id ?? crypto.randomUUID(), from, to, read };
    let next: Transition = base;
    if (machine.kind === 'pda') {
      const pushSymbols = Array.from(push);
      if (!machine.stackAlphabet.includes(pop)) return setError('Selecciona un símbolo del alfabeto de pila para el tope.');
      if (pushSymbols.some(symbol => !machine.stackAlphabet.includes(symbol))) return setError('El reemplazo solo puede contener símbolos de Γ. Deja el campo vacío para desapilar.');
      next = { ...base, pop, push: pushSymbols };
    }
    if (machine.kind === 'tm') {
      if (!machine.tapeAlphabet.includes(write)) return setError('Selecciona un símbolo de escritura de Γ.');
      if (read === machine.leftMarker && (write !== machine.leftMarker || move !== 'R')) return setError('El marcador izquierdo se conserva y siempre mueve el cabezal a la derecha.');
      if (machine.acceptingStateIds.includes(from) || machine.rejectStateId === from) return setError('Los estados t y r son absorbentes; sus reglas se definen automáticamente.');
      next = { ...base, write, move };
    }
    if (machine.transitions.length >= 300 && !transition) return setError('El documento permite hasta 300 reglas.');
    onSave(next);
  }
  return <form onSubmit={submit} className="inspector-form">
    <div className="field-row">
      <label>Origen<select aria-label="Origen" value={from} onChange={event => setFrom(event.target.value)}>{machine.states.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}</select></label>
      <label>Destino<select aria-label="Destino" value={to} onChange={event => setTo(event.target.value)}>{machine.states.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}</select></label>
    </div>
    <label>Lee<select aria-label="Lee" value={read} onChange={event => setRead(event.target.value)}>
      {(machine.kind === 'nfa' || machine.kind === 'pda') && <option value="">ε · no consume entrada</option>}
      {reads.map(symbol => <option key={symbol} value={symbol}>{symbol}</option>)}
    </select></label>
    {machine.kind === 'pda' && <>
      <label>Tope que retira<select aria-label="Tope que retira" value={pop} onChange={event => setPop(event.target.value)}>{machine.stackAlphabet.map(symbol => <option key={symbol}>{symbol}</option>)}</select></label>
      <label>Reemplaza por<input value={push} onChange={event => setPush(event.target.value)} placeholder="Vacío = ε, solo desapila" aria-describedby="push-hint" maxLength={256} /></label>
      <p className="field-hint" id="push-hint">El primer símbolo queda en el tope. Por ejemplo, A⊥ deja A arriba.</p>
    </>}
    {machine.kind === 'tm' && <div className="field-row">
      <label>Escribe<select aria-label="Escribe" value={write} onChange={event => setWrite(event.target.value)}>{machine.tapeAlphabet.map(symbol => <option key={symbol}>{symbol}</option>)}</select></label>
      <label>Mueve<select aria-label="Mueve" value={move} onChange={event => setMove(event.target.value as 'L' | 'R')}><option value="R">R · derecha</option><option value="L">L · izquierda</option></select></label>
    </div>}
    {read === '' && <p className="field-hint">ε cambia la configuración sin leer una letra de la entrada.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="button-row"><button className="primary" type="submit">{transition ? 'Guardar transición' : 'Crear transición'}</button><button type="button" onClick={onCancel}>Cancelar</button></div>
  </form>;
}

function StateProperties({ machine, state, onChange }: {machine: Machine; state: State; onChange: (machine: Machine) => void}) {
  const initial = machine.initialStateIds.includes(state.id);
  const final = machine.acceptingStateIds.includes(state.id);
  return <div className="inspector-form">
    <label>Nombre del estado<input value={state.name} maxLength={24} onChange={event => onChange({ ...machine, states: machine.states.map(item => item.id === state.id ? { ...item, name: event.target.value } : item) })} /></label>
    <label className="check-label"><input type="checkbox" checked={initial} onChange={event => onChange({ ...machine, initialStateIds: event.target.checked ? machine.kind === 'nfa' ? [...machine.initialStateIds, state.id] : [state.id] : machine.initialStateIds.filter(id => id !== state.id) })} />Estado inicial</label>
    <p className="field-hint">La flecha que llega desde fuera indica dónde comienza el cálculo.{machine.kind === 'nfa' && ' Un AFN puede comenzar en varios estados.'}</p>
    <label className="check-label"><input type="checkbox" checked={final} onChange={event => onChange({ ...machine, acceptingStateIds: event.target.checked ? machine.kind === 'tm' ? [state.id] : [...machine.acceptingStateIds, state.id] : machine.acceptingStateIds.filter(id => id !== state.id) })} />{machine.kind === 'tm' ? 'Estado de aceptación · t' : 'Estado de aceptación'}</label>
    <p className="field-hint">{machine.kind === 'tm' ? 'Entrar en t termina la simulación con aceptación.' : 'El doble círculo marca aceptación. La entrada debe haberse consumido por completo.'}</p>
    {machine.kind === 'tm' && <label className="check-label"><input type="checkbox" checked={machine.rejectStateId === state.id} onChange={event => onChange({ ...machine, rejectStateId: event.target.checked ? state.id : '' })} />Estado de rechazo · r</label>}
    <button className="danger subtle" onClick={() => onChange({ ...machine, states: machine.states.filter(item => item.id !== state.id), transitions: machine.transitions.filter(rule => rule.from !== state.id && rule.to !== state.id), initialStateIds: machine.initialStateIds.filter(id => id !== state.id), acceptingStateIds: machine.acceptingStateIds.filter(id => id !== state.id), ...(machine.kind === 'tm' && machine.rejectStateId === state.id ? { rejectStateId: '' } : {}) } as Machine)}>Eliminar estado y sus conexiones</button>
  </div>;
}

export default function Inspector(props: Props) {
  const { machine, selectedStateId, selectedTransitionId, addingTransition, onChange } = props;
  const [tab, setTab] = useState<'edit' | 'formal'>('edit');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (selectedStateId || selectedTransitionId || addingTransition) { setTab('edit'); setExpanded(true); } }, [selectedStateId, selectedTransitionId, addingTransition]);
  const state = machine.states.find(item => item.id === selectedStateId);
  const transition = machine.transitions.find(item => item.id === selectedTransitionId);
  const edit = tab === 'edit' || addingTransition;
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!body.current || !expanded || preference.matches) return;
    const animation = body.current.animate([{ opacity: 0.65 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    const stopMotion = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener('change', stopMotion);
    return () => { animation.cancel(); preference.removeEventListener('change', stopMotion); };
  }, [selectedStateId, selectedTransitionId, addingTransition, edit, expanded]);
  return <aside className={`inspector${expanded ? ' is-expanded' : ''}`} aria-label="Inspector del autómata">
    <div className="inspector-tabs" role="group" aria-label="Vista del inspector"><button className={edit ? 'selected' : ''} onClick={() => { setExpanded(tab === 'edit' ? value => !value : true); setTab('edit'); }}>Inspector</button><button className={!edit ? 'selected' : ''} onClick={() => { setExpanded(true); props.onCancelTransition(); setTab('formal'); }}>Definición formal</button><button className="collapse-inspector text-button" onClick={() => setExpanded(false)} hidden={!expanded}>Cerrar panel</button></div>
    <div ref={body} className="inspector-body">
      {!edit ? <>
        <h2>Del dibujo a la definición</h2><p className="explanation">Cada parte del grafo tiene un lugar en la tupla de {MODEL_SHORT[machine.kind]}.</p>
        <p className="formula">{tuple(machine)}</p>
        <dl className="definition-list">
          <div><dt>Q</dt><dd>Estados<br /><code>{'{'}{machine.states.map(item => item.name).join(', ')}{'}'}</code></dd></div>
          <div><dt>Σ</dt><dd>Alfabeto de entrada<br /><code>{'{'}{machine.alphabet.join(', ')}{'}'}</code></dd></div>
          <div><dt>{machine.kind === 'nfa' ? 'S' : 's'}</dt><dd>{machine.kind === 'nfa' ? 'Estados iniciales' : 'Estado inicial'}<br /><code>{machine.initialStateIds.map(id => stateName(machine, id)).join(', ') || '∅'}</code></dd></div>
          {machine.kind !== 'tm' && <div><dt>F</dt><dd>Estados de aceptación<br /><code>{machine.acceptingStateIds.map(id => stateName(machine, id)).join(', ') || '∅'}</code></dd></div>}
          {(machine.kind === 'pda' || machine.kind === 'tm') && <div><dt>Γ</dt><dd>Alfabeto de {machine.kind === 'pda' ? 'pila' : 'cinta'}<br /><code>{(machine.kind === 'pda' ? machine.stackAlphabet : machine.tapeAlphabet).join(', ')}</code></dd></div>}
          {machine.kind === 'pda' && <div><dt>⊥</dt><dd>Símbolo inicial de la pila: <code>{machine.initialStackSymbol}</code></dd></div>}
          {machine.kind === 'tm' && <><div><dt>t / r</dt><dd>Acepta: {machine.acceptingStateIds.map(id => stateName(machine, id)).join('') || 'sin definir'}<br />Rechaza: {stateName(machine, machine.rejectStateId) || 'sin definir'}</dd></div><div><dt>⊢ / ␣</dt><dd>Marcador izquierdo / blanco<br /><code>{machine.leftMarker} / {machine.blankSymbol}</code></dd></div></>}
        </dl>
        <p className="field-hint">{machine.kind === 'dfa' ? 'δ: Q × Σ → Q. Cada par estado–símbolo debe tener exactamente un destino.' : machine.kind === 'nfa' ? 'Δ: Q × Σ → 2^Q. Un símbolo puede llevar a varios estados. Aquí también puedes explorar la extensión con ε.' : machine.kind === 'pda' ? 'δ ⊆ (Q × (Σ ∪ {ε}) × Γ) × (Q × Γ*). Aceptamos por estado final con toda la entrada consumida.' : 'δ: Q × Γ → Q × Γ × {L, R}. Las reglas omitidas van a r, conservan el símbolo y mueven R. t y r son absorbentes.'}</p>
      </> : addingTransition || transition ? <>
        <h2>{transition ? 'Editar transición' : 'Una nueva conexión'}</h2>
        <p className="explanation">{machine.kind === 'pda' ? 'Lee la entrada, retira el tope y escribe su reemplazo.' : machine.kind === 'tm' ? 'Lee y escribe una celda; después mueve el cabezal.' : 'Una transición indica a qué estado ir al leer un símbolo.'}</p>
        <TransitionForm key={`${machine.kind}-${transition?.id ?? 'new'}-${props.connection?.from ?? ''}-${props.connection?.to ?? ''}`} machine={machine} transition={transition} initialFrom={props.connection?.from ?? selectedStateId ?? undefined} initialTo={props.connection?.to} onCancel={() => { props.onSelectTransition(null); props.onCancelTransition(); }} onSave={rule => { onChange({ ...machine, transitions: transition ? machine.transitions.map(item => item.id === rule.id ? rule : item) : [...machine.transitions, rule] } as Machine); props.onCancelTransition(); props.onSelectTransition(rule.id); }} />
        {transition && <button className="danger subtle" onClick={() => { onChange({ ...machine, transitions: machine.transitions.filter(rule => rule.id !== transition.id) } as Machine); props.onSelectTransition(null); }}>Eliminar transición</button>}
      </> : state ? <>
        <div className="inspector-title"><h2>Estado {state.name || 'sin nombre'}</h2><button className="text-button" onClick={() => props.onSelectState(null)}>Ver modelo</button></div>
        <p className="explanation">Un estado resume lo que la máquina necesita recordar hasta este punto.</p>
        <StateProperties machine={machine} state={state} onChange={onChange} />
      </> : <>
        <h2>Tu modelo, por dentro</h2><p className="explanation">Selecciona un estado o una flecha para entenderlo y editar sus propiedades.</p>
        <label>Nombre del autómata<input value={machine.name} maxLength={100} onChange={event => onChange({ ...machine, name: event.target.value })} /></label>
        <label>Alfabeto de entrada · Σ<input value={machine.alphabet.join(' ')} onChange={event => onChange({ ...machine, alphabet: symbolsFromField(event.target.value) })} aria-describedby="alphabet-hint" /></label>
        <p className="field-hint" id="alphabet-hint">Símbolos separados por espacios. Cada símbolo ocupa un carácter; ε representa la cadena vacía.</p>
        {machine.kind === 'pda' && <><label>Alfabeto de pila · Γ<input value={machine.stackAlphabet.join(' ')} onChange={event => onChange({ ...machine, stackAlphabet: symbolsFromField(event.target.value) })} /></label><label>Símbolo inicial de pila<input value={machine.initialStackSymbol} onChange={event => onChange({ ...machine, initialStackSymbol: event.target.value })} maxLength={2} /></label></>}
        {machine.kind === 'tm' && <><label>Alfabeto de cinta · Γ<input value={machine.tapeAlphabet.join(' ')} onChange={event => onChange({ ...machine, tapeAlphabet: symbolsFromField(event.target.value) })} /></label><p className="field-hint">Incluye Σ, el marcador {machine.leftMarker} y el blanco {machine.blankSymbol}. Una regla omitida rechaza explícitamente.</p></>}
        <div className="context-note"><strong>Prueba una idea</strong><p>{machine.kind === 'dfa' ? 'Un solo estado resume el prefijo leído. Pregúntate qué necesita recordar tu autómata y qué símbolo cambia esa información.' : machine.kind === 'nfa' ? 'El AFN explora varios caminos a la vez. Basta que uno termine aceptando toda la cadena.' : machine.kind === 'pda' ? 'La pila permite recordar símbolos pendientes. Observa cómo crece y se vacía en cada rama.' : 'El cabezal puede regresar y escribir marcas. Cada paso es una transición, no necesariamente una letra nueva.'}</p></div>
      </>}
    </div>
  </aside>;
}
