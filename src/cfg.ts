import { LIMITS, type CfgMachine, type CfgProduction } from './domain'
import type { ValidationIssue } from './engine'

export interface CfgParseNode {
  id: string
  symbol: string
  isTerminal: boolean
  isEpsilon?: boolean
  productionId?: string
  children: CfgParseNode[]
  span: [number, number]
}

export interface CfgSententialToken {
  nodeId: string
  symbol: string
  isTerminal: boolean
  status: 'stable' | 'target' | 'spawned'
}

export type DerivationStrategy = 'leftmost' | 'rightmost'

export interface CfgDerivationStep {
  step: number
  sentential: CfgSententialToken[]
  production?: CfgProduction
  expandedNodeId?: string
  nextTargetNodeId?: string
  prefix: string
  targetSymbol?: string
  replacement?: string
  suffix: string
  arrow: '→_L' | '→_R' | '→_G'
  formula: string
  message: string
  expandedNodeIds: string[]
}

export interface CfgDerivationResult {
  accepted: boolean
  trees: CfgParseNode[]
  ambiguous: boolean
  nullable: string[]
  chart: ReadonlySet<string>
  message: string
}

export interface CfgProductionGroup {
  left: string
  productions: CfgProduction[]
}

const RESERVED_SYMBOLS = new Set(['ε', 'λ', '|', '→', '⇒'])
const MAX_TREES_PER_CELL = 3
const MAX_TREE_COMBINATIONS = 24

const isSingleSymbol = (value: string) =>
  Array.from(value).length === 1 && !/\s/.test(value) && !RESERVED_SYMBOLS.has(value)

export const chartKey = (nonterminal: string, start: number, end: number) =>
  `${nonterminal}\u0000${start}\u0000${end}`

export const formatRhs = (right: string[]) => (right.length ? right.join('') : 'ε')

export const formatProduction = (production: CfgProduction) =>
  `${production.left} → ${formatRhs(production.right)}`

export function groupProductionsByLeft(
  nonterminals: string[],
  productions: CfgProduction[],
): CfgProductionGroup[] {
  const map = new Map<string, CfgProduction[]>()
  for (const nt of nonterminals) map.set(nt, [])
  for (const prod of productions) {
    const list = map.get(prod.left) ?? []
    list.push(prod)
    map.set(prod.left, list)
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([left, list]) => ({ left, productions: list }))
}

