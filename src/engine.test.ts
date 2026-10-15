import { describe, expect, it } from 'vitest'
import { LIMITS, type Machine, type MachineKind, type FiniteMachine, type PdaMachine, type TmMachine } from './domain'
import { createRun, stepRun, validateInput, validateMachine, type Run } from './engine'
import { createBlankMachine, EXAMPLES, EXAMPLE_INPUTS } from './examples'

function finish(machine: Machine, input: string, maximum = 10_100): Run {
  let run = createRun(machine, input)
  for (let step = 0; run.status === 'running' && step < maximum; step++) run = stepRun(machine, run)
  return run
}

function draftWithStates(kind: 'pda' | 'tm'): Machine {
  const machine = createBlankMachine(kind)
  const ids = kind === 'tm' ? ['s', 't', 'r'] : ['q0']
  machine.states = ids.map((id, index) => ({ id, name: id, x: index * 150, y: 100 }))
  machine.initialStateIds = [ids[0]]
  if (machine.kind === 'tm') {
    machine.acceptingStateIds = ['t']
    machine.rejectStateId = 'r'
  }
  return machine
}

describe('ejemplos y aceptación formal', () => {
  it.each(Object.keys(EXAMPLES) as MachineKind[])('%s tiene una definición válida', (kind) => {
    expect(validateMachine(EXAMPLES[kind])).toEqual([])
    expect(finish(EXAMPLES[kind], EXAMPLE_INPUTS[kind]).status).toBe('accepted')
  })

  it.each(Object.keys(EXAMPLES) as MachineKind[])('%s comienza en un lienzo vacío que aún no se puede simular', (kind) => {
    const machine = createBlankMachine(kind)
    expect(machine.states).toEqual([])
    expect(machine.initialStateIds).toEqual([])
    expect(machine.acceptingStateIds).toEqual([])
    expect(machine.transitions).toEqual([])
    if (machine.kind === 'tm') expect(machine.rejectStateId).toBe('')
    expect(validateMachine(machine).some((issue) => issue.field === 'states')).toBe(true)
    expect(createRun(machine, '').status).toBe('inconclusive')
  })

  it.each([
    ['dfa', ['', '0', '11', '101'], ['1', '10', '111']],
    ['nfa', ['01', '001', '1101'], ['', '0', '1', '011', '010']],
    ['pda', ['', 'ab', 'aabb', 'aaabbb'], ['a', 'b', 'abb', 'abab', 'ba']],
    ['tm', ['', '01', '0011', '000111'], ['0', '1', '001', '011', '0101', '00101']],
  ] as [MachineKind, string[], string[]][])('%s acepta y rechaza las cadenas esperadas', (kind, yes, no) => {
    for (const input of yes) expect(finish(EXAMPLES[kind], input).status, input).toBe('accepted')
    for (const input of no) expect(finish(EXAMPLES[kind], input).status, input).toBe('rejected')
  })

  it('comprueba exhaustivamente cadenas pequeñas de los cuatro lenguajes', () => {
    for (const kind of Object.keys(EXAMPLES) as MachineKind[]) {
      const machine = EXAMPLES[kind]
      let words = ['']
      for (let length = 0; length <= 5; length++) {
        for (const word of words) {
          const expected = kind === 'dfa' ? Array.from(word).filter((letter) => letter === '1').length % 2 === 0
            : kind === 'nfa' ? word.endsWith('01')
              : kind === 'pda' ? word.length % 2 === 0 && word === 'a'.repeat(word.length / 2) + 'b'.repeat(word.length / 2)
                : word.length % 2 === 0 && word === '0'.repeat(word.length / 2) + '1'.repeat(word.length / 2)
          expect(finish(machine, word).status, `${kind}: ${word}`).toBe(expected ? 'accepted' : 'rejected')
        }
        words = words.flatMap((word) => machine.alphabet.map((letter) => word + letter))
      }
    }
  })
})

