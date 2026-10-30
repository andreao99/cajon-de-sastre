# Chat

_Started 2026-10-30 10:58 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Implementa una aplicación web estática llamada "Cajón de sastre" que se publica"
The project currently has no files except possibly dotfiles — a `list_files` on the project root would return nothing else.
Current date is now October 30, 2026
</system-info>

<default aesthetic_system_instructions>
The user has not attached a design system. If they have ALSO not attached references or art direction, and the project is empty (the auto-managed _ds/ folder doesn't count), ask your opening questions with the ask_user tool. Whenever you ask opening questions in this project, include a design-system question in the form: the user's pick there sets the visual direction, so do NOT also ask about the visual aesthetic (no questions about vibe, colors or palette directions (including color-swatch svg-options questions), typography, mood, or art direction). Spend your other questions on everything else: audience, purpose, content, structure, scope, interactions, tone of copy. Exception: if the request already states the visual direction as a brand or concrete art direction, leave the design-system question out of your own questions (the app may still add one — it's skippable, and a skip doesn't change the stated direction) — but if they name a design system that isn't attached, keep the question: their pick there is what attaches it.

If the design-system question comes back unanswered — skipped without a pick (a "Not sure" / decide-for-me answer counts as a pick: it applies the effective default) — and no references or other art direction arrived either, THEN ask the visual-aesthetic questions before designing: a follow-up round (or one focused question) about vibe, colors, type, and mood is the right move once the design-system ask went unanswered. Do NOT just pick your own. Once you have a direction, use this guidance when creating designs:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are user-authored files in the project already (the auto-managed _ds/ folder is not user-authored).
</default aesthetic_system_instructions>

<pasted_text name="Pasted text (40 lines)">
Implementa una aplicación web estática llamada "Cajón de sastre" que se publica en GitHub Pages. Es un lanzador de mini-apps HTML personales con estética de pantalla de inicio de móvil. Sigue el diseño entregado por Claude Design (adjunto/carpeta /design). Antes de escribir código, propón la estructura del proyecto y espera mi confirmación.

STACK
- Vite + TypeScript. Usa React (o Preact si prefieres ligereza), con CSS variables para el tema claro/oscuro.
- Firebase (SDK modular) con Firestore y persistencia offline. Sin Firebase Auth.
- Lucide para los iconos.
- PWA instalable (manifest + service worker) y workflow de GitHub Actions que despliega en GitHub Pages (con la base correcta del repo).
- Fuente Nunito (autohospedada o de Google Fonts).

FUNCIONALIDAD
1. Acceso por código secreto: la primera vez en un dispositivo se pide un código (o se genera uno aleatorio largo). Se guarda en localStorage del dispositivo. El código nunca se guarda en claro en Firestore: usa su hash SHA-256 como id del vault.
2. Modelo de datos en Firestore:
   vaults/{hash}/apps/{appId}: { name, icon, color, html, folderId, page, order, createdAt }
   vaults/{hash}/folders/{folderId}: { name, page, order }
   vaults/{hash}/appData/{appId}: { entries: { [key]: string } }
   Avisa de los límites (1 MB por documento) y propón qué hacer si un HTML o los datos de una app lo superan.
3. Pantalla de inicio: cuadrícula 4 columnas, páginas deslizables con scroll-snap y puntitos, carpetas, buscador que aparece al deslizar hacia abajo (con barra superior como alternativa), modo edición con pulsación larga (reordenar con arrastrar, renombrar, cambiar icono/color, mover a carpeta, borrar).
4. Añadir app: pegar HTML o subir archivo .html, nombre (prellenado con el &lt;title&gt; del HTML), icono de Lucide, color pastel y carpeta.
5. Ejecución de apps: cada app se muestra en un iframe con srcdoc y sandbox="allow-scripts allow-forms allow-modals allow-popups" SIN allow-same-origin, para aislarla del resto.
6. Aislamiento y sincronización del localStorage de cada app:
   - Inyecta al principio del &lt;head&gt; de cada HTML un script (shim) que sustituye window.localStorage por un objeto en memoria con la misma API (getItem, setItem, removeItem, clear, key, length), inicializado de forma síncrona con los datos guardados de esa app.
   - Cada escritura se envía al padre con postMessage; el padre la guarda en IndexedDB (caché local) y la sincroniza con Firestore (con debounce).
   - Haz lo mismo con sessionStorage (solo en memoria).
   - Escucha cambios remotos desde otros dispositivos y refleja los datos al reabrir la app.
   - Documenta las limitaciones (IndexedDB, cookies y otros APIs no disponibles dentro de las apps).
7. Animación de apertura: el icono se expande a pantalla completa y se cierra deslizando desde el borde (gesto con pointer events + animaciones CSS/Web Animations). Soporta también el botón atrás del navegador y la tecla Escape.
8. Temas: claro beige y oscuro marrón cálido, sigue el sistema y permite forzarlo desde ajustes.
9. Ajustes: tema, ver/copiar código, exportar/importar JSON con todas las apps y datos, estado de sincronización, cerrar sesión en este dispositivo.
10. Funcionamiento offline: la app y los datos funcionan sin conexión y se sincronizan al volver.

SEGURIDAD
- Reglas de Firestore: permitir lectura/escritura solo bajo vaults/{vaultId}/** y denegar el listado de la colección raíz "vaults", de modo que solo quien conoce el código (hash) accede. Explícame las limitaciones de este enfoque (el código funciona como una contraseña) y exige un código de al menos 16 caracteres o ofrece generarlo.
- Activa Firebase App Check si es viable, o explícame cómo hacerlo.
- Sanitiza lo necesario del lado de la app (el iframe aislado ya protege), y no ejecutes nunca el HTML fuera del iframe sandbox.

ENTREGABLES
- Código completo, README con pasos para crear el proyecto de Firebase, pegar la configuración (variables de entorno) y publicar en GitHub Pages.
- Archivo firestore.rules.
- Tests básicos del shim de localStorage y de la sincronización.
- Trabaja por fases (1: esqueleto + tema + inicio, 2: añadir/editar apps + iframe + shim, 3: Firebase + sync, 4: animaciones/gestos + PWA) y hazme una pausa para revisar al final de cada una.
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Design Components">
This project uses Design Components: every design is a single streaming `Name.dc.html` file. The full authoring spec is in your system prompt under "Writing code — Design Components" — follow it. Author and edit `.dc.html` content with the `dc_write`, `dc_html_str_replace`, `dc_js_str_replace`, and `dc_set_props` tools (not `write_file`; `str_replace_edit` works but won't stream); template edits stream into the live preview as you type.
</attached-skill>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant

No hay carpeta `/design` en el proyecto (está vacío), así que antes de implementar necesito el diseño o que lo cree yo. Esta es la estructura propuesta.

**Estructura**
```
cajon-de-sastre/
├─ index.html · vite.config.ts (base desde env) · tsconfig.json
├─ firestore.rules · .env.example · README.md
├─ .github/workflows/deploy.yml
├─ public/  manifest.webmanifest · icons/ · fonts/ (Nunito)
├─ src/
│  ├─ main.tsx · App.tsx
│  ├─ styles/ theme.css (variables claro/oscuro) · base.css
│  ├─ lib/
│  │  ├─ vault.ts      (código, SHA-256, localStorage)
│  │  ├─ firebase.ts   (init modular, persistencia offline, App Check)
│  │  ├─ db.ts         (CRUD apps/folders/appData)
│  │  ├─ idb.ts        (caché local IndexedDB)
│  │  ├─ sync.ts       (debounce, cola, estado, listeners remotos)
│  │  ├─ shim.ts       (genera e inyecta el shim en el HTML)
│  │  ├─ bridge.ts     (postMessage padre↔iframe)
│  │  └─ limits.ts     (control del límite de 1 MB)
│  ├─ components/ Home · Grid · Page · AppIcon · Folder · SearchBar · EditMode · AddAppSheet · AppFrame · Settings · LockScreen
│  ├─ hooks/ useTheme · useLongPress · useSwipeClose · useHistoryBack
│  └─ pwa/ sw.ts (vite-plugin-pwa)
└─ tests/ shim.test.ts · sync.test.ts (Vitest + jsdom)
```

**Decisiones**
- Preact (con alias de compatibilidad React) por ligereza; Vitest para los tests.
- Límite de 1 MB: avisar al 80 % y bloquear al 100 %. Para un HTML grande, comprimirlo (gzip → base64) o partirlo en varios documentos. Para datos grandes, dividir `appData` en trozos o avisar y exportar.
- Reglas de Firestore: `allow get, list, write` solo en `vaults/{id}/**`, y `vaults` sin listado. Limitación: el hash funciona como contraseña, y quien lo conozca lo lee todo. Por eso se exigen 16+ caracteres o se genera uno aleatorio.
- App Check con reCAPTCHA v3, opcional mediante variable de entorno. Lo documento en el README.

**Fases con pausa de revisión**
1. Esqueleto, tema e inicio
2. Añadir/editar apps, iframe y shim
3. Firebase y sync
4. Animaciones, gestos y PWA

**Antes de empezar, dime:**
1. ¿Adjuntas el diseño de `/design`, o prefieres que primero diseñe la pantalla de inicio, la hoja de añadir app y los ajustes como prototipo?
2. ¿Confirmas Preact, o prefieres React?
3. ¿Confirmas la estructura?

