import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, setDoc, deleteDoc,
  terminate, clearIndexedDbPersistence, type Firestore,
} from 'firebase/firestore';
import type { Remote, RemoteDoc, SnapshotMeta } from './sync';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID,
};
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let db: Firestore | null = null;
function getDb(): Firestore {
  if (db) return db;
  const app = initializeApp(config);
  // App Check (opcional): requiere clave pública reCAPTCHA v3 y activar la aplicación en la consola
  if (env.VITE_APPCHECK_SITE_KEY) {
    if (env.DEV) (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(env.VITE_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
  // Persistencia offline (IndexedDB) compartida entre pestañas
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  return db;
}

export function createFirebaseRemote(vault: string): Remote | null {
  if (!firebaseConfigured) return null;
  const d = getDb();
  const col = (n: string) => collection(d, 'vaults', vault, n);
  const ref = (n: string, id: string) => doc(d, 'vaults', vault, n, id);
  const watch = (n: string, cb: (docs: RemoteDoc[], m: SnapshotMeta) => void, err: (e: Error) => void) =>
    onSnapshot(col(n), { includeMetadataChanges: true }, (s) =>
      cb(s.docs.map((x) => ({ id: x.id, data: x.data() })), { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites }), err);
  return {
    subscribe: (h) => {
      const u = [watch('apps', h.apps, h.error), watch('folders', h.folders, h.error), watch('appData', h.appData, h.error)];
      return () => u.forEach((f) => f());
    },
    setApp: (id, data) => setDoc(ref('apps', id), data),
    deleteApp: (id) => deleteDoc(ref('apps', id)),
    setFolder: (id, data) => setDoc(ref('folders', id), data),
    deleteFolder: (id) => deleteDoc(ref('folders', id)),
    setEntries: (id, entries) => setDoc(ref('appData', id), { entries }),
    deleteEntries: (id) => deleteDoc(ref('appData', id)),
  };
}

/** Al cerrar el vault en un dispositivo: borra también la caché offline de Firestore. */
export async function wipeFirestoreCache() {
  if (!db) return;
  try { await terminate(db); await clearIndexedDbPersistence(db); } catch { /* ya cerrada */ }
  db = null;
}
