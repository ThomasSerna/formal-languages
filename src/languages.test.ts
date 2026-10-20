import { describe, expect, it } from 'vitest'
import type { FiniteMachine } from './domain'
import { EXAMPLES } from './examples'
import {
  checkAcceptance, checkBase, checkStep, compareLanguage, finiteActivity, isProofComplete, semanticKey,
  type Certificate, type LanguageSpec,
} from './languages'

const finiteExample = (kind: 'dfa' | 'nfa') => structuredClone(EXAMPLES[kind]) as FiniteMachine

function wordMachine(word: string, kind: 'prefix' | 'suffix' | 'contains'): FiniteMachine {
  const symbols = Array.from(word)
  const alphabet = [...new Set(symbols)]
  const states = Array.from({ length: symbols.length + 1 }, (_, index) => ({ id: String(index), name: String(index), x: index, y: 0 }))
  const transitions = symbols.map((read, index) => ({ id: `letter${index}`, from: String(index), to: String(index + 1), read }))
  if (kind !== 'prefix') for (const read of alphabet) transitions.push({ id: `before${read}`, from: '0', to: '0', read })
  if (kind !== 'suffix') for (const read of alphabet) transitions.push({ id: `after${read}`, from: String(symbols.length), to: String(symbols.length), read })
  return { schemaVersion: 1, kind: 'nfa', name: 'Palabra', states, transitions, alphabet, initialStateIds: ['0'], acceptingStateIds: [String(symbols.length)] }
}

async function certificate(machine: FiniteMachine, spec: LanguageSpec): Promise<Certificate> {
  const result = await compareLanguage(machine, spec)
  expect(result.status).toBe('equivalent')
  if (result.status !== 'equivalent') throw new Error(JSON.stringify(result))
  return result.certificate
}

