import { useRef, useState } from 'preact/hooks';
import { Check, Pencil } from 'lucide-preact';
import type { AppItem, Folder } from '../lib/types';
import { useLongPress } from '../hooks/useLongPress';
import { AppTile } from './Icons';

interface Props {
  folder: Folder; apps: AppItem[]; startEditing?: boolean; editMode?: boolean;
  onRename: (name: string) => void; onClose: () => void; onOpenApp: (a: AppItem, rect?: DOMRect) => void;
  /** `close`: la app se arrastró fuera de la hoja, así que se cierra la carpeta */
  onExtract: (a: AppItem, close: boolean) => void; onMove: (id: string, to: number) => void; onEditApp: (a: AppItem) => void;
}

export function FolderSheet({ folder, apps, startEditing, editMode, onRename, onClose, onOpenApp, onExtract, onMove, onEditApp }: Props) {
  const [renaming, setRenaming] = useState(!!startEditing);
  const [name, setName] = useState(folder.name);
  const [edit, setEdit] = useState(!!editMode);
  const [dragId, setDragId] = useState<string | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; started: boolean; el: HTMLElement } | null>(null);
  const press = useLongPress(() => setEdit(true));
  const done = () => { const n = name.trim(); if (n) onRename(n); setRenaming(false); };

  // Arrastrar en modo edición: dentro de la hoja reordena; fuera de la hoja saca la app de la carpeta
  const dragProps = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.badge')) return;
      press.onPointerDown(e);
      const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
      drag.current = { id, sx: e.clientX, sy: e.clientY, started: false, el };
    },
    onPointerMove: (e: PointerEvent) => {
      press.onPointerMove(e);
      const d = drag.current; if (!d || !edit) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.started) { if (Math.hypot(dx, dy) < 8) return; d.started = true; setDragId(id); }
      d.el.style.transform = `translate(${dx}px,${dy}px)`;
    },
    onPointerUp: (e: PointerEvent) => {
      press.onPointerUp();
      const d = drag.current; drag.current = null; if (!d) return;
      d.el.style.transform = '';
      if (d.started) {
        const r = sheet.current!.getBoundingClientRect();
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        const app = apps.find((a) => a.id === id)!;
        if (outside) onExtract(app, true);
        else {
          const el = document.elementsFromPoint(e.clientX, e.clientY).map((n) => n.closest<HTMLElement>('.item[data-id]')).find((n) => n && n.dataset.id !== id);
          if (el) {
            const b = el.getBoundingClientRect();
            const i = apps.findIndex((a) => a.id === el.dataset.id);
            onMove(id, i + (e.clientX > b.left + b.width / 2 ? 1 : 0));
          }
        }
      }
      setDragId(null);
    },
    onPointerCancel: () => { press.onPointerCancel(); if (drag.current) drag.current.el.style.transform = ''; drag.current = null; setDragId(null); },
  });

  return (
    <div class="overlay" onClick={() => (edit ? setEdit(false) : onClose())}>
      <div ref={sheet} class={`sheet ${edit ? 'editing' : ''}`} style={{ '--cols': 3, '--size': '72px' }} onClick={(e) => e.stopPropagation()}>
        {renaming ? (
          <form style={{ display: 'flex', gap: 8, alignItems: 'center' }} onSubmit={(e) => { e.preventDefault(); done(); }}>
            <input class="field" style={{ textAlign: 'center', fontSize: 20, fontWeight: 800 }} value={name} autoFocus maxLength={30} onInput={(e) => setName(e.currentTarget.value)} />
            <button class="circle" style={{ width: 40, height: 40, flex: 'none' }} type="submit" aria-label="Guardar"><Check size={18} strokeWidth={2} /></button>
          </form>
        ) : (
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setRenaming(true)}>{folder.name}<Pencil size={16} strokeWidth={1.8} color="var(--muted)" /></h2>
        )}
        <div class="grid" style={{ width: '100%', gap: 22 }}>
          {apps.map((a) => (
            <AppTile key={a.id} id={a.id} cls={dragId === a.id ? 'dragging' : ''} app={a} edit={edit} out
              press={{ ...press, ...dragProps(a.id) }} onEdit={() => onEditApp(a)} onDelete={() => onExtract(a, false)}
              onTap={(e) => { if (!edit && !press.wasLong()) onOpenApp(a, ((e.currentTarget as HTMLElement).querySelector('.icon') as HTMLElement).getBoundingClientRect()); }} />
          ))}
        </div>
        {edit
          ? <>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', textAlign: 'center' }}>Arrastra para reordenar o sácala de la hoja para quitarla de la carpeta</span>
              <button class="pill sm" onClick={() => setEdit(false)}>Listo</button>
            </>
          : <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Mantén pulsada una app para editar la carpeta</span>}
      </div>
    </div>
  );
}
