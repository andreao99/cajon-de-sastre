import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncEngine, type LocalStore, type Remote, type RemoteDoc, type SnapshotMeta } from '../src/lib/sync';
import { addApp, type Library } from '../src/lib/store';
import { buildBackup, mergeBackup, parseBackup } from '../src/lib/backup';

const memLocal = (): LocalStore & { lib: Library | null; data: Map<string, Record<string, string>> } => {
  const s = { lib: null as Library | null, data: new Map<string, Record<string, string>>() };
  return { ...s, get lib() { return s.lib; }, set lib(v) { s.lib = v; }, get data() { return s.data; },
    getLibrary: async () => s.lib, putLibrary: async (l) => void (s.lib = l),
    getEntries: async (id) => s.data.get(id), putEntries: async (id, e) => void s.data.set(id, e), deleteEntries: async (id) => void s.data.delete(id) };
};
function fakeRemote() {
  let h: Parameters<Remote['subscribe']>[0];
  const calls: string[] = []; const entries: Record<string, Record<string, string>> = {};
  const r: Remote = {
    subscribe: (handlers) => { h = handlers; return () => {}; },
    setApp: async (id) => void calls.push(`setApp:${id}`), deleteApp: async (id) => void calls.push(`deleteApp:${id}`),
    setFolder: async (id) => void calls.push(`setFolder:${id}`), deleteFolder: async (id) => void calls.push(`deleteFolder:${id}`),
    setEntries: async (id, e) => void ((entries[id] = e), calls.push(`setEntries:${id}`)), deleteEntries: async (id) => void calls.push(`deleteEntries:${id}`),
  };
  const server: SnapshotMeta = { fromCache: false, hasPendingWrites: false };
  return { r, calls, entries, apps: (d: RemoteDoc[], m = server) => h.apps(d, m), folders: (d: RemoteDoc[], m = server) => h.folders(d, m), appData: (d: RemoteDoc[]) => h.appData(d, server), error: (e: Error) => h.error(e) };
}
const a = (name: string) => addApp({ apps: [], folders: [] }, { name, icon: 'drop', color: 'rose', html: '<p>x</p>' }, null);

describe('SyncEngine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sin nube funciona en local', async () => {
    const eng = new SyncEngine(null, memLocal());
    await eng.load(); eng.saveLibrary(a('A'));
    expect(eng.status).toBe('local'); expect(eng.synced).toBe(true);
  });

  it('solo sube los documentos que cambian', async () => {
    const f = fakeRemote(); const eng = new SyncEngine(f.r, memLocal());
    await eng.load(); eng.start();
    const l1 = a('A'); eng.saveLibrary(l1);
    expect(f.calls).toEqual([`setApp:${l1.apps[0].id}`]);
    eng.saveLibrary(l1); // sin cambios
    expect(f.calls).toHaveLength(1);
    eng.saveLibrary({ apps: [], folders: [] });
    expect(f.calls.slice(1)).toEqual([`deleteApp:${l1.apps[0].id}`, `deleteEntries:${l1.apps[0].id}`]);
  });

  it('agrupa con debounce los cambios de localStorage de una app', async () => {
    const f = fakeRemote(); const local = memLocal(); const eng = new SyncEngine(f.r, local, 1000);
    await eng.load(); eng.start();
    eng.setEntries('x', { a: '1' }); eng.setEntries('x', { a: '1', b: '2' });
    expect(local.data.get('x')).toEqual({ a: '1', b: '2' }); // caché local inmediata
    expect(f.calls).toEqual([]); expect(eng.status).toBe('syncing');
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.calls).toEqual(['setEntries:x']); expect(f.entries.x).toEqual({ a: '1', b: '2' });
  });

  it('flush envía lo pendiente sin esperar', async () => {
    const f = fakeRemote(); const eng = new SyncEngine(f.r, memLocal(), 60000);
    await eng.load(); eng.start(); eng.setEntries('x', { a: '1' }); await eng.flush();
    expect(f.calls).toEqual(['setEntries:x']);
  });

  it('aplica la biblioteca remota y refleja datos de otros dispositivos', async () => {
    const f = fakeRemote(); const local = memLocal(); const eng = new SyncEngine(f.r, local);
    await eng.load(); eng.start();
    f.apps([{ id: 'r1', data: { name: 'Remota', icon: 'sun', color: 'sky', html: '<b/>', order: 0, createdAt: 1 } }]);
    f.folders([]); f.appData([{ id: 'r1', data: { entries: { k: 'v' } } }]);
    expect(eng.synced).toBe(true); expect(eng.library.apps.map((x) => x.name)).toEqual(['Remota']);
    expect(await eng.getEntries('r1')).toEqual({ k: 'v' });
    expect(eng.status).toBe('synced');
  });

  it('un dato remoto no pisa cambios locales aún sin enviar', async () => {
    const f = fakeRemote(); const eng = new SyncEngine(f.r, memLocal(), 5000);
    await eng.load(); eng.start(); eng.setEntries('r1', { k: 'local' });
    f.appData([{ id: 'r1', data: { entries: { k: 'remoto' } } }]);
    expect(await eng.getEntries('r1')).toEqual({ k: 'local' });
  });

  it('sube los datos locales a un vault nuevo y vacío', async () => {
    const f = fakeRemote(); const local = memLocal(); const l = a('Local'); local.lib = l;
    const eng = new SyncEngine(f.r, local); await eng.load(); eng.start();
    f.apps([]); f.folders([]);
    expect(f.calls).toEqual([`setApp:${l.apps[0].id}`]); expect(eng.library.apps).toHaveLength(1);
  });

  it('ignora una caché vacía mientras espera al servidor', async () => {
    const f = fakeRemote(); const local = memLocal(); local.lib = a('Local');
    const eng = new SyncEngine(f.r, local); await eng.load(); eng.start();
    const cache = { fromCache: true, hasPendingWrites: false };
    f.apps([], cache); f.folders([], cache);
    expect(eng.library.apps).toHaveLength(1); expect(eng.synced).toBe(false);
  });

  it('estado sin conexión y errores', async () => {
    const f = fakeRemote(); const eng = new SyncEngine(f.r, memLocal());
    await eng.load(); eng.start(); eng.setOnline(false);
    f.apps([], { fromCache: true, hasPendingWrites: false });
    expect(eng.status).toBe('offline');
    f.error(new Error('permission-denied'));
    expect(eng.status).toBe('error');
  });
});

describe('copias de seguridad', () => {
  it('ida y vuelta + fusión por id', () => {
    const l = a('A'); const b = parseBackup(JSON.stringify(buildBackup(l, { [l.apps[0].id]: { k: 'v' } })));
    expect(b.apps[0].name).toBe('A'); expect(b.appData[l.apps[0].id]).toEqual({ k: 'v' });
    const merged = mergeBackup(addApp(l, { name: 'B', icon: 'sun', color: 'sky', html: '<i/>' }, null), b);
    expect(merged.apps.map((x) => x.name).sort()).toEqual(['A', 'B']);
  });
  it('rechaza archivos que no son copias', () => {
    expect(() => parseBackup('no json')).toThrow();
    expect(() => parseBackup('{"format":"otro"}')).toThrow(/Cajón/);
  });
  it('rechaza HTML de más de 1 MB', () => {
    const l = a('A'); l.apps[0].html = 'x'.repeat(1_100_000);
    expect(() => parseBackup(JSON.stringify(buildBackup(l, {})))).toThrow(/1 MB/);
  });
});
