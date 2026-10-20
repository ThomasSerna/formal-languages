import type { FiniteMachine, FiniteTransition } from './domain'
import { validateMachine } from './engine'
import { epsilonClosure, indexFiniteTransitions, moveFinite } from './finite'

export type LanguageSpec =
  | { kind: 'count'; symbol: string; modulus: number; remainder: number }
  | { kind: 'length'; modulus: number; remainder: number }
  | { kind: 'prefix' | 'suffix' | 'contains'; word: string }
  | { kind: 'regex'; source: string }

export interface ProofPair {
  left: string[]
  right: string[]
  rightLabel: string
  acceptsLeft: boolean
  acceptsRight: boolean
  successors: Record<string, number>
  parent: number | null
  via: string | null
}

export interface Certificate { alphabet: string[]; pairs: ProofPair[] }
export interface ComparisonFrame {
  states: string[]
  referenceLabel: string
  acceptsLeft: boolean
  acceptsRight: boolean
  transitionIds: string[]
  symbol: string | null
}
export type ComparisonResult =
  | { status: 'equivalent'; certificate: Certificate }
  | { status: 'different'; word: string; trace: ComparisonFrame[] }
  | { status: 'invalid'; message: string; position?: number }
  | { status: 'inconclusive'; message: string }

interface Reference {
  initial: string[]
  accepting: Set<string>
  transitions: FiniteTransition[]
  move?: (states: string[], symbol: string) => string[]
  label: (states: string[]) => string
}

class LanguageError extends Error {
  constructor(message: string, readonly position?: number) { super(message) }
}

function compileRegex(source: string, alphabet: string[]): Reference {
  const characters = Array.from(source)
  if (characters.length > 256) throw new LanguageError('La expresión admite hasta 256 símbolos.')
  const tokens: { value: string; literal: boolean; position: number }[] = []
  for (let index = 0; index < characters.length; index++) {
    const value = characters[index]
    if (value === '\\') {
      if (index + 1 === characters.length) throw new LanguageError('Falta el símbolo después de \\.', index + 1)
      tokens.push({ value: characters[++index], literal: true, position: index })
    } else if (!/\s/u.test(value)) tokens.push({ value, literal: false, position: index + 1 })
  }
  if (!tokens.length) throw new LanguageError('Falta una expresión; ε representa la cadena vacía.')
  const transitions: FiniteTransition[] = []
  let stateCount = 0
  let cursor = 0
  const state = () => `e${stateCount++}`
  const edge = (from: string, to: string, read = '') => transitions.push({ id: `e${transitions.length}`, from, to, read })
  const is = (value: string) => tokens[cursor]?.value === value && !tokens[cursor]?.literal
  type Fragment = { start: string; end: string }
  function atom(depth: number): Fragment {
    const token = tokens[cursor]
    if (!token) throw new LanguageError('Falta una expresión.', characters.length + 1)
    let fragment: Fragment
    if (is('(')) {
      if (depth >= 32) throw new LanguageError('Se admiten hasta 32 niveles de paréntesis.', token.position)
      cursor++
      fragment = union(depth + 1)
      if (!is(')')) throw new LanguageError('Falta cerrar el paréntesis.', tokens[cursor]?.position ?? characters.length + 1)
      cursor++
    } else {
      if (!token.literal && ['+', ')', '*'].includes(token.value)) throw new LanguageError('Falta una expresión antes del operador.', token.position)
      cursor++
      fragment = { start: state(), end: state() }
      if (!token.literal && token.value === 'ε') edge(fragment.start, fragment.end)
      else if (token.literal || token.value !== '∅') {
        if (!alphabet.includes(token.value)) throw new LanguageError(`El símbolo «${token.value}» no pertenece a Σ.`, token.position)
        edge(fragment.start, fragment.end, token.value)
      }
    }
    while (is('*')) {
      cursor++
      const repeated = { start: state(), end: state() }
      edge(repeated.start, repeated.end)
      edge(repeated.start, fragment.start)
      edge(fragment.end, fragment.start)
      edge(fragment.end, repeated.end)
      fragment = repeated
    }
    return fragment
  }
  function concatenation(depth: number): Fragment {
    let fragment = atom(depth)
    while (cursor < tokens.length && !is('+') && !is(')')) {
      const next = atom(depth)
      edge(fragment.end, next.start)
      fragment = { start: fragment.start, end: next.end }
    }
    return fragment
  }
  function union(depth: number): Fragment {
    let fragment = concatenation(depth)
    while (is('+')) {
      cursor++
      const next = concatenation(depth)
      const combined = { start: state(), end: state() }
      edge(combined.start, fragment.start)
      edge(combined.start, next.start)
      edge(fragment.end, combined.end)
      edge(next.end, combined.end)
      fragment = combined
    }
    return fragment
  }
  const fragment = union(0)
  if (cursor < tokens.length) throw new LanguageError('El paréntesis no tiene apertura.', tokens[cursor].position)
  const labels = new Map<string, string>()
  return {
    initial: [fragment.start], accepting: new Set([fragment.end]), transitions,
    label: states => {
      const key = JSON.stringify(states)
      if (!labels.has(key)) labels.set(key, `r${labels.size}`)
      return `${labels.get(key)} · ${states.length ? `${states.length} ${states.length === 1 ? 'estado activo' : 'estados activos'}` : 'sin estados activos'}`
    },
  }
}

