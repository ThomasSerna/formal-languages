import type { Machine } from './domain';

const MAX_JSON_BYTES = 1024 * 1024;
const STORAGE_PREFIX = 'formal-languages:v1:';
const KINDS = ['dfa', 'nfa', 'pda', 'tm'] as const;

function invalid(message: string): never {
  throw new Error(`No se pudo importar el autómata: ${message}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(`${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    invalid(`${label} debe ser un texto${allowEmpty ? '' : ' no vacío'}.`);
  }
  return value;
}

function symbol(value: unknown, label: string, allowEpsilon = false): string {
  const result = text(value, label, allowEpsilon);
  if ((allowEpsilon && result === '') || (Array.from(result).length === 1 && result !== 'ε')) {
    return result;
  }
  invalid(`${label} debe ser un único símbolo${allowEpsilon ? ' o la cadena vacía para ε' : ''}.`);
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label} debe ser una lista.`);
  return value;
}

function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) invalid(`${label} contiene elementos repetidos.`);
}

function alphabet(value: unknown, label: string): string[] {
  const values = array(value, label).map((item) => symbol(item, label));
  unique(values, label);
  return values;
}

function reference(value: unknown, ids: Set<string>, label: string): string {
  const id = text(value, label);
  if (!ids.has(id)) invalid(`${label} hace referencia al estado inexistente «${id}».`);
  return id;
}

function role(value: unknown, ids: Set<string>, label: string): void {
  const values = array(value, label).map((item) => reference(item, ids, label));
  unique(values, label);
}

export function parseMachineJson(source: string): Machine {
  if (source.length > MAX_JSON_BYTES || new TextEncoder().encode(source).byteLength > MAX_JSON_BYTES) {
    invalid('el archivo supera el límite de 1 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source, (key: string, value: unknown) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        invalid('el archivo contiene una propiedad no permitida.');
      }
      return value;
    });
  } catch (error) {
    if (error instanceof SyntaxError) invalid('el archivo no contiene JSON válido.');
    if (error instanceof RangeError) invalid('la estructura JSON es demasiado profunda.');
    throw error;
  }

  const machine = record(parsed, 'El autómata');
  if (machine.schemaVersion !== 1) invalid('la versión del archivo no es compatible; se requiere la versión 1.');
  if (!KINDS.includes(machine.kind as Machine['kind'])) invalid('el tipo de autómata no es válido.');
  text(machine.name, 'El nombre del autómata', true);
  alphabet(machine.alphabet, 'El alfabeto de entrada');
  const states = array(machine.states, 'Los estados');
  const transitions = array(machine.transitions, 'Las transiciones');
  if (states.length > 50) invalid('se permiten como máximo 50 estados.');
  if (transitions.length > 300) invalid('se permiten como máximo 300 transiciones.');

  const stateIds = states.map((value) => {
    const state = record(value, 'Cada estado');
    const id = text(state.id, 'El identificador del estado');
    text(state.name, 'El nombre del estado', true);
    if (typeof state.x !== 'number' || !Number.isFinite(state.x)
      || typeof state.y !== 'number' || !Number.isFinite(state.y)) {
      invalid('las coordenadas de cada estado deben ser números finitos.');
    }
    return id;
  });
  unique(stateIds, 'Los identificadores de los estados');
  const ids = new Set(stateIds);
  role(machine.initialStateIds, ids, 'Los estados iniciales');
  role(machine.acceptingStateIds, ids, 'Los estados de aceptación');

  if (machine.kind === 'pda') {
    alphabet(machine.stackAlphabet, 'El alfabeto de la pila');
    text(machine.initialStackSymbol, 'El símbolo inicial de la pila', true);
    if (machine.initialStackSymbol !== '') symbol(machine.initialStackSymbol, 'El símbolo inicial de la pila');
  }
  if (machine.kind === 'tm') {
    alphabet(machine.tapeAlphabet, 'El alfabeto de la cinta');
    symbol(machine.leftMarker, 'El marcador izquierdo');
    symbol(machine.blankSymbol, 'El símbolo blanco');
    text(machine.rejectStateId, 'El estado de rechazo', true);
    if (machine.rejectStateId !== '') reference(machine.rejectStateId, ids, 'El estado de rechazo');
  }

  const transitionIds = transitions.map((value) => {
    const transition = record(value, 'Cada transición');
    const id = text(transition.id, 'El identificador de la transición');
    reference(transition.from, ids, 'El origen de la transición');
    reference(transition.to, ids, 'El destino de la transición');
    const allowEpsilon = machine.kind === 'nfa' || machine.kind === 'pda';
    symbol(transition.read, 'La lectura de la transición', allowEpsilon);

    if (machine.kind === 'pda') {
      symbol(transition.pop, 'El símbolo que se retira de la pila');
      array(transition.push, 'Los símbolos que se apilan').forEach((item) => {
        symbol(item, 'Cada símbolo que se apila');
      });
    }
    if (machine.kind === 'tm') {
      symbol(transition.write, 'La escritura de la transición');
      if (transition.move !== 'L' && transition.move !== 'R') invalid('el movimiento de la cinta debe ser L o R.');
    }
    return id;
  });
  unique(transitionIds, 'Los identificadores de las transiciones');

  return parsed as Machine;
}

export function saveDraft(machine: Machine): string | null {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${machine.kind}`, JSON.stringify(machine));
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return 'El almacenamiento del navegador está lleno. Exporta tu autómata para conservar los cambios.';
    }
    return 'El navegador no pudo guardar el borrador. Exporta tu autómata para conservar los cambios.';
  }
}

export function loadDraft(kind: Machine['kind']): Machine | null {
  try {
    const source = localStorage.getItem(`${STORAGE_PREFIX}${kind}`);
    if (!source) return null;
    const machine = parseMachineJson(source);
    return machine.kind === kind ? machine : null;
  } catch {
    return null;
  }
}

export function exportMachine(machine: Machine): void {
  const blob = new Blob([JSON.stringify(machine, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${machine.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-') || machine.kind}.json`;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
