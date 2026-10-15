import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Machine } from './domain';
import { loadDraft, parseMachineJson, saveDraft } from './storage';

const state = { id: 'q0', name: 'q0', x: 120, y: 120 };
const finite = {
  schemaVersion: 1,
  name: 'Mi autómata',
  kind: 'dfa',
  alphabet: ['0', '1'],
  states: [state],
  initialStateIds: ['q0'],
  acceptingStateIds: ['q0'],
  transitions: [{ id: 't0', from: 'q0', to: 'q0', read: '0' }],
} satisfies Machine;

const machines: Machine[] = [
  finite,
  { ...finite, kind: 'nfa', transitions: [{ ...finite.transitions[0], read: '' }] },
  {
    ...finite,
    kind: 'pda',
    stackAlphabet: ['⊥', 'A'],
    initialStackSymbol: '⊥',
    transitions: [{ ...finite.transitions[0], read: '', pop: '⊥', push: ['A', 'A', '⊥'] }],
  },
  {
    ...finite,
    kind: 'tm',
    tapeAlphabet: ['0', '1', '⊢', '␣'],
    leftMarker: '⊢',
    blankSymbol: '␣',
    rejectStateId: '',
    transitions: [{ ...finite.transitions[0], write: '1', move: 'R' }],
  },
];

function parse(value: unknown): Machine {
  return parseMachineJson(JSON.stringify(value));
}

