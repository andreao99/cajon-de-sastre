import { useState } from 'preact/hooks';
import { Check, Pencil } from 'lucide-preact';
import type { AppItem, Folder } from '../lib/types';
import { AppTile } from './Icons';

interface Props { folder: Folder; apps: AppItem[]; startEditing?: boolean; onRename: (name: string) => void; onClose: () => void; onOpenApp: (a: AppItem, rect?: DOMRect) => void }

export function FolderSheet({ folder, apps, startEditing, onRename, onClose, onOpenApp }: Props) {
  const [editing, setEditing] = useState(!!startEditing);
  const [name, setName] = useState(folder.name);
  const done = () => { const n = name.trim(); if (n) onRename(n); setEditing(false); };
  return (
    <div class="overlay" onClick={onClose}>
      <div class="sheet" style={{ '--cols': 3, '--size': '72px' }} onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <form style={{ display: 'flex', gap: 8, alignItems: 'center' }} onSubmit={(e) => { e.preventDefault(); done(); }}>
            <input class="field" style={{ textAlign: 'center', fontSize: 20, fontWeight: 800 }} value={name} autoFocus maxLength={30} onInput={(e) => setName(e.currentTarget.value)} />
            <button class="circle" style={{ width: 40, height: 40, flex: 'none' }} type="submit" aria-label="Guardar"><Check size={18} strokeWidth={2} /></button>
          </form>
        ) : (
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setEditing(true)}>{folder.name}<Pencil size={16} strokeWidth={1.8} color="var(--muted)" /></h2>
        )}
        <div class="grid" style={{ width: '100%', gap: 22 }}>
          {apps.map((a) => <AppTile key={a.id} app={a} edit={false} press={{}} onTap={(e) => onOpenApp(a, ((e.currentTarget as HTMLElement).querySelector('.icon') as HTMLElement).getBoundingClientRect())} />)}
        </div>
      </div>
    </div>
  );
}
