import { useRef, useState } from 'preact/hooks';
import { Check, Copy, Download, Eye, EyeOff, LogOut, Monitor, Moon, Sun, Upload, X } from 'lucide-preact';
import type { SyncStatus } from '../lib/sync';
import type { ThemePref } from '../hooks/useTheme';
import { maskCode } from '../lib/vault';

interface Props { theme: ThemePref; setTheme: (t: ThemePref) => void; searchMode: 'pull' | 'bar'; setSearchMode: (m: 'pull' | 'bar') => void; code: string; status: SyncStatus; lastSync: number | null; syncError: string | null; onExport: () => void; onImport: (f: File) => void; message: string | null; onLogout: () => void; onClose: () => void }

export function Settings({ theme, setTheme, searchMode, setSearchMode, code, status, lastSync, syncError, onExport, onImport, message, onLogout, onClose }: Props) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const shown = code.match(/.{1,4}/g)?.join('-') ?? code;
  const copy = async () => { await navigator.clipboard?.writeText(shown); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const file = useRef<HTMLInputElement>(null);
  const ago = lastSync ? Math.max(0, Math.round((Date.now() - lastSync) / 60000)) : 0;
  const st = {
    local: ['var(--muted)', 'Solo en este dispositivo'], syncing: ['var(--busy)', 'Sincronizando…'], offline: ['var(--muted)', 'Sin conexión · se enviará al volver'],
    error: ['var(--danger)', 'Error de sincronización'], synced: ['var(--ok)', ago < 1 ? 'Sincronizado · ahora' : `Sincronizado · hace ${ago} min`],
  }[status];
  const themes: [ThemePref, string, typeof Sun][] = [['light', 'Claro', Sun], ['dark', 'Oscuro', Moon], ['system', 'Sistema', Monitor]];
  return (
    <div class="screen" style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px 0' }}>
        <span style={{ fontSize: 28, fontWeight: 800 }}>Ajustes</span>
        <button class="circle" style={{ width: 40, height: 40 }} onClick={onClose} aria-label="Cerrar"><X size={19} strokeWidth={1.8} /></button>
      </div>
      <div class="settings" style={{ maxWidth: 560, width: '100%', margin: '0 auto' }}>
        <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span class="label">Tema</span>
          <div class="segment">{themes.map(([k, n, I]) => <button key={k} class={theme === k ? 'on' : ''} onClick={() => setTheme(k)}><I size={16} strokeWidth={1.8} />{n}</button>)}</div>
        </div>
        <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span class="label">Buscador</span>
          <div class="segment">
            <button class={searchMode === 'pull' ? 'on' : ''} onClick={() => setSearchMode('pull')}>Deslizar</button>
            <button class={searchMode === 'bar' ? 'on' : ''} onClick={() => setSearchMode('bar')}>Barra fija</button>
          </div>
        </div>
        <div class="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span class="label">Sincronización</span>
            <span class="status"><i style={{ background: st[0] }} />{st[1]}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, padding: '13px 16px', borderRadius: 18, background: 'var(--field)', fontSize: 15, fontWeight: 800, letterSpacing: '.06em', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', userSelect: 'text' }}>{show ? shown : maskCode(shown)}</div>
            <button class="circle" style={{ width: 44, height: 44, background: 'var(--field)', boxShadow: 'none' }} onClick={() => setShow(!show)} aria-label="Ver código">{show ? <EyeOff size={19} strokeWidth={1.7} /> : <Eye size={19} strokeWidth={1.7} />}</button>
            <button class="circle" style={{ width: 44, height: 44, background: 'var(--field)', boxShadow: 'none' }} onClick={copy} aria-label="Copiar código">{copied ? <Check size={19} strokeWidth={1.8} /> : <Copy size={19} strokeWidth={1.7} />}</button>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.45 }}>Usa este código en otro dispositivo para ver las mismas apps.</span>
          {syncError && <span class="error">{syncError}</span>}
        </div>
        <div class="card" style={{ padding: '6px 16px' }}>
          <button class="row" style={{ padding: '13px 0', fontSize: 15, fontWeight: 700 }} onClick={onExport}><Download size={20} strokeWidth={1.7} />Exportar copia de seguridad</button>
          <button class="row" style={{ padding: '13px 0', fontSize: 15, fontWeight: 700 }} onClick={() => file.current?.click()}><Upload size={20} strokeWidth={1.7} />Importar copia</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) onImport(f); }} />
          {message && <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', paddingBottom: 10, display: 'block' }}>{message}</span>}
        </div>
        <button class="card" style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--danger)', textAlign: 'left' }} onClick={onLogout}>
          <LogOut size={20} strokeWidth={1.7} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Cerrar vault en este dispositivo</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Tus apps siguen guardadas en la nube</span>
          </div>
        </button>
      </div>
    </div>
  );
}