describe('AFN y AP no deterministas', () => {
  it('calcula clausuras ε cíclicas, antes y después de leer, sin consumir símbolos', () => {
    const machine = structuredClone(EXAMPLES.nfa)
    if (machine.kind !== 'nfa') throw new Error('fixture')
    machine.initialStateIds = ['s', 'q1']
    machine.transitions.push({ id: 'cycle', from: 'q0', to: 's', read: '' }, { id: 'final', from: 'q1', to: 'q2', read: '' })
    const run = createRun(machine, '')
    expect(run.status).toBe('accepted')
    expect(run.configurations.map((item) => item.stateId).sort()).toEqual(['q0', 'q1', 'q2', 's'])
    expect(run.step).toBe(0)
    expect(run.message).toContain('clausura ε')
    const afterReading = stepRun(machine, createRun(machine, '0'))
    expect(afterReading.status).toBe('accepted')
    expect(afterReading.transitionIds).toContain('final')
  })

  it('mantiene rutas con pilas diferentes y no acepta con entrada pendiente', () => {
    const machine = structuredClone(EXAMPLES.pda) as PdaMachine
    const initial = createRun(machine, 'ab')
    const next = stepRun(machine, initial)
    expect(next.status).toBe('running')
    expect(next.configurations.some((item) => item.stateId === 'f' && item.inputIndex === 0)).toBe(true)
    expect(next.configurations.find((item) => item.stateId === 'p')?.stack).toEqual(['A', '⊥'])
    expect(next.message).toContain('p → p: lee a, retira ⊥, apila A⊥')
    expect(next.message).toContain('p → f: lee ε, retira ⊥, apila ⊥')
    expect(initial.configurations[0].stack).toEqual(['⊥'])
    machine.transitions.unshift({ id: 'other-stack', from: 'p', to: 'p', read: 'a', pop: '⊥', push: ['⊥'] })
    expect(finish(machine, 'ab').status).toBe('accepted')
  })

  it('rechaza un ciclo ε repetido y limita un ciclo que hace crecer la pila', () => {
    const machine = draftWithStates('pda') as PdaMachine
    machine.transitions = [{ id: 'cycle', from: 'q0', to: 'q0', read: '', pop: '⊥', push: ['⊥'] }]
    expect(finish(machine, '').status).toBe('rejected')
    machine.transitions[0].push = ['⊥', '⊥']
    const run = finish(machine, '')
    expect(run.status).toBe('inconclusive')
    expect(run.message).toContain(String(LIMITS.pdaStack))
  })

  it('permite vaciar la pila pero ninguna regla puede operar sobre ella después', () => {
    const machine = draftWithStates('pda') as PdaMachine
    machine.transitions = [{ id: 'pop', from: 'q0', to: 'q0', read: '', pop: '⊥', push: [] }]
    expect(finish(machine, '').status).toBe('rejected')
    machine.acceptingStateIds = ['q0']
    expect(finish(machine, '').status).toBe('accepted')
  })

  it('resume hasta tres reglas AP y cuenta las demás sin mostrar identificadores internos', () => {
    const machine = draftWithStates('pda') as PdaMachine
    machine.states[0] = { ...machine.states[0], id: 'uuid-internal', name: 'inicio' }
    machine.initialStateIds = ['uuid-internal']
    machine.transitions = Array.from({ length: 5 }, (_, index) => ({
      id: String(index), from: 'uuid-internal', to: 'uuid-internal', read: 'a', pop: '⊥', push: Array.from({ length: index + 1 }, () => '⊥'),
    }))
    const run = stepRun(machine, createRun(machine, 'a'))
    expect(run.message).toContain('5 configuraciones posibles')
    expect(run.message).toContain('+2 reglas')
    expect(run.message.match(/inicio → inicio/g)).toHaveLength(3)
    expect(run.message).not.toContain('uuid-internal')
  })
})

