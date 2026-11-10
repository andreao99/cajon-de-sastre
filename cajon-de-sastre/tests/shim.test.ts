import { describe, expect, it, vi } from 'vitest';
import { extractTitle, injectIntoHtml, shimSource } from '../src/lib/shim';
import { byteLength, MAX_BYTES, sizeState } from '../src/lib/limits';

/** Ejecuta el shim contra una «ventana» falsa y devuelve lo que la app vería. */
function run(entries: Record<string, string> = {}) {
  const post = vi.fn();
  const listeners: Record<string, (e: unknown) => void> = {};
  const win: any = { parent: { postMessage: post }, addEventListener: (t: string, f: any) => (listeners[t] = f), document: { documentElement: { setAttribute: vi.fn() } } };
  new Function('window', shimSource('app1', entries))(win);
  return { win, post, listeners };
}

describe('shim de localStorage', () => {
  it('arranca síncrono con los datos guardados', () => {
    const { win } = run({ a: '1' });
    expect(win.localStorage.getItem('a')).toBe('1');
    expect(win.localStorage.length).toBe(1);
    expect(win.localStorage.getItem('nada')).toBeNull();
  });
  it('implementa setItem/removeItem/clear/key y notifica al padre', () => {
    const { win, post } = run();
    const ls = win.localStorage;
    ls.setItem('x', 5);
    expect(ls.getItem('x')).toBe('5');
    expect(ls.key(0)).toBe('x');
    expect(ls.key(3)).toBeNull();
    ls.removeItem('x'); ls.setItem('y', '2'); ls.clear();
    expect(ls.length).toBe(0);
    expect(post.mock.calls.map((c) => c[0])).toEqual([
      { t: 'set', k: 'x', v: '5', cajon: 1, app: 'app1' }, { t: 'remove', k: 'x', cajon: 1, app: 'app1' },
      { t: 'set', k: 'y', v: '2', cajon: 1, app: 'app1' }, { t: 'clear', cajon: 1, app: 'app1' },
    ]);
  });
  it('permite acceso por propiedad', () => {
    const { win, post } = run({ a: '1' });
    win.localStorage.b = 'dos';
    expect(win.localStorage.b).toBe('dos');
    expect(win.localStorage.a).toBe('1');
    expect(post).toHaveBeenCalledTimes(1);
  });
  it('sessionStorage es solo en memoria (no avisa)', () => {
    const { win, post } = run();
    win.sessionStorage.setItem('s', '1');
    expect(win.sessionStorage.getItem('s')).toBe('1');
    expect(post).not.toHaveBeenCalled();
  });
  it('cambia el tema cuando el padre lo pide', () => {
    const { win, listeners } = run();
    listeners.message({ data: { cajon: 1, t: 'theme', theme: 'dark' } });
    expect(win.document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
  });
  it('no se rompe con </script> dentro de los datos', () => {
    expect(shimSource('a', { k: '</script><b>' })).not.toContain('</script>');
  });
});

describe('inyección en el HTML', () => {
  const o = { appId: 'a', entries: {}, theme: 'light' as const, adapt: true };
  it('va al principio del head', () => {
    const out = injectIntoHtml('<!doctype html><html><head><title>T</title></head><body></body></html>', o);
    expect(out.indexOf('<head>') + 6).toBe(out.indexOf('<script>'));
    expect(out).toContain('data-cajon-adapt');
  });
  it('crea el head tras el doctype si falta', () => {
    expect(injectIntoHtml('<!DOCTYPE html><h1>Hola</h1>', o)).toMatch(/^<!DOCTYPE html><head><script>/);
  });
  it('incluye la red de seguridad responsive salvo que se desactive', () => {
    expect(injectIntoHtml('<head></head>', o)).toContain('e.style.zoom');
    expect(injectIntoHtml('<head></head>', { ...o, fit: false })).not.toContain('e.style.zoom');
  });
  it('extrae el título', () => expect(extractTitle('<title> Mi rutina </title><p>x')).toBe('Mi rutina'));
});

describe('límite de 1 MB', () => {
  it('clasifica el tamaño', () => {
    expect(sizeState(100)).toBe('ok');
    expect(sizeState(MAX_BYTES * 0.9)).toBe('warn');
    expect(sizeState(MAX_BYTES + 1)).toBe('over');
    expect(byteLength('ñ')).toBe(2);
  });
});
