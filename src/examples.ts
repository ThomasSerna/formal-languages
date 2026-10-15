import type { Machine, MachineKind, State, PdaTransition, TmTransition } from './domain'

const state = (id: string, x: number, y: number): State => ({ id, name: id, x, y })
const finite = (id: string, from: string, to: string, read: string) => ({ id, from, to, read })
const pda = (id: string, from: string, to: string, read: string, pop: string, push: string[]): PdaTransition => ({ id, from, to, read, pop, push })
const tm = (id: string, from: string, to: string, read: string, write: string, move: 'L' | 'R'): TmTransition => ({ id, from, to, read, write, move })

export const EXAMPLES: Record<MachineKind, Machine> = {
  dfa: {
    schemaVersion: 1, kind: 'dfa', name: 'Cantidad par de unos', alphabet: ['0', '1'],
    states: [state('q0', 230, 230), state('q1', 530, 230)], initialStateIds: ['q0'], acceptingStateIds: ['q0'],
    transitions: [finite('d0', 'q0', 'q0', '0'), finite('d1', 'q0', 'q1', '1'), finite('d2', 'q1', 'q1', '0'), finite('d3', 'q1', 'q0', '1')],
  },
  nfa: {
    schemaVersion: 1, kind: 'nfa', name: 'Cadenas que terminan en 01', alphabet: ['0', '1'],
    states: [state('s', 100, 230), state('q0', 300, 230), state('q1', 500, 230), state('q2', 700, 230)],
    initialStateIds: ['s'], acceptingStateIds: ['q2'],
    transitions: [finite('n0', 's', 'q0', ''), finite('n1', 'q0', 'q0', '0'), finite('n2', 'q0', 'q0', '1'), finite('n3', 'q0', 'q1', '0'), finite('n4', 'q1', 'q2', '1')],
  },
  pda: {
    schemaVersion: 1, kind: 'pda', name: 'aⁿbⁿ · primero a, después b', alphabet: ['a', 'b'],
    states: [state('p', 180, 230), state('q', 460, 230), state('f', 700, 230)], initialStateIds: ['p'], acceptingStateIds: ['f'],
    stackAlphabet: ['⊥', 'A'], initialStackSymbol: '⊥',
    transitions: [pda('p0', 'p', 'p', 'a', '⊥', ['A', '⊥']), pda('p1', 'p', 'p', 'a', 'A', ['A', 'A']), pda('p2', 'p', 'q', 'b', 'A', []), pda('p3', 'q', 'q', 'b', 'A', []), pda('p4', 'p', 'f', '', '⊥', ['⊥']), pda('p5', 'q', 'f', '', '⊥', ['⊥'])],
  },
  tm: {
    schemaVersion: 1, kind: 'tm', name: '0ⁿ1ⁿ · emparejar ceros y unos', alphabet: ['0', '1'],
    states: [state('s', 90, 240), state('q0', 280, 240), state('q1', 470, 100), state('q2', 470, 380), state('q3', 650, 240), state('t', 820, 140), state('r', 820, 360)],
    initialStateIds: ['s'], acceptingStateIds: ['t'], rejectStateId: 'r',
    tapeAlphabet: ['0', '1', 'X', 'Y', '⊢', '␣'], leftMarker: '⊢', blankSymbol: '␣',
    transitions: [
      tm('t0', 's', 'q0', '⊢', '⊢', 'R'),
      tm('t1', 'q0', 'q0', 'X', 'X', 'R'), tm('t2', 'q0', 'q1', '0', 'X', 'R'), tm('t3', 'q0', 'q3', 'Y', 'Y', 'R'), tm('t4', 'q0', 't', '␣', '␣', 'R'),
      tm('t5', 'q1', 'q1', '0', '0', 'R'), tm('t6', 'q1', 'q1', 'Y', 'Y', 'R'), tm('t7', 'q1', 'q2', '1', 'Y', 'L'),
      ...['0', '1', 'X', 'Y'].map((letter, index) => tm(`t${index + 8}`, 'q2', 'q2', letter, letter, 'L')),
      tm('t12', 'q2', 'q0', '⊢', '⊢', 'R'), tm('t13', 'q3', 'q3', 'Y', 'Y', 'R'), tm('t14', 'q3', 't', '␣', '␣', 'R'),
    ],
  },
}

export const EXAMPLE_INPUTS: Record<MachineKind, string> = { dfa: '1010', nfa: '1101', pda: 'aabb', tm: '0011' }

export function createBlankMachine(kind: MachineKind): Machine {
  const common = {
    schemaVersion: 1 as const, name: 'Mi autómata', alphabet: kind === 'pda' ? ['a', 'b'] : ['0', '1'],
    states: [] as State[], initialStateIds: [] as string[], acceptingStateIds: [] as string[],
  }
  if (kind === 'pda') return { ...common, kind, stackAlphabet: ['⊥', 'A'], initialStackSymbol: '⊥', transitions: [] }
  if (kind === 'tm') return {
    ...common, kind, rejectStateId: '',
    tapeAlphabet: ['0', '1', 'X', 'Y', '⊢', '␣'], leftMarker: '⊢', blankSymbol: '␣', transitions: [],
  }
  return { ...common, kind, transitions: [] }
}