describe('máquina de Turing y límites', () => {
  it('empieza en ⊢ y hace visible el rechazo por defecto', () => {
    const machine = draftWithStates('tm') as TmMachine
    const before = createRun(machine, '0')
    const after = stepRun(machine, before)
    expect(before.configurations[0].head).toBe(0)
    expect(before.configurations[0].tape).toEqual({ 0: '⊢', 1: '0' })
    expect(after.status).toBe('rejected')
    expect(after.configurations[0].head).toBe(1)
    expect(after.transitionIds[0]).toMatch(/^__default:/)
    expect(after.message).toContain('defecto')
    expect(stepRun(machine, after)).toBe(after)
  })

  it('conserva los snapshots anteriores y comparte la cinta cuando no escribe', () => {
    const machine = EXAMPLES.tm
    const initial = createRun(machine, '01')
    const moved = stepRun(machine, initial)
    const written = stepRun(machine, moved)
    expect(moved.configurations[0].tape).toBe(initial.configurations[0].tape)
    expect(written.configurations[0].tape?.[1]).toBe('X')
    expect(initial.configurations[0].tape?.[1]).toBe('0')
    expect(written.configurations[0].tape).not.toBe(initial.configurations[0].tape)
  })

  it('explica las transiciones MT con nombres de estados, incluidos los rechazos por defecto', () => {
    const machine = draftWithStates('tm') as TmMachine
    machine.states[0] = { ...machine.states[0], name: 'inicio visible' }
    machine.states[2] = { ...machine.states[2], name: 'rechazo visible' }
    expect(stepRun(machine, createRun(machine, '')).message).toContain('δ(inicio visible, ⊢) = (rechazo visible, ⊢, R)')
    machine.transitions = [{ id: 'loop', from: 's', to: 's', read: '⊢', write: '⊢', move: 'R' }]
    expect(stepRun(machine, createRun(machine, '')).message).toContain('δ(inicio visible, ⊢) = (inicio visible, ⊢, R)')
  })

  it('no añade una prohibición ajena a Kozen sobre escribir ⊢ en otra celda', () => {
    const machine = draftWithStates('tm') as TmMachine
    machine.transitions = [
      { id: 'start', from: 's', to: 's', read: '⊢', write: '⊢', move: 'R' },
      { id: 'copy-marker', from: 's', to: 't', read: '0', write: '⊢', move: 'R' },
    ]
    expect(validateMachine(machine)).toEqual([])
    expect(finish(machine, '0').configurations[0].tape?.[1]).toBe('⊢')
  })

  it('un límite de pasos o cinta nunca significa rechazo', () => {
    const machine = draftWithStates('tm') as TmMachine
    machine.transitions = [{ id: 'start', from: 's', to: 's', read: '⊢', write: '⊢', move: 'R' }, { id: 'back', from: 's', to: 's', read: '␣', write: '␣', move: 'L' }]
    expect(finish(machine, '').status).toBe('inconclusive')
    machine.transitions[1].move = 'R'
    const run = finish(machine, '')
    expect(run.status).toBe('inconclusive')
    expect(run.message).toContain(String(LIMITS.tmCells))
  })

  it('limita el número de configuraciones y aplicaciones AP', () => {
    const machine = draftWithStates('pda') as PdaMachine
    machine.stackAlphabet.push('B')
    machine.transitions = machine.stackAlphabet.flatMap((pop) => ['A', 'B'].map((push) => ({
      id: `${pop}-${push}`, from: 'q0', to: 'q0', read: '', pop, push: [push, pop],
    })))
    const manyConfigurations = finish(machine, '')
    expect(manyConfigurations.status).toBe('inconclusive')
    expect(manyConfigurations.message).toContain(String(LIMITS.pdaConfigurations))
    machine.transitions = Array.from({ length: 300 }, (_, index) => ({
      id: String(index), from: 'q0', to: 'q0', read: 'a', pop: '⊥', push: ['⊥'],
    }))
    const manyApplications = finish(machine, 'a'.repeat(40))
    expect(manyApplications.status).toBe('inconclusive')
    expect(manyApplications.message).toContain(String(LIMITS.pdaApplications))
  })
})

