import { useEffect, useRef, useState } from 'preact/hooks';
import { Search } from 'lucide-preact';
import type { AppItem } from '../lib/types';
import type { Library } from '../lib/store';
import { AppGlyph, colors } from './Icons';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function SearchOverlay({ lib, onClose, onOpenApp }: { lib: Library; onClose: () => void; onOpenApp: (a: AppItem, rect?: DOMRect) => void }) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, []);
  const folderName = (a: AppItem) => lib.folders.find((f) => f.id === a.folderId)?.name;
  const hits = q.trim() ? lib.apps.filter((a) => norm(a.name).includes(norm(q.trim()))) : [];
  const recents = [...lib.apps].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);

  return (
    <div class="screen" style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 30, gap: 16 }}>
      <div class="searchrow" style={{ paddingTop: 18 }}>
        <label class="searchbar" style={{ color: 'var(--text)' }}>
          <Search size={20} strokeWidth={1.7} />
          <input ref={input} value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="Buscar" />
        </label>
        <button style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)' }} onClick={onClose}>Cancelar</button>
      </div>
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        {q.trim() ? (
          <>
            <span class="label" style={{ paddingLeft: 6 }}>{hits.length === 1 ? '1 resultado' : `${hits.length} resultados`}</span>
            {hits.length > 0 && <div class="card results" style={{ padding: '6px 0' }}>{hits.map((a) => <Row key={a.id} a={a} where={folderName(a)} onOpen={onOpenApp} />)}</div>}
          </>
        ) : (
          <>
            <span class="label" style={{ paddingLeft: 6 }}>Recientes</span>
            <div class="card results" style={{ padding: '6px 0' }}>{recents.map((a) => <Row key={a.id} a={a} where={folderName(a)} onOpen={onOpenApp} />)}</div>
          </>
        )}
      </div>
    </div>
  );
}

const Row = ({ a, where, onOpen }: { a: AppItem; where?: string; onOpen: (a: AppItem, rect?: DOMRect) => void }) => (
  <button class="row" onClick={(e) => onOpen(a, (e.currentTarget as HTMLElement).querySelector('.ico')?.getBoundingClientRect())}>
    <div class="ico" style={colors(a.color)}><AppGlyph app={a} size={46} /></div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{a.name}</span>
      {where && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{where}</span>}
    </div>
  </button>
);
