import { Plus } from 'lucide-preact';

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  const box = (s: Record<string, string | number>) => <div style={{ position: 'absolute', boxShadow: 'var(--shadow-sm)', ...s }} />;
  return (
    <div class="center" style={{ flex: 1, justifyContent: 'center', gap: 14, paddingBottom: 60 }}>
      <div style={{ position: 'relative', width: 220, height: 190 }}>
        {box({ left: 30, top: 6, width: 44, height: 44, borderRadius: '50%', background: 'var(--sage)' })}
        {box({ left: 100, top: 0, width: 40, height: 40, borderRadius: '24%', background: 'var(--lav)', transform: 'rotate(14deg)' })}
        {box({ left: 160, top: 22, width: 32, height: 32, borderRadius: 8, background: 'var(--rose)', transform: 'rotate(45deg)' })}
        {box({ left: 0, right: 0, top: 66, height: 112, borderRadius: 30, background: 'var(--butter)', boxShadow: 'var(--shadow)' })}
        {box({ left: 14, right: 14, top: 96, height: 78, borderRadius: 24, background: 'var(--peach)', boxShadow: 'none' })}
        {box({ left: 78, right: 78, top: 124, height: 14, borderRadius: 99, background: 'var(--peach-ink)', opacity: 0.55, boxShadow: 'none' })}
      </div>
      <h1 style={{ fontSize: 26 }}>Tu cajón está vacío</h1>
      <p>Añade tu primera mini-app pegando su código HTML o subiendo un archivo.</p>
      <button class="pill" style={{ marginTop: 6 }} onClick={onAdd}><Plus size={20} strokeWidth={1.8} />Añadir app</button>
    </div>
  );
}