describe('parseMachineJson', () => {
  it.each(machines)('conserva un archivo de tipo $kind al exportar e importar', (machine) => {
    expect(parse(machine)).toEqual(machine);
  });

  it('permite un AFD parcial y un borrador sin roles ni estados', () => {
    expect(parse(finite)).toEqual(finite);
    const empty = { ...finite, states: [], transitions: [], initialStateIds: [], acceptingStateIds: [] };
    expect(parse(empty)).toEqual(empty);
  });

  it.each([null, [], 'autómata', { ...finite, states: 'q0' }, { ...finite, states: [{ ...state, x: '0' }] }])(
    'rechaza una estructura inválida', (value) => {
      expect(() => parse(value)).toThrow('No se pudo importar');
    },
  );

  it('rechaza versiones futuras y tipos desconocidos', () => {
    expect(() => parse({ ...finite, schemaVersion: 2 })).toThrow('versión');
    expect(() => parse({ ...finite, kind: 'unknown' })).toThrow('tipo');
  });

  it('rechaza referencias inexistentes en roles y transiciones', () => {
    expect(() => parse({ ...finite, initialStateIds: ['missing'] })).toThrow('inexistente');
    expect(() => parse({ ...finite, acceptingStateIds: ['missing'] })).toThrow('inexistente');
    expect(() => parse({ ...finite, transitions: [{ ...finite.transitions[0], to: 'missing' }] })).toThrow('inexistente');
    expect(() => parse({ ...machines[3], rejectStateId: 'missing' })).toThrow('inexistente');
  });

  it('rechaza identificadores y símbolos duplicados', () => {
    expect(() => parse({ ...finite, states: [state, state] })).toThrow('repetidos');
    expect(() => parse({ ...finite, transitions: [finite.transitions[0], finite.transitions[0]] })).toThrow('repetidos');
    expect(() => parse({ ...finite, alphabet: ['0', '0'] })).toThrow('repetidos');
  });

  it('valida símbolos unitarios y la representación de ε', () => {
    expect(() => parse({ ...finite, alphabet: ['01'] })).toThrow('único símbolo');
    expect(() => parse({ ...finite, alphabet: ['ε'] })).toThrow('único símbolo');
    expect(() => parse({ ...finite, transitions: [{ ...finite.transitions[0], read: '' }] })).toThrow();
    expect(() => parse({ ...finite, transitions: [{ ...finite.transitions[0], read: 'ε' }] })).toThrow();
    expect(parse({ ...finite, alphabet: ['🦉'], transitions: [] }).alphabet).toEqual(['🦉']);
  });

  it('valida la forma de las reglas de pila y cinta', () => {
    const pda = machines[2];
    const tm = machines[3];
    expect(() => parse({ ...pda, transitions: [{ ...pda.transitions[0], pop: '' }] })).toThrow();
    expect(() => parse({ ...pda, transitions: [{ ...pda.transitions[0], push: ['AB'] }] })).toThrow('único símbolo');
    expect(() => parse({ ...tm, transitions: [{ ...tm.transitions[0], move: 'S' }] })).toThrow('L o R');
    expect(() => parse({ ...tm, transitions: [{ ...tm.transitions[0], write: '' }] })).toThrow();
  });

  it('conserva borradores exportados con errores semánticos editables', () => {
    const drafts = [
      { ...finite, states: [{ ...state, name: '' }], alphabet: ['1'] },
      { ...machines[2], initialStackSymbol: '', stackAlphabet: [] },
      { ...machines[2], initialStackSymbol: 'B', stackAlphabet: [] },
      { ...machines[3], tapeAlphabet: [], transitions: [{ ...machines[3].transitions[0], write: 'X' }] },
    ];
    drafts.forEach((draft) => expect(parse(draft)).toEqual(draft));
  });

  it('rechaza contenido no JSON y propiedades de prototipo', () => {
    expect(() => parseMachineJson('esto no es JSON')).toThrow('JSON válido');
    expect(() => parseMachineJson('{"__proto__":{"polluted":true}}')).toThrow('no permitida');
    expect(() => parseMachineJson('{"nested":{"constructor":{}}}')).toThrow('no permitida');
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('explica en español un JSON con anidamiento excesivo', () => {
    const nested = '{"nested":'.repeat(20_000) + 'null' + '}'.repeat(20_000);
    expect(() => parseMachineJson(nested)).toThrow('estructura JSON');
  });

  it('aplica los límites de bytes, estados y transiciones', () => {
    expect(() => parseMachineJson(' '.repeat(1024 * 1024 + 1))).toThrow('1 MB');
    expect(() => parse({ ...finite, name: '🦉'.repeat(270_000) })).toThrow('1 MB');
    expect(() => parse({ ...finite, states: Array.from({ length: 51 }, (_, index) => ({ ...state, id: `q${index}` })) })).toThrow('50 estados');
    expect(() => parse({ ...finite, transitions: Array.from({ length: 301 }, (_, index) => ({ ...finite.transitions[0], id: `t${index}` })) })).toThrow('300 transiciones');
  });
});

describe('borradores locales', () => {
  let entries: Map<string, string>;
  let storage: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    entries = new Map();
    storage = {
      getItem: vi.fn((key: string) => entries.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { entries.set(key, value); }),
    };
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('guarda y recupera un borrador con una clave por modelo', () => {
    expect(saveDraft(finite)).toBeNull();
    expect(entries.has('formal-languages:v1:dfa')).toBe(true);
    expect(loadDraft('dfa')).toEqual(finite);
    expect(loadDraft('pda')).toBeNull();
  });

  it('recupera el trabajo incompleto sin perder cambios al recargar', () => {
    const finiteDraft: Machine = { ...finite, states: [{ ...state, name: '' }], alphabet: ['1'] };
    const pda = machines[2];
    if (pda.kind !== 'pda') throw new Error('El ejemplo debe ser un AP');
    const pdaDraft: Machine = { ...pda, initialStackSymbol: '', stackAlphabet: [] };
    for (const draft of [finiteDraft, pdaDraft]) {
      expect(saveDraft(draft)).toBeNull();
      expect(loadDraft(draft.kind)).toEqual(draft);
    }
  });

  it('tolera almacenamiento corrupto y un tipo que no coincide con la clave', () => {
    entries.set('formal-languages:v1:dfa', '{');
    expect(loadDraft('dfa')).toBeNull();
    entries.set('formal-languages:v1:dfa', JSON.stringify(machines[1]));
    expect(loadDraft('dfa')).toBeNull();
  });

  it('devuelve un error recuperable si la cuota se agota', () => {
    storage.setItem.mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(saveDraft(finite)).toContain('lleno');
  });

  it('tolera que el navegador bloquee el almacenamiento', () => {
    storage.getItem.mockImplementation(() => { throw new Error('Blocked'); });
    storage.setItem.mockImplementation(() => { throw new Error('Blocked'); });
    expect(loadDraft('dfa')).toBeNull();
    expect(saveDraft(finite)).toContain('Exporta');
  });
});