export function validateCfg(machine: CfgMachine): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (message: string, location: Omit<ValidationIssue, 'message'> = {}) =>
    issues.push({ message, ...location })

  if (!machine.name.trim()) add('Escribe un nombre para la gramática.', { field: 'name' })

  if (!machine.nonterminals.length) {
    add('Define al menos un símbolo no terminal en N.', { field: 'nonterminals' })
  } else if (machine.nonterminals.length > LIMITS.cfgNonterminals) {
    add(`El límite es ${LIMITS.cfgNonterminals} símbolos no terminales.`, { field: 'nonterminals' })
  }

  if (machine.nonterminals.some((nt) => !isSingleSymbol(nt))) {
    add('Cada no terminal de N debe ser un único símbolo distinto de ε, | y →.', { field: 'nonterminals' })
  }
  if (new Set(machine.nonterminals).size !== machine.nonterminals.length) {
    add('El conjunto de no terminales N contiene símbolos repetidos.', { field: 'nonterminals' })
  }

  if (machine.alphabet.some((sym) => !isSingleSymbol(sym))) {
    add('Cada terminal de Σ debe ser un único símbolo distinto de ε, | y →.', { field: 'alphabet' })
  }
  if (new Set(machine.alphabet).size !== machine.alphabet.length) {
    add('El alfabeto terminal Σ contiene símbolos repetidos.', { field: 'alphabet' })
  }

  const ntSet = new Set(machine.nonterminals)
  const overlap = machine.alphabet.filter((sym) => ntSet.has(sym))
  if (overlap.length) {
    add(`Los conjuntos N y Σ deben ser disjuntos (repetidos: ${overlap.join(', ')}).`, { field: 'alphabet' })
  }

  if (!machine.startSymbol || !ntSet.has(machine.startSymbol)) {
    add('El símbolo inicial S debe pertenecer al conjunto N.', { field: 'startSymbol' })
  }

  if (!machine.productions.length) {
    add('Agrega al menos una producción en P.', { field: 'productions' })
  } else if (machine.productions.length > LIMITS.cfgProductions) {
    add(`El límite es ${LIMITS.cfgProductions} producciones.`, { field: 'productions' })
  }

  if (new Set(machine.productions.map((prod) => prod.id)).size !== machine.productions.length) {
    add('Los identificadores de las producciones deben ser únicos.', { field: 'productions' })
  }

  const vocab = new Set([...machine.nonterminals, ...machine.alphabet])
  let hasStartRule = false
  for (const prod of machine.productions) {
    if (!ntSet.has(prod.left)) {
      add(`El lado izquierdo «${prod.left || '∅'}» de la producción debe pertenecer a N.`, { field: 'productions' })
    }
    if (prod.left === machine.startSymbol) hasStartRule = true
    if (prod.right.length > LIMITS.cfgRhsSymbols) {
      add(`Una producción admite hasta ${LIMITS.cfgRhsSymbols} símbolos en el lado derecho.`, { field: 'productions' })
    }
    for (const sym of prod.right) {
      if (!vocab.has(sym)) {
        add(`El símbolo «${sym}» en ${formatProduction(prod)} no pertenece a N ∪ Σ.`, { field: 'productions' })
      }
    }
  }

  if (machine.startSymbol && ntSet.has(machine.startSymbol) && machine.productions.length && !hasStartRule) {
    add(`El símbolo inicial ${machine.startSymbol} debe tener al menos una producción.`, { field: 'productions' })
  }

  return issues
}

export function validateCfgInput(machine: CfgMachine, input: string): string | null {
  const letters = Array.from(input)
  if (letters.length > LIMITS.cfgInput) return `La entrada puede tener hasta ${LIMITS.cfgInput} símbolos.`
  const invalid = letters.find((letter) => !machine.alphabet.includes(letter))
  return invalid === undefined ? null : `El símbolo «${invalid}» no pertenece al alfabeto terminal Σ.`
}

export function computeNullable(machine: CfgMachine): Set<string> {
  const nullable = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const prod of machine.productions) {
      if (nullable.has(prod.left)) continue
      if (prod.right.every((sym) => nullable.has(sym))) {
        nullable.add(prod.left)
        changed = true
      }
    }
  }
  return nullable
}

type InternalNode = Omit<CfgParseNode, 'id' | 'children'> & { children: InternalNode[] }

interface InternalTree {
  node: InternalNode
  size: number
  signature: string
  sameSpanNonterminals: Set<string>
}

function assignNodeIds(internal: InternalNode): CfgParseNode {
  let counter = 0
  const clone = (node: InternalNode): CfgParseNode => ({
    id: `n${counter++}`,
    symbol: node.symbol,
    isTerminal: node.isTerminal,
    ...(node.isEpsilon ? { isEpsilon: true } : {}),
    ...(node.productionId ? { productionId: node.productionId } : {}),
    span: node.span,
    children: node.children.map(clone),
  })
  return clone(internal)
}

function computeReachableChart(machine: CfgMachine, chars: string[]): Set<string> {
  const n = chars.length
  const ntSet = new Set(machine.nonterminals)
  const reachable = new Set<string>()

  const canMatchProduction = (prod: CfgProduction, i: number, j: number): boolean => {
    let positions = new Set<number>([i])
    for (const sym of prod.right) {
      const nextPositions = new Set<number>()
      if (!ntSet.has(sym)) {
        for (const pos of positions) {
          if (pos < j && chars[pos] === sym) nextPositions.add(pos + 1)
        }
      } else {
        for (const pos of positions) {
          for (let end = pos; end <= j; end++) {
            if (reachable.has(chartKey(sym, pos, end))) nextPositions.add(end)
          }
        }
      }
      if (!nextPositions.size) return false
      positions = nextPositions
    }
    return positions.has(j)
  }

  for (let len = 0; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len
      let changed = true
      while (changed) {
        changed = false
        for (const prod of machine.productions) {
          const key = chartKey(prod.left, i, j)
          if (reachable.has(key)) continue
          if (canMatchProduction(prod, i, j)) {
            reachable.add(key)
            changed = true
          }
        }
      }
    }
  }

  return reachable
}