function compileLanguage(spec: LanguageSpec, alphabet: string[]): Reference {
  if (spec.kind === 'regex') return compileRegex(spec.source, alphabet)
  if (spec.kind === 'count' || spec.kind === 'length') {
    if (!Number.isInteger(spec.modulus) || spec.modulus < 2 || spec.modulus > 10
      || !Number.isInteger(spec.remainder) || spec.remainder < 0 || spec.remainder >= spec.modulus) {
      throw new LanguageError('El módulo debe estar entre 2 y 10 y el residuo entre 0 y módulo − 1.')
    }
    if (spec.kind === 'count' && !alphabet.includes(spec.symbol)) throw new LanguageError('El símbolo contado debe pertenecer a Σ.')
    return {
      initial: ['r0'], accepting: new Set([`r${spec.remainder}`]), transitions: [],
      move: (states, symbol) => states.map(state => `r${(Number(state.slice(1)) + (spec.kind === 'length' || symbol === spec.symbol ? 1 : 0)) % spec.modulus}`),
      label: states => {
        const subject = spec.kind === 'length' ? 'Longitud' : `Cantidad de ${spec.symbol}`
        const remainder = Number(states[0].slice(1))
        return spec.modulus === 2 ? `${subject}: ${remainder === 0 ? 'par' : 'impar'}` : `${subject} ≡ ${remainder} (mód. ${spec.modulus})`
      },
    }
  }
  const word = Array.from(spec.word)
  if (!word.length || word.length > 32) throw new LanguageError('La palabra debe tener entre 1 y 32 símbolos.')
  const invalid = word.find(symbol => !alphabet.includes(symbol))
  if (invalid !== undefined) throw new LanguageError(`El símbolo «${invalid}» no pertenece a Σ.`)
  const length = word.length
  const move = (current: number, symbol: string) => {
    let next: number
    if (spec.kind === 'prefix') next = current >= length ? current : symbol === word[current] ? current + 1 : length + 1
    else if (spec.kind === 'contains' && current === length) next = length
    else {
      const candidate = [...word.slice(0, current), symbol]
      next = Math.min(length, candidate.length)
      while (next > 0 && !word.slice(0, next).every((value, index) => value === candidate[candidate.length - next + index])) next--
    }
    return next
  }
  return {
    initial: ['r0'], accepting: new Set([`r${length}`]), transitions: [],
    move: (states, symbol) => states.map(state => `r${move(Number(state.slice(1)), symbol)}`),
    label: states => {
      const matched = Number(states[0].slice(1))
      if (spec.kind === 'prefix' && matched > length) return 'Prefijo distinto'
      if (matched === length && spec.kind !== 'suffix') return spec.kind === 'contains' ? 'Palabra encontrada' : 'Prefijo completo'
      return `${spec.kind === 'suffix' ? 'Sufijo' : 'Prefijo'} coincidente: ${word.slice(0, matched).join('') || 'ε'}`
    },
  }
}

export function finiteActivity(machine: FiniteMachine, states: string[], symbol?: string) {
  const index = indexFiniteTransitions(machine.transitions)
  return symbol === undefined ? epsilonClosure(states, index) : moveFinite(states, symbol, index)
}

export function semanticKey(machine: FiniteMachine): string {
  return JSON.stringify([
    machine.kind, [...machine.alphabet].sort(), machine.states.map(state => state.id).sort(),
    [...machine.initialStateIds].sort(), [...machine.acceptingStateIds].sort(),
    machine.transitions.map(edge => JSON.stringify([edge.id, edge.from, edge.to, edge.read])).sort(),
  ])
}

