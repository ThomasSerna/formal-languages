import { describe, expect, it } from 'vitest';
import type { TmMachine } from './domain';
import { createRun, stepRun, validateMachine } from './engine';
import { createBlankMachine, EXAMPLES } from './examples';
import { buildTmTransitionTable } from './turingTable';

describe('tabla de transición de Máquina de Turing (Kozen)', () => {
  it('representa fielmente el ejemplo 0ⁿ1ⁿ con columnas Γ, reglas explícitas, implícitas a r y filas absorbentes', () => {
    const machine = EXAMPLES.tm as TmMachine;
    const table = buildTmTransitionTable(machine, validateMachine(machine));

    expect(table.hasRejectState).toBe(true);
    expect(table.columns.map((col) => col.symbol)).toEqual(['0', '1', 'X', 'Y', '⊢', '␣']);
    expect(table.columns.find((col) => col.symbol === '⊢')?.isLeftMarker).toBe(true);
    expect(table.columns.find((col) => col.symbol === '␣')?.isBlank).toBe(true);
    expect(table.columns.every((col) => !col.outOfAlphabet)).toBe(true);

    expect(table.rows.map((row) => row.state.id)).toEqual(['s', 'q0', 'q1', 'q2', 'q3', 't', 'r']);

    const startRow = table.rows.find((row) => row.state.id === 's')!;
    expect(startRow.initial).toBe(true);
    expect(startRow.absorbing).toBe(false);

    const markerCell = startRow.cells.find((cell) => cell.symbol === '⊢')!;
    expect(markerCell.explicit).toHaveLength(1);
    expect(markerCell.explicit[0]).toMatchObject({ to: 'q0', write: '⊢', move: 'R' });
    expect(markerCell.defaultRule).toBeNull();

    const omittedStartZero = startRow.cells.find((cell) => cell.symbol === '0')!;
    expect(omittedStartZero.explicit).toEqual([]);
    expect(omittedStartZero.defaultRule).toEqual({
      activeKey: '__default:s:0',
      targetStateId: 'r',
      targetName: 'r',
      write: '0',
      move: 'R',
    });

    const acceptRow = table.rows.find((row) => row.state.id === 't')!;
    const rejectRow = table.rows.find((row) => row.state.id === 'r')!;
    expect(acceptRow.accepting && acceptRow.absorbing).toBe(true);
    expect(rejectRow.rejecting && rejectRow.absorbing).toBe(true);
    expect(acceptRow.cells.every((cell) => cell.isTerminal && cell.defaultRule === null)).toBe(true);
    expect(rejectRow.cells.every((cell) => cell.isTerminal && cell.defaultRule === null)).toBe(true);
  });

  it('sincroniza exactamente la clave de regla implícita con el paso de rechazo de stepRun', () => {
    const machine = EXAMPLES.tm as TmMachine;
    const table = buildTmTransitionTable(machine);

    // Input "10": s -(⊢)-> q0, then q0 reads "1" (omitted rule -> default to r).
    let run = createRun(machine, '10');
    run = stepRun(machine, run);
    run = stepRun(machine, run);

    expect(run.status).toBe('rejected');
    const q0Row = table.rows.find((row) => row.state.id === 'q0')!;
    const q0OneCell = q0Row.cells.find((cell) => cell.symbol === '1')!;
    expect(q0OneCell.defaultRule?.activeKey).toBe(run.transitionIds[0]);
  });

  it('conserva transiciones con símbolos fuera de Γ, reglas sobre t/r e incidencias de validación en borradores', () => {
    const machine = structuredClone(EXAMPLES.tm) as TmMachine;
    machine.tapeAlphabet = ['0', '1', '⊢', '␣'];
    machine.transitions.push({
      id: 'escape-t',
      from: 't',
      to: 's',
      read: '0',
      write: '0',
      move: 'R',
    });

    const issues = validateMachine(machine);
    const table = buildTmTransitionTable(machine, issues);

    const xColumn = table.columns.find((col) => col.symbol === 'X')!;
    expect(xColumn.outOfAlphabet).toBe(true);
    expect(table.transitionIssues.get('escape-t')?.some((msg) => msg.includes('absorbentes'))).toBe(true);

    const acceptRow = table.rows.find((row) => row.state.id === 't')!;
    const acceptZeroCell = acceptRow.cells.find((cell) => cell.symbol === '0')!;
    expect(acceptZeroCell.explicit.map((rule) => rule.id)).toEqual(['escape-t']);
    expect(acceptZeroCell.isTerminal).toBe(false);
  });

  it('maneja máquinas vacías y borradores sin estado de rechazo r definido', () => {
    const blank = createBlankMachine('tm') as TmMachine;
    const blankTable = buildTmTransitionTable(blank);
    expect(blankTable.rows).toEqual([]);
    expect(blankTable.columns.map((col) => col.symbol)).toEqual(['0', '1', 'X', 'Y', '⊢', '␣']);
    expect(blankTable.hasRejectState).toBe(false);

    blank.states = [{ id: 'q0', name: 'q0', x: 100, y: 100 }];
    blank.initialStateIds = ['q0'];
    const noRejectTable = buildTmTransitionTable(blank);
    expect(noRejectTable.hasRejectState).toBe(false);
    expect(noRejectTable.rows[0].cells.every((cell) => cell.defaultRule === null && !cell.isTerminal)).toBe(true);
  });
});
