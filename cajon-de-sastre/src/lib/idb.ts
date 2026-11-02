// Caché local en IndexedDB (una base por vault). Guarda la biblioteca y los datos de cada app.
import type { Library } from './store';
import type { LocalStore } from './sync';

const open = (name: string) => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open(name, 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('appData'); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});

export async function openLocal(vault: string): Promise<LocalStore & { name: string }> {
  const name = `cajon-${vault.slice(0, 24)}`;
  const db = await open(name);
  const run = <T>(store: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) =>
    new Promise<T>((res, rej) => { const r = f(db.transaction(store, mode).objectStore(store)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return {
    name,
    getLibrary: async () => ((await run('kv', 'readonly', (s) => s.get('library'))) as Library | undefined) ?? null,
    putLibrary: async (l) => void (await run('kv', 'readwrite', (s) => s.put(l, 'library'))),
    getEntries: async (id) => (await run('appData', 'readonly', (s) => s.get(id))) as Record<string, string> | undefined,
    putEntries: async (id, e) => void (await run('appData', 'readwrite', (s) => s.put(e, id))),
    deleteEntries: async (id) => void (await run('appData', 'readwrite', (s) => s.delete(id))),
  };
}
export const deleteLocal = (name: string) => new Promise<void>((res) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => res(); });
