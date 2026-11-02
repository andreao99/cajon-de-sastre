import { useRef } from 'preact/hooks';

/** Pulsación larga con pointer events; se cancela si el dedo se mueve más de 8 px. */
export function useLongPress(onLong: () => void, ms = 500) {
  const t = useRef<number>(0);
  const start = useRef<[number, number]>([0, 0]);
  const fired = useRef(false);
  const cancel = () => clearTimeout(t.current);
  return {
    onPointerDown: (e: PointerEvent) => {
      fired.current = false; start.current = [e.clientX, e.clientY];
      t.current = window.setTimeout(() => { fired.current = true; onLong(); }, ms);
    },
    onPointerMove: (e: PointerEvent) => { if (Math.hypot(e.clientX - start.current[0], e.clientY - start.current[1]) > 8) cancel(); },
    onPointerUp: cancel, onPointerCancel: cancel, onPointerLeave: cancel,
    onContextMenu: (e: Event) => e.preventDefault(),
    /** true si el gesto acaba de disparar la pulsación larga (para ignorar el click posterior) */
    wasLong: () => fired.current,
  };
}
