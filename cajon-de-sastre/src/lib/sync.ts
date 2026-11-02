// Motor de sincronización «local primero». No importa Firebase: habla con un `Remote` y un `LocalStore`
// inyectados, de modo que se puede probar con implementaciones en memoria.
import type { AppItem, Folder } from './types';
import type { Library } from './store';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';
export interface RemoteDoc { id: string; data: Record<string, any> }
export interface SnapshotMeta { fromCache: boolean; hasPendingWrites: boolean }
export interface Remote {
  subscribe(h: {
    apps: (d: RemoteDoc[], m: SnapshotMeta) => void; folders: (d: RemoteDoc[], m: SnapshotMeta) => void;
    appData: (d: RemoteDoc[], m: SnapshotMeta) => void; error: (e: Error) => void;
  }): () => void;
  setApp(id: string, data: object): Promise<void>; deleteApp(id: string): Promise<void>;
  setFolder(id: string, data: object): Promise<void>; deleteFolder(id: string): Promise<void>;
  setEntries(id: string, entries: Record<string, string>): Promise<void>; deleteEntries(id: string): Promise<void>;
}
export interface LocalStore {
  getLibrary(): Promise<Library | null>; putLibrary(l: Library): Promise<void>;
  getEntries(id: string): Promise<Record<string, string> | undefined>;
  putEntries(id: string, e: Record<string, string>): Promise<void>; deleteEntries(id: string): Promise<void>;
}

const empty = (): Library => ({ apps: [], folders: [] });
const isEmpty = (l: Library) => !l.apps.length && !l.folders.length;
/** Campos que viajan a Firestore (sin undefined, que Firestore rechaza). */
export const appDoc = (a: AppItem) => ({ name: a.name, icon: a.icon, color: a.color, html: a.html ?? '', adapt: !!a.adapt, folderId: a.folderId ?? null, page: a.page ?? 0, order: a.order, createdAt: a.createdAt });
export const folderDoc = (f: Folder) => ({ name: f.name, page: f.page ?? 0, order: f.order });
const toApp = ({ id, data: d }: RemoteDoc): AppItem => ({ id, name: String(d.name ?? ''), icon: String(d.icon ?? ''), color: d.color, html: d.html || undefined, adapt: !!d.adapt, folderId: d.folderId ?? null, page: d.page ?? 0, order: d.order ?? 0, createdAt: d.createdAt ?? 0 });
const toFolder = ({ id, data: d }: RemoteDoc): Folder => ({ id, name: String(d.name ?? ''), page: d.page ?? 0, order: d.order ?? 0 });

export class SyncEngine {
  library: Library = empty();
  status: SyncStatus;
  lastSync: number | null = null;
  /** true cuando ya llegó al menos una respuesta del servidor (o no hay nube) */
  synced: boolean;
  error: string | null = null;

  private listeners = new Set<() => void>();
  private dirty = new Map<string, Record<string, string>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private rApps: AppItem[] | null = null; private rFolders: Folder[] | null = null;
  private serverApps = false; private serverFolders = false; private seeded = false;
  private pending = false; private fromCache = true; private online = true;
  private unsub?: () => void;

  constructor(private remote: Remote | null, private local: LocalStore, private debounceMs = 1500) {
    this.status = remote ? 'syncing' : 'local';
    this.synced = !remote;
  }

