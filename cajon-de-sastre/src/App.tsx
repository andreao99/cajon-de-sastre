import { useEffect, useRef, useState } from 'preact/hooks';
import { useTheme } from './hooks/useTheme';
import { clearStoredCode, getStoredCode, storeCode, vaultId } from './lib/vault';
import { addApp, addFolder, demoLibrary, removeApp, takeLegacy, updateApp, type Library } from './lib/store';
import type { AppItem } from './lib/types';
import { SyncEngine } from './lib/sync';
import { deleteLocal, openLocal } from './lib/idb';
import { createFirebaseRemote, wipeFirestoreCache } from './lib/firebase';
import { buildBackup, mergeBackup, parseBackup } from './lib/backup';
import { LockScreen } from './components/LockScreen';
import { Home } from './components/Home';
import { Settings } from './components/Settings';
import { AppForm } from './components/AppForm';
import { AppFrame } from './components/AppFrame';
import { SyncScreen } from './components/SyncScreen';

const readMode = (): 'pull' | 'bar' => { try { return localStorage.getItem('cajon:search') === 'bar' ? 'bar' : 'pull'; } catch { return 'pull'; } };

export function App() {
  const [theme, setTheme] = useTheme();
  const [code, setCode] = useState(getStoredCode);
  const [settings, setSettings] = useState(false);
  const [searchMode, setMode] = useState(readMode);
  const [form, setForm] = useState<{ app?: AppItem } | null>(null);
  const [running, setRunning] = useState<{ app: AppItem; initial: Record<string, string>; origin?: DOMRect } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  const [, tick] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const localName = useRef('');

  // Arranque del vault: caché local → suscripción a Firestore
  useEffect(() => {
    if (!code) return;
    let dead = false; let eng: SyncEngine | undefined; let off = () => {};
    (async () => {
      const id = await vaultId(code);
      const local = await openLocal(id); localName.current = local.name;
      eng = new SyncEngine(createFirebaseRemote(id), local);
      await eng.load();
      const legacy = takeLegacy();
      if (legacy && !eng.library.apps.length) { eng.saveLibrary(legacy.lib); for (const [k, v] of Object.entries(legacy.data)) eng.setEntries(k, v); }
      if (new URLSearchParams(location.search).has('demo') && eng.status === 'local' && !eng.library.apps.length) eng.saveLibrary(demoLibrary());
      if (dead) return;
      off = eng.onChange(() => tick((n) => n + 1));
      eng.start(); setEngine(eng);
    })();
    const t = setTimeout(() => setGaveUp(true), 8000); // sin conexión en el primer arranque: se entra igualmente
    const flush = () => { if (document.visibilityState === 'hidden') void eng?.flush(); };
    const on = () => eng?.setOnline(true), offl = () => eng?.setOnline(false);
    document.addEventListener('visibilitychange', flush); addEventListener('pagehide', flush); addEventListener('online', on); addEventListener('offline', offl);
    return () => { dead = true; clearTimeout(t); off(); eng?.stop(); document.removeEventListener('visibilitychange', flush); removeEventListener('pagehide', flush); removeEventListener('online', on); removeEventListener('offline', offl); };
  }, [code]);

  // Botón atrás del navegador cierra la app en ejecución
  useEffect(() => {
    if (!running) return;
    history.pushState({ cajon: 'app' }, '');
    // El botón atrás lo gestiona AppFrame (cierra con animación); aquí solo se limpia la entrada del historial
    return () => { if (history.state?.cajon === 'app') history.back(); };
  }, [running?.app.id]);

  if (!code) return <LockScreen onEnter={(c) => { storeCode(c); setCode(c); }} />;
  if (!engine || (!engine.synced && !engine.library.apps.length && !gaveUp)) return <SyncScreen />;

  const lib = engine.library;
  const update = (l: Library) => engine.saveLibrary(l);
  const save = (data: Parameters<typeof addApp>[1], folderId: string | null, newFolder?: string) => {
    let l = lib;
    if (newFolder) { const r = addFolder(l, newFolder); l = r.lib; folderId = r.id; }
    update(form?.app ? updateApp(l, form.app.id, { ...data, folderId }) : addApp(l, data, folderId));
    setForm(null);
  };
  const del = (a: AppItem) => { if (confirm(`¿Eliminar «${a.name}» y sus datos?`)) { update(removeApp(lib, a.id)); setForm(null); } };
  const open = async (a: AppItem, origin?: DOMRect) => { if (a.html && !running) setRunning({ app: a, initial: await engine.getEntries(a.id), origin }); };

  const exportAll = async () => {
    const data: Record<string, Record<string, string>> = {};
    for (const a of lib.apps) data[a.id] = await engine.getEntries(a.id);
    const url = URL.createObjectURL(new Blob([JSON.stringify(buildBackup(lib, data), null, 2)], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: `cajon-de-sastre-${new Date().toISOString().slice(0, 10)}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importFile = async (f: File) => {
    try {
      const b = parseBackup(await f.text());
      update(mergeBackup(lib, b));
      for (const [id, e] of Object.entries(b.appData)) engine.setEntries(id, e);
      setMessage(`Importadas ${b.apps.length} apps.`);
    } catch (e) { setMessage((e as Error).message); }
  };
  const logout = async () => {
    await engine.flush(); engine.stop();
    if (engine.status !== 'local') { await deleteLocal(localName.current); await wipeFirestoreCache(); } // los datos siguen en la nube
    clearStoredCode(); location.reload();
  };

  return (
    <>
      <Home lib={lib} onLib={update} searchMode={searchMode} onSettings={() => setSettings(true)}
        onAdd={() => setForm({})} onEditApp={(app) => setForm({ app })} onOpenApp={open} dim={!!running} />
      {form && <AppForm app={form.app} folders={lib.folders} onSave={save} onDelete={form.app ? () => del(form.app!) : undefined} onClose={() => setForm(null)} />}
      {running && <AppFrame app={running.app} initial={running.initial} origin={running.origin} onEntries={(e) => engine.setEntries(running.app.id, e)} onClose={() => { void engine.flush(); setRunning(null); }} />}
      {settings && <Settings theme={theme} setTheme={setTheme} searchMode={searchMode}
        setSearchMode={(m) => { setMode(m); localStorage.setItem('cajon:search', m); }}
        code={code} status={engine.status} lastSync={engine.lastSync} syncError={engine.error} message={message}
        onExport={exportAll} onImport={importFile} onClose={() => { setSettings(false); setMessage(null); }} onLogout={logout} />}
    </>
  );
}
