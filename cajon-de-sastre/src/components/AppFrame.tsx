import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ChevronLeft } from 'lucide-preact';
import type { AppItem } from '../lib/types';
import { injectIntoHtml, SANDBOX } from '../lib/shim';
import { entriesBytes, MAX_BYTES } from '../lib/limits';
import { AppGlyph } from './Icons';

const currentTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const OPEN_MS = 420, CLOSE_MS = 340, EASE = 'cubic-bezier(.2,.8,.2,1)';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (n: number) => Math.min(1, Math.max(0, n));

interface Props { app: AppItem; initial: Record<string, string>; origin?: DOMRect; onEntries: (e: Record<string, string>) => void; onClose: () => void }

/**
 * Ejecuta la app SOLO dentro de un iframe sandbox sin allow-same-origin.
 * El icono se expande a pantalla completa (Web Animations) y se cierra deslizando
 * desde el borde izquierdo (o con el botón Volver): el gesto «rebobina» la propia animación de apertura.
 */
export function AppFrame({ app, initial, origin, onEntries, onClose }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const shell = useRef<HTMLDivElement>(null), glyph = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);
  const closing = useRef(false);
  const [overQuota, setOverQuota] = useState(false);
  // srcdoc se calcula una sola vez: los datos iniciales son los guardados al abrir
  const srcdoc = useMemo(() => injectIntoHtml(app.html ?? '', { appId: app.id, entries: initial, theme: currentTheme(), adapt: !!app.adapt, fit: app.fit !== false }), [app.id]);
  const W = innerWidth, H = innerHeight;
  const r = origin ?? new DOMRect(W / 2 - 32, H / 2 - 32, 64, 64);

  // ----- Animación de apertura -----
  useEffect(() => {
    const d = reduced() ? 0 : OPEN_MS;
    const opts = { duration: d, easing: EASE, fill: 'both' as const };
    anims.current = [
      shell.current!.animate([
        { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: `${r.width * 0.24}px`, boxShadow: 'var(--lift)' },
        { left: '0px', top: '0px', width: `${W}px`, height: `${H}px`, borderRadius: '0px', boxShadow: '0 0 0 transparent' },
      ], opts),
      glyph.current!.animate([{ opacity: 1 }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], opts),
      content.current!.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], opts),
    ];
    return () => anims.current.forEach((a) => a.cancel());
  }, []);

  /** Rebobina las animaciones hasta el icono y avisa al terminar. */
  const finishClose = async () => {
    if (closing.current && anims.current[0].playbackRate < 0) return;
    closing.current = true;
    anims.current.forEach((a) => { a.effect?.updateTiming({ easing: EASE }); a.updatePlaybackRate(-(OPEN_MS / CLOSE_MS)); a.play(); });
    await Promise.all(anims.current.map((a) => a.finished.catch(() => {})));
    onClose();
  };
  const close = () => {
    if (closing.current) return;
    anims.current.forEach((a) => a.finish()); // asegura que parte de «abierta»
    void finishClose();
  };
  /** Posiciona la animación según el progreso del gesto (0 = abierta, 1 = cerrada). */
  const scrub = (p: number) => anims.current.forEach((a) => { a.pause(); a.currentTime = (1 - p) * OPEN_MS; });
  const cancelGesture = () => anims.current.forEach((a) => { a.effect?.updateTiming({ easing: EASE }); a.updatePlaybackRate(1); a.play(); });

  const gesture = (axis: 'y' | 'x') => {
    let start = 0, last = 0, lastT = 0, vel = 0, active = false, moved = false;
    const span = axis === 'y' ? H * 0.45 : W * 0.5;
    const pos = (e: PointerEvent) => (axis === 'y' ? start - e.clientY : e.clientX - start);
    return {
      onPointerDown: (e: PointerEvent) => {
        if (closing.current) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        start = axis === 'y' ? e.clientY : e.clientX; last = 0; lastT = e.timeStamp; vel = 0; active = true; moved = false;
        anims.current.forEach((a) => { a.finish(); a.effect?.updateTiming({ easing: 'linear' }); });
      },
      onPointerMove: (e: PointerEvent) => {
        if (!active) return;
        const d = pos(e); if (Math.abs(d) > 6) moved = true;
        if (e.timeStamp > lastT) vel = (d - last) / (e.timeStamp - lastT);
        last = d; lastT = e.timeStamp;
        if (moved) scrub(clamp(d / span));
      },
      onPointerUp: () => {
        if (!active) return; active = false;
        if (!moved) { close(); return; } // un toque en el asa también cierra
        if (clamp(last / span) > 0.3 || vel > 0.6) void finishClose(); else cancelGesture();
      },
      onPointerCancel: () => { if (active) { active = false; cancelGesture(); } },
    };
  };
  const edge = gesture('x');

  // ----- Datos de la app, Escape, botón atrás, tema -----
  useEffect(() => {
    const entries = { ...initial };
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (e.source !== frame.current?.contentWindow || !d || d.cajon !== 1 || d.app !== app.id) return;
      if (d.t === 'set' && typeof d.k === 'string' && typeof d.v === 'string') entries[d.k] = d.v;
      else if (d.t === 'remove' && typeof d.k === 'string') delete entries[d.k];
      else if (d.t === 'clear') for (const k of Object.keys(entries)) delete entries[k];
      else return;
      const tooBig = entriesBytes(entries) > MAX_BYTES;
      setOverQuota(tooBig);
      if (!tooBig) onEntries({ ...entries });
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    const pushTheme = () => frame.current?.contentWindow?.postMessage({ cajon: 1, t: 'theme', theme: currentTheme() }, '*');
    const mo = new MutationObserver(pushTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('message', onMessage); addEventListener('keydown', key); addEventListener('popstate', close);
    return () => { mo.disconnect(); removeEventListener('message', onMessage); removeEventListener('keydown', key); removeEventListener('popstate', close); };
  }, [app.id]);

  const fixed = { position: 'absolute', left: 0, top: 0, width: W, height: H } as const;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
      <div ref={shell} style={{ position: 'absolute', overflow: 'hidden', background: `var(--${app.color})`, color: `var(--${app.color}-ink)`, pointerEvents: 'auto', left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: r.width * 0.24 }}>
        <div ref={glyph} style={{ position: 'absolute', left: 0, top: 0, width: r.width, height: r.height, display: 'grid', placeItems: 'center' }}><AppGlyph app={app} size={r.width} /></div>
        <div ref={content} style={{ ...fixed, background: 'var(--bg)' }}>
          <iframe ref={frame} title={app.name} srcDoc={srcdoc} sandbox={SANDBOX} style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
          {overQuota && <div class="card" style={{ position: 'absolute', top: 12, left: 12, right: 12, color: 'var(--danger)', fontSize: 13, fontWeight: 700 }}>Los datos de esta app superan 1 MB: los últimos cambios no se guardan.</div>}
          <div {...edge} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, touchAction: 'none' }} />
          <button aria-label="Volver" title="Volver" onClick={close} style={{ position: 'absolute', top: 'calc(10px + env(safe-area-inset-top))', left: 10, width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-sm)', opacity: 0.75, display: 'grid', placeItems: 'center' }}><ChevronLeft size={22} strokeWidth={1.8} /></button>
        </div>
      </div>
    </div>
  );
}