describe('validación de fronteras', () => {
  it('rechaza documentos mal formados sin lanzar excepciones', () => {
    for (const value of [null, [], {}, { schemaVersion: 1, kind: 'dfa' }, { ...EXAMPLES.dfa, states: [null] }]) {
      expect(validateMachine(value).length).toBeGreaterThan(0)
    }
  })

  it('valida totalidad AFD, determinismo, referencias y reglas de pila', () => {
    const machine = structuredClone(EXAMPLES.dfa) as FiniteMachine
    machine.transitions.pop()
    expect(validateMachine(machine).some((issue) => issue.message.includes('Falta definir'))).toBe(true)
    machine.transitions.push({ ...machine.transitions[0], id: 'duplicate', to: 'missing' })
    expect(validateMachine(machine).some((issue) => issue.message.includes('determinista'))).toBe(true)
    expect(validateMachine(machine).some((issue) => issue.message.includes('existentes'))).toBe(true)
    const stack = structuredClone(EXAMPLES.pda) as PdaMachine
    stack.transitions[0].pop = ''
    expect(validateMachine(stack).some((issue) => issue.transitionId === 'p0')).toBe(true)
  })

  it('protege el marcador y los estados terminales MT', () => {
    const machine = structuredClone(EXAMPLES.tm) as TmMachine
    machine.transitions[0].move = 'L'
    machine.transitions.push({ id: 'escape', from: 't', to: 's', read: '0', write: '0', move: 'R' })
    expect(validateMachine(machine).some((issue) => issue.message.includes('marcador'))).toBe(true)
    expect(validateMachine(machine).some((issue) => issue.message.includes('absorbentes'))).toBe(true)
  })

  it('reserva ε y señala el estado cuyo nombre está repetido', () => {
    for (const kind of ['dfa', 'pda', 'tm'] as const) {
      const machine = structuredClone(EXAMPLES[kind])
      const field = machine.kind === 'pda' ? 'stackAlphabet' : machine.kind === 'tm' ? 'tapeAlphabet' : 'alphabet'
      expect(validateMachine({ ...machine, [field]: ['ε'] }).some((issue) => issue.field === field)).toBe(true)
    }
    const machine = structuredClone(EXAMPLES.dfa)
    machine.states[1].name = ` ${machine.states[0].name} `
    expect(validateMachine(machine).find((issue) => issue.message.includes('nombres'))?.stateId).toBe('q1')
  })

  it('cuenta caracteres Unicode y rechaza entradas fuera de Σ o demasiado largas', () => {
    const machine = structuredClone(EXAMPLES.dfa)
    machine.alphabet = ['😀']
    machine.transitions = [{ id: 'emoji', from: 'q0', to: 'q0', read: '😀' }, { id: 'emoji2', from: 'q1', to: 'q1', read: '😀' }]
    expect(validateMachine(machine)).toEqual([])
    expect(finish(machine, '😀😀').step).toBe(2)
    expect(validateInput(machine, '😀'.repeat(LIMITS.input))).toBeNull()
    expect(validateInput(machine, '😀'.repeat(LIMITS.input + 1))).not.toBeNull()
    expect(createRun(machine, 'x').status).toBe('inconclusive')
    expect(validateMachine({ ...machine, states: Array.from({ length: 51 }, (_, i) => ({ id: String(i), name: String(i), x: 0, y: 0 })) }).some((issue) => issue.message.includes('50'))).toBe(true)
    expect(validateMachine({ ...machine, transitions: Array.from({ length: 301 }, (_, i) => ({ id: String(i), from: 'q0', to: 'q0', read: '😀' })) }).some((issue) => issue.message.includes('300'))).toBe(true)
  })
})
