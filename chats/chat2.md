# # Cajón de sastre: Interfaz móvil-first

_Started 2026-10-30 10:59 UTC_

---

## User

Diseña la interfaz de una aplicación web móvil-first llamada "Cajón de sastre" (nombre provisional): un lanzador personal que reúne mis mini-apps HTML (skincare, rutinas de gym, horarios semanales, etc.). Debe sentirse como la pantalla de inicio de un móvil, cálida y acogedora.

ESTILO VISUAL
- Tema claro: fondo beige cálido (referencia #F5EEE3), superficies beige más claro (#FBF7F0), texto marrón suave (#4A3F35), nunca negro puro.
- Colores pastel para los iconos de las apps: rosa empolvado, salvia, lavanda, melocotón, azul cielo, mantequilla, menta, arcilla suave. Todos con buen contraste con su icono.
- Tema oscuro: tonos cálidos, fondo marrón chocolate suave (#2B241F), superficies #382F28, texto crema. Los pasteles se mantienen pero algo menos saturados.
- Bordes muy redondeados en todo (iconos ~22-26% de radio, tarjetas y hojas 24-28px, botones en píldora).
- Sombras muy suaves y difusas, sin bordes duros ni líneas negras.
- Tipografía redondeada y amable tipo Nunito o Quicksand.
- Iconos de línea suave y trazo uniforme (estilo Lucide/Phosphor light).

PANTALLAS Y COMPONENTES A DISEÑAR
1. Pantalla de inicio (estilo iOS):
   - Cuadrícula de iconos grandes (4 columnas en móvil) con nombre debajo.
   - Varias páginas deslizables horizontalmente con indicador de puntitos.
   - Carpetas como en iOS (icono de carpeta con mini-previsualización de 4 apps) que se abren en una hoja redondeada.
   - Buscador: aparece al deslizar hacia abajo desde la pantalla de inicio, como en iOS. Diseña también la alternativa de barra de búsqueda fija arriba.
   - Saludo o fecha discreta arriba (opcional, muy sutil).
2. Modo edición (pulsación larga): iconos con ligero movimiento, botón de borrar/editar en cada uno, arrastrar para reordenar o meter en carpeta, botón "Listo".
3. Hoja "Añadir app": pegar código HTML o subir archivo .html, campo de nombre, selector de icono (cuadrícula de iconos de línea), selector de color pastel, selector de carpeta. Botón principal en píldora.
4. Hoja "Editar app": mismos campos + eliminar.
5. Apertura de una app: animación en la que el icono se expande hasta ocupar toda la pantalla (como abrir una app en el móvil). Se cierra deslizando desde el borde inferior o lateral, con una barra-asa discreta. Diseña los fotogramas clave de la animación.
6. Pantalla de código secreto (primera vez en un dispositivo): campo para introducir o generar el código de sincronización, con un texto breve explicando que sirve para sincronizar entre dispositivos. Incluye el estado "sincronizando" y un pequeño indicador de estado de sincronización en ajustes.
7. Ajustes: cambiar tema (claro/oscuro/sistema), ver y copiar el código, exportar/importar copia de seguridad, cerrar vault en este dispositivo.
8. Estados vacíos (sin apps todavía), con una ilustración sencilla y amable.

Entrega las pantallas en versión claro y oscuro, en formato móvil (390px) y una adaptación a escritorio donde la cuadrícula se centra con ancho máximo. Incluye un pequeño sistema de diseño con paleta, radios, sombras, tipografías y componentes reutilizables.

## Assistant

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

He creado el diseño en un único lienzo, `Cajón de sastre.dc.html`. No lo he revisado aún: el verificador sigue comprobándolo y solo me avisará si encuentra problemas.

Por cada tema (claro y oscuro) incluye:
- **Sistema de diseño:** paleta, pasteles, radios, sombras, tipografía (Nunito) y componentes.
- **Pantallas móviles de 390px:**
  - inicio (A);
  - búsqueda al deslizar (B) y buscando (C);
  - alternativa con barra fija (D);
  - carpeta abierta (E);
  - modo edición (F);
  - hojas «Añadir app» (G) y «Editar app» (H);
  - código secreto (J) y sincronizando (K);
  - ajustes (L) con el indicador de sincronización;
  - estado vacío (M).
- **Escritorio de 1280px (N):** la cuadrícula va centrada con ancho máximo.

Aparte, una sección con cinco fotogramas clave de la apertura de app, un bucle animado en vivo y la especificación del cierre por gesto.

Para ver todo hay que mover y ampliar el lienzo. No hay una pantalla de código inválido ni dibujé el estado de pausa del gesto de cierre.

## User

está perfecto, como haré para que todas las apps que suba tengan el mismo estilo?

## Assistant

Hay tres vías, de menos a más intrusiva. Puedes combinarlas.

1. **Un kit de estilos que el cajón inyecta al abrir cada app.**
   - Antes de cargar el HTML de la app, el lanzador le añade un `<style>` con variables CSS: `--bg`, `--surface`, `--text`, `--accent`, los pasteles, `--radius-card`, `--shadow` y la fuente Nunito.
   - Al cambiar de tema, el lanzador reenvía las variables a la app, así que claro y oscuro se aplican solos.
   - Esta vía solo funciona en apps que usen esas variables.

2. **Un prompt base para generar las apps.**
   - Cuando le pides una mini-app a Claude, le pegas siempre el mismo bloque: «usa estas variables CSS, Nunito, radios de 24px, sin bordes duros…».
   - Así nacen ya en el estilo, y la vía 1 les sirve para cambiar de tema.
   - Es la más fiable, porque no depende de reescribir CSS ajeno.

3. **Un interruptor «Adaptar estilo» por app.**
   - Inyecta una hoja base que redefine `body`, botones, inputs y tarjetas con tus tokens.
   - Ayuda con apps antiguas, pero no garantiza un resultado limpio si traen colores fijos. Por eso lo dejaría como opción en «Editar app».

Mi recomendación es 1 y 2 como base, y 3 solo para apps heredadas.

Si quieres, preparo el kit (el CSS de variables más el prompt listo para copiar) como una hoja nueva en este diseño. También puedo añadir el interruptor «Adaptar estilo» a la hoja «Editar app».

## User

si, prepara los 3 por si acaso

## Assistant

_[tool: write_file]_

_[tool: write_file]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Están las tres vías. Aún no he comprobado el resultado: el verificador sigue revisándolo.

- **Vía 1, kit inyectado:** `cajon-kit.css` contiene las variables de tema claro y oscuro, los pasteles con su tinta, radios, sombras y la fuente. El lanzador lo antepone al HTML de cada app y cambia `data-theme`.
- **Vía 2, prompt base:** `prompt-base.md` es el bloque para pegar al pedir una app nueva.
- **Vía 3, «Adaptar estilo»:** es un interruptor en las hojas Añadir y Editar. Activa una capa base incluida al final del mismo CSS, con especificidad cero, así que lo que la app defina por su cuenta sigue mandando.

Al final del lienzo hay una sección que explica las tres, con una comparación antes y después de la vía 3.

Lo que la app trae en línea no cambia: colores fijos escritos en sus etiquetas o texto dentro de imágenes. Por eso la vía 2 es la más fiable.

Al añadir el interruptor, la hoja de formulario queda más justa de altura. Puede que el botón principal quede muy pegado al borde inferior, y lo ajusto si es así.

