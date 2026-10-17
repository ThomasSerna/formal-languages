import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  ControlButton,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  getViewportForBounds,
  useInternalNode,
  type AriaLabelConfig,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import type { Machine } from '../domain';
import { ruleLabel } from '../format';
import '@xyflow/react/dist/style.css';
import './GraphEditor.css';

export type PopupAnchor = { kind: 'state' | 'transition'; id: string } | { kind: 'toolbar'; element: HTMLElement | null };

type GraphEditorProps = {
  machine: Machine;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  activeStateIds: string[];
  activeTransitionIds: string[];
  step: number;
  onSelectState: (id: string | null) => void;
  onSelectTransition: (id: string | null) => void;
  onMoveState: (id: string, x: number, y: number) => void;
  onConnect: (from: string, to: string) => void;
  popup?: ReactNode;
  popupAnchor: PopupAnchor | null;
  compactPopup: boolean;
};

type StateData = {
  name: string;
  initial: boolean;
  accepting: boolean;
  haltingAcceptance: boolean;
  rejecting: boolean;
  active: boolean;
  step: number;
  motionKey: string;
};

type RuleLabel = { id: string; text: string; active: boolean; selected: boolean };
type TransitionData = {
  rules: RuleLabel[];
  label: string;
  reciprocal: boolean;
  active: boolean;
  step: number;
  motionKey: string;
  onSelect: (id: string) => void;
};
type StateNode = Node<StateData, 'state'>;
type TransitionEdge = Edge<TransitionData, 'transition'>;

const RADIUS = 30;
const directions: Record<string, string> = { left: 'la izquierda', right: 'la derecha', up: 'arriba', down: 'abajo' };
const ariaLabels: Partial<AriaLabelConfig> = {
  'node.a11yDescription.default': 'Pulsa Entrar o Espacio para seleccionar el estado. Usa las flechas para moverlo y Escape para cancelar la selección.',
  'node.a11yDescription.keyboardDisabled': 'Pulsa Entrar o Espacio para seleccionar este estado.',
  'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) => `Estado movido hacia ${directions[direction] ?? direction}. Posición ${Math.round(x)}, ${Math.round(y)}.`,
  'edge.a11yDescription.default': 'Pulsa Entrar o Espacio para seleccionar la transición. Puedes editar cada regla desde su etiqueta.',
  'controls.ariaLabel': 'Controles del grafo',
  'controls.zoomIn.ariaLabel': 'Acercar el grafo',
  'controls.zoomOut.ariaLabel': 'Alejar el grafo',
  'controls.fitView.ariaLabel': 'Ajustar todos los estados a la vista',
  'controls.interactive.ariaLabel': 'Alternar la interacción con el grafo',
  'handle.ariaLabel': 'Conectar estados',
};

function StateCircle({ data, selected }: NodeProps<StateNode>) {
  const stateName = /^([a-zA-Z]+)(\d+)$/.exec(data.name);
  return (
    <div
      className={`automaton-state${selected ? ' is-selected' : ''}${data.active ? ' is-active' : ''}${data.accepting ? ' is-accepting' : ''}`}
      onClick={(event) => {
        // A handle finishes its connection before the node's selection handler runs.
        if (event.target instanceof Element && event.target.closest('.react-flow__handle')) event.stopPropagation();
      }}
    >
      {data.active && <span key={data.motionKey} className="automaton-state__pulse" data-step={data.step} aria-hidden="true" />}
      {data.initial && (
        <svg className="automaton-state__initial" width="43" height="20" viewBox="0 0 43 20" aria-hidden="true">
          <path d="M1 10H37M29 3L38 10L29 17" />
        </svg>
      )}
      <Handle type="target" position={Position.Left} id="in" className="automaton-state__handle" />
      <span className="automaton-state__name" title={data.name}>
        {stateName ? <>{stateName[1]}<sub>{stateName[2]}</sub></> : data.name}
      </span>
      {(data.rejecting || data.haltingAcceptance) && <span className="automaton-state__role" aria-hidden="true">{data.rejecting ? 'r' : 't'}</span>}
      {data.active && <span className="automaton-state__status">Activo</span>}
      <Handle type="source" position={Position.Right} id="out" className="automaton-state__handle" />
    </div>
  );
}

