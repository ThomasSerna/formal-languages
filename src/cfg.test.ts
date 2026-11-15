import { describe, expect, it } from 'vitest';
import type { CfgMachine } from './domain';
import {
  buildDerivationSteps,
  canSententialReachTarget,
  computeNullable,
  createInitialManualState,
  deriveCfgString,
  expandManualStep,
  parseBnfRule,
  validateCfg,
} from './cfg';
import { CFG_PRESETS, EXAMPLES } from './examples';

const anbn = EXAMPLES.cfg as CfgMachine;

function treeYield(node: ReturnType<typeof deriveCfgString>['trees'][number]): string {
  if (node.isEpsilon) return '';
  if (node.isTerminal) return node.symbol;
  return node.children.map(treeYield).join('');
}

describe('validación y propiedades de GLC', () => {
  it('valida los cuatro presets de Kozen sin errores', () => {
    for (const preset of CFG_PRESETS) {
      expect(validateCfg(preset.machine), preset.id).toEqual([]);
    }
  });

  it('exige disjunción entre N y Σ, símbolo inicial válido y producciones válidas', () => {
    const overlap: CfgMachine = { ...anbn, alphabet: ['a', 'S'] };
    expect(validateCfg(overlap).some((issue) => issue.message.includes('disjuntos'))).toBe(true);

    const missingStart: CfgMachine = { ...anbn, startSymbol: 'Z' };
    expect(validateCfg(missingStart).some((issue) => issue.field === 'startSymbol')).toBe(true);

    const noStartRule: CfgMachine = {
      ...anbn,
      nonterminals: ['S', 'A'],
      productions: [{ id: 'p0', left: 'A', right: ['a'] }],
    };
    expect(validateCfg(noStartRule).some((issue) => issue.message.includes('inicial S'))).toBe(true);

    const unknownSym: CfgMachine = {
      ...anbn,
      productions: [{ id: 'p0', left: 'S', right: ['x'] }],
    };
    expect(validateCfg(unknownSym).some((issue) => issue.message.includes('N ∪ Σ'))).toBe(true);
  });

  it('calcula correctamente los símbolos anulables por punto fijo', () => {
    const grammar: CfgMachine = {
      ...anbn,
      nonterminals: ['S', 'A', 'B', 'C'],
      alphabet: ['a'],
      productions: [
        { id: '1', left: 'S', right: ['A', 'B'] },
        { id: '2', left: 'A', right: ['B'] },
        { id: '3', left: 'B', right: [] },
        { id: '4', left: 'C', right: ['A', 'a'] },
      ],
    };
    const nullable = computeNullable(grammar);
    expect([...nullable].sort()).toEqual(['A', 'B', 'S']);
  });
});

