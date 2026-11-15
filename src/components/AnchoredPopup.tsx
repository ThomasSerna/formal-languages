import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from 'react';
import type { MachineKind } from '../domain';

export type PopupAnchor =
  | { kind: 'state'; id: string }
  | { kind: 'transition'; id: string }
  | { kind: 'cell'; stateId: string; symbol: string }
  | { kind: 'toolbar'; element: HTMLElement | null };

interface AnchoredPopupProps {
  kind: MachineKind;
  containerRef: RefObject<HTMLElement | null>;
  canvasSize: { width: number; height: number };
  popup?: ReactNode;
  popupAnchor: PopupAnchor | null;
  compactPopup: boolean;
  resolveAnchor: (container: HTMLElement, anchor: Exclude<PopupAnchor, { kind: 'toolbar' }>) => HTMLElement | null;
  layoutDeps?: unknown;
  repositionRef?: MutableRefObject<() => void>;
}

export default function AnchoredPopup({
  kind,
  containerRef,
  canvasSize,
  popup,
  popupAnchor,
  compactPopup,
  resolveAnchor,
  layoutDeps,
  repositionRef,
}: AnchoredPopupProps) {
  const popupSurface = useRef<HTMLDivElement>(null);
  const popupContainer = useRef<HTMLDivElement>(null);
  const positionFrame = useRef(0);
  const lastPopup = useRef<{ kind: MachineKind; node: ReactNode; compact: boolean } | null>(null);
  const [popupPresent, setPopupPresent] = useState(false);
  const popupOpen = Boolean(popup);
  const interruptedPopup = useRef<Keyframe | null>(null);

  const positionPopup = useCallback(() => {
    const panel = popupContainer.current;
    const canvas = containerRef.current;
    if (!popupOpen || !panel || !canvas) return;
    const element = popupAnchor?.kind === 'toolbar'
      ? popupAnchor.element
      : popupAnchor
        ? resolveAnchor(canvas, popupAnchor)
        : null;
    const bounds = canvas.getBoundingClientRect();
    const anchor = element?.getBoundingClientRect();
    const navbar = canvas.closest('.workspace')?.querySelector<HTMLElement>('.liquid-navbar-shell')?.getBoundingClientRect();
    const margin = 12;
    const safeTop = navbar ? Math.max(margin, Math.ceil(navbar.bottom - bounds.top + 8)) : margin;
    const width = panel.offsetWidth;
    panel.style.maxHeight = `${Math.max(0, bounds.height - safeTop - margin)}px`;
    let left = margin;
    let top = safeTop;
    let originX = 0;
    let originY = safeTop;
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
        const above = anchor.top - bounds.top - safeTop - margin;
        const below = bounds.bottom - anchor.bottom - margin * 2;
        const space = Math.max(above, below);
        panel.style.maxHeight = `${Math.max(0, Math.min(bounds.height - safeTop - margin, space))}px`;
        top = below >= above ? anchor.bottom - bounds.top + margin : anchor.top - bounds.top - panel.offsetHeight - margin;
        originX = width / 2;
        originY = below >= above ? top : top + panel.offsetHeight;
      }
    } else if (anchor) {
      const aboveToolbar = Math.max(180, Math.floor(anchor.top - bounds.top - safeTop - 8));
      panel.style.maxHeight = `${Math.max(0, Math.min(bounds.height - safeTop - margin, aboveToolbar))}px`;
      left = anchor.left - bounds.left;
      top = Math.max(safeTop, Math.floor(anchor.top - bounds.top - panel.offsetHeight - 8));
      originX = (anchor.left + anchor.right) / 2 - bounds.left - left;
      originY = top + panel.offsetHeight;
    }
    left = Math.max(margin, Math.min(left, bounds.width - width - margin));
    top = Math.max(safeTop, Math.min(top, bounds.height - panel.offsetHeight - margin));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    popupSurface.current?.style.setProperty(
      '--popup-origin',
      `${originX}px ${Math.max(0, Math.min(panel.offsetHeight, originY - top))}px`,
    );
  }, [popupOpen, popupAnchor, canvasSize, containerRef, resolveAnchor]);

  const schedulePopupPosition = useCallback(() => {
    cancelAnimationFrame(positionFrame.current);
    positionFrame.current = requestAnimationFrame(positionPopup);
  }, [positionPopup]);

  useEffect(() => {
    if (repositionRef) repositionRef.current = schedulePopupPosition;
  }, [repositionRef, schedulePopupPosition]);

  useLayoutEffect(() => {
    positionPopup();
  }, [positionPopup, layoutDeps]);

  useLayoutEffect(() => {
    if (!popupOpen || !popupContainer.current) return;
    const observer = new ResizeObserver(positionPopup);
    observer.observe(popupContainer.current);
    return () => observer.disconnect();
  }, [popupOpen, positionPopup]);

  useEffect(() => () => cancelAnimationFrame(positionFrame.current), []);

  useLayoutEffect(() => {
    if (popupOpen) lastPopup.current = { kind, node: popup, compact: compactPopup };
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
    if (!surface || (!popupOpen && lastPopup.current?.kind !== kind)) {
      discard();
      return;
    }
    if (popupOpen) setPopupPresent(true);
    if (preference.matches || surface.closest('[data-input="keyboard"]')) {
      if (!popupOpen) discard();
      return;
    }
    surface.style.willChange = 'transform, opacity';
    const animation = surface.animate(
      popupOpen
        ? [
            from ?? { opacity: 0, transform: 'scale(.94)' },
            { opacity: 1, transform: 'scale(1.01)', offset: 0.72 },
            { opacity: 1, transform: 'scale(1)' },
          ]
        : [
            from ?? { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(.97)' },
          ],
      { duration: popupOpen ? 220 : 140, easing: 'cubic-bezier(.16, 1, .3, 1)' },
    );
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
  }, [popupOpen, kind]);

  if (!(popupOpen || popupPresent) || (!popupOpen && lastPopup.current?.kind !== kind)) {
    return null;
  }

  return (
    <div
      ref={popupContainer}
      className="graph-popup"
      data-compact={popupOpen ? compactPopup : lastPopup.current?.compact}
      data-state={popupOpen ? 'open' : 'closing'}
      role="dialog"
      aria-label="Inspector del autómata"
      aria-modal="false"
      aria-hidden={!popupOpen || undefined}
      inert={!popupOpen}
    >
      <div ref={popupSurface} className="graph-popup__surface">
        {popupOpen ? popup : lastPopup.current?.node}
      </div>
    </div>
  );
}