function TransitionArrow({ id, source, target, sourceX, sourceY, targetX, targetY, markerEnd, data, selected }: EdgeProps<TransitionEdge>) {
  const sourceNode = useInternalNode<StateNode>(source);
  const targetNode = useInternalNode<StateNode>(target);
  if (!data) return null;

  const start = sourceNode
    ? { x: sourceNode.internals.positionAbsolute.x + RADIUS, y: sourceNode.internals.positionAbsolute.y + RADIUS }
    : { x: sourceX - RADIUS, y: sourceY };
  const end = targetNode
    ? { x: targetNode.internals.positionAbsolute.x + RADIUS, y: targetNode.internals.positionAbsolute.y + RADIUS }
    : { x: targetX + RADIUS, y: targetY };
  let path: string;
  let labelX: number;
  let labelY: number;

  if (source === target) {
    path = `M ${start.x + 21} ${start.y - 21} C ${start.x + 94} ${start.y - 126}, ${start.x - 94} ${start.y - 126}, ${start.x - 27} ${start.y - 27}`;
    labelX = start.x;
    labelY = start.y - 99;
  } else {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy) || 1;
    const bend = data.reciprocal || distance < 90 ? 66 : 0;
    const control = { x: (start.x + end.x) / 2 - dy / distance * bend, y: (start.y + end.y) / 2 + dx / distance * bend };
    const startLength = Math.hypot(control.x - start.x, control.y - start.y) || 1;
    const endLength = Math.hypot(control.x - end.x, control.y - end.y) || 1;
    const sx = start.x + (control.x - start.x) / startLength * (RADIUS + 2);
    const sy = start.y + (control.y - start.y) / startLength * (RADIUS + 2);
    const ex = end.x + (control.x - end.x) / endLength * (RADIUS + 5);
    const ey = end.y + (control.y - end.y) / endLength * (RADIUS + 5);
    path = `M ${sx} ${sy} Q ${control.x} ${control.y}, ${ex} ${ey}`;
    labelX = sx / 4 + control.x / 2 + ex / 4;
    labelY = sy / 4 + control.y / 2 + ey / 4;
  }

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={28} className={`automaton-transition${data.active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`} />
      {data.active && <path key={data.motionKey} d={path} pathLength={1} className="automaton-transition__pulse" data-step={data.step} aria-hidden="true" />}
      <EdgeLabelRenderer>
        <div
          className="automaton-transition__labels nodrag nopan nowheel"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          role="group"
          aria-label={`Reglas ${data.label}`}
        >
          {data.rules.map((rule) => (
            <button
              key={rule.id}
              type="button"
              className={`automaton-transition__label${rule.active ? ' is-active' : ''}${rule.selected ? ' is-selected' : ''}`}
              aria-label={`Regla ${rule.text}, ${data.label}${rule.active ? ', utilizada en este paso' : ''}`}
              aria-pressed={rule.selected}
              data-transition-id={rule.id}
              onClick={(event) => { event.stopPropagation(); data.onSelect(rule.id); }}
            >
              <span>{rule.text}</span>
              {rule.active && <span className="automaton-transition__status">en uso</span>}
            </button>
          ))}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { state: StateCircle };
const edgeTypes = { transition: TransitionArrow };

