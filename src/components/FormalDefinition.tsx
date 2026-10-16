import type { Machine } from '../domain';
import { ruleLabel, stateName, transitionEquations, tuple } from '../format';

interface Props {
  machine: Machine;
  onSelectState?: (id: string) => void;
  onSelectTransition?: (id: string) => void;
  compact?: boolean;
}

const setNotation = (values: string[]) => values.length ? `{${values.join(', ')}}` : '∅';

export default function FormalDefinition({ machine, onSelectState, onSelectTransition, compact = false }: Props) {
  const names = (ids: string[]) => ids.map(id => stateName(machine, id));
  const symbol = machine.kind === 'nfa' ? 'Δ' : 'δ';
  const signature = machine.kind === 'dfa' ? 'δ: Q × Σ → Q'
    : machine.kind === 'nfa' ? 'Δ: Q × (Σ ∪ {ε}) → 2^Q'
      : machine.kind === 'pda' ? 'δ ⊆ (Q × (Σ ∪ {ε}) × Γ) × (Q × Γ*)'
        : 'δ: Q × Γ → Q × Γ × {L, R}';
  return <section className={`formal-definition${compact ? ' formal-definition--compact' : ''}`} aria-label="Definición formal del autómata">
    <p className="formula">{tuple(machine)}</p>
    <dl className="formal-components">
      <div><dt>Q</dt><dd className="formal-states">{machine.states.length ? <>{'{'}{machine.states.map((state, index) => <span key={state.id}>{index > 0 && ', '}{onSelectState ? <button className="text-button" aria-label={`Editar estado ${state.name}`} onClick={() => onSelectState(state.id)}>{state.name || 'sin nombre'}</button> : state.name || 'sin nombre'}</span>)}{'}'}</> : '∅'}</dd></div>
      <div><dt>Σ</dt><dd><code>{setNotation(machine.alphabet)}</code></dd></div>
      <div><dt>{machine.kind === 'nfa' ? 'S' : 's'}</dt><dd><code>{machine.kind === 'nfa' ? setNotation(names(machine.initialStateIds)) : names(machine.initialStateIds).join(', ') || 'sin definir'}</code></dd></div>
      {machine.kind !== 'tm' && <div><dt>F</dt><dd><code>{setNotation(names(machine.acceptingStateIds))}</code></dd></div>}
      {(machine.kind === 'pda' || machine.kind === 'tm') && <div><dt>Γ</dt><dd><code>{setNotation(machine.kind === 'pda' ? machine.stackAlphabet : machine.tapeAlphabet)}</code></dd></div>}
      {machine.kind === 'pda' && <div><dt>⊥</dt><dd><code>{machine.initialStackSymbol || 'sin definir'}</code></dd></div>}
      {machine.kind === 'tm' && <>
        <div><dt>⊢ / ␣</dt><dd><code>{machine.leftMarker} / {machine.blankSymbol}</code></dd></div>
        <div><dt>t</dt><dd><code>{names(machine.acceptingStateIds).join(', ') || 'sin definir'}</code></dd></div>
        <div><dt>r</dt><dd><code>{machine.rejectStateId ? stateName(machine, machine.rejectStateId) : 'sin definir'}</code></dd></div>
      </>}
    </dl>
    {!compact && <div className="transition-functions">
      <h3>Función de transición · {symbol}</h3>
      <p className="transition-domain"><code>{signature}</code></p>
      {machine.kind === 'pda' && <p className="field-hint">Vista funcional equivalente a la relación δ: cada terna devuelve un conjunto finito de pares (estado, reemplazo). El primer símbolo del reemplazo queda en el tope.</p>}
      {machine.transitions.length ? <ul>{transitionEquations(machine).map(equation => <li className="transition-function" key={equation.key}>
        <code className="transition-function__equation">{equation.expression}</code>
        {onSelectTransition && <div className="transition-function__actions">{equation.transitions.map((rule, index) => <button className="text-button" key={rule.id} aria-label={`Editar transición ${stateName(machine, rule.from)} ${ruleLabel(rule)} ${stateName(machine, rule.to)}`} onClick={() => onSelectTransition(rule.id)}>{equation.transitions.length > 1 ? `Editar regla ${index + 1}` : 'Editar'}</button>)}</div>}
      </li>)}</ul> : <p className="field-hint">Todavía no hay transiciones. Agrega una conexión desde el grafo.</p>}
      <p className="field-hint">{machine.kind === 'dfa' ? 'Cada par de Q × Σ debe tener un destino. Las reglas faltantes dejan δ incompleta y deben definirse antes de simular.'
        : machine.kind === 'nfa' ? 'Los pares no mostrados tienen imagen ∅. Se incluye la extensión con ε: cambia de estado sin consumir entrada, sin añadir ε al alfabeto Σ.'
          : machine.kind === 'pda' ? 'Las ternas no mostradas tienen imagen ∅. ε indica entrada no consumida o reemplazo vacío; cada regla retira un símbolo real del tope. Se acepta al llegar a F con toda la entrada consumida.'
            : 'Desde estados no terminales, toda regla omitida es δ(p, a) = (r, a, R). Los estados t y r son absorbentes; la simulación se detiene al entrar en ellos.'}</p>
    </div>}
    {compact && <p className="transition-domain"><code>{signature}</code></p>}
  </section>;
}