describe('comparación exacta de lenguajes', () => {
  it('comprueba el ejemplo AFD con conteo modular y expresión regular', async () => {
    const machine = finiteExample('dfa')
    expect((await certificate(machine, { kind: 'count', symbol: '1', modulus: 2, remainder: 0 })).pairs).toHaveLength(2)
    await certificate(machine, { kind: 'regex', source: '(0+10*1)*' })
    const different = await compareLanguage(machine, { kind: 'count', symbol: '1', modulus: 2, remainder: 1 })
    expect(different.status).toBe('different')
    if (different.status === 'different') {
      expect(different.word).toBe('')
      expect(different.trace).toHaveLength(1)
      expect(different.trace[0]).toMatchObject({ symbol: null, states: ['q0'], acceptsLeft: true, acceptsRight: false })
    }
  })

  it('valida prefijo, sufijo y aparición con patrones solapados y Unicode', async () => {
    for (const kind of ['prefix', 'suffix', 'contains'] as const) for (const word of ['aab', 'abab', '😀😀a']) {
      await certificate(wordMachine(word, kind), { kind, word })
    }
    await certificate(finiteExample('nfa'), { kind: 'suffix', word: '01' })
    await certificate(finiteExample('nfa'), { kind: 'regex', source: '(0+1)*01' })
  })

  it('genera el contraejemplo más corto con ambos recorridos y transiciones ε', async () => {
    const result = await compareLanguage(finiteExample('nfa'), { kind: 'prefix', word: '01' })
    expect(result.status).toBe('different')
    if (result.status !== 'different') return
    expect(result.word).toBe('001')
    expect(result.trace).toHaveLength(4)
    expect(result.trace[0].states).toEqual(['q0', 's'])
    expect(result.trace[0].transitionIds).toEqual(['n0'])
    expect(result.trace[3]).toMatchObject({ states: ['q0', 'q2'], symbol: '1', acceptsLeft: true, acceptsRight: false })
  })

  it('maneja ciclos ε, múltiples iniciales y aceptación por cualquier rama', async () => {
    const machine = finiteExample('nfa')
    machine.initialStateIds.push('q0')
    machine.transitions.push({ id: 'cycle', from: 'q0', to: 's', read: '' })
    await certificate(machine, { kind: 'suffix', word: '01' })
    expect(finiteActivity(machine, ['s']).states.sort()).toEqual(['q0', 's'])
    expect(finiteActivity(machine, ['s', 'q0'], '0').states.sort()).toEqual(['q0', 'q1', 's'])
  })

  it('admite AFN sin iniciales y Σ vacío', async () => {
    const machine = finiteExample('nfa')
    machine.initialStateIds = []
    const proof = await certificate(machine, { kind: 'regex', source: '∅' })
    expect(proof.pairs.every(pair => !pair.left.length)).toBe(true)
    const result = await compareLanguage(machine, { kind: 'regex', source: 'ε' })
    expect(result).toMatchObject({ status: 'different', word: '' })
    const emptyAlphabet = { ...machine, alphabet: [], transitions: [] }
    expect(await compareLanguage(emptyAlphabet, { kind: 'regex', source: '∅' }, undefined, { pairs: 1, transitions: 0 })).toMatchObject({ status: 'equivalent' })
  })

  it('cuenta longitud y símbolos con residuos distintos de cero', async () => {
    const machine: FiniteMachine = {
      schemaVersion: 1, kind: 'dfa', name: 'Residuo', alphabet: ['0', '1'],
      states: [0, 1, 2].map(index => ({ id: String(index), name: String(index), x: index, y: 0 })),
      initialStateIds: ['0'], acceptingStateIds: ['1'],
      transitions: [0, 1, 2].flatMap(index => ['0', '1'].map(read => ({ id: `${index}${read}`, from: String(index), to: String((index + 1) % 3), read }))),
    }
    await certificate(machine, { kind: 'length', modulus: 3, remainder: 1 })
    expect(await compareLanguage(machine, { kind: 'count', symbol: '0', modulus: 3, remainder: 1 })).toMatchObject({ status: 'different', word: '1' })
    machine.transitions = machine.transitions.map(edge => edge.read === '1' ? { ...edge, to: edge.from } : edge)
    await certificate(machine, { kind: 'count', symbol: '0', modulus: 3, remainder: 1 })
  })

  it('no limita los contraejemplos a los 256 símbolos del simulador', async () => {
    const machine: FiniteMachine = { schemaVersion: 1, kind: 'nfa', name: 'Ciclos', alphabet: ['0'], states: [], transitions: [], initialStateIds: [], acceptingStateIds: [] }
    for (const modulus of [7, 11, 13]) {
      machine.initialStateIds.push(`${modulus}:0`)
      for (let index = 0; index < modulus; index++) {
        const id = `${modulus}:${index}`
        machine.states.push({ id, name: id, x: index, y: modulus })
        machine.transitions.push({ id, from: id, to: `${modulus}:${(index + 1) % modulus}`, read: '0' })
        if (index) machine.acceptingStateIds.push(id)
      }
    }
    const result = await compareLanguage(machine, { kind: 'regex', source: '00*' })
    expect(result.status).toBe('different')
    if (result.status === 'different') {
      expect(result.word).toBe('0'.repeat(1001))
      expect(result.trace).toHaveLength(1002)
    }
  })

  it('distingue igualdad, presupuesto exacto e inconcluso', async () => {
    const machine = finiteExample('dfa')
    const spec: LanguageSpec = { kind: 'count', symbol: '1', modulus: 2, remainder: 0 }
    expect(await compareLanguage(machine, spec, undefined, { pairs: 2, transitions: 4 })).toMatchObject({ status: 'equivalent' })
    expect(await compareLanguage(machine, spec, undefined, { pairs: 1, transitions: 4 })).toMatchObject({ status: 'inconclusive' })
    expect(await compareLanguage(machine, spec, undefined, { pairs: 2, transitions: 3 })).toMatchObject({ status: 'inconclusive' })
    expect(await compareLanguage(machine, spec, undefined, { pairs: 0 })).toMatchObject({ status: 'inconclusive' })
  })

  it('cede el hilo y permite cancelar una exploración exponencial', async () => {
    const machine: FiniteMachine = { schemaVersion: 1, kind: 'nfa', name: 'Símbolo distante', alphabet: ['0', '1'], states: [], transitions: [], initialStateIds: ['0'], acceptingStateIds: ['14'] }
    for (let index = 0; index <= 14; index++) machine.states.push({ id: String(index), name: String(index), x: index, y: 0 })
    machine.transitions.push({ id: 'loop0', from: '0', to: '0', read: '0' }, { id: 'loop1', from: '0', to: '0', read: '1' }, { id: 'choose', from: '0', to: '1', read: '1' })
    for (let index = 1; index < 14; index++) for (const read of machine.alphabet) machine.transitions.push({ id: `${index}${read}`, from: String(index), to: String(index + 1), read })
    const controller = new AbortController()
    let timerRan = false
    const timer = setTimeout(() => { timerRan = true; controller.abort() }, 0)
    const result = await compareLanguage(machine, { kind: 'regex', source: `(0+1)*1${'(0+1)'.repeat(13)}` }, controller.signal)
    clearTimeout(timer)
    expect(timerRan).toBe(true)
    expect(result).toMatchObject({ status: 'inconclusive', message: 'La comparación se canceló.' })
    expect(await compareLanguage(finiteExample('dfa'), { kind: 'regex', source: 'ε' }, controller.signal)).toMatchObject({ status: 'inconclusive' })
  })
})