function graphBounds(machine: Machine) {
  const loops = new Map<string, number>();
  for (const rule of machine.transitions) {
    if (rule.from === rule.to) loops.set(rule.from, (loops.get(rule.from) ?? 0) + 1);
  }
  const rowHeight = window.matchMedia('(max-width: 850px)').matches ? 48 : 44;
  const left = Math.min(...machine.states.map((state) => state.x - (loops.has(state.id) ? 90 : machine.initialStateIds.includes(state.id) ? 48 : 12)));
  const right = Math.max(...machine.states.map((state) => state.x + RADIUS * 2 + (loops.has(state.id) ? 90 : 12)));
  const top = Math.min(...machine.states.map((state) => state.y - (loops.has(state.id) ? Math.max(130, 72 + Math.min(164, loops.get(state.id)! * rowHeight + 4) / 2) : 16)));
  const bottom = Math.max(...machine.states.map((state) => state.y + RADIUS * 2 + 36));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export default function GraphEditor({ machine, selectedStateId, selectedTransitionId, activeStateIds, activeTransitionIds, step, onSelectState, onSelectTransition, onMoveState, onConnect, popup, popupAnchor, compactPopup }: GraphEditorProps) {
  const [instance, setInstance] = useState<ReactFlowInstance<StateNode, TransitionEdge> | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const popupSurface = useRef<HTMLDivElement>(null);
  const popupContainer = useRef<HTMLDivElement>(null);
  const positionFrame = useRef(0);
  const rippleSequence = useRef(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastPopup = useRef<{ kind: Machine['kind']; node: ReactNode; compact: boolean } | null>(null);
  const [popupPresent, setPopupPresent] = useState(false);
  const popupOpen = Boolean(popup);
  const interruptedPopup = useRef<Keyframe | null>(null);
  const latestMachine = useRef(machine);
  latestMachine.current = machine;
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 380 });
  const stateIds = JSON.stringify(machine.states.map((state) => state.id));
  const activeIds = JSON.stringify(activeStateIds);
  const transitionIds = JSON.stringify(activeTransitionIds);
  const previousCanvas = useRef<{ width: number; height: number; document: string } | null>(null);
  const motionKey = `${machine.kind}:${step}`;
  const bounds = machine.states.length ? graphBounds(machine) : null;
  const needsPanning = bounds !== null && (bounds.width * 0.95 > canvasSize.width - 24 || bounds.height * 0.95 > canvasSize.height - 50);
  const selectRule = useCallback((id: string) => { onSelectTransition(id); }, [onSelectTransition]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clearRipples = () => { if (preference.matches) setRipples([]); };
    preference.addEventListener('change', clearRipples);
    return () => preference.removeEventListener('change', clearRipples);
  }, []);

  const positionPopup = useCallback(() => {
    const panel = popupContainer.current;
    const canvas = container.current;
    if (!popupOpen || !panel || !canvas) return;
    const element = popupAnchor?.kind === 'toolbar' ? popupAnchor.element : popupAnchor
      ? canvas.querySelector<HTMLElement>(popupAnchor.kind === 'state' ? `.react-flow__node[data-id="${CSS.escape(popupAnchor.id)}"]` : `[data-transition-id="${CSS.escape(popupAnchor.id)}"]`) : null;
    const bounds = canvas.getBoundingClientRect();
    const anchor = element?.getBoundingClientRect();
    const margin = 12;
    const width = panel.offsetWidth;
    panel.style.maxHeight = `${Math.max(0, bounds.height - margin * 2)}px`;
    let left = margin;
    let top = margin;
    let originX = 0;
    let originY = 0;
    if (anchor && popupAnchor?.kind !== 'toolbar') {
      const right = anchor.right - bounds.left + margin;
      const before = anchor.left - bounds.left - width - margin;
      const centerY = (anchor.top + anchor.bottom) / 2 - bounds.top;
      if (right + width <= bounds.width - margin || before >= margin) {
        left = right + width <= bounds.width - margin ? right : before;
        top = centerY - panel.offsetHeight / 2;
        originX = left === right ? 0 : width;
        originY = centerY;
      } else {
        left = (anchor.left + anchor.right) / 2 - bounds.left - width / 2;
        const above = anchor.top - bounds.top - margin * 2;
        const below = bounds.bottom - anchor.bottom - margin * 2;
        const space = Math.max(above, below);
        panel.style.maxHeight = `${Math.max(0, Math.min(bounds.height - margin * 2, space))}px`;
        top = below >= above ? anchor.bottom - bounds.top + margin : anchor.top - bounds.top - panel.offsetHeight - margin;
        originX = width / 2;
        originY = below >= above ? top : top + panel.offsetHeight;
      }
    } else if (anchor) {
      left = anchor.left - bounds.left;
      originX = (anchor.left + anchor.right) / 2 - bounds.left - left;
    }
    left = Math.max(margin, Math.min(left, bounds.width - width - margin));
    top = Math.max(margin, Math.min(top, bounds.height - panel.offsetHeight - margin));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    popupSurface.current?.style.setProperty('--popup-origin', `${originX}px ${Math.max(0, Math.min(panel.offsetHeight, originY - top))}px`);
  }, [popupOpen, popupAnchor, canvasSize]);
  const schedulePopupPosition = useCallback(() => {
    cancelAnimationFrame(positionFrame.current);
    positionFrame.current = requestAnimationFrame(positionPopup);
  }, [positionPopup]);
  useLayoutEffect(() => {
    positionPopup();
  }, [positionPopup, machine]);
  useLayoutEffect(() => {
    if (!popupOpen || !popupContainer.current) return;
    const observer = new ResizeObserver(positionPopup);
    observer.observe(popupContainer.current);
    return () => observer.disconnect();
  }, [popupOpen, positionPopup]);
  useEffect(() => () => cancelAnimationFrame(positionFrame.current), []);

  useLayoutEffect(() => {
    if (popupOpen) lastPopup.current = { kind: machine.kind, node: popup, compact: compactPopup };
  });
  useLayoutEffect(() => {
    const surface = popupSurface.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const from = interruptedPopup.current;
    interruptedPopup.current = null;
    let current = true;
    const discard = () => {
      if (!current) return;
      lastPopup.current = null;
      setPopupPresent(false);
    };
    if (!surface || (!popupOpen && lastPopup.current?.kind !== machine.kind)) {
      discard();
      return;
    }
    if (popupOpen) setPopupPresent(true);
    if (preference.matches || surface.closest('[data-input="keyboard"]')) {
      if (!popupOpen) discard();
      return;
    }
    surface.style.willChange = 'transform, opacity';
    const animation = surface.animate(popupOpen ? [
      from ?? { opacity: 0, transform: 'scale(.94)' },
      { opacity: 1, transform: 'scale(1.01)', offset: .72 },
      { opacity: 1, transform: 'scale(1)' },
    ] : [
      from ?? { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.97)' },
    ], { duration: popupOpen ? 220 : 140, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    animation.onfinish = () => {
      if (!current) return;
      surface.style.willChange = '';
      if (!popupOpen) discard();
    };
    const stopMotion = () => {
      if (!preference.matches) return;
      animation.cancel();
      surface.style.willChange = '';
      if (!popupOpen) discard();
    };
    preference.addEventListener('change', stopMotion);
    return () => {
      current = false;
      if (animation.playState === 'running' || animation.playState === 'paused') {
        const style = getComputedStyle(surface);
        interruptedPopup.current = { opacity: style.opacity, transform: style.transform };
      }
      animation.onfinish = null;
      animation.cancel();
      surface.style.willChange = '';
      preference.removeEventListener('change', stopMotion);
    };
  }, [popupOpen, machine.kind]);
  const fitAll = useCallback(() => {
    if (!instance || !canvasSize.width || !machine.states.length) return;
    const viewport = getViewportForBounds(graphBounds(machine), canvasSize.width, canvasSize.height, 0.25, 1.15, 0.12);
    void instance.setViewport(viewport, { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240 });
  }, [instance, machine, canvasSize]);

  const nodes = useMemo<StateNode[]>(() => machine.states.map((state) => {
    const initial = machine.initialStateIds.includes(state.id);
    const accepting = machine.acceptingStateIds.includes(state.id);
    const rejecting = machine.kind === 'tm' && machine.rejectStateId === state.id;
    const active = activeStateIds.includes(state.id);
    return {
      id: state.id,
      type: 'state',
      position: { x: state.x, y: state.y },
      width: RADIUS * 2,
      height: RADIUS * 2,
      measured: { width: RADIUS * 2, height: RADIUS * 2 },
      selected: state.id === selectedStateId,
      deletable: false,
      ariaLabel: `Estado ${state.name}${initial ? ', inicial' : ''}${accepting ? ', de aceptación' : ''}${rejecting ? ', de rechazo r' : ''}${active ? ', activo' : ''}`,
      data: { name: state.name, initial, accepting, haltingAcceptance: machine.kind === 'tm' && accepting, rejecting, active, step, motionKey },
    };
  }), [machine, selectedStateId, activeStateIds, step, motionKey]);

  const edges = useMemo<TransitionEdge[]>(() => {
    const groups = new Map<string, { from: string; to: string; rules: RuleLabel[] }>();
    for (const transition of machine.transitions) {
      const key = JSON.stringify([transition.from, transition.to]);
      if (!groups.has(key)) groups.set(key, { from: transition.from, to: transition.to, rules: [] });
      groups.get(key)!.rules.push({ id: transition.id, text: ruleLabel(transition), active: activeTransitionIds.includes(transition.id), selected: selectedTransitionId === transition.id });
    }
    return [...groups.values()].map((group) => {
      const active = group.rules.some((rule) => rule.active);
      const selected = group.rules.some((rule) => rule.selected);
      const sourceName = machine.states.find((state) => state.id === group.from)?.name ?? group.from;
      const targetName = machine.states.find((state) => state.id === group.to)?.name ?? group.to;
      return {
        id: `transition-${group.rules[0].id}`,
        source: group.from,
        target: group.to,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'transition',
        selected,
        deletable: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: active ? '#0e7490' : selected ? '#6a45b8' : '#625d70', width: 20, height: 20, markerUnits: 'userSpaceOnUse' },
        ariaLabel: `De ${sourceName} a ${targetName}: ${group.rules.map((rule) => rule.text).join('; ')}`,
        data: { rules: group.rules, label: `de ${sourceName} a ${targetName}`, reciprocal: group.from !== group.to && groups.has(JSON.stringify([group.to, group.from])), active, step, motionKey, onSelect: selectRule },
      };
    });
  }, [machine, activeTransitionIds, selectedTransitionId, selectRule, step, motionKey]);

  useEffect(() => {
    if (!instance) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stopViewportMotion = () => {
      if (preference.matches) void instance.setViewport(instance.getViewport(), { duration: 0 });
    };
    preference.addEventListener('change', stopViewportMotion);
    return () => preference.removeEventListener('change', stopViewportMotion);
  }, [instance]);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!instance || !canvasSize.width) return;
    const frame = requestAnimationFrame(() => {
      const document = latestMachine.current;
      const key = `${document.kind}:${stateIds}`;
      const previous = previousCanvas.current;
      previousCanvas.current = { ...canvasSize, document: key };
      if (previous?.document === key) {
        const viewport = instance.getViewport();
        void instance.setViewport({ ...viewport, x: viewport.x + (canvasSize.width - previous.width) / 2, y: viewport.y + (canvasSize.height - previous.height) / 2 }, { duration: 0 });
        return;
      }
      if (!document.states.length) return;
      const documentBounds = graphBounds(document);
      const readableFit = documentBounds.width * 0.95 <= canvasSize.width - 24 && documentBounds.height * 0.95 <= canvasSize.height - 50;
      if (!readableFit) {
        const initial = document.states.find((state) => document.initialStateIds.includes(state.id)) ?? document.states[0];
        void instance.setCenter(initial.x + RADIUS, initial.y + RADIUS - 35, { zoom: 0.95, duration: 0 });
      } else {
        void instance.setViewport(getViewportForBounds(documentBounds, canvasSize.width, canvasSize.height, 0.25, 1.15, 0.12), { duration: 0 });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [instance, stateIds, machine.kind, canvasSize]);

  useEffect(() => {
    if (!instance || !needsPanning || !activeStateIds.length) return;
    const frame = requestAnimationFrame(() => {
      const viewport = instance.getViewport();
      const outside = latestMachine.current.states.find((state) => {
        if (!activeStateIds.includes(state.id)) return false;
        const x = (state.x + RADIUS) * viewport.zoom + viewport.x;
        const y = (state.y + RADIUS) * viewport.zoom + viewport.y;
        return x < 45 || x > canvasSize.width - 45 || y < 70 || y > canvasSize.height - 70;
      });
      if (outside) void instance.setCenter(outside.x + RADIUS, outside.y + RADIUS - 35, { zoom: viewport.zoom, duration: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [instance, activeIds, transitionIds, step, machine.kind]);

  const onNodesChange = useCallback((changes: NodeChange<StateNode>[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) onMoveState(change.id, change.position.x, change.position.y);
      if (change.type === 'select' && change.selected) onSelectState(change.id);
    }
  }, [onMoveState, onSelectState]);

  const onEdgesChange = useCallback((changes: EdgeChange<TransitionEdge>[]) => {
    for (const change of changes) {
      if (change.type === 'select' && change.selected) {
        const rule = edges.find((edge) => edge.id === change.id)?.data?.rules[0];
        if (rule) selectRule(rule.id);
      }
    }
  }, [edges, selectRule]);

  return (
    <section className="graph-editor" aria-label="Editor interactivo del grafo">
      <div ref={container} className="graph-canvas" onPointerDownCapture={event => {
        if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element) || !event.target.matches('.react-flow__pane') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const ripple = { id: ++rippleSequence.current, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        setRipples(current => [...current.slice(-3), ripple]);
      }}>
      <ReactFlow<StateNode, TransitionEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setInstance}
        onMove={schedulePopupPosition}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => { onSelectState(node.id); }}
        onEdgeClick={(_, edge) => { const rule = edge.data?.rules.find((item) => item.selected) ?? edge.data?.rules[0]; if (rule) selectRule(rule.id); }}
        onPaneClick={() => { onSelectState(null); }}
        onConnect={(connection) => { if (connection.source && connection.target) onConnect(connection.source, connection.target); }}
        ariaLabelConfig={ariaLabels}
        nodesFocusable
        edgesFocusable
        connectOnClick
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
        minZoom={0.25}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
        connectionRadius={28}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd8e5" />
        <Controls position="bottom-right" showInteractive={false} showFitView={false}>
          <ControlButton onClick={fitAll} title="Ajustar todos los estados a la vista" aria-label="Ajustar todos los estados a la vista">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 2H2V6M10 2H14V6M2 10V14H6M14 10V14H10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </ControlButton>
        </Controls>
      </ReactFlow>
      <div className="canvas-ripples" aria-hidden="true">{ripples.map(ripple => <span key={ripple.id} className="canvas-ripple" style={{ left: ripple.x, top: ripple.y }} onAnimationEnd={() => setRipples(current => current.filter(item => item.id !== ripple.id))} />)}</div>
      {machine.states.length === 0 && <div className="graph-editor__empty"><svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true"><circle cx="28" cy="26" r="18" stroke="currentColor" strokeWidth="1.5" /><path d="M1 26H10M5 21L10 26L5 31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><strong>Tu autómata empieza aquí</strong><p>Añade un estado para comenzar a construir el grafo.</p></div>}
      </div>
      {(popupOpen || popupPresent) && (popupOpen || lastPopup.current?.kind === machine.kind) && <div ref={popupContainer} className="graph-popup" data-compact={popupOpen ? compactPopup : lastPopup.current?.compact} data-state={popupOpen ? 'open' : 'closing'} role="dialog" aria-label="Inspector del autómata" aria-modal="false" aria-hidden={!popupOpen || undefined} inert={!popupOpen}>
        <div ref={popupSurface} className="graph-popup__surface">{popupOpen ? popup : lastPopup.current?.node}</div>
      </div>}
    </section>
  );
}
