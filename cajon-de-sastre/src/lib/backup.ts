import { PASTELS, type AppItem, type Folder } from './types';
import { entriesBytes, MAX_BYTES, byteLength } from './limits';
import { tidy, type Library } from './store';

export interface Backup { format: 'cajon-de-sastre'; version: 1; exportedAt: number; apps: AppItem[]; folders: Folder[]; appData: Record<string, Record<string, string>> }

export const buildBackup = (lib: Library, appData: Record<string, Record<string, string>>): Backup =>
  ({ format: 'cajon-de-sastre', version: 1, exportedAt: Date.now(), apps: lib.apps, folders: lib.folders, appData });

const str = (v: unknown, what: string) => { if (typeof v !== 'string') throw new Error(`Copia no válida: ${what}`); return v; };
const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

/** Valida y sanea una copia: solo se conservan los campos conocidos. */
export function parseBackup(text: string): Backup {
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (!raw || raw.format !== 'cajon-de-sastre' || raw.version !== 1 || !Array.isArray(raw.apps) || !Array.isArray(raw.folders)) throw new Error('No parece una copia de Cajón de sastre.');
  const colors = PASTELS.map((p) => p.key as string);
  const apps = raw.apps.map((a: any): AppItem => {
    const html = a.html === undefined ? undefined : str(a.html, 'html');
    if (html !== undefined && byteLength(html) > MAX_BYTES) throw new Error(`«${a.name}» supera el límite de 1 MB.`);
    return { id: str(a.id, 'id'), name: str(a.name, 'nombre'), icon: str(a.icon, 'icono'), color: colors.includes(a.color) ? a.color : 'peach', html, adapt: !!a.adapt, folderId: typeof a.folderId === 'string' ? a.folderId : null, page: num(a.page), order: num(a.order), createdAt: num(a.createdAt, Date.now()) };
  });
  const folders = raw.folders.map((f: any): Folder => ({ id: str(f.id, 'id de carpeta'), name: str(f.name, 'nombre de carpeta'), page: num(f.page), order: num(f.order) }));
  const appData: Backup['appData'] = {};
  for (const [id, e] of Object.entries(raw.appData ?? {})) {
    if (!e || typeof e !== 'object') continue;
    const clean = Object.fromEntries(Object.entries(e as object).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
    if (entriesBytes(clean) > MAX_BYTES) throw new Error('Los datos de una app superan el límite de 1 MB.');
    appData[id] = clean;
  }
  return { format: 'cajon-de-sastre', version: 1, exportedAt: num(raw.exportedAt), apps, folders, appData };
}

/** Importar fusiona por id: lo que existe se sobrescribe, lo demás se conserva. */
export function mergeBackup(lib: Library, b: Backup): Library {
  const apps = [...lib.apps.filter((a) => !b.apps.some((x) => x.id === a.id)), ...b.apps];
  const folders = [...lib.folders.filter((f) => !b.folders.some((x) => x.id === f.id)), ...b.folders];
  return tidy({ apps, folders });
}