function mergeBestTrees(existing: InternalTree[], candidates: InternalTree[]): boolean {
  if (!candidates.length) return false
  const bySig = new Map<string, InternalTree>()
  for (const item of existing) bySig.set(item.signature, item)
  let changed = false
  for (const cand of candidates) {
    const prev = bySig.get(cand.signature)
    if (!prev || cand.size < prev.size) {
      bySig.set(cand.signature, cand)
      if (!prev) changed = true
    }
  }
  const sorted = [...bySig.values()]
    .sort((a, b) => a.size - b.size || a.signature.localeCompare(b.signature))
    .slice(0, MAX_TREES_PER_CELL)
  if (
    sorted.length !== existing.length ||
    sorted.some((item, index) => item.signature !== existing[index]?.signature)
  ) {
    existing.splice(0, existing.length, ...sorted)
    return true
  }
  return changed
}

export function deriveCfgString(machine: CfgMachine, input: string): CfgDerivationResult {
  const issues = validateCfg(machine)
  const inputErr = validateCfgInput(machine, input)
  const nullable = [...computeNullable(machine)]
  if (issues.length || inputErr) {
    return {
      accepted: false,
      trees: [],
      ambiguous: false,
      nullable,
      chart: new Set(),
      message: issues[0]?.message ?? inputErr ?? 'Gramática inválida.',
    }
  }

  const chars = Array.from(input)
  const n = chars.length
  const ntSet = new Set(machine.nonterminals)
  const reachable = computeReachableChart(machine, chars)
  const cellTrees = new Map<string, InternalTree[]>()
  const getCell = (nt: string, i: number, j: number) => cellTrees.get(chartKey(nt, i, j)) ?? []

  for (let len = 0; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len
      let changed = true
      let iterations = 0
      const maxIterations = Math.max(8, machine.nonterminals.length * 4)

      while (changed && iterations < maxIterations) {
        changed = false
        iterations++
        for (const prod of machine.productions) {
          if (!reachable.has(chartKey(prod.left, i, j))) continue

          const buildChildrenLists = (): InternalTree[][] => {
            if (prod.right.length === 0) {
              if (i !== j) return []
              return [[{
                node: { symbol: 'ε', isTerminal: true, isEpsilon: true, span: [i, i], children: [] },
                size: 0,
                signature: 'ε',
                sameSpanNonterminals: new Set(),
              }]]
            }

            let partials = new Map<number, InternalTree[][]>([[i, [[]]]])
            for (const sym of prod.right) {
              const nextPartials = new Map<number, InternalTree[][]>()
              const pushPartial = (end: number, list: InternalTree[]) => {
                const bucket = nextPartials.get(end) ?? []
                if (bucket.length < MAX_TREE_COMBINATIONS) {
                  bucket.push(list)
                  nextPartials.set(end, bucket)
                }
              }

              if (!ntSet.has(sym)) {
                for (const [pos, lists] of partials) {
                  if (pos < j && chars[pos] === sym) {
                    const termNode: InternalTree = {
                      node: { symbol: sym, isTerminal: true, span: [pos, pos + 1], children: [] },
                      size: 0,
                      signature: `t:${sym}`,
                      sameSpanNonterminals: new Set(),
                    }
                    for (const list of lists) pushPartial(pos + 1, [...list, termNode])
                  }
                }
              } else {
                for (const [pos, lists] of partials) {
                  for (let end = pos; end <= j; end++) {
                    const subTrees = getCell(sym, pos, end)
                    if (!subTrees.length) continue
                    for (const sub of subTrees) {
                      // Evitar ciclos redundantes donde A vuelve a aparecer sobre el mismo intervalo [i, j].
                      if (pos === i && end === j && sub.sameSpanNonterminals.has(prod.left)) continue
                      for (const list of lists) pushPartial(end, [...list, sub])
                    }
                  }
                }
              }
              partials = nextPartials
              if (!partials.size) return []
            }
            return partials.get(j) ?? []
          }

          const childrenLists = buildChildrenLists()
          if (!childrenLists.length) continue

          const candidates: InternalTree[] = childrenLists.map((children) => {
            const size = 1 + children.reduce((sum, child) => sum + child.size, 0)
            const sameSpanNonterminals = new Set<string>([prod.left])
            for (const child of children) {
              if (child.node.span[0] === i && child.node.span[1] === j) {
                for (const nt of child.sameSpanNonterminals) sameSpanNonterminals.add(nt)
              }
            }
            const signature = `${prod.left}[${prod.id}](${children.map((c) => c.signature).join(',')})`
            return {
              node: {
                symbol: prod.left,
                isTerminal: false,
                productionId: prod.id,
                span: [i, j],
                children: children.map((c) => c.node),
              },
              size,
              signature,
              sameSpanNonterminals,
            }
          })

          const key = chartKey(prod.left, i, j)
          const existing = cellTrees.get(key) ?? []
          if (mergeBestTrees(existing, candidates)) {
            cellTrees.set(key, existing)
            changed = true
          }
        }
      }
    }
  }

  const rootTrees = getCell(machine.startSymbol, 0, n).map((item) => assignNodeIds(item.node))
  const accepted = rootTrees.length > 0
  const ambiguous = rootTrees.length > 1
  const wordLabel = input || 'ε'

  const message = accepted
    ? ambiguous
      ? `La cadena «${wordLabel}» pertenece a L(G) y presenta ambigüedad: existen al menos ${rootTrees.length} árboles de derivación distintos.`
      : `La cadena «${wordLabel}» pertenece a L(G): existe una derivación desde ${machine.startSymbol}.`
    : `La cadena «${wordLabel}» no pertenece a L(G): no existe ninguna derivación desde ${machine.startSymbol}.`

  return {
    accepted,
    trees: rootTrees,
    ambiguous,
    nullable,
    chart: reachable,
    message,
  }
}