export async function compareLanguage(
  machine: FiniteMachine,
  spec: LanguageSpec,
  signal?: AbortSignal,
  limits: { pairs?: number; transitions?: number } = {},
): Promise<ComparisonResult> {
  const cancelled = (): ComparisonResult => ({ status: 'inconclusive', message: 'La comparación se canceló.' })
  if (signal?.aborted) return cancelled()
  if (machine.kind !== 'dfa' && machine.kind !== 'nfa') return { status: 'invalid', message: 'La comparación exacta está disponible para AFD y AFN.' }
  const issue = validateMachine(machine)[0]
  if (issue) return { status: 'invalid', message: issue.message }
  let reference: Reference
  try { reference = compileLanguage(spec, machine.alphabet) }
  catch (error) {
    if (error instanceof LanguageError) return { status: 'invalid', message: error.message, position: error.position }
    throw error
  }
  const maxPairs = limits.pairs ?? 10_000
  const maxTransitions = limits.transitions ?? 100_000
  const limited = (): ComparisonResult => ({ status: 'inconclusive', message: `La comparación alcanzó el límite de ${maxPairs.toLocaleString('es')} parejas o ${maxTransitions.toLocaleString('es')} transiciones. No se ha demostrado igualdad ni diferencia.` })
  if (maxPairs < 1) return limited()
  const leftIndex = indexFiniteTransitions(machine.transitions)
  const rightIndex = indexFiniteTransitions(reference.transitions)
  const accepting = new Set(machine.acceptingStateIds)
  const alphabet = [...machine.alphabet]
  const pairs: ProofPair[] = []
  const known = new Map<string, number>()
  function add(left: string[], right: string[], parent: number | null, via: string | null) {
    left.sort()
    right.sort()
    const key = JSON.stringify([left, right])
    const existing = known.get(key)
    if (existing !== undefined) return existing
    if (pairs.length >= maxPairs) return -1
    const index = pairs.length
    known.set(key, index)
    pairs.push({
      left, right, rightLabel: reference.label(right),
      acceptsLeft: left.some(state => accepting.has(state)), acceptsRight: right.some(state => reference.accepting.has(state)),
      successors: Object.create(null) as Record<string, number>, parent, via,
    })
    return index
  }
  const initial = epsilonClosure(machine.initialStateIds, leftIndex)
  add(initial.states, epsilonClosure(reference.initial, rightIndex).states, null, null)
  function counterexample(index: number): ComparisonResult {
    const path: number[] = []
    let current: number | null = index
    while (current !== null) { path.push(current); current = pairs[current].parent }
    path.reverse()
    const trace = path.map((pairIndex, offset): ComparisonFrame => {
      const pair = pairs[pairIndex]
      return {
        states: pair.left, referenceLabel: pair.rightLabel, acceptsLeft: pair.acceptsLeft, acceptsRight: pair.acceptsRight,
        transitionIds: offset === 0 ? initial.transitionIds : moveFinite(pairs[path[offset - 1]].left, pair.via!, leftIndex).transitionIds,
        symbol: pair.via,
      }
    })
    return { status: 'different', word: trace.map(frame => frame.symbol ?? '').join(''), trace }
  }
  let evaluated = 0
  let batchStart = performance.now()
  for (let cursor = 0; cursor < pairs.length; cursor++) {
    const pair = pairs[cursor]
    if (pair.acceptsLeft !== pair.acceptsRight) return counterexample(cursor)
    for (const symbol of alphabet) {
      if (performance.now() - batchStart >= 8) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        batchStart = performance.now()
      }
      if (signal?.aborted) return cancelled()
      if (evaluated >= maxTransitions) return limited()
      evaluated++
      const right = reference.move ? reference.move(pair.right, symbol) : moveFinite(pair.right, symbol, rightIndex).states
      const next = add(moveFinite(pair.left, symbol, leftIndex).states, right, cursor, symbol)
      if (next === -1) return limited()
      pair.successors[symbol] = next
      if (pairs[next].acceptsLeft !== pairs[next].acceptsRight) return counterexample(next)
    }
  }
  if (signal?.aborted) return cancelled()
  return { status: 'equivalent', certificate: { alphabet, pairs } }
}

const sameStates = (selected: string[], expected: string[]) =>
  selected.length === expected.length && new Set(selected).size === selected.length && selected.every(state => expected.includes(state))

export function checkBase(certificate: Certificate, selected: string[]): boolean {
  return !!certificate.pairs.length && sameStates(selected, certificate.pairs[0].left)
}

export function checkStep(certificate: Certificate, index: number, answers: Record<string, string[]>): boolean {
  const pair = certificate.pairs[index]
  return !!pair && certificate.alphabet.every(symbol => {
    const successor = certificate.pairs[pair.successors[symbol]]
    return Object.hasOwn(answers, symbol) && Array.isArray(answers[symbol]) && !!successor && sameStates(answers[symbol], successor.left)
  })
}

export function checkAcceptance(certificate: Certificate, index: number, answer: boolean | 'different'): boolean {
  const pair = certificate.pairs[index]
  return !!pair && (pair.acceptsLeft !== pair.acceptsRight ? answer === 'different' : answer === pair.acceptsLeft)
}

export function isProofComplete(certificate: Certificate, progress: { base: boolean; steps: boolean[]; acceptance: boolean[] }): boolean {
  return certificate.pairs.length > 0 && progress.base && progress.steps.length === certificate.pairs.length
    && progress.acceptance.length === certificate.pairs.length
    && certificate.pairs.every((pair, index) => progress.steps[index] && progress.acceptance[index] && pair.acceptsLeft === pair.acceptsRight)
}
