# Cajón de sastre

Lanzador personal de mini-apps HTML (Vite + Preact + TypeScript). Diseño de referencia en `../project/`.

## Estado: fase 4 de 4 (animaciones, gestos, PWA, despliegue) — completo

Hecho: tema claro/oscuro/sistema (tokens de `cajon-kit.css`), pantalla de código secreto (≥16 caracteres, generador, hash SHA-256 con Web Crypto), inicio con cuadrícula de 4 columnas (6 en escritorio, ancho máx. 720 px), páginas con scroll-snap y puntos, carpetas con hoja, buscador por deslizamiento hacia abajo o barra fija (ajustes), modo edición visual con pulsación larga (movimiento + botones), estado vacío, ajustes (tema, buscador, ver/copiar código, cerrar vault).

Fase 2: hoja Añadir/Editar (pegar o subir .html, nombre prellenado con `<title>`, icono Lucide, color, carpeta, «Adaptar estilo»), arrastrar para reordenar o crear/llenar carpetas, renombrar/deshacer carpetas, borrar. Las apps se ejecutan solo en `<iframe srcdoc sandbox="allow-scripts allow-forms allow-modals allow-popups">` (sin `allow-same-origin`). Se les inyecta al inicio del `<head>` un shim de `localStorage`/`sessionStorage` en memoria (datos iniciales síncronos, escrituras por `postMessage`, validadas por `event.source`) y el kit de estilos con el tema. Cerrar: asa inferior, Escape o botón atrás.

**Límite de 1 MB por documento de Firestore:** el HTML se avisa al 80 % y se bloquea al superar ~1 MB (quitar imágenes base64/librerías incrustadas; si hiciera falta, comprimir con gzip+base64 o trocear en la fase 3). Lo mismo con los datos de una app: dejan de guardarse y se avisa.

**Limitaciones dentro de las apps:** sin IndexedDB, cookies, `localStorage` real ni acceso al padre; `sessionStorage` no persiste. Los datos de cada app se guardan en IndexedDB (caché local) y se sincronizan con Firestore.

Fase 3: motor «local primero» (`src/lib/sync.ts`) con caché IndexedDB por vault y Firestore (SDK modular, persistencia offline multi-pestaña, sin Auth). Solo se suben los documentos que cambian; los datos de las apps se envían con debounce (1,5 s) y al cerrar la app o la pestaña; los cambios de otros dispositivos llegan por listeners y se reflejan al reabrir la app (si la app está abierta no se le cambia el `localStorage` en caliente). Un vault nuevo en la nube con datos locales los sube al entrar. Ajustes muestra el estado (sincronizado / sincronizando / sin conexión / error), exporta e importa copias JSON (importar fusiona por id) y «Cerrar vault» borra la caché local y de Firestore del dispositivo. Sin variables de Firebase la app funciona solo en local.

Fase 4: al abrir, el icono se expande a pantalla completa (Web Animations, 420 ms, `cubic-bezier(.2,.8,.2,1)`) y el inicio se atenúa. Se cierra con el botón Volver, deslizando desde el borde izquierdo, Escape o el botón atrás del navegador; el gesto «rebobina» la propia animación (pointer events) y cierra en 340 ms si pasas del 30 % o vas rápido. Respeta `prefers-reduced-motion`. PWA instalable con `vite-plugin-pwa` (manifest, iconos, service worker con precarga: la app arranca sin conexión y los datos van por IndexedDB/Firestore). Workflow `../.github/workflows/deploy.yml`.

## Uso

```
npm install
npm run dev      # añade ?demo a la URL para cargar las apps de muestra del diseño
npm test
npm run build    # VITE_BASE=/mi-repo/ para GitHub Pages
```

**Ajustar al móvil** (activo por defecto, desactivable por app en la hoja Editar): red de seguridad para apps que no son responsive. Inyecta CSS de especificidad cero (`box-sizing`, imágenes y tablas con `max-width`, texto que parte palabras largas) y un script que, si la página sigue desbordando en horizontal, la reduce con `zoom` hasta que quepa (mínimo 0,35). No sustituye a un diseño responsive: el prompt base sigue siendo la vía fiable.

## Configurar Firebase

1. En [console.firebase.google.com](https://console.firebase.google.com) crea un proyecto y añade una app **Web**; copia su configuración.
2. **Firestore Database** → crear base de datos (modo producción, la región que prefieras).
3. Publica las reglas: pestaña *Reglas* → pega `firestore.rules` (o `firebase deploy --only firestore:rules`).
4. Copia `.env.example` a `.env` y rellena los `VITE_FIREBASE_*`. Para GitHub Pages, guárdalos como *Variables* (o *Secrets*) del repositorio; el workflow llega en la fase 4. La configuración web de Firebase no es secreta: la seguridad la dan las reglas.
5. `npm run dev`; en Firestore aparecerá `vaults/{hash}/…` al añadir la primera app.

### Seguridad y limitaciones

- **El código funciona como una contraseña.** Las reglas permiten leer y escribir bajo `vaults/{vaultId}/**` a quien conozca el id (SHA-256 del código, 64 hex) y no permiten listar `vaults`. Quien obtenga el código (o el hash) lee y modifica todo. Por eso se exigen ≥16 caracteres (generador de ~79 bits). Cualquiera con la configuración web puede intentar adivinar hashes, pero con ese entropía no es viable; no uses códigos inventados fáciles.
- Firestore no puede limitar peticiones por vault: un atacante que conozca el hash puede escribir hasta llenar tu cuota. Si te preocupa, activa App Check y pon alertas de presupuesto.
- El hash viaja a Firebase, el código nunca. El código se guarda en `localStorage` del dispositivo.
- **App Check (recomendado):** Consola → App Check → registra la app Web con reCAPTCHA v3 (crea la clave en google.com/recaptcha, añade tu dominio de GitHub Pages), copia la clave de sitio en `VITE_APPCHECK_SITE_KEY` y, tras comprobar que las peticiones aparecen como verificadas, pulsa *Aplicar* en Firestore. En desarrollo se usa un token de depuración (se imprime en consola; regístralo en la consola de App Check). App Check limita el uso a tu web, no sustituye al código.
- Límites de Firestore: 1 MiB por documento. HTML o datos de app mayores se bloquean con aviso. Alternativas si hace falta: comprimir (gzip+base64) o trocear en varios documentos.
- Conflictos: gana la última escritura por documento. Los datos de una app son un solo documento (`appData/{appId}`): si editas la misma app en dos dispositivos a la vez, se queda la última.

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (rama `main`). El workflow está en `.github/workflows/deploy.yml` y trabaja sobre la carpeta `cajon-de-sastre/`.
2. *Settings → Pages → Source: GitHub Actions*.
3. *Settings → Secrets and variables → Actions → Variables*: crea `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (y `VITE_APPCHECK_SITE_KEY` si usas App Check).
4. Cada push a `main` ejecuta tests, compila con `VITE_BASE=/<nombre-del-repo>/` y despliega. Si usas un dominio propio o un repo `usuario.github.io`, cambia `VITE_BASE` a `/`.
5. En Firebase Authentication no se usa nada; en App Check añade tu dominio `usuario.github.io` a reCAPTCHA.
