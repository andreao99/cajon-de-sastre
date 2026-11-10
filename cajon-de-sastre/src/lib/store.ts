// Almacén local de la fase 1. En la fase 3 se sustituye por Firestore + caché IndexedDB.
import type { AppItem, Folder, PastelName } from './types';

export interface Library { apps: AppItem[]; folders: Folder[] }
const KEY = 'cajon:library';


/** Datos de muestra del diseño; se cargan con ?demo en la URL. */
export function demoLibrary(): Library {
  const f = (id: string, name: string, order: number): Folder => ({ id, name, page: 0, order });
  const a = (name: string, icon: string, color: PastelName, order: number, folderId: string | null = null): AppItem =>
    ({ id: `${name}-${order}`.toLowerCase(), name, icon, color, folderId, page: 0, order, createdAt: order });
  return {
    folders: [f('bienestar', 'Bienestar', 4), f('cocina', 'Cocina', 8)],
    apps: [
      a('Skincare', 'drop', 'rose', 0), a('Gym', 'dumbbell', 'sage', 1), a('Horario', 'cal', 'sky', 2), a('Recetas', 'utensils', 'peach', 3),
      a('Lectura', 'book', 'lav', 5), a('Gastos', 'coins', 'butter', 6), a('Tareas', 'list', 'clay', 7),
      a('Música', 'music', 'lav', 9), a('Pomodoro', 'timer', 'peach', 10), a('Plantas', 'leaf', 'sage', 11), a('Hábitos', 'heart', 'rose', 12), a('Sueño', 'moon', 'sky', 13),
      a('Meditar', 'sun', 'mint', 20, 'bienestar'), a('Café', 'coffee', 'clay', 21, 'cocina'),
    ],
  };
}

// ---------- Operaciones puras sobre la biblioteca ----------
export type NewApp = Pick<AppItem, 'name' | 'icon' | 'color' | 'html' | 'adapt' | 'fit'>;
export const uid = () => crypto.randomUUID();

export type Entry = { kind: 'app'; id: string; order: number } | { kind: 'folder'; id: string; order: number };
export const topLevel = (lib: Library): Entry[] => [
  ...lib.apps.filter((a) => !a.folderId).map((a): Entry => ({ kind: 'app', id: a.id, order: a.order })),
  ...lib.folders.map((f): Entry => ({ kind: 'folder', id: f.id, order: f.order })),
].sort((a, b) => a.order - b.order);

/** Reasigna order 0..n al nivel superior y borra carpetas sin apps. */
export function tidy(lib: Library): Library {
  const folders = lib.folders.filter((f) => lib.apps.some((a) => a.folderId === f.id));
  const base = { apps: lib.apps, folders };
  const pos = new Map(topLevel(base).map((e, i) => [e.id, i]));
  const inside = new Map<string, number>();
  for (const f of folders) lib.apps.filter((a) => a.folderId === f.id).sort((a, b) => a.order - b.order).forEach((a, i) => inside.set(a.id, i));
  return {
    folders: folders.map((f) => ({ ...f, order: pos.get(f.id)! })),
    apps: lib.apps.map((a) => ({ ...a, order: a.folderId ? inside.get(a.id)! : pos.get(a.id)! })),
  };
}

const nextOrder = (lib: Library) => topLevel(lib).length;

export function addApp(lib: Library, data: NewApp, folderId: string | null): Library {
  const app: AppItem = { ...data, id: uid(), folderId, page: 0, order: folderId ? lib.apps.filter((a) => a.folderId === folderId).length : nextOrder(lib), createdAt: Date.now() };
  return tidy({ ...lib, apps: [...lib.apps, app] });
}
export const updateApp = (lib: Library, id: string, patch: Partial<AppItem>): Library =>
  tidy({ ...lib, apps: lib.apps.map((a) => (a.id === id ? { ...a, ...patch, order: patch.folderId !== undefined && patch.folderId !== a.folderId ? 1e9 : a.order } : a)) });