describe('expresiones regulares matemáticas y validación', () => {
  it('respeta precedencia de estrella, concatenación y unión', async () => {
    const machine: FiniteMachine = {
      schemaVersion: 1, kind: 'nfa', name: 'Unión', alphabet: ['0', '1'],
      states: ['s', 'zero', 'ones'].map(id => ({ id, name: id, x: 0, y: 0 })), initialStateIds: ['s'], acceptingStateIds: ['zero', 'ones'],
      transitions: [{ id: '0', from: 's', to: 'zero', read: '0' }, { id: '1', from: 's', to: 'ones', read: '1' }, { id: 'more', from: 'ones', to: 'ones', read: '1' }],
    }
    await certificate(machine, { kind: 'regex', source: ' 0 + 1 1* ' })
    expect(await compareLanguage(machine, { kind: 'regex', source: '(0+1)1*' })).toMatchObject({ status: 'different', word: '01' })
  })

  it('escapa operadores y espacios, y cuenta Unicode por puntos de código', async () => {
    const literal = '+*∅\\ '
    const machine = wordMachine(literal, 'prefix')
    const escaped = Array.from(literal).map(symbol => `\\${symbol}`).join('')
    await certificate(machine, { kind: 'regex', source: `${escaped}(\\++\\*+\\∅+\\\\+\\ )*` })
    const emoji = wordMachine('😀', 'contains')
    await certificate(emoji, { kind: 'regex', source: '😀😀*' })
    expect(await compareLanguage(emoji, { kind: 'regex', source: '😀'.repeat(256) })).toMatchObject({ status: 'different' })
    expect(await compareLanguage(emoji, { kind: 'regex', source: '😀'.repeat(257) })).toMatchObject({ status: 'invalid' })
  })

  it('limita anidamiento y señala errores sintácticos por posición', async () => {
    const machine = finiteExample('nfa')
    machine.alphabet = []
    machine.transitions = []
    machine.acceptingStateIds = [...machine.initialStateIds]
    await certificate(machine, { kind: 'regex', source: `${'('.repeat(32)}ε${')'.repeat(32)}` })
    expect(await compareLanguage(machine, { kind: 'regex', source: `${'('.repeat(33)}ε${')'.repeat(33)}` })).toMatchObject({ status: 'invalid', position: 33 })
    for (const source of ['0+', '(0', '0)', '*0', '()', '\\', '2']) {
      const result = await compareLanguage(finiteExample('dfa'), { kind: 'regex', source })
      expect(result.status, source).toBe('invalid')
      if (result.status === 'invalid') expect(result.position).toBeGreaterThan(0)
    }
    expect(await compareLanguage(machine, { kind: 'regex', source: ' ' })).toMatchObject({ status: 'invalid' })
  })

  it('distingue ε de ∅ en unión, concatenación y estrella', async () => {
    const machine = finiteExample('nfa')
    machine.transitions = []
    machine.acceptingStateIds = [...machine.initialStateIds]
    for (const source of ['ε', 'ε*', '∅*', '(∅+ε)*', '∅+ε', 'εε']) await certificate(machine, { kind: 'regex', source })
    machine.acceptingStateIds = []
    for (const source of ['∅', '∅ε', 'ε∅', '∅+∅']) await certificate(machine, { kind: 'regex', source })
  })

  it('rechaza autómatas inválidos y parámetros fuera de las fronteras', async () => {
    const machine = finiteExample('dfa')
    for (const spec of [
      { kind: 'count', symbol: '2', modulus: 2, remainder: 0 },
      { kind: 'length', modulus: 1, remainder: 0 }, { kind: 'length', modulus: 11, remainder: 0 },
      { kind: 'length', modulus: 2.5, remainder: 0 }, { kind: 'length', modulus: 2, remainder: 2 },
      { kind: 'length', modulus: 2, remainder: -1 }, { kind: 'prefix', word: '' },
      { kind: 'suffix', word: '0'.repeat(33) }, { kind: 'contains', word: '2' },
    ] satisfies LanguageSpec[]) expect(await compareLanguage(machine, spec)).toMatchObject({ status: 'invalid' })
    machine.transitions.pop()
    expect(await compareLanguage(machine, { kind: 'regex', source: 'ε' })).toMatchObject({ status: 'invalid' })
  })
})