function collectExpansionOrder(
  root: CfgParseNode,
  strategy: DerivationStrategy,
): CfgParseNode[] {
  const order: CfgParseNode[] = []
  const visit = (node: CfgParseNode) => {
    if (node.isTerminal) return
    order.push(node)
    const children = strategy === 'leftmost' ? node.children : [...node.children].reverse()
    for (const child of children) visit(child)
  }
  visit(root)
  return order
}

function tokensToString(tokens: { symbol: string; isEpsilon?: boolean }[]): string {
  const nonEmpty = tokens.filter((t) => !t.isEpsilon).map((t) => t.symbol).join('')
  return nonEmpty || 'ε'
}

export function buildDerivationSteps(
  root: CfgParseNode,
  strategy: DerivationStrategy,
  machine: CfgMachine,
): CfgDerivationStep[] {
  const prodById = new Map(machine.productions.map((p) => [p.id, p]))
  const expansions = collectExpansionOrder(root, strategy)
  const arrow = strategy === 'leftmost' ? '→_L' : '→_R'

  interface FrontierEntry {
    node: CfgParseNode
    spawned: boolean
  }

  let frontier: FrontierEntry[] = [{ node: root, spawned: false }]
  const expandedSet = new Set<string>()
  const steps: CfgDerivationStep[] = []

  const makeSentential = (
    entries: FrontierEntry[],
    targetNodeId?: string,
  ): CfgSententialToken[] => {
    const visible = entries.filter((entry) => !entry.node.isEpsilon)
    if (!visible.length) {
      return [{ nodeId: '__eps', symbol: 'ε', isTerminal: true, status: 'spawned' }]
    }
    return visible.map((entry) => ({
      nodeId: entry.node.id,
      symbol: entry.node.symbol,
      isTerminal: entry.node.isTerminal,
      status:
        entry.node.id === targetNodeId
          ? 'target'
          : entry.spawned
            ? 'spawned'
            : 'stable',
    }))
  }

  const firstTarget = expansions[0]?.id
  steps.push({
    step: 0,
    sentential: makeSentential(frontier, firstTarget),
    nextTargetNodeId: firstTarget,
    prefix: '',
    suffix: '',
    arrow,
    formula: root.symbol,
    message: `Configuración inicial con el símbolo inicial ${root.symbol}.`,
    expandedNodeIds: [],
  })

  for (let idx = 0; idx < expansions.length; idx++) {
    const targetNode = expansions[idx]
    const prod = targetNode.productionId ? prodById.get(targetNode.productionId) : undefined
    const targetPos = frontier.findIndex((entry) => entry.node.id === targetNode.id)
    if (targetPos === -1) continue

    const beforeVisible = frontier.slice(0, targetPos).filter((e) => !e.node.isEpsilon)
    const afterVisible = frontier.slice(targetPos + 1).filter((e) => !e.node.isEpsilon)
    const prefix = beforeVisible.map((e) => e.node.symbol).join('')
    const suffix = afterVisible.map((e) => e.node.symbol).join('')
    const replacement = formatRhs(prod?.right ?? targetNode.children.filter((c) => !c.isEpsilon).map((c) => c.symbol))

    const cleared = frontier.map((e) => ({ ...e, spawned: false }))
    const spawnedChildren: FrontierEntry[] = targetNode.children.map((child) => ({
      node: child,
      spawned: true,
    }))
    frontier = [
      ...cleared.slice(0, targetPos),
      ...spawnedChildren,
      ...cleared.slice(targetPos + 1),
    ]
    expandedSet.add(targetNode.id)

    const nextTargetNodeId = expansions[idx + 1]?.id
    const currentString = tokensToString(frontier.map((e) => e.node))
    const ruleLabel = prod ? formatProduction(prod) : `${targetNode.symbol} → ${replacement}`
    const dirLabel = strategy === 'leftmost' ? 'más a la izquierda' : 'más a la derecha'

    steps.push({
      step: steps.length,
      sentential: makeSentential(frontier, nextTargetNodeId),
      production: prod,
      expandedNodeId: targetNode.id,
      nextTargetNodeId,
      prefix,
      targetSymbol: targetNode.symbol,
      replacement,
      suffix,
      arrow,
      formula: currentString,
      message: `Se aplica ${ruleLabel} sobre el no terminal ${dirLabel}: ${prefix}${targetNode.symbol}${suffix} ⇒ ${currentString}.`,
      expandedNodeIds: [...expandedSet],
    })
  }

  return steps
}

