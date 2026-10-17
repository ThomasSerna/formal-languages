import { useEffect, useRef, useState } from 'react';
import type { Machine, State, Transition } from '../domain';
import { stateName, symbolsFromField } from '../format';

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
  onClose: () => void;
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
      {(machine.kind === 'nfa' || machine.kind === 'pda') && <option value="">ε · sin leer entrada</option>}
      {reads.map(symbol => <option key={symbol} value={symbol}>{symbol}</option>)}
    </select></label>
    {machine.kind === 'pda' && <>
      <label>Tope que retira<select aria-label="Tope que retira" value={pop} onChange={event => setPop(event.target.value)}>{machine.stackAlphabet.map(symbol => <option key={symbol}>{symbol}</option>)}</select></label>
      <label>Reemplaza por<input value={push} onChange={event => setPush(event.target.value)} aria-describedby="push-hint" maxLength={256} /></label>
      <p className="field-hint" id="push-hint">Primer símbolo = tope; vacío = ε.</p>
    </>}
    {machine.kind === 'tm' && <div className="field-row">
      <label>Escribe<select aria-label="Escribe" value={write} onChange={event => setWrite(event.target.value)}>{machine.tapeAlphabet.map(symbol => <option key={symbol}>{symbol}</option>)}</select></label>
      <label>Mueve<select aria-label="Mueve" value={move} onChange={event => setMove(event.target.value as 'L' | 'R')}><option value="R">R · derecha</option><option value="L">L · izquierda</option></select></label>
    </div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="button-row"><button className="primary" type="submit">{transition ? 'Guardar transición' : 'Crear transición'}</button><button type="button" onClick={onCancel}>Cancelar</button></div>
  </form>;
}

function StateProperties({ machine, state, onChange, onDelete }: {machine: Machine; state: State; onChange: (machine: Machine) => void; onDelete: () => void}) {
  const initial = machine.initialStateIds.includes(state.id);
  const final = machine.acceptingStateIds.includes(state.id);
  return <div className="inspector-form">
    <label>Nombre del estado<input value={state.name} maxLength={24} onChange={event => onChange({ ...machine, states: machine.states.map(item => item.id === state.id ? { ...item, name: event.target.value } : item) })} /></label>
    <div className="state-roles" role="group" aria-label="Roles del estado">
      <button type="button" aria-pressed={initial} onClick={() => onChange({ ...machine, initialStateIds: !initial ? machine.kind === 'nfa' ? [...machine.initialStateIds, state.id] : [state.id] : machine.initialStateIds.filter(id => id !== state.id) })}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M1 10h8m-3-3 3 3-3 3" /><circle cx="14" cy="10" r="5" /></svg>Inicial</button>
      <button type="button" aria-pressed={final} onClick={() => onChange({ ...machine, acceptingStateIds: !final ? machine.kind === 'tm' ? [state.id] : [...machine.acceptingStateIds, state.id] : machine.acceptingStateIds.filter(id => id !== state.id) })}><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" /><circle cx="10" cy="10" r="5" /></svg>Aceptación</button>
      {machine.kind === 'tm' && <button type="button" aria-pressed={machine.rejectStateId === state.id} onClick={() => onChange({ ...machine, rejectStateId: machine.rejectStateId === state.id ? '' : state.id })}><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="m7 7 6 6m0-6-6 6" /></svg>Rechazo</button>}
    </div>
    <button className="danger subtle" onClick={() => { onChange({ ...machine, states: machine.states.filter(item => item.id !== state.id), transitions: machine.transitions.filter(rule => rule.from !== state.id && rule.to !== state.id), initialStateIds: machine.initialStateIds.filter(id => id !== state.id), acceptingStateIds: machine.acceptingStateIds.filter(id => id !== state.id), ...(machine.kind === 'tm' && machine.rejectStateId === state.id ? { rejectStateId: '' } : {}) } as Machine); onDelete(); }}>Eliminar estado y sus conexiones</button>
  </div>;
}

export default function Inspector(props: Props) {
  const { machine, selectedStateId, selectedTransitionId, addingTransition, onChange } = props;
  const state = machine.states.find(item => item.id === selectedStateId);
  const transition = machine.transitions.find(item => item.id === selectedTransitionId);
  const editingTransition = addingTransition || Boolean(transition);
  const title = editingTransition ? transition ? 'Editar transición' : 'Nueva transición' : state ? `Estado ${state.name || 'sin nombre'}` : 'Modelo';
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!body.current || preference.matches || body.current.closest('[data-input="keyboard"]')) return;
    const animation = body.current.animate([{ opacity: 0.65 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    const stopMotion = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener('change', stopMotion);
    return () => { animation.cancel(); preference.removeEventListener('change', stopMotion); };
  }, [selectedStateId, selectedTransitionId, addingTransition]);
  return <div className="inspector">
    <div className="inspector-header">
      <h2>{title}</h2>
      <div className="inspector-actions">
        <button className="text-button close-inspector" aria-label="Cerrar inspector" onClick={props.onClose}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m5 5 8 8M13 5l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button>
      </div>
    </div>
    <div ref={body} className="inspector-body">
      {editingTransition ? <>
        <TransitionForm key={`${machine.kind}-${transition?.id ?? 'new'}-${props.connection?.from ?? ''}-${props.connection?.to ?? ''}`} machine={machine} transition={transition} initialFrom={props.connection?.from ?? selectedStateId ?? undefined} initialTo={props.connection?.to} onCancel={() => { props.onSelectTransition(null); props.onCancelTransition(); props.onClose(); }} onSave={rule => { onChange({ ...machine, transitions: transition ? machine.transitions.map(item => item.id === rule.id ? rule : item) : [...machine.transitions, rule] } as Machine); props.onCancelTransition(); props.onSelectTransition(rule.id); }} />
        {transition && <button className="danger subtle" onClick={() => { onChange({ ...machine, transitions: machine.transitions.filter(rule => rule.id !== transition.id) } as Machine); props.onSelectTransition(null); props.onClose(); }}>Eliminar transición</button>}
      </> : state ? <>
        <StateProperties machine={machine} state={state} onChange={onChange} onDelete={() => { props.onSelectState(null); props.onClose(); }} />
      </> : <>
        <label>Nombre del autómata<input value={machine.name} maxLength={100} onChange={event => onChange({ ...machine, name: event.target.value })} /></label>
        <label>Alfabeto de entrada · Σ<input value={machine.alphabet.join(' ')} onChange={event => onChange({ ...machine, alphabet: symbolsFromField(event.target.value) })} aria-describedby="alphabet-hint" /></label>
        <p className="field-hint" id="alphabet-hint">Un carácter por símbolo, separados por espacios.</p>
        {machine.kind === 'pda' && <><label>Alfabeto de pila · Γ<input value={machine.stackAlphabet.join(' ')} onChange={event => onChange({ ...machine, stackAlphabet: symbolsFromField(event.target.value) })} /></label><label>Símbolo inicial de pila<input value={machine.initialStackSymbol} onChange={event => onChange({ ...machine, initialStackSymbol: event.target.value })} maxLength={2} /></label></>}
        {machine.kind === 'tm' && <label>Alfabeto de cinta · Γ<input value={machine.tapeAlphabet.join(' ')} onChange={event => onChange({ ...machine, tapeAlphabet: symbolsFromField(event.target.value) })} /></label>}
      </>}
    </div>
  </div>;
}
