import { useState } from 'preact/hooks';
import { KeyRound, RefreshCw } from 'lucide-preact';
import { generateCode, validateCode, normalizeCode } from '../lib/vault';

export function LockScreen({ onEnter }: { onEnter: (code: string) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = (e: Event) => {
    e.preventDefault();
    const err = validateCode(code);
    err ? setError(err) : onEnter(normalizeCode(code));
  };
  return (
    <form class="screen center" style={{ justifyContent: 'center', paddingBottom: 60 }} onSubmit={submit}>
      <div class="icon" style={{ '--size': '92px', borderRadius: '26%', background: 'var(--mint)', color: 'var(--mint-ink)', boxShadow: 'var(--shadow)' }}><KeyRound size={44} strokeWidth={1.5} /></div>
      <h1 style={{ marginTop: 6 }}>Tu código secreto</h1>
      <p>Es la llave que sincroniza tus apps entre todos tus dispositivos. Introdúcelo o genera uno nuevo.</p>
      <input class="codefield" value={code} placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck={false}
        onInput={(e) => { setCode(e.currentTarget.value); setError(null); }} />
      {error && <span class="error">{error}</span>}
      <button class="pill" style={{ width: '100%', height: 56 }} type="submit">Entrar</button>
      <button type="button" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 15, fontWeight: 800, padding: 8 }} onClick={() => { setCode(generateCode()); setError(null); }}>
        <RefreshCw size={19} strokeWidth={1.7} />Generar código nuevo
      </button>
      <p style={{ fontSize: 12.5, position: 'absolute', bottom: 'calc(40px + env(safe-area-inset-bottom))', maxWidth: 270 }}>
        Guárdalo en un lugar seguro: sin él no podrás recuperar tus apps en otro dispositivo.
      </p>
    </form>
  );
}
