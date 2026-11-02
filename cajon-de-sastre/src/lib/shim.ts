import kit from './kit.css?raw';

/**
 * Script que se inyecta al principio del <head> de cada app (dentro de un iframe sandbox sin allow-same-origin,
 * donde el localStorage real lanza SecurityError). Sustituye localStorage y sessionStorage por objetos en memoria
 * con la misma API. localStorage arranca con los datos guardados y avisa al padre de cada escritura.
 */
const SHIM = `(function(){
var W=window;
function make(init,notify){
  var m=new Map(Object.entries(init||{}));
  var api={
    getItem:function(k){k=String(k);return m.has(k)?m.get(k):null},
    setItem:function(k,v){k=String(k);v=String(v);m.set(k,v);notify&&notify({t:'set',k:k,v:v})},
    removeItem:function(k){k=String(k);if(m.delete(k))notify&&notify({t:'remove',k:k})},
    clear:function(){if(m.size){m.clear();notify&&notify({t:'clear'})}},
    key:function(i){var a=Array.from(m.keys());return i>=0&&i<a.length?a[i]:null}
  };
  return new Proxy(api,{
    get:function(t,p){if(p==='length')return m.size;if(typeof p==='string'&&!(p in t))return m.has(p)?m.get(p):undefined;return t[p]},
    set:function(t,p,v){if(typeof p==='string')t.setItem(p,v);return true},
    deleteProperty:function(t,p){if(typeof p==='string')t.removeItem(p);return true},
    has:function(t,p){return p in t||(typeof p==='string'&&m.has(p))},
    ownKeys:function(){return Array.from(m.keys())},
    getOwnPropertyDescriptor:function(t,p){return typeof p==='string'&&m.has(p)?{value:m.get(p),writable:true,enumerable:true,configurable:true}:undefined}
  });
}
var local=make(__INIT__,function(msg){msg.cajon=1;msg.app=__APP__;W.parent.postMessage(msg,'*')});
var session=make({},null);
function define(name,val){try{Object.defineProperty(W,name,{value:val,configurable:true})}catch(e){}}
define('localStorage',local);define('sessionStorage',session);
W.addEventListener('message',function(e){
  var d=e.data;if(!d||d.cajon!==1)return;
  if(d.t==='theme'&&W.document.documentElement)W.document.documentElement.setAttribute('data-theme',d.theme);
});
})();`;

// JSON seguro dentro de <script>: evita cerrar la etiqueta y los separadores de línea unicode
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));

export const shimSource = (appId: string, entries: Record<string, string>) =>
  SHIM.replace('__INIT__', () => safeJson(entries)).replace('__APP__', () => safeJson(appId));

export interface InjectOptions { appId: string; entries: Record<string, string>; theme: 'light' | 'dark'; adapt: boolean }

/** Inserta shim + kit de estilos al principio del <head> (creándolo si falta, siempre después del doctype). */
export function injectIntoHtml(html: string, o: InjectOptions): string {
  const setup = `document.documentElement.setAttribute('data-theme',${safeJson(o.theme)});${o.adapt ? "document.documentElement.setAttribute('data-cajon-adapt','');" : ''}`;
  const block = `<script>${setup}</script><script>${shimSource(o.appId, o.entries)}</script><style data-cajon-kit>${kit}</style>`;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head) return html.slice(0, head.index + head[0].length) + block + html.slice(head.index + head[0].length);
  const root = /<html(\s[^>]*)?>/i.exec(html);
  if (root) return html.slice(0, root.index + root[0].length) + `<head>${block}</head>` + html.slice(root.index + root[0].length);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  const at = doctype ? doctype[0].length : 0;
  return html.slice(0, at) + `<head>${block}</head>` + html.slice(at);
}

export function extractTitle(html: string): string {
  const t = new DOMParser().parseFromString(html, 'text/html').title.trim();
  return t.slice(0, 40);
}

export const SANDBOX = 'allow-scripts allow-forms allow-modals allow-popups';