export interface ManualDerivationState {
  root: CfgParseNode
  frontierIds: string[]
  nodeMap: Record<string, CfgParseNode>
  steps: CfgDerivationStep[]
}

export function createInitialManualState(machine: CfgMachine): ManualDerivationState {
  const rootId = 'm0'
  const root: CfgParseNode = {
    id: rootId,
    symbol: machine.startSymbol,
    isTerminal: false,
    span: [0, 0],
    children: [],
  }
  const initialStep: CfgDerivationStep = {
    step: 0,
    sentential: [{ nodeId: rootId, symbol: machine.startSymbol, isTerminal: false, status: 'target' }],
    nextTargetNodeId: rootId,
    prefix: '',
    suffix: '',
    arrow: '→_G',
    formula: machine.startSymbol,
    message: `Inicio de derivación manual desde ${machine.startSymbol}. Seleccionar un no terminal para aplicar una producción.`,
    expandedNodeIds: [],
  }
  return {
    root,
    frontierIds: [rootId],
    nodeMap: { [rootId]: root },
    steps: [initialStep],
  }
}

export function expandManualStep(
  state: ManualDerivationState,
  targetNodeId: string,
  production: CfgProduction,
  machine: CfgMachine,
): ManualDerivationState {
  const targetPos = state.frontierIds.indexOf(targetNodeId)
  const targetNode = state.nodeMap[targetNodeId]
  if (targetPos === -1 || !targetNode || targetNode.isTerminal || targetNode.symbol !== production.left) {
    return state
  }

  const ntSet = new Set(machine.nonterminals)
  let nextCounter = Object.keys(state.nodeMap).length

  const newChildren: CfgParseNode[] = production.right.length
    ? production.right.map((sym) => ({
        id: `m${nextCounter++}`,
        symbol: sym,
        isTerminal: !ntSet.has(sym),
        span: [0, 0],
        children: [],
      }))
    : [{
        id: `m${nextCounter++}`,
        symbol: 'ε',
        isTerminal: true,
        isEpsilon: true,
        span: [0, 0],
        children: [],
      }]

  const nextNodeMap: Record<string, CfgParseNode> = { ...state.nodeMap }
  for (const child of newChildren) nextNodeMap[child.id] = child

  const cloneWithExpansion = (node: CfgParseNode): CfgParseNode => {
    if (node.id === targetNodeId) {
      return { ...node, productionId: production.id, children: newChildren }
    }
    return node.children.length ? { ...node, children: node.children.map(cloneWithExpansion) } : node
  }

  const nextRoot = cloneWithExpansion(state.root)
  nextNodeMap[targetNodeId] = { ...targetNode, productionId: production.id, children: newChildren }

  const beforeEntries = state.frontierIds
    .slice(0, targetPos)
    .map((id) => nextNodeMap[id])
    .filter((n) => !n.isEpsilon)
  const afterEntries = state.frontierIds
    .slice(targetPos + 1)
    .map((id) => nextNodeMap[id])
    .filter((n) => !n.isEpsilon)

  const nextFrontierIds = [
    ...state.frontierIds.slice(0, targetPos),
    ...newChildren.map((c) => c.id),
    ...state.frontierIds.slice(targetPos + 1),
  ]

  const visibleFrontier = nextFrontierIds.map((id) => nextNodeMap[id]).filter((n) => !n.isEpsilon)
  const spawnedIds = new Set(newChildren.map((c) => c.id))
  const nextFirstNonterminal = visibleFrontier.find((n) => !n.isTerminal)?.id

  const sentential: CfgSententialToken[] = visibleFrontier.length
    ? visibleFrontier.map((n) => ({
        nodeId: n.id,
        symbol: n.symbol,
        isTerminal: n.isTerminal,
        status: spawnedIds.has(n.id) ? 'spawned' : 'stable',
      }))
    : [{ nodeId: '__eps', symbol: 'ε', isTerminal: true, status: 'spawned' }]

  const prefix = beforeEntries.map((n) => n.symbol).join('')
  const suffix = afterEntries.map((n) => n.symbol).join('')
  const replacement = formatRhs(production.right)
  const currentString = tokensToString(visibleFrontier)
  const prevExpanded = state.steps[state.steps.length - 1]?.expandedNodeIds ?? []

  const step: CfgDerivationStep = {
    step: state.steps.length,
    sentential,
    production,
    expandedNodeId: targetNodeId,
    nextTargetNodeId: nextFirstNonterminal,
    prefix,
    targetSymbol: targetNode.symbol,
    replacement,
    suffix,
    arrow: '→_G',
    formula: currentString,
    message: `Se aplica ${formatProduction(production)}: ${prefix}${targetNode.symbol}${suffix} ⇒ ${currentString}.`,
    expandedNodeIds: [...prevExpanded, targetNodeId],
  }

  return {
    root: nextRoot,
    frontierIds: nextFrontierIds,
    nodeMap: nextNodeMap,
    steps: [...state.steps, step],
  }
}