  async load(): Promise<Library> { this.library = (await this.local.getLibrary()) ?? empty(); return this.library; }
  onChange(cb: () => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private emit() { this.listeners.forEach((f) => f()); }

  start() {
    if (!this.remote) return;
    this.unsub = this.remote.subscribe({
      apps: (d, m) => this.onApps(d, m), folders: (d, m) => this.onFolders(d, m),
      appData: (d) => this.onAppData(d),
      error: (e) => { this.status = 'error'; this.error = e.message; this.emit(); },
    });
  }
  stop() { this.unsub?.(); this.unsub = undefined; }

  setOnline(on: boolean) { this.online = on; this.refresh(); }

  private skipEmptyCache(d: RemoteDoc[], m: SnapshotMeta) { return d.length === 0 && m.fromCache && !m.hasPendingWrites && !isEmpty(this.library); }
  private onApps(d: RemoteDoc[], m: SnapshotMeta) {
    this.track(m);
    if (this.skipEmptyCache(d, m)) return;
    this.rApps = d.map(toApp); if (!m.fromCache) this.serverApps = true; this.recompute();
  }
  private onFolders(d: RemoteDoc[], m: SnapshotMeta) {
    this.track(m);
    if (this.skipEmptyCache(d, m)) return;
    this.rFolders = d.map(toFolder); if (!m.fromCache) this.serverFolders = true; this.recompute();
  }
  private onAppData(d: RemoteDoc[]) {
    for (const { id, data } of d) {
      if (this.dirty.has(id)) continue; // los cambios locales aún no enviados mandan
      const entries = data.entries && typeof data.entries === 'object' ? (data.entries as Record<string, string>) : {};
      void this.local.putEntries(id, entries);
    }
  }
  private track(m: SnapshotMeta) { this.pending = m.hasPendingWrites; this.fromCache = m.fromCache; this.refresh(); }

  private recompute() {
    if (!this.rApps || !this.rFolders) return;
    if (this.serverApps && this.serverFolders && !this.seeded) {
      this.seeded = true; this.synced = true;
      // Vault nuevo en la nube con datos locales (migración o primer uso): se suben
      if (isEmpty({ apps: this.rApps, folders: this.rFolders }) && !isEmpty(this.library)) { this.pushAll(this.library); this.refresh(); return; }
    }
    if (!this.synced) return; // aún no hay respuesta del servidor: se sigue mostrando lo local
    const next = { apps: this.rApps, folders: this.rFolders };
    for (const a of this.library.apps) if (!next.apps.some((x) => x.id === a.id)) void this.local.deleteEntries(a.id);
    this.library = next;
    void this.local.putLibrary(next);
    this.refresh();
  }

  private refresh() {
    if (!this.remote) this.status = 'local';
    else if (this.error) this.status = 'error';
    else if (this.pending || this.timers.size) this.status = 'syncing';
    else if (this.fromCache) this.status = this.online ? 'syncing' : 'offline';
    else { this.status = 'synced'; this.lastSync = Date.now(); }
    this.emit();
  }

  private fail = (e: Error) => { this.error = e.message; this.refresh(); };
  private pushAll(l: Library) {
    l.apps.forEach((a) => this.remote!.setApp(a.id, appDoc(a)).catch(this.fail));
    l.folders.forEach((f) => this.remote!.setFolder(f.id, folderDoc(f)).catch(this.fail));
  }

  /** Guarda la biblioteca: local al instante y solo los documentos que cambian hacia la nube. */
  saveLibrary(next: Library) {
    const prev = this.library; this.library = next;
    void this.local.putLibrary(next);
    if (this.remote) {
      const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);
      for (const a of next.apps) { const o = prev.apps.find((x) => x.id === a.id); if (!o || !same(appDoc(o), appDoc(a))) this.remote.setApp(a.id, appDoc(a)).catch(this.fail); }
      for (const f of next.folders) { const o = prev.folders.find((x) => x.id === f.id); if (!o || !same(folderDoc(o), folderDoc(f))) this.remote.setFolder(f.id, folderDoc(f)).catch(this.fail); }
      for (const f of prev.folders) if (!next.folders.some((x) => x.id === f.id)) this.remote.deleteFolder(f.id).catch(this.fail);
    }
    for (const a of prev.apps) if (!next.apps.some((x) => x.id === a.id)) this.removeEntries(a.id);
    this.refresh();
  }

  private removeEntries(id: string) {
    clearTimeout(this.timers.get(id)); this.timers.delete(id); this.dirty.delete(id);
    void this.local.deleteEntries(id);
    this.remote?.deleteApp(id).catch(this.fail);
    this.remote?.deleteEntries(id).catch(this.fail);
  }

  async getEntries(id: string): Promise<Record<string, string>> { return { ...(this.dirty.get(id) ?? (await this.local.getEntries(id)) ?? {}) }; }

  /** localStorage de una app: caché local inmediata + envío a Firestore con debounce. */
  setEntries(id: string, entries: Record<string, string>) {
    void this.local.putEntries(id, entries);
    if (!this.remote) return;
    this.dirty.set(id, entries);
    clearTimeout(this.timers.get(id));
    this.timers.set(id, setTimeout(() => void this.sendEntries(id), this.debounceMs));
    this.refresh();
  }
  private async sendEntries(id: string) {
    const e = this.dirty.get(id); this.timers.delete(id);
    if (!e) return;
    try { await this.remote!.setEntries(id, e); this.dirty.delete(id); } catch (err) { this.fail(err as Error); }
    this.refresh();
  }
  /** Envía ya los cambios pendientes (al cerrar la pestaña o la app). */
  async flush() { await Promise.all([...this.timers.keys()].map((id) => { clearTimeout(this.timers.get(id)); return this.sendEntries(id); })); }
}