export const removeApp = (lib: Library, id: string): Library => tidy({ ...lib, apps: lib.apps.filter((a) => a.id !== id) });
export const addFolder = (lib: Library, name: string): { lib: Library; id: string } => {
  const id = uid();
  return { id, lib: { ...lib, folders: [...lib.folders, { id, name, page: 0, order: nextOrder(lib) }] } };
};
export const renameFolder = (lib: Library, id: string, name: string): Library => ({ ...lib, folders: lib.folders.map((f) => (f.id === id ? { ...f, name } : f)) });
/** Borra la carpeta y devuelve sus apps al nivel superior. */
export const removeFolder = (lib: Library, id: string): Library =>
  tidy({ folders: lib.folders.filter((f) => f.id !== id), apps: lib.apps.map((a) => (a.folderId === id ? { ...a, folderId: null, order: 1e9 } : a)) });

/** Mueve una entrada del nivel superior para que quede en el índice `to` (índice previo a la retirada). */
export function reorder(lib: Library, id: string, to: number): Library {
  const list = topLevel(lib); const from = list.findIndex((e) => e.id === id);
  if (from < 0) return lib;
  const [moved] = list.splice(from, 1); list.splice(to > from ? to - 1 : to, 0, moved);
  const pos = new Map(list.map((e, i) => [e.id, i]));
  return tidy({ folders: lib.folders.map((f) => ({ ...f, order: pos.get(f.id) ?? f.order })), apps: lib.apps.map((a) => (pos.has(a.id) && !a.folderId ? { ...a, order: pos.get(a.id)! } : a)) });
}

/** Mueve una app dentro de su carpeta al índice `to` (índice previo a la retirada). */
export function reorderInFolder(lib: Library, id: string, to: number): Library {
  const app = lib.apps.find((a) => a.id === id); if (!app?.folderId) return lib;
  const list = lib.apps.filter((a) => a.folderId === app.folderId).sort((a, b) => a.order - b.order);
  const from = list.findIndex((a) => a.id === id);
  const [moved] = list.splice(from, 1); list.splice(to > from ? to - 1 : to, 0, moved);
  const pos = new Map(list.map((a, i) => [a.id, i]));
  return tidy({ ...lib, apps: lib.apps.map((a) => (pos.has(a.id) ? { ...a, order: pos.get(a.id)! } : a)) });
}

/** Suelta una app sobre otra entrada: sobre una carpeta entra en ella; sobre otra app crea una carpeta nueva. */
export function dropOnto(lib: Library, dragId: string, targetId: string): Library {
  if (dragId === targetId || !lib.apps.some((a) => a.id === dragId)) return lib;
  const folder = lib.folders.find((f) => f.id === targetId);
  if (folder) return updateApp(lib, dragId, { folderId: folder.id });
  const target = lib.apps.find((a) => a.id === targetId);
  if (!target) return lib;
  const { lib: l2, id } = addFolder(lib, 'Carpeta');
  const pos = target.order;
  const l3 = { ...l2, folders: l2.folders.map((f) => (f.id === id ? { ...f, order: pos - 0.5 } : f)) };
  return updateApp(updateApp(l3, targetId, { folderId: id }), dragId, { folderId: id });
}

// Migración de las fases 1-2 (localStorage) → caché local del motor de sincronización
export function takeLegacy(): { lib: Library; data: Record<string, Record<string, string>> } | null {
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return null;
    const lib = JSON.parse(raw) as Library; const data: Record<string, Record<string, string>> = {};
    for (const a of lib.apps) { const e = localStorage.getItem(`cajon:data:${a.id}`); if (e) { data[a.id] = JSON.parse(e); localStorage.removeItem(`cajon:data:${a.id}`); } }
    localStorage.removeItem(KEY);
    return { lib, data };
  } catch { return null; }
}