export function canSententialReachTarget(
  sentential: CfgSententialToken[],
  input: string,
  chart: ReadonlySet<string>,
): boolean {
  const symbols = sentential.filter((t) => !(t.isTerminal && t.symbol === 'ε'))
  const chars = Array.from(input)
  const n = chars.length
  let dp = Array<boolean>(n + 1).fill(false)
  dp[0] = true

  for (const token of symbols) {
    const nextDp = Array<boolean>(n + 1).fill(false)
    if (token.isTerminal) {
      for (let pos = 0; pos < n; pos++) {
        if (dp[pos] && chars[pos] === token.symbol) nextDp[pos + 1] = true
      }
    } else {
      for (let pos = 0; pos <= n; pos++) {
        if (!dp[pos]) continue
        for (let end = pos; end <= n; end++) {
          if (chart.has(chartKey(token.symbol, pos, end))) nextDp[end] = true
        }
      }
    }
    dp = nextDp
    if (!dp.some(Boolean)) return false
  }

  return dp[n]
}

export interface ParsedBnfRule {
  left: string
  alternatives: string[][]
}

export function parseBnfRule(
  raw: string,
  nonterminals: string[],
  alphabet: string[],
): { rule?: ParsedBnfRule; discoveredNonterminals: string[]; discoveredTerminals: string[]; error?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { discoveredNonterminals: [], discoveredTerminals: [], error: 'Escribe una regla con formato A → α.' }

  const arrowMatch = trimmed.match(/^(.*?)\s*(?:->|→|::=)\s*(.*)$/)
  if (!arrowMatch) {
    return {
      discoveredNonterminals: [],
      discoveredTerminals: [],
      error: 'Usa «->» o «→» para separar el lado izquierdo y el derecho (ejemplo: S -> aSb | ε).',
    }
  }

  const left = arrowMatch[1].trim()
  if (!isSingleSymbol(left)) {
    return {
      discoveredNonterminals: [],
      discoveredTerminals: [],
      error: 'El lado izquierdo debe ser un único símbolo no terminal.',
    }
  }
  if (alphabet.includes(left)) {
    return {
      discoveredNonterminals: [],
      discoveredTerminals: [],
      error: `«${left}» ya está definido como símbolo terminal en Σ.`,
    }
  }

  const rhsRaw = arrowMatch[2].trim()
  const parts = rhsRaw.split('|')
  const alternatives: string[][] = []
  const ntSet = new Set([...nonterminals, left])
  const discoveredNonterminals = nonterminals.includes(left) ? [] : [left]
  const discoveredTerminals: string[] = []
  const termSet = new Set(alphabet)

  for (const rawPart of parts) {
    const compact = rawPart.replace(/\s+/g, '')
    if (!compact || compact === 'ε' || compact === 'λ' || compact.toLowerCase() === 'epsilon') {
      alternatives.push([])
      continue
    }
    const syms = Array.from(compact)
    if (syms.length > LIMITS.cfgRhsSymbols) {
      return {
        discoveredNonterminals: [],
        discoveredTerminals: [],
        error: `Cada alternativa admite hasta ${LIMITS.cfgRhsSymbols} símbolos.`,
      }
    }
    if (syms.some((s) => !isSingleSymbol(s))) {
      return {
        discoveredNonterminals: [],
        discoveredTerminals: [],
        error: `Alternativa «${rawPart.trim()}» contiene símbolos reservados no válidos.`,
      }
    }
    for (const s of syms) {
      if (!ntSet.has(s) && !termSet.has(s)) {
        // Heurística estándar: mayúsculas ASCII nuevas se añaden a N; el resto a Σ.
        if (/^[A-Z]$/.test(s)) {
          ntSet.add(s)
          discoveredNonterminals.push(s)
        } else {
          termSet.add(s)
          discoveredTerminals.push(s)
        }
      }
    }
    alternatives.push(syms)
  }

  return {
    rule: { left, alternatives },
    discoveredNonterminals,
    discoveredTerminals,
  }
}
