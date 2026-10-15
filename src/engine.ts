import { LIMITS, type Machine, type FiniteTransition, type TmMachine } from './domain'

export interface ValidationIssue {
  message: string
  stateId?: string
  transitionId?: string
  field?: string
}

export interface Configuration {
  stateId: string
  inputIndex: number
  stack?: string[]
  tape?: Record<number, string>
  head?: number
}

export interface Run {
  status: 'running' | 'accepted' | 'rejected' | 'inconclusive'
  step: number
  input: string[]
  configurations: Configuration[]
  transitionIds: string[]
  message: string
  visited?: ReadonlySet<string>
  applications?: number
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
const symbol = (value: string) => Array.from(value).length === 1 && value !== 'ε'
const stateName = (machine: Machine, id: string) => machine.states.find((state) => state.id === id)?.name ?? 'estado desconocido'

export function validateMachine(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (message: string, location: Omit<ValidationIssue, 'message'> = {}) =>
    issues.push({ message, ...location })

  if (!record(value) || value.schemaVersion !== 1 || !['dfa', 'nfa', 'pda', 'tm'].includes(String(value.kind))) {
    return [{ message: 'El documento no contiene un autómata de versión 1 reconocido.' }]
  }
  if (typeof value.name !== 'string' || !value.name.trim()) add('Escribe un nombre para el autómata.', { field: 'name' })
  if (!strings(value.alphabet) || !strings(value.initialStateIds) || !strings(value.acceptingStateIds)) {
    add('Los alfabetos y los estados iniciales y finales deben ser listas de símbolos o identificadores.')
  }
  if (!Array.isArray(value.states) || !value.states.every((state) => record(state)
    && typeof state.id === 'string' && state.id.length > 0 && typeof state.name === 'string'
    && state.name.trim().length > 0 && typeof state.x === 'number' && Number.isFinite(state.x)
    && typeof state.y === 'number' && Number.isFinite(state.y))) {
    add('Cada estado necesita identificador, nombre y coordenadas válidas.', { field: 'states' })
  }
  if (!Array.isArray(value.transitions) || !value.transitions.every((edge) => record(edge)
    && typeof edge.id === 'string' && edge.id.length > 0 && typeof edge.from === 'string'
    && typeof edge.to === 'string' && typeof edge.read === 'string'
    && (value.kind !== 'pda' || (typeof edge.pop === 'string' && strings(edge.push)))
    && (value.kind !== 'tm' || (typeof edge.write === 'string' && ['L', 'R'].includes(String(edge.move)))))) {
    add('Hay una transición con campos incompletos o de tipo incorrecto.', { field: 'transitions' })
  }
  if (value.kind === 'pda' && (!strings(value.stackAlphabet) || typeof value.initialStackSymbol !== 'string')) {
    add('Define el alfabeto y el símbolo inicial de la pila.', { field: 'stackAlphabet' })
  }
  if (value.kind === 'tm' && (!strings(value.tapeAlphabet) || typeof value.leftMarker !== 'string'
    || typeof value.blankSymbol !== 'string' || typeof value.rejectStateId !== 'string')) {
    add('Define el alfabeto de cinta, sus símbolos especiales y el estado de rechazo.', { field: 'tapeAlphabet' })
  }
  if (issues.length) return issues

  const machine = value as unknown as Machine
  if (!machine.states.length) add('Agrega un estado para comenzar a construir el autómata.', { field: 'states' })
  if (machine.states.length > LIMITS.states) add(`El límite es ${LIMITS.states} estados.`, { field: 'states' })
  if (machine.transitions.length > LIMITS.transitions) add(`El límite es ${LIMITS.transitions} transiciones.`, { field: 'transitions' })
  const ids = new Set(machine.states.map((state) => state.id))
  if (ids.size !== machine.states.length) add('Los identificadores de los estados deben ser únicos.', { field: 'states' })
  const names = new Set<string>()
  for (const state of machine.states) {
    const name = state.name.trim()
    if (names.has(name)) add('Los nombres de los estados deben ser únicos.', { stateId: state.id, field: 'name' })
    names.add(name)
  }
  if (new Set(machine.transitions.map((edge) => edge.id)).size !== machine.transitions.length) {
    add('Los identificadores de las transiciones deben ser únicos.', { field: 'transitions' })
  }
  const checkAlphabet = (alphabet: string[], field: string) => {
    if (alphabet.some((letter) => !symbol(letter))) add('Cada símbolo del alfabeto debe ser un único carácter Unicode; ε se representa como entrada vacía.', { field })
    if (new Set(alphabet).size !== alphabet.length) add('El alfabeto contiene símbolos repetidos.', { field })
  }
  checkAlphabet(machine.alphabet, 'alphabet')
  for (const field of ['initialStateIds', 'acceptingStateIds'] as const) {
    if (new Set(machine[field]).size !== machine[field].length) add('Un estado no puede aparecer dos veces en el mismo conjunto.', { field })
    for (const id of machine[field]) if (!ids.has(id)) add('El conjunto hace referencia a un estado que no existe.', { field, stateId: id })
  }
  if (machine.kind !== 'nfa' && machine.initialStateIds.length !== 1) {
    add('Este modelo necesita exactamente un estado inicial.', { field: 'initialStateIds' })
  }
  if (machine.kind === 'pda') {
    checkAlphabet(machine.stackAlphabet, 'stackAlphabet')
    if (!machine.stackAlphabet.includes(machine.initialStackSymbol)) add('El símbolo inicial debe pertenecer al alfabeto de pila.', { field: 'initialStackSymbol' })
  }
  if (machine.kind === 'tm') {
    checkAlphabet(machine.tapeAlphabet, 'tapeAlphabet')
    if (machine.alphabet.some((letter) => !machine.tapeAlphabet.includes(letter))) add('Σ debe estar contenido en el alfabeto de cinta Γ.', { field: 'tapeAlphabet' })
    for (const field of ['leftMarker', 'blankSymbol'] as const) {
      if (!machine.tapeAlphabet.includes(machine[field]) || machine.alphabet.includes(machine[field])) {
        add('El marcador y el blanco deben pertenecer a Γ y estar fuera de Σ.', { field })
      }
    }
    if (machine.leftMarker === machine.blankSymbol) add('El marcador izquierdo y el blanco deben ser distintos.', { field: 'blankSymbol' })
    if (machine.acceptingStateIds.length !== 1) add('La MT necesita exactamente un estado de aceptación t.', { field: 'acceptingStateIds' })
    if (!ids.has(machine.rejectStateId) || machine.acceptingStateIds.includes(machine.rejectStateId)) {
      add('Elige un estado de rechazo r distinto del estado de aceptación t.', { field: 'rejectStateId' })
    }
  }
  const deterministic = new Set<string>()
  for (const edge of machine.transitions) {
    const location = { transitionId: edge.id }
    if (!ids.has(edge.from) || !ids.has(edge.to)) add('La transición debe unir dos estados existentes.', location)
    const readingAlphabet = machine.kind === 'tm' ? machine.tapeAlphabet : machine.alphabet
    if (!readingAlphabet.includes(edge.read) && !((machine.kind === 'nfa' || machine.kind === 'pda') && edge.read === '')) {
      add('El símbolo leído no pertenece al alfabeto de este modelo.', location)
    }
    if (machine.kind === 'dfa' || machine.kind === 'tm') {
      const key = JSON.stringify([edge.from, edge.read])
      if (deterministic.has(key)) add('En un modelo determinista solo puede haber una regla por estado y símbolo.', location)
      deterministic.add(key)
    }
    if (machine.kind === 'pda' && 'pop' in edge) {
      if (!machine.stackAlphabet.includes(edge.pop)) add('La regla necesita un símbolo real del alfabeto de pila como tope.', location)
      if (edge.push.some((letter) => !machine.stackAlphabet.includes(letter))) add('Todos los símbolos apilados deben pertenecer a Γ.', location)
    }
    if (machine.kind === 'tm' && 'write' in edge) {
      if (!machine.tapeAlphabet.includes(edge.write)) add('El símbolo escrito debe pertenecer al alfabeto de cinta Γ.', location)
      if (edge.read === machine.leftMarker && (edge.write !== machine.leftMarker || edge.move !== 'R')) {
        add('Al leer ⊢, conserva el marcador y mueve la cabeza a la derecha.', location)
      }
      if ((machine.acceptingStateIds.includes(edge.from) || edge.from === machine.rejectStateId) && edge.to !== edge.from) {
        add('Los estados de aceptación y rechazo de una MT son absorbentes.', location)
      }
    }
  }
  if (machine.kind === 'dfa') {
    for (const state of machine.states) for (const letter of machine.alphabet) {
      if (!deterministic.has(JSON.stringify([state.id, letter]))) {
        add(`Falta definir δ(${state.name}, ${letter}): un AFD necesita una transición por símbolo.`, { stateId: state.id })
      }
    }
  }
  return issues
}

export function validateInput(machine: Machine, input: string): string | null {
  const letters = Array.from(input)
  if (letters.length > LIMITS.input) return `La entrada puede tener hasta ${LIMITS.input} símbolos.`
  const invalid = letters.find((letter) => !machine.alphabet.includes(letter))
  return invalid === undefined ? null : `El símbolo «${invalid}» no pertenece al alfabeto Σ.`
}

function epsilonClosure(states: string[], transitions: FiniteTransition[]) {
  const reachable = new Set(states)
  const transitionIds = new Set<string>()
  for (const state of reachable) for (const edge of transitions) {
    if (edge.from === state && edge.read === '') {
      transitionIds.add(edge.id)
      reachable.add(edge.to)
    }
  }
  return { states: [...reachable], transitionIds: [...transitionIds] }
}

const pdaKey = (configuration: Configuration) => JSON.stringify([
  configuration.stateId, configuration.inputIndex, configuration.stack,
])
const accepted = (machine: Machine, run: Run, configuration: Configuration) =>
  configuration.inputIndex === run.input.length && machine.acceptingStateIds.includes(configuration.stateId)

export function createRun(machine: Machine, input: string): Run {
  const run: Run = {
    status: 'running', step: 0, input: Array.from(input), configurations: [], transitionIds: [],
    message: 'Configuración inicial. Avanza para aplicar la siguiente transición.',
  }
  const error = validateMachine(machine)[0]?.message ?? validateInput(machine, input)
  if (error) return { ...run, status: 'inconclusive', message: error }
  if (machine.kind === 'tm') {
    const tape: Record<number, string> = { 0: machine.leftMarker }
    run.input.forEach((letter, index) => { tape[index + 1] = letter })
    run.configurations = [{ stateId: machine.initialStateIds[0], inputIndex: 0, tape, head: 0 }]
    if (machine.acceptingStateIds.includes(run.configurations[0].stateId)) run.status = 'accepted'
    else if (run.configurations[0].stateId === machine.rejectStateId) run.status = 'rejected'
  } else if (machine.kind === 'pda') {
    run.configurations = [{ stateId: machine.initialStateIds[0], inputIndex: 0, stack: [machine.initialStackSymbol] }]
    run.visited = new Set(run.configurations.map(pdaKey))
    run.applications = 0
    if (accepted(machine, run, run.configurations[0])) run.status = 'accepted'
  } else {
    const closure = machine.kind === 'nfa'
      ? epsilonClosure(machine.initialStateIds, machine.transitions)
      : { states: machine.initialStateIds, transitionIds: [] }
    run.configurations = closure.states.map((stateId) => ({ stateId, inputIndex: 0 }))
    run.transitionIds = closure.transitionIds
    if (!run.input.length) run.status = run.configurations.some((configuration) => accepted(machine, run, configuration)) ? 'accepted' : 'rejected'
    else if (!run.configurations.length) run.status = 'rejected'
  }
  if (run.status === 'accepted') run.message = 'Cadena aceptada desde la configuración inicial.'
  if (run.status === 'rejected') run.message = 'Cadena rechazada: no hay una configuración inicial aceptante.'
  if (machine.kind === 'nfa' && run.transitionIds.length) {
    const closureMessage = `La clausura ε de S añadió los estados alcanzables sin consumir entrada: ${run.configurations.length} estados activos.`
    run.message = run.status === 'running' ? `Configuración inicial. ${closureMessage}` : `${run.message} ${closureMessage}`
  }
  return run
}

function stepTuring(machine: TmMachine, run: Run): Run {
  if (run.step >= LIMITS.tmSteps) return { ...run, status: 'inconclusive', message: `Pausa: se alcanzaron ${LIMITS.tmSteps} pasos. Esto no demuestra rechazo.` }
  const current = run.configurations[0]
  const head = current.head ?? 0
  const tape = current.tape ?? {}
  const read = tape[head] ?? machine.blankSymbol
  const explicit = machine.transitions.find((edge) => edge.from === current.stateId && edge.read === read)
  const edge = explicit ?? { id: `__default:${current.stateId}:${read}`, from: current.stateId, to: machine.rejectStateId, read, write: read, move: 'R' as const }
  const nextHead = head + (edge.move === 'L' ? -1 : 1)
  if (nextHead < 0 || nextHead >= LIMITS.tmCells) {
    return { ...run, status: 'inconclusive', message: `Pausa: la simulación está limitada a ${LIMITS.tmCells} celdas. Esto no demuestra rechazo.` }
  }
  // Un paso que no escribe comparte la cinta; las escrituras copian solo las celdas almacenadas.
  const nextTape = edge.write === read ? tape : { ...tape }
  if (edge.write !== read) {
    if (edge.write === machine.blankSymbol) delete nextTape[head]
    else nextTape[head] = edge.write
  }
  const status = machine.acceptingStateIds.includes(edge.to) ? 'accepted' : edge.to === machine.rejectStateId ? 'rejected' : 'running'
  const rule = `δ(${stateName(machine, current.stateId)}, ${read}) = (${stateName(machine, edge.to)}, ${edge.write}, ${edge.move})`
  return {
    ...run, status, step: run.step + 1,
    configurations: [{ stateId: edge.to, inputIndex: Math.max(0, Math.min(nextHead - 1, run.input.length)), tape: nextTape, head: nextHead }],
    transitionIds: [edge.id],
    message: explicit ? `${rule}.${status === 'accepted' ? ' Cadena aceptada.' : status === 'rejected' ? ' Cadena rechazada.' : ''}` : `${rule}. Regla por defecto: una transición omitida lleva a r conservando el símbolo y moviendo R. Cadena rechazada.`,
  }
}

export function stepRun(machine: Machine, run: Run): Run {
  if (run.status !== 'running') return run
  if (machine.kind === 'tm') return stepTuring(machine, run)
  if (machine.kind === 'pda') {
    const visited = new Set(run.visited)
    const configurations: Configuration[] = []
    const transitionIds = new Set<string>()
    let applications = run.applications ?? 0
    let limit = ''
    search: for (const current of run.configurations) for (const edge of machine.transitions) {
      if (edge.from !== current.stateId || edge.pop !== current.stack?.[0]
        || (edge.read !== '' && edge.read !== run.input[current.inputIndex])) continue
      if (applications >= LIMITS.pdaApplications) { limit = `${LIMITS.pdaApplications} aplicaciones de reglas`; break search }
      applications++
      const stack = [...edge.push, ...current.stack.slice(1)]
      if (stack.length > LIMITS.pdaStack) { limit = `${LIMITS.pdaStack} símbolos en la pila`; break search }
      const next: Configuration = { stateId: edge.to, inputIndex: current.inputIndex + (edge.read === '' ? 0 : 1), stack }
      const key = pdaKey(next)
      transitionIds.add(edge.id)
      if (visited.has(key)) continue
      if (visited.size >= LIMITS.pdaConfigurations) { limit = `${LIMITS.pdaConfigurations} configuraciones`; break search }
      visited.add(key)
      configurations.push(next)
    }
    const status = configurations.some((configuration) => accepted(machine, run, configuration)) ? 'accepted'
      : limit ? 'inconclusive' : configurations.length ? 'running' : 'rejected'
    const rules = machine.transitions.filter((edge) => transitionIds.has(edge.id))
    const ruleSummary = rules.slice(0, 3).map((edge) => `${stateName(machine, edge.from)} → ${stateName(machine, edge.to)}: lee ${edge.read || 'ε'}, retira ${edge.pop}, apila ${edge.push.join('') || 'ε'}`).join('; ')
    const explanation = `${configurations.length} ${configurations.length === 1 ? 'configuración posible' : 'configuraciones posibles'}.${ruleSummary ? ` ${ruleSummary}${rules.length > 3 ? `; +${rules.length - 3} reglas` : ''}.` : ''}`
    const outcome = status === 'accepted' ? 'Cadena aceptada: una ruta consumió toda la entrada y llegó a F.'
      : limit ? `Pausa: se alcanzó el límite de ${limit}. Esto no demuestra rechazo.`
        : status === 'rejected' ? 'Cadena rechazada: se agotaron todas las configuraciones posibles.' : ''
    return {
      ...run, status, step: run.step + 1, configurations, transitionIds: [...transitionIds], visited, applications,
      message: `${explanation}${outcome ? ` ${outcome}` : ''}`,
    }
  }
  const inputIndex = run.configurations[0]?.inputIndex ?? 0
  const read = run.input[inputIndex]
  const from = new Set(run.configurations.map((configuration) => configuration.stateId))
  const edges = machine.transitions.filter((edge) => from.has(edge.from) && edge.read === read)
  const destinations = [...new Set(edges.map((edge) => edge.to))]
  const closure = machine.kind === 'nfa' ? epsilonClosure(destinations, machine.transitions) : { states: destinations, transitionIds: [] }
  const configurations = closure.states.map((stateId) => ({ stateId, inputIndex: inputIndex + 1 }))
  const complete = inputIndex + 1 === run.input.length
  const status = !configurations.length ? 'rejected' : complete
    ? configurations.some((configuration) => accepted(machine, run, configuration)) ? 'accepted' : 'rejected' : 'running'
  return {
    ...run, status, step: run.step + 1, configurations,
    transitionIds: [...new Set([...edges.map((edge) => edge.id), ...closure.transitionIds])],
    message: status === 'accepted' ? `Leímos «${read}». Cadena aceptada: se consumió toda la entrada y se alcanzó F.`
      : status === 'rejected' ? `Leímos «${read}». Cadena rechazada: ${!configurations.length ? 'no queda ninguna ruta posible' : 'ningún estado alcanzado pertenece a F'}.`
        : `Leímos «${read}». ${configurations.length === 1 ? 'Un estado activo' : `${configurations.length} estados activos`}${machine.kind === 'nfa' ? ', incluida su clausura ε' : ''}.`,
  }
}
