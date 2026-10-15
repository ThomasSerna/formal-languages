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
