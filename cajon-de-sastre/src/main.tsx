import { options, render } from 'preact';
import '@fontsource-variable/nunito';
import './styles/theme.css';
import './styles/base.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';

registerSW({ immediate: true });

// Preact 11 ya no añade «px» a los números de los estilos en línea: se restaura aquí para todo el código.
const UNITLESS = /^(--|opacity$|flex|fontWeight$|lineHeight$|zIndex$|order$|zoom$|scale$|aspectRatio$)/;
const prevVnode = options.vnode;
options.vnode = (vnode) => {
  const style = (vnode.props as { style?: unknown } | undefined)?.style;
  if (style && typeof style === 'object') {
    const s = style as Record<string, unknown>;
    for (const k in s) if (typeof s[k] === 'number' && s[k] !== 0 && !UNITLESS.test(k)) s[k] = `${s[k]}px`;
  }
  prevVnode?.(vnode);
};

render(<App />, document.getElementById('app')!);
