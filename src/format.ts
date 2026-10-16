import type { Machine, MachineKind, Transition } from './domain';

export const MODEL_NAMES: Record<MachineKind, string> = {
  dfa: 'Autómata finito determinista', nfa: 'Autómata finito no determinista',
  pda: 'Autómata de pila', tm: 'Máquina de Turing',
};
export const MODEL_SHORT: Record<MachineKind, string> = { dfa: 'AFD', nfa: 'AFN', pda: 'Pila', tm: 'Turing' };
export const SYMBOL = (value: string) => value === '' ? 'ε' : value;
export const word = (values: string[]) => values.join('') || 'ε';
export const stateName = (machine: Machine, id: string) => machine.states.find(state => state.id === id)?.name ?? id;
export function ruleLabel(rule: Transition) {
  if ('pop' in rule) return `${SYMBOL(rule.read)}, ${rule.pop} → ${word(rule.push)}`;
  if ('write' in rule) return `${rule.read} → ${rule.write}, ${rule.move}`;
  return SYMBOL(rule.read);
}
export const symbolsFromField = (value: string) => [...new Set(Array.from(value).filter(symbol => !/\s|,/.test(symbol)))];
export function tuple(machine: Machine) {
  if (machine.kind === 'pda') return 'P = (Q, Σ, Γ, δ, s, ⊥, F)';
  if (machine.kind === 'tm') return 'M = (Q, Σ, Γ, ⊢, ␣, δ, s, t, r)';
  return machine.kind === 'nfa' ? 'N = (Q, Σ, Δ, S, F)' : 'M = (Q, Σ, δ, s, F)';
}

export interface TransitionEquation {
  key: string;
  expression: string;
  transitions: Transition[];
}

export function transitionEquations(machine: Machine): TransitionEquation[] {
  const grouped = machine.kind === 'nfa' || machine.kind === 'pda';
  const groups = new Map<string, { left: string; outputs: Map<string, string>; transitions: Transition[] }>();
  for (const rule of machine.transitions) {
    const key = grouped ? JSON.stringify([rule.from, rule.read, ...('pop' in rule ? [rule.pop] : [])]) : rule.id;
    const left = `${machine.kind === 'nfa' ? 'Δ' : 'δ'}(${stateName(machine, rule.from)}, ${SYMBOL(rule.read)}${'pop' in rule ? `, ${rule.pop}` : ''})`;
    const output = 'pop' in rule ? `(${stateName(machine, rule.to)}, ${word(rule.push)})`
      : 'write' in rule ? `(${stateName(machine, rule.to)}, ${rule.write}, ${rule.move})` : stateName(machine, rule.to);
    const outputKey = JSON.stringify([rule.to, ...('pop' in rule ? [rule.push] : 'write' in rule ? [rule.write, rule.move] : [])]);
    const group = groups.get(key) ?? { left, outputs: new Map<string, string>(), transitions: [] };
    group.outputs.set(outputKey, output);
    group.transitions.push(rule);
    groups.set(key, group);
  }
  return [...groups].map(([key, group]) => ({
    key,
    expression: `${group.left} = ${grouped ? `{${[...group.outputs.values()].join(', ')}}` : [...group.outputs.values()].join(', ')}`,
    transitions: group.transitions,
  }));
}
