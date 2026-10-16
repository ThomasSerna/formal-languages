import { describe, expect, it } from 'vitest';
import type { FiniteMachine, PdaMachine, TmMachine } from './domain';
import { createBlankMachine, EXAMPLES } from './examples';
import { transitionEquations } from './format';

describe('funciones de transición de la definición formal', () => {
  it('representa las reglas AFD con nombres visibles y conserva una ecuación por regla', () => {
    const machine = structuredClone(EXAMPLES.dfa);
    machine.states[0].name = 'par';
    expect(transitionEquations(machine).map(item => item.expression)).toEqual([
      'δ(par, 0) = par', 'δ(par, 1) = q1', 'δ(q1, 0) = q1', 'δ(q1, 1) = par',
    ]);
    expect(transitionEquations(machine).flatMap(item => item.transitions)).toEqual(machine.transitions);
  });

  it('agrupa AFN por estado y lectura, sin confundir transiciones ε con su clausura', () => {
    const equations = transitionEquations(EXAMPLES.nfa);
    expect(equations.map(item => item.expression)).toEqual([
      'Δ(s, ε) = {q0}', 'Δ(q0, 0) = {q0, q1}', 'Δ(q0, 1) = {q0}', 'Δ(q1, 1) = {q2}',
    ]);
    expect(equations[1].transitions.map(rule => rule.id)).toEqual(['n1', 'n3']);
  });

  it('elimina destinos repetidos del conjunto AFN sin perder reglas editables', () => {
    const machine = structuredClone(EXAMPLES.nfa) as FiniteMachine;
    machine.transitions.push({ ...machine.transitions[1], id: 'duplicada' });
    const equation = transitionEquations(machine).find(item => item.transitions.some(rule => rule.id === 'duplicada'))!;
    expect(equation.expression).toBe('Δ(q0, 0) = {q0, q1}');
    expect(equation.transitions.map(rule => rule.id)).toEqual(['n1', 'n3', 'duplicada']);
  });

  it('agrupa pila por origen, lectura y tope, manteniendo reemplazos y resultados distintos', () => {
    const machine = structuredClone(EXAMPLES.pda) as PdaMachine;
    machine.transitions.push(
      { ...machine.transitions[0], id: 'otra-pila', push: ['⊥'] },
      { ...machine.transitions[0], id: 'otro-destino', to: 'q' },
      { ...machine.transitions[0], id: 'duplicada' },
    );
    const equations = transitionEquations(machine);
    expect(equations[0].expression).toBe('δ(p, a, ⊥) = {(p, A⊥), (p, ⊥), (q, A⊥)}');
    expect(equations[0].transitions.map(rule => rule.id)).toEqual(['p0', 'otra-pila', 'otro-destino', 'duplicada']);
    expect(equations[1].expression).toBe('δ(p, a, A) = {(p, AA)}');
    expect(equations[2].expression).toBe('δ(p, b, A) = {(q, ε)}');
    expect(equations[4].expression).toBe('δ(p, ε, ⊥) = {(f, ⊥)}');
  });

  it('usa la palabra completa de pila como identidad del resultado', () => {
    const machine = structuredClone(EXAMPLES.pda) as PdaMachine;
    machine.transitions = [
      { id: 'primera', from: 'p', to: 'q', read: '', pop: '⊥', push: ['A', '⊥'] },
      { id: 'segunda', from: 'p', to: 'q', read: '', pop: '⊥', push: ['⊥', 'A'] },
    ];
    expect(transitionEquations(machine)[0].expression).toBe('δ(p, ε, ⊥) = {(q, A⊥), (q, ⊥A)}');
  });

  it('representa Turing sin añadir reglas implícitas ni agrupar símbolos diferentes', () => {
    const machine = structuredClone(EXAMPLES.tm) as TmMachine;
    machine.states[1].name = 'búsqueda';
    const equations = transitionEquations(machine);
    expect(equations[0].expression).toBe('δ(s, ⊢) = (búsqueda, ⊢, R)');
    expect(equations[2].expression).toBe('δ(búsqueda, 0) = (q1, X, R)');
    expect(equations).toHaveLength(machine.transitions.length);
  });

  it('admite símbolos Unicode y nombres con separadores sin mezclar grupos', () => {
    const machine = structuredClone(EXAMPLES.nfa);
    machine.states[0].name = 'a, b';
    machine.states[1].name = 'a';
    machine.transitions = [
      { id: 'uno', from: 's', to: 'q1', read: '😀' },
      { id: 'dos', from: 'q0', to: 'q2', read: '😀' },
    ];
    expect(transitionEquations(machine).map(item => item.expression)).toEqual([
      'Δ(a, b, 😀) = {q1}', 'Δ(a, 😀) = {q2}',
    ]);
  });

  it('un borrador vacío no inventa reglas', () => {
    for (const kind of ['dfa', 'nfa', 'pda', 'tm'] as const) expect(transitionEquations(createBlankMachine(kind))).toEqual([]);
  });
});
