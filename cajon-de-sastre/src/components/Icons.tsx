import type { AppItem, Folder } from '../lib/types';
import { getIcon } from '../lib/icons';
import { FolderOutput, Minus, Pencil } from 'lucide-preact';

const colors = (c: string) => ({ background: `var(--${c})`, color: `var(--${c}-ink)` });

export function AppGlyph({ app, size }: { app: AppItem; size: number }) {
  const I = getIcon(app.icon);
  return <I size={Math.round(size * 0.47)} strokeWidth={1.6} />;
}

interface Props { id?: string; cls?: string; edit: boolean; onTap: (e: Event) => void; press: Record<string, unknown>; onDelete?: () => void; onEdit?: () => void; /** el botón izquierdo saca de la carpeta en vez de borrar */ out?: boolean }

export function AppTile({ id, cls, app, edit, onTap, press, onDelete, onEdit, out }: Props & { app: AppItem }) {
  return (
    <button class={`item ${cls ?? ''}`} data-id={id} onClick={onTap} {...press}>
      <div class="icon" style={colors(app.color)}>
        <AppGlyph app={app} size={64} />
        {edit && <Badges onDelete={onDelete} onEdit={onEdit} out={out} />}
      </div>
      <span class="name">{app.name}</span>
    </button>
  );
}

export function FolderTile({ id, cls, folder, apps, edit, onTap, press, onDelete, onEdit }: Props & { folder: Folder; apps: AppItem[] }) {
  return (
    <button class={`item ${cls ?? ''}`} data-id={id} onClick={onTap} {...press}>
      <div class="icon folder">
        <div class="minis">
          {apps.slice(0, 4).map((a) => (
            <div key={a.id} style={colors(a.color)}><AppGlyph app={a} size={34} /></div>
          ))}
        </div>
        {edit && <Badges onDelete={onDelete} onEdit={onEdit} />}
      </div>
      <span class="name">{folder.name}</span>
    </button>
  );
}

const Badges = ({ onDelete, onEdit, out }: { onDelete?: () => void; onEdit?: () => void; out?: boolean }) => (
  <>
    <span class="badge l" role="button" aria-label={out ? 'Sacar de la carpeta' : 'Eliminar'} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete?.(); }}>{out ? <FolderOutput size={13} strokeWidth={2.2} /> : <Minus size={14} strokeWidth={2.4} />}</span>
    <span class="badge r" role="button" aria-label="Editar" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit?.(); }}><Pencil size={12} strokeWidth={2.2} /></span>
  </>
);

export { colors };
