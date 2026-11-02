import { useEffect, useState } from 'preact/hooks';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'cajon:theme';
const read = (): ThemePref => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; } };

/** Aplica data-theme en <html>: sigue al sistema salvo que se fuerce. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref;
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#2B241F' : '#F5EEE3');
    };
    apply();
    mq.addEventListener('change', apply);
    try { localStorage.setItem(KEY, pref); } catch { /* sin almacenamiento */ }
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
  return [pref, setPref] as const;
}
