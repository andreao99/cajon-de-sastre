import { Check, Cloud } from 'lucide-preact';

export function SyncScreen() {
  const steps = [['Código verificado', true], ['Descargando tus apps', false], ['Preparando iconos', false]] as const;
  return (
    <div class="screen center" style={{ justifyContent: 'center', paddingBottom: 60 }}>
      <div style={{ position: 'relative', width: 104, height: 104, display: 'grid', placeItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '5px solid var(--field)', borderTopColor: 'var(--busy)', animation: 'spin 1.2s linear infinite' }} />
        <div class="icon" style={{ '--size': '70px', borderRadius: '26%', background: 'var(--sky)', color: 'var(--sky-ink)', boxShadow: 'none' }}><Cloud size={34} strokeWidth={1.5} /></div>
      </div>
      <h1 style={{ fontSize: 26, marginTop: 6 }}>Sincronizando…</h1>
      <p>Trayendo tu cajón desde la nube</p>
      <div class="card" style={{ width: '100%', maxWidth: 340, marginTop: 14, padding: '8px 18px', textAlign: 'left' }}>
        {steps.map(([n, done], i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', fontSize: 15, fontWeight: 700, color: i === 2 ? 'var(--muted)' : 'var(--text)' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--on-accent)', background: done ? 'var(--ok)' : i === 1 ? 'var(--busy)' : 'var(--field)' }}>{done && <Check size={13} strokeWidth={3} />}</span>{n}
          </div>
        ))}
      </div>
    </div>
  );
}
