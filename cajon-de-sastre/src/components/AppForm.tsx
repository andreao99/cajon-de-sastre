import { useRef, useState } from 'preact/hooks';
import { Check, ClipboardPaste, FileUp, Trash2 } from 'lucide-preact';
import { ICONS } from '../lib/icons';
import { PASTELS, type AppItem, type Folder, type PastelName } from '../lib/types';
import { byteLength, formatKB, MAX_BYTES, sizeState } from '../lib/limits';
import { extractTitle } from '../lib/shim';
import type { NewApp } from '../lib/store';

interface Props {
  app?: AppItem; folders: Folder[];
  onSave: (data: NewApp, folderId: string | null, newFolderName?: string) => void;
  onDelete?: () => void; onClose: () => void;
}

export function AppForm({ app, folders, onSave, onDelete, onClose }: Props) {
  const edit = !!app;
  const [html, setHtml] = useState(app?.html ?? '');
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [name, setName] = useState(app?.name ?? '');
  const [touched, setTouched] = useState(edit);
  const [icon, setIcon] = useState(app?.icon ?? 'drop');
  const [color, setColor] = useState<PastelName>(app?.color ?? 'peach');
  const [folder, setFolder] = useState<string | null>(app?.folderId ?? null);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [adapt, setAdapt] = useState(app?.adapt ?? false);
  const [fit, setFit] = useState(app?.fit !== false);
  const [editHtml, setEditHtml] = useState(!edit);
  const file = useRef<HTMLInputElement>(null);

  const setCode = (code: string) => { setHtml(code); if (!touched) setName(extractTitle(code)); };
  const bytes = byteLength(html);
  const size = sizeState(bytes);
  const valid = html.trim().length > 0 && size !== 'over' && name.trim().length > 0 && (newFolder === null || newFolder.trim().length > 0);

  const pick = async (f?: File) => { if (f) { setCode(await f.text()); setEditHtml(true); setMode('paste'); } };
  const paste = async () => { try { setCode(await navigator.clipboard.readText()); } catch { /* sin permiso: se pega a mano */ } };
  const submit = () => valid && onSave({ name: name.trim(), icon, color, html, adapt, fit }, newFolder !== null ? null : folder, newFolder?.trim());

  return (
    <div class="overlay" style={{ justifyContent: 'flex-end', padding: 0 }} onClick={onClose}>
      <div class="sheet form" style={{ borderRadius: 'var(--r-sheet) var(--r-sheet) 0 0', alignItems: 'stretch', gap: 12, maxHeight: '94%', overflowY: 'auto', padding: '10px 22px calc(26px + env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 5, borderRadius: 99, background: 'var(--handle)', alignSelf: 'center' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 30 }}>
          <button style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', width: 70, textAlign: 'left' }} onClick={onClose}>Cancelar</button>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{edit ? 'Editar app' : 'Añadir app'}</span><span style={{ width: 70 }} />
        </div>

        {edit && !editHtml ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button class="chip" onClick={() => setEditHtml(true)}>Reemplazar código</button>
            <button class="chip" onClick={() => file.current?.click()}>Subir .html</button>
          </div>
        ) : (
          <>
            <div class="segment">
              <button class={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}><ClipboardPaste size={16} strokeWidth={1.8} />Pegar HTML</button>
              <button class={mode === 'file' ? 'on' : ''} onClick={() => { setMode('file'); file.current?.click(); }}><FileUp size={16} strokeWidth={1.8} />Subir .html</button>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea class="field mono" rows={4} placeholder={'<!doctype html>\n<html lang="es"><body>…'} value={html} onInput={(e) => setCode(e.currentTarget.value)} />
              {!html && <button class="chip" style={{ position: 'absolute', right: 10, bottom: 12, background: 'var(--sheet)' }} onClick={paste}>Pegar</button>}
            </div>
          </>
        )}
        <input ref={file} type="file" accept=".html,.htm,text/html" hidden onChange={(e) => pick(e.currentTarget.files?.[0])} />
        {html && size !== 'ok' && (
          <span class="error" style={size === 'warn' ? { color: 'var(--muted)' } : undefined}>
            {size === 'over'
              ? `El HTML pesa ${formatKB(bytes)} y supera el límite de ${formatKB(MAX_BYTES)} por documento (1 MB en Firestore). Quita imágenes en base64 o librerías incrustadas.`
              : `El HTML pesa ${formatKB(bytes)}: se acerca al límite de 1 MB por documento.`}
          </span>
        )}

        <label class="fl"><span class="label">Nombre</span>
          <input class="field" value={name} maxLength={40} placeholder="Rutina de noche" onInput={(e) => { setName(e.currentTarget.value); setTouched(true); }} /></label>

        <div class="fl"><span class="label">Icono</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6 }}>
            {Object.entries(ICONS).map(([k, I]) => (
              <button key={k} aria-label={k} onClick={() => setIcon(k)} style={{ height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: icon === k ? `var(--${color})` : 'var(--field)', color: icon === k ? `var(--${color}-ink)` : 'var(--text)', boxShadow: icon === k ? 'var(--shadow-sm)' : 'none' }}><I size={20} strokeWidth={1.6} /></button>
            ))}
          </div></div>

        <div class="fl"><span class="label">Color</span>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {PASTELS.map((p) => (
              <button key={p.key} aria-label={p.name} onClick={() => setColor(p.key)} style={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `var(--${p.key})`, color: `var(--${p.key}-ink)`, boxShadow: color === p.key ? '0 0 0 3px var(--sheet), 0 0 0 5px var(--accent)' : 'var(--shadow-sm)' }}>{color === p.key && <Check size={16} strokeWidth={2.4} />}</button>
            ))}
          </div></div>

        <div class="fl"><span class="label">Carpeta</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip on={newFolder === null && folder === null} onClick={() => { setFolder(null); setNewFolder(null); }}>Ninguna</Chip>
            {folders.map((f) => <Chip key={f.id} on={newFolder === null && folder === f.id} onClick={() => { setFolder(f.id); setNewFolder(null); }}>{f.name}</Chip>)}
            {newFolder === null
              ? <Chip on={false} onClick={() => setNewFolder('')}>+ Nueva</Chip>
              : <input class="field" style={{ width: 150, padding: '8px 14px', borderRadius: 99 }} autoFocus placeholder="Nombre" value={newFolder} maxLength={30} onInput={(e) => setNewFolder(e.currentTarget.value)} />}
          </div></div>

        <Toggle on={adapt} onClick={() => setAdapt(!adapt)} title="Adaptar estilo del cajón" sub="Aplica colores, fuente y formas a esta app" />
        <Toggle on={fit} onClick={() => setFit(!fit)} title="Ajustar al móvil" sub="Si la app se sale por los lados, la reduce para que quepa" />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <button class="pill" style={{ width: '100%', opacity: valid ? 1 : 0.5 }} disabled={!valid} onClick={submit}>{edit ? 'Guardar cambios' : 'Añadir app'}</button>
          {edit && <button style={{ display: 'flex', gap: 7, alignItems: 'center', color: 'var(--danger)', fontSize: 14, fontWeight: 800, padding: 4 }} onClick={onDelete}><Trash2 size={17} strokeWidth={1.7} />Eliminar app</button>}
        </div>
      </div>
    </div>
  );
}

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: preact.ComponentChildren }) => (
  <button class="chip" style={on ? { background: 'var(--accent)', color: 'var(--on-accent)' } : undefined} onClick={onClick}>{children}</button>
);

const Toggle = ({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) => (
  <button class="toggle-row" onClick={onClick}>
    <span style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
      <span style={{ fontSize: 14, fontWeight: 800 }}>{title}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{sub}</span>
    </span>
    <span class={`switch ${on ? 'on' : ''}`}><i /></span>
  </button>
);