describe('derivación, árboles y ambigüedad', () => {
  it('decide exactamente aⁿbⁿ, palíndromos y paréntesis balanceados', () => {
    for (const word of ['', 'ab', 'aabb', 'aaabbb']) {
      const res = deriveCfgString(anbn, word);
      expect(res.accepted, word).toBe(true);
      expect(treeYield(res.trees[0])).toBe(word);
    }
    for (const word of ['a', 'b', 'ba', 'aab', 'abb', 'abab']) {
      expect(deriveCfgString(anbn, word).accepted, word).toBe(false);
    }

    const pal = CFG_PRESETS.find((p) => p.id === 'palindromes')!.machine;
    for (const word of ['', 'a', 'b', 'aba', 'abba', 'ababa']) {
      expect(deriveCfgString(pal, word).accepted, word).toBe(true);
    }
    for (const word of ['ab', 'aabb', 'abab']) {
      expect(deriveCfgString(pal, word).accepted, word).toBe(false);
    }

    const parens = CFG_PRESETS.find((p) => p.id === 'parentheses')!.machine;
    for (const word of ['', '()', '()()', '(())', '(()())']) {
      expect(deriveCfgString(parens, word).accepted, word).toBe(true);
    }
    for (const word of ['(', ')', ')(', '(()']) {
      expect(deriveCfgString(parens, word).accepted, word).toBe(false);
    }
  });

  it('maneja ciclos unitarios y anulables sin entrar en bucle infinito', () => {
    const cyclic: CfgMachine = {
      schemaVersion: 1,
      kind: 'cfg',
      name: 'Ciclos unitarios',
      alphabet: ['a'],
      nonterminals: ['S', 'A', 'B'],
      startSymbol: 'S',
      productions: [
        { id: 'p0', left: 'S', right: ['A'] },
        { id: 'p1', left: 'A', right: ['B'] },
        { id: 'p2', left: 'B', right: ['S'] },
        { id: 'p3', left: 'B', right: ['a'] },
        { id: 'p4', left: 'S', right: ['S', 'A'] },
        { id: 'p5', left: 'A', right: [] },
      ],
      states: [],
      initialStateIds: [],
      acceptingStateIds: [],
      transitions: [],
    };
    const resEmpty = deriveCfgString(cyclic, '');
    expect(resEmpty.accepted).toBe(true);
    expect(treeYield(resEmpty.trees[0])).toBe('');

    const resA = deriveCfgString(cyclic, 'a');
    expect(resA.accepted).toBe(true);
    expect(treeYield(resA.trees[0])).toBe('a');
  });

  it('genera derivaciones canónicas por la izquierda (→_L) y por la derecha (→_R) equivalentes al árbol', () => {
    const expr = CFG_PRESETS.find((p) => p.id === 'ambiguous')!.machine;
    const res = deriveCfgString(expr, '(a+a)*a');
    expect(res.accepted).toBe(true);
    const tree = res.trees[0];

    const leftSteps = buildDerivationSteps(tree, 'leftmost', expr);
    const rightSteps = buildDerivationSteps(tree, 'rightmost', expr);

    expect(leftSteps[0].formula).toBe('E');
    expect(leftSteps[leftSteps.length - 1].formula).toBe('(a+a)*a');
    expect(rightSteps[0].formula).toBe('E');
    expect(rightSteps[rightSteps.length - 1].formula).toBe('(a+a)*a');
    expect(leftSteps.length).toBe(rightSteps.length);

    // Verificar que en →_L el prefijo β solo contiene terminales
    const ntSet = new Set(expr.nonterminals);
    for (const step of leftSteps.slice(1)) {
      expect(Array.from(step.prefix).every((sym) => !ntSet.has(sym))).toBe(true);
      expect(step.arrow).toBe('→_L');
    }
    // Verificar que en →_R el sufijo γ solo contiene terminales
    for (const step of rightSteps.slice(1)) {
      expect(Array.from(step.suffix).every((sym) => !ntSet.has(sym))).toBe(true);
      expect(step.arrow).toBe('→_R');
    }
  });

  it('detecta ambigüedad y extrae múltiples árboles sintácticos distintos', () => {
    const expr = CFG_PRESETS.find((p) => p.id === 'ambiguous')!.machine;
    const res = deriveCfgString(expr, 'a+a*a');
    expect(res.accepted).toBe(true);
    expect(res.ambiguous).toBe(true);
    expect(res.trees.length).toBeGreaterThanOrEqual(2);
    for (const tree of res.trees) {
      expect(treeYield(tree)).toBe('a+a*a');
    }
    // Las raíces deben usar producciones distintas (E+E vs E*E)
    const rootProductions = new Set(res.trees.map((t) => t.productionId));
    expect(rootProductions.size).toBeGreaterThanOrEqual(2);
  });
});

describe('modo manual y parser BNF', () => {
  it('permite construir una derivación manual y evaluar si la forma sentencial alcanza w', () => {
    const deriv = deriveCfgString(anbn, 'ab');
    let manual = createInitialManualState(anbn);
    expect(canSententialReachTarget(manual.steps[0].sentential, 'ab', deriv.chart)).toBe(true);

    // S -> aSb
    manual = expandManualStep(manual, 'm0', anbn.productions[0], anbn);
    const step1 = manual.steps[manual.steps.length - 1];
    expect(step1.formula).toBe('aSb');
    expect(canSententialReachTarget(step1.sentential, 'ab', deriv.chart)).toBe(true);

    // S -> ε
    const targetId = step1.sentential.find((t) => !t.isTerminal)!.nodeId;
    manual = expandManualStep(manual, targetId, anbn.productions[1], anbn);
    const step2 = manual.steps[manual.steps.length - 1];
    expect(step2.formula).toBe('ab');
    expect(canSententialReachTarget(step2.sentential, 'ab', deriv.chart)).toBe(true);
    expect(canSententialReachTarget(step2.sentential, 'aabb', deriv.chart)).toBe(false);
  });

  it('interpreta reglas BNF con alternativas y símbolos nuevos', () => {
    const parsed = parseBnfRule('A -> a A b | c | ε', ['S'], ['a', 'b']);
    expect(parsed.error).toBeUndefined();
    expect(parsed.rule).toEqual({
      left: 'A',
      alternatives: [['a', 'A', 'b'], ['c'], []],
    });
    expect(parsed.discoveredNonterminals).toEqual(['A']);
    expect(parsed.discoveredTerminals).toEqual(['c']);

    const bad = parseBnfRule('a -> b', ['S'], ['a', 'b']);
    expect(bad.error).toContain('terminal');
  });
});
