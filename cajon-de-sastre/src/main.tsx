import { render } from 'preact';
import '@fontsource-variable/nunito';
import './styles/theme.css';
import './styles/base.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';

registerSW({ immediate: true });

render(<App />, document.getElementById('app')!);
