Crea una mini-app en UN solo archivo HTML (HTML + CSS + JS inline, sin dependencias externas salvo fuentes). Va dentro de mi lanzador «Cajón de sastre», que le inyecta variables CSS de estilo.

REGLAS DE ESTILO
- No escribas colores fijos. Usa SIEMPRE estas variables con un valor de reserva, p. ej. `background: var(--bg, #F5EEE3)`:
  --bg (fondo), --surface (tarjetas), --field (inputs), --text, --muted, --accent, --on-accent, --danger.
  Pasteles (fondo + tinta para icono/texto encima): --rose/--rose-ink, --sage, --lav, --peach, --sky, --butter, --mint, --clay (cada uno con su -ink).
  Sombras: --shadow, --shadow-sm. Radios: --r-card (24px), --r-sheet (28px), --r-pill, --r-icon (24%).
  Tipografía: font-family: var(--font, 'Nunito', sans-serif).
- Tema: soporta claro y oscuro solo con las variables; no uses `prefers-color-scheme` ni dos hojas.
- Forma: todo muy redondeado; botones en píldora; tarjetas con --shadow, sin bordes duros ni líneas negras; nunca negro puro.
- Iconos: SVG de línea, trazo uniforme de 1.6px, `stroke="currentColor"`, extremos redondeados (estilo Lucide). Sin emojis.
- Móvil primero: ancho fluido 320–430px, objetivos táctiles de mínimo 44px, respeta `env(safe-area-inset-bottom)`; deja libre ~24px abajo para la barra-asa de cierre.
- Texto en español, tono cercano y breve.
- Si guarda datos, usa `localStorage` con una clave que empiece por el nombre de la app.

LA APP QUE QUIERO:
[describe aquí qué debe hacer]