describe('obligaciones de la demostración', () => {
  it('verifica base, cada símbolo y aceptación, sin admitir marcas parciales', async () => {
    const proof = await certificate(finiteExample('dfa'), { kind: 'count', symbol: '1', modulus: 2, remainder: 0 })
    expect(checkBase(proof, ['q0'])).toBe(true)
    expect(checkBase(proof, [])).toBe(false)
    expect(checkBase(proof, ['q0', 'q0'])).toBe(false)
    expect(checkStep(proof, 0, { '0': ['q0'], '1': ['q1'] })).toBe(true)
    expect(checkStep(proof, 0, { '0': ['q0'] })).toBe(false)
    expect(checkStep(proof, 0, { '0': ['q0'], '1': ['q0'] })).toBe(false)
    expect(checkStep(proof, 99, {})).toBe(false)
    expect(checkAcceptance(proof, 0, true)).toBe(true)
    expect(checkAcceptance(proof, 0, false)).toBe(false)
    expect(checkAcceptance(proof, 0, 'different')).toBe(false)
    expect(checkAcceptance(proof, 1, false)).toBe(true)
    const progress = { base: true, steps: [true, true], acceptance: [true, true] }
    expect(isProofComplete(proof, progress)).toBe(true)
    expect(isProofComplete(proof, { ...progress, base: false })).toBe(false)
    expect(isProofComplete(proof, { ...progress, steps: [true] })).toBe(false)
    expect(isProofComplete(proof, { ...progress, acceptance: [true, false] })).toBe(false)
    expect(proof.pairs.map(pair => pair.rightLabel)).toEqual(['Cantidad de 1: par', 'Cantidad de 1: impar'])
  })

  it('identifica cada configuración de la ER sin confundir subconjuntos del mismo tamaño', async () => {
    const proof = await certificate(finiteExample('dfa'), { kind: 'regex', source: '(0+10*1)*' })
    const configurations = new Map(proof.pairs.map(pair => [JSON.stringify(pair.right), pair.rightLabel]))
    expect(new Set(configurations.values()).size).toBe(configurations.size)
    expect(new Set(proof.pairs.map(pair => pair.right.length)).size).toBeLessThan(configurations.size)
    expect([...configurations.values()].every(label => /^r\d+ · /.test(label))).toBe(true)
  })

  it('exige seleccionar explícitamente ∅ y comprueba toda la clausura inicial', async () => {
    const machine = finiteExample('nfa')
    const proof = await certificate(machine, { kind: 'suffix', word: '01' })
    expect(checkBase(proof, ['s', 'q0'])).toBe(true)
    expect(checkBase(proof, ['s'])).toBe(false)
    machine.initialStateIds = []
    const empty = await certificate(machine, { kind: 'regex', source: '∅' })
    expect(checkBase(empty, [])).toBe(true)
    expect(checkStep(empty, 0, {})).toBe(false)
    expect(checkStep(empty, 0, { '0': [], '1': [] })).toBe(true)
  })

  it('conserva las pruebas al mover o renombrar e invalida cambios semánticos', () => {
    const machine = finiteExample('dfa')
    const before = semanticKey(machine)
    machine.name = 'Otro título'
    machine.states = machine.states.reverse().map(state => ({ ...state, name: `Estado ${state.id}`, x: 999, y: -1 }))
    machine.alphabet.reverse()
    machine.transitions.reverse()
    expect(semanticKey(machine)).toBe(before)
    machine.acceptingStateIds = ['q1']
    expect(semanticKey(machine)).not.toBe(before)
  })
})
