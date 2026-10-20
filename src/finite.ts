import type { FiniteTransition } from './domain'

export type FiniteIndex = Map<string, FiniteTransition[]>

export function indexFiniteTransitions(transitions: readonly FiniteTransition[]): FiniteIndex {
  const index: FiniteIndex = new Map()
  for (const edge of transitions) {
    const outgoing = index.get(edge.from) ?? []
    outgoing.push(edge)
    index.set(edge.from, outgoing)
  }
  return index
}

export function epsilonClosure(states: Iterable<string>, index: FiniteIndex) {
  const reachable = new Set(states)
  const transitionIds = new Set<string>()
  for (const state of reachable) for (const edge of index.get(state) ?? []) {
    if (edge.read === '') {
      transitionIds.add(edge.id)
      reachable.add(edge.to)
    }
  }
  return { states: [...reachable], transitionIds: [...transitionIds] }
}

export function moveFinite(states: Iterable<string>, symbol: string, index: FiniteIndex) {
  const destinations = new Set<string>()
  const transitionIds = new Set<string>()
  for (const state of states) for (const edge of index.get(state) ?? []) {
    if (edge.read === symbol) {
      destinations.add(edge.to)
      transitionIds.add(edge.id)
    }
  }
  const closure = epsilonClosure(destinations, index)
  return { states: closure.states, transitionIds: [...new Set([...transitionIds, ...closure.transitionIds])] }
}
