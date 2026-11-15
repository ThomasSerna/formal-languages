import type { State, TmMachine, TmTransition } from './domain';
import type { ValidationIssue } from './engine';
import { stateName } from './format';

export interface TmTableColumn {
  symbol: string;
  isLeftMarker: boolean;
  isBlank: boolean;
  outOfAlphabet: boolean;
}

export interface TmDefaultRule {
  activeKey: string;
  targetStateId: string;
  targetName: string;
  write: string;
  move: 'R';
}

export interface TmTableCell {
  stateId: string;
  symbol: string;
  explicit: TmTransition[];
  defaultRule: TmDefaultRule | null;
  isTerminal: boolean;
}

export interface TmTableRow {
  state: State;
  initial: boolean;
  accepting: boolean;
  rejecting: boolean;
  absorbing: boolean;
  issues: string[];
  cells: TmTableCell[];
}

export interface TmTransitionTable {
  columns: TmTableColumn[];
  rows: TmTableRow[];
  transitionIssues: Map<string, string[]>;
  hasRejectState: boolean;
}

export function buildTmTransitionTable(
  machine: TmMachine,
  issues: ValidationIssue[] = [],
): TmTransitionTable {
  const seenSymbols = new Set<string>();
  const columns: TmTableColumn[] = [];

  const pushColumn = (symbol: string, outOfAlphabet: boolean) => {
    if (seenSymbols.has(symbol)) return;
    seenSymbols.add(symbol);
    columns.push({
      symbol,
      isLeftMarker: symbol === machine.leftMarker,
      isBlank: symbol === machine.blankSymbol,
      outOfAlphabet,
    });
  };

  for (const symbol of machine.tapeAlphabet) pushColumn(symbol, false);
  for (const rule of machine.transitions) pushColumn(rule.read, true);

  const byOrigin = new Map<string, Map<string, TmTransition[]>>();
  for (const rule of machine.transitions) {
    let bySymbol = byOrigin.get(rule.from);
    if (!bySymbol) {
      bySymbol = new Map();
      byOrigin.set(rule.from, bySymbol);
    }
    const list = bySymbol.get(rule.read);
    if (list) list.push(rule);
    else bySymbol.set(rule.read, [rule]);
  }

  const stateIssues = new Map<string, string[]>();
  const transitionIssues = new Map<string, string[]>();
  for (const issue of issues) {
    if (issue.stateId) {
      const list = stateIssues.get(issue.stateId) ?? [];
      list.push(issue.message);
      stateIssues.set(issue.stateId, list);
    }
    if (issue.transitionId) {
      const list = transitionIssues.get(issue.transitionId) ?? [];
      list.push(issue.message);
      transitionIssues.set(issue.transitionId, list);
    }
  }

  const hasRejectState = Boolean(
    machine.rejectStateId && machine.states.some((state) => state.id === machine.rejectStateId),
  );
  const rejectTargetName = hasRejectState ? stateName(machine, machine.rejectStateId) : '';

  const rows: TmTableRow[] = machine.states.map((state) => {
    const initial = machine.initialStateIds.includes(state.id);
    const accepting = machine.acceptingStateIds.includes(state.id);
    const rejecting = machine.rejectStateId === state.id;
    const absorbing = accepting || rejecting;
    const rowTransitions = byOrigin.get(state.id);

    const cells: TmTableCell[] = columns.map((column) => {
      const explicit = rowTransitions?.get(column.symbol) ?? [];
      const defaultRule =
        !absorbing && explicit.length === 0 && hasRejectState
          ? {
              activeKey: `__default:${state.id}:${column.symbol}`,
              targetStateId: machine.rejectStateId,
              targetName: rejectTargetName,
              write: column.symbol,
              move: 'R' as const,
            }
          : null;

      return {
        stateId: state.id,
        symbol: column.symbol,
        explicit,
        defaultRule,
        isTerminal: absorbing && explicit.length === 0,
      };
    });

    return {
      state,
      initial,
      accepting,
      rejecting,
      absorbing,
      issues: stateIssues.get(state.id) ?? [],
      cells,
    };
  });

  return { columns, rows, transitionIssues, hasRejectState };
}
