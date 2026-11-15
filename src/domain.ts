export type MachineKind = 'dfa' | 'nfa' | 'pda' | 'tm' | 'cfg'

export interface State {
  id: string
  name: string
  x: number
  y: number
}

export interface BaseTransition {
  id: string
  from: string
  to: string
}

export type FiniteTransition = BaseTransition & { read: string }
export type PdaTransition = BaseTransition & { read: string; pop: string; push: string[] }
export type TmTransition = BaseTransition & { read: string; write: string; move: 'L' | 'R' }
export type Transition = FiniteTransition | PdaTransition | TmTransition

interface BaseMachine {
  schemaVersion: 1
  name: string
  alphabet: string[]
  states: State[]
  initialStateIds: string[]
  acceptingStateIds: string[]
}

export type FiniteMachine = BaseMachine & {
  kind: 'dfa' | 'nfa'
  transitions: FiniteTransition[]
}
export type PdaMachine = BaseMachine & {
  kind: 'pda'
  stackAlphabet: string[]
  initialStackSymbol: string
  transitions: PdaTransition[]
}
export type TmMachine = BaseMachine & {
  kind: 'tm'
  tapeAlphabet: string[]
  leftMarker: string
  blankSymbol: string
  rejectStateId: string
  transitions: TmTransition[]
}
export interface CfgProduction {
  id: string
  left: string
  right: string[]
}

export type CfgMachine = BaseMachine & {
  kind: 'cfg'
  nonterminals: string[]
  startSymbol: string
  productions: CfgProduction[]
  transitions: FiniteTransition[]
}
export type Machine = FiniteMachine | PdaMachine | TmMachine | CfgMachine

export const LIMITS = {
  states: 50,
  transitions: 300,
  input: 256,
  tmSteps: 10_000,
  tmCells: 4_096,
  pdaConfigurations: 2_000,
  pdaApplications: 10_000,
  pdaStack: 256,
  cfgNonterminals: 30,
  cfgProductions: 120,
  cfgRhsSymbols: 16,
  cfgInput: 48,
  cfgDerivationSteps: 120,
} as const
