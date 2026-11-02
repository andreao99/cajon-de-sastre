import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Plus, Search, SlidersHorizontal } from 'lucide-preact';
import type { AppItem, Folder } from '../lib/types';
import { dropOnto, removeApp, removeFolder, renameFolder, reorder, topLevel, type Library } from '../lib/store';
import { useLongPress } from '../hooks/useLongPress';
import { AppTile, FolderTile } from './Icons';
import { FolderSheet } from './FolderSheet';
import { SearchOverlay } from './SearchOverlay';
import { EmptyState } from './EmptyState';

type Entry = { kind: 'app'; app: AppItem; order: number } | { kind: 'folder'; folder: Folder; order: number };

const useCols = () => {
  const mq = matchMedia('(min-width:760px)');
  const [wide, setWide] = useState(mq.matches);
  useEffect(() => { const f = () => setWide(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  return wide ? { cols: 6, rows: 4, size: 84 } : { cols: 4, rows: 5, size: 64 };
};

const greeting = () => { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'; };

interface Props { lib: Library; onLib: (l: Library) => void; onEditApp: (a: AppItem) => void; searchMode: 'pull' | 'bar'; onSettings: () => void; onAdd: () => void; onOpenApp: (a: AppItem, rect?: DOMRect) => void; dim?: boolean }

export function Home({ lib, onLib, onEditApp, searchMode, onSettings, onAdd, onOpenApp, dim }: Props) {
  const { cols, rows, size } = useCols();
  const [edit, setEdit] = useState(false);
  const [page, setPage] = useState(0);
  const [openFolder, setOpenFolder] = useState<{ id: string; rename: boolean } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [targetId, setTarget] = useState<string | null>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; started: boolean; el: HTMLElement } | null>(null);
  const [search, setSearch] = useState(false);
  const [pull, setPull] = useState(0);
  const pagesRef = useRef<HTMLDivElement>(null);
  const press = useLongPress(() => setEdit(true));

  const entries = useMemo<Entry[]>(() => [
    ...lib.apps.filter((a) => !a.folderId).map((app): Entry => ({ kind: 'app', app, order: app.order })),
    ...lib.folders.map((folder): Entry => ({ kind: 'folder', folder, order: folder.order })),
  ].sort((a, b) => a.order - b.order), [lib]);
  const perPage = cols * rows;
  const pages = Array.from({ length: Math.max(1, Math.ceil(entries.length / perPage)) }, (_, i) => entries.slice(i * perPage, (i + 1) * perPage));

  // Escape sale del modo edición
  useEffect(() => {
    if (!edit) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setEdit(false);
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [edit]);

  // Deslizar hacia abajo desde arriba del todo abre el buscador
  const pullY = useRef<number | null>(null);
  const touch = {
    onTouchStart: (e: TouchEvent) => { const el = e.currentTarget as HTMLElement; pullY.current = el.scrollTop <= 0 && searchMode === 'pull' && !edit ? e.touches[0].clientY : null; },
    onTouchMove: (e: TouchEvent) => { if (pullY.current !== null) setPull(Math.max(0, Math.min(70, (e.touches[0].clientY - pullY.current) * 0.5))); },
    onTouchEnd: () => { if (pull >= 50) setSearch(true); setPull(0); pullY.current = null; },
  };

  const folderApps = (id: string) => lib.apps.filter((a) => a.folderId === id).sort((a, b) => a.order - b.order);
  /** Arrastrar en modo edición: soltar sobre el centro de otra entrada la mete (o crea carpeta); en los bordes reordena. */
  const locate = (e: PointerEvent, id: string) => {
    const el = document.elementsFromPoint(e.clientX, e.clientY).map((n) => n.closest<HTMLElement>('.item[data-id]')).find((n) => n && n.dataset.id !== id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const onto = Math.abs(e.clientX - (r.left + r.width / 2)) < r.width * 0.3 && Math.abs(e.clientY - (r.top + r.height / 2)) < r.height * 0.3;
    return { id: el.dataset.id!, onto, after: e.clientX > r.left + r.width / 2 };
  };
  const dragProps = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.badge')) return;
      const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
      drag.current = { id, sx: e.clientX, sy: e.clientY, started: false, el };
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.started) { if (Math.hypot(dx, dy) < 8) return; d.started = true; setDragId(id); }
      d.el.style.transform = `translate(${dx}px,${dy}px)`;
      const t = locate(e, id); setTarget(t?.onto ? t.id : null);
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current; drag.current = null; if (!d) return;
      d.el.style.transform = '';
      if (d.started) {
        const t = locate(e, id);
        if (t) {
          const dragIsApp = lib.apps.some((a) => a.id === id);
          if (t.onto && dragIsApp) onLib(dropOnto(lib, id, t.id));
          else { const list = topLevel(lib); const i = list.findIndex((x) => x.id === t.id); onLib(reorder(lib, id, i + (t.after ? 1 : 0))); }
        }
      }
      setDragId(null); setTarget(null);
    },
    onPointerCancel: () => { if (drag.current) drag.current.el.style.transform = ''; drag.current = null; setDragId(null); setTarget(null); },
  });
  const tileProps = (id: string) => ({ id, cls: `${dragId === id ? 'dragging' : ''} ${targetId === id ? 'target' : ''}`, press: edit ? dragProps(id) : press });
  const confirmDel = (msg: string, fn: () => void) => { if (confirm(msg)) fn(); };
  const iconRect = (e: Event) => ((e.currentTarget as HTMLElement).querySelector('.icon') as HTMLElement | null)?.getBoundingClientRect();
  const tap = (fn: (rect?: DOMRect) => void) => (e: Event) => { if (!press.wasLong() && !edit) fn(iconRect(e)); };

  return (
    <div class={`screen ${edit ? 'editing' : ''}`} style={{ '--cols': cols, '--size': `${size}px`, transform: dim ? 'scale(.94)' : 'none', opacity: dim ? 0.5 : 1, transition: 'transform .42s cubic-bezier(.2,.8,.2,1), opacity .42s' }}>
      {searchMode === 'bar' ? (
        <div class="searchrow" style={{ paddingTop: 18 }}>
          <button class="searchbar" onClick={() => setSearch(true)}><Search size={20} strokeWidth={1.7} />Buscar en tu cajón</button>
          <button class="circle" style={{ width: 50, height: 50 }} onClick={onSettings} aria-label="Ajustes"><SlidersHorizontal size={21} strokeWidth={1.6} /></button>
        </div>
      ) : edit ? (
        <div class="searchrow" style={{ justifyContent: 'space-between', paddingTop: 18 }}>
          <button class="circle" style={{ width: 44, height: 44 }} onClick={onAdd} aria-label="Añadir app"><Plus size={21} strokeWidth={1.7} /></button>
          <button class="pill sm" onClick={() => setEdit(false)}>Listo</button>
        </div>
      ) : (
        <div class="header">
          <div class="date">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div class="greet">{greeting()}</div>
        </div>
      )}

      {searchMode === 'pull' && (
        <div class="pull" style={{ height: pull ? pull + 10 : 0 }}>
          <div class="searchbar" style={{ marginTop: 10, opacity: pull / 70 }}><Search size={20} strokeWidth={1.7} />{pull >= 50 ? 'Suelta para buscar' : 'Buscar'}</div>
        </div>
      )}

      {entries.length === 0 ? <EmptyState onAdd={onAdd} /> : (
        <div class="pages" ref={pagesRef} onScroll={(e) => { const el = e.currentTarget; setPage(Math.round(el.scrollLeft / el.clientWidth)); }}>
          {pages.map((p, i) => (
            <div class="page" key={i} {...touch}>
              <div class="grid">
                {p.map((en) => en.kind === 'app'
                  ? <AppTile key={en.app.id} {...tileProps(en.app.id)} app={en.app} edit={edit} onTap={tap((rect) => onOpenApp(en.app, rect))} onEdit={() => onEditApp(en.app)} onDelete={() => confirmDel(`¿Eliminar «${en.app.name}» y sus datos?`, () => onLib(removeApp(lib, en.app.id)))} />
                  : <FolderTile key={en.folder.id} {...tileProps(en.folder.id)} folder={en.folder} apps={folderApps(en.folder.id)} edit={edit} onTap={tap(() => setOpenFolder({ id: en.folder.id, rename: false }))} onEdit={() => setOpenFolder({ id: en.folder.id, rename: true })} onDelete={() => confirmDel(`¿Deshacer la carpeta «${en.folder.name}»? Las apps vuelven al inicio.`, () => onLib(removeFolder(lib, en.folder.id)))} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && <div class="hint">Arrastra para reordenar · suéltalo sobre otra app para crear una carpeta</div>}
      <div class="footer">
        {!edit && <button class="circle" onClick={onSettings} aria-label="Ajustes" style={searchMode === 'bar' ? { visibility: 'hidden' } : undefined}><SlidersHorizontal size={21} strokeWidth={1.6} /></button>}
        {pages.length > 1 && <div class="dots">{pages.map((_, i) => <span key={i} class={i === page ? 'on' : ''} />)}</div>}
        {!edit && entries.length > 0 && <button class="circle" onClick={onAdd} aria-label="Añadir app"><Plus size={21} strokeWidth={1.7} /></button>}
      </div>

      {openFolder && lib.folders.find((f) => f.id === openFolder.id) && <FolderSheet folder={lib.folders.find((f) => f.id === openFolder.id)!} startEditing={openFolder.rename} apps={folderApps(openFolder.id)} onRename={(n) => onLib(renameFolder(lib, openFolder.id, n))} onClose={() => setOpenFolder(null)} onOpenApp={(a, rect) => { setOpenFolder(null); onOpenApp(a, rect); }} />}
      {search && <SearchOverlay lib={lib} onClose={() => setSearch(false)} onOpenApp={(a, rect) => { setSearch(false); onOpenApp(a, rect); }} />}
    </div>
  );
}
