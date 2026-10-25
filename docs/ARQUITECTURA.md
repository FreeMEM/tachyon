# Arquitectura de dashweb

*[English](ARQUITECTURA.en.md) | Castellano*

Cómo está hecho dashweb por dentro, tal como es el código el 2026-10-20 (commit `cdfe376`: v0.2.0-alfa más el
encargo 37 en curso). Sustituye al borrador del 2026-10-15.

Qué es cada documento:

- **Este:** la ingeniería: piezas, datos, procesos, decisiones y límites.
- `ingenieria/`: el paquete de ingeniería completo (requisitos, casos de uso, flujos, estados, modelo de datos,
  interfaz, módulos, pruebas, construcción, riesgos). Empieza en `ingenieria/00_INDICE.md`.
- `DASHWEB_LOOP.md`: el plan y la bitácora (el diario; de ahí salen los porqués y las medidas).
- `COMO_SE_CONSTRUYE.md` y `TUTORIAL.md`: cómo se hacen aplicaciones con Dash y MUI.
- `quickjs_amiga.md`: los cambios a QuickJS.

Se actualiza cuando cambia la arquitectura, no en cada tarea. Las referencias van por fichero y función; los
números de línea cambian.

## 1. Objetivo y restricciones

- **Máquina objetivo:** PiStorm (Emu68) y emulación con JIT. No se optimiza para un 68k real ni se mide en él.
  Para medir "como el objetivo": FS-UAE con 68040, JIT y velocidad máxima; la máquina de pruebas habitual es la
  "rtg" (68040 + JIT, AmigaOS 3.2, 1024x768 a 16 bits, 128 MB).
- **CPU:** 68020 o mejor con FPU. QuickJS y las librerías de C se compilan con `-m68020 -m68881`.
- **Sistema** (según `paquete/LEEME`): AmigaOS 3.2, o 3.5/3.9, porque fuera de RTG las imágenes pasan por
  picture.datatype V43; con 3.0/3.1 la página se ve sin imágenes. MUI 3.8 o 5. Una pila TCP/IP con
  `bsdsocket.library`. AmiSSL 5 para HTTPS. Decenas de MB de memoria Fast.
- **Juego de caracteres: Latin-1**, el del Amiga. Todo texto de la red se convierte al entrar.
- **Licencias:** solo código que se pueda redistribuir con el MIT de dashweb. Lo que no (SDK de MUI, AmiSSL,
  ROMs, Workbench) lo bajan scripts a `~/.cache`.
- **Todo en Dash.** Lo que le falta a Dash se añade a Dash (tareas `D<n>`, sección 15). C solo en `third_party/` y en
  el pegamento con esas librerías.

## 2. Vista general

```
 src/dashweb.dash  ── ventanas MUI (navegador.dashui), bucle de eventos, un temporizador para todo
        │
        ▼
 lib/documento.dash ── una página: dueña de todo lo suyo
        │
        ├─ red ........ url → red → http (+ cookies) ............ net_* / tls_* de Dash (bsdsocket, AmiSSL)
        ├─ recursos ... CSS y JS de la página, 4 a la vez
        ├─ HTML ....... html5 (Hubbub) → dom ; html + dom para innerHTML y de reserva
        ├─ JS ......... js (QuickJS) + jsdom (puente C) + jsdom_preludio.js
        ├─ estilo ..... css → estilo (cascada, restyle parcial)
        ├─ maqueta .... maqueta → lista plana de Dibujo
        ├─ pintor ..... pintor → gfx_ de Dash en el lienzo MUI
        ├─ imágenes ... imagenes (descarga, tamaños) → imagen_dec (decodificadores, otro proceso)
        ├─ fuentes .... fuente_web (stb_truetype → TextFont)
        └─ vídeo ...... videos → video (MintVID) ; youtube
```

**Procesos de AmigaOS en marcha:**

| Proceso | Quién lo crea | Qué hace |
|---|---|---|
| Principal | — | Todo: interfaz, red, HTML, JS, estilo, maqueta, pintado |
| Búsqueda de nombres | runtime de Dash (`net_connect_start`) | `gethostbyname`, que siempre espera; avisa al acabar |
| Decodificadores de imagen | `lib/imagen_dec.dash` (`task_start_with`, prioridad -1, 256 KB de pila) | Hasta 4 a la vez. Solo C |

Nada más corre en paralelo. El JavaScript, el estilo, la maqueta y el pintado se hacen en el proceso principal,
cada uno de una vez.

**Programas:** `src/dashweb.dash` (el navegador MUI) y `src/visor.dash` (fase A: sin MUI, una ventana de Intuition
con `Window`/`EventLoop`, carga síncrona; sirve para medir y probar el motor).

## 3. El programa y su bucle

`src/dashweb.dash`:

- **Ventanas:** `navegador.dashui` (ventana principal y "Acerca de"), importado como módulo. Hasta 4 ventanas
  (`MAX_VENTANAS`), cada una un `struct Ventana` con el struct generado (`v: Navegador`) y su estado: la página
  actual, la carga en curso, la página preparándose, el historial, el foco, la descarga a disco.
- **Eventos:** números del `.dashui` repetidos como constantes, más los del programa (`ID_TIC`, `ID_RANGO`,
  `ID_CERRADA + k`, los de pantalla completa). La ventana de un evento es la activa (`mui_window_active`), salvo el
  cierre, que lleva un número por ventana.
- **Un solo temporizador** (`programar`): un `mui_timer` para todas las ventanas, con la espera más corta que haga
  falta: 50 ms si algo está llegando; la hora del siguiente `setTimeout` del JS; el siguiente cuadro de vídeo. Sin
  nada pendiente no se arma y el programa duerme. Cada `ID_TIC` llama a `tic(w)` en cada ventana.
- **La red no despierta al programa todavía.** Se pregunta en cada tic. `net_signal`/`task_signal` (Dash D60)
  existen, pero ningún fichero de `src/` ni `lib/` los usa: es la tarea 39. En FS-UAE `net_signal()` da 0 (su
  `bsdsocket.library` no tiene `SO_EVENTMASK`), así que el tic seguirá haciendo falta allí.
- **Lienzo:** `mui_canvas` con doble búfer (`mui_canvas_buffered`). Una función de dibujo por ventana
  (`pinta0`..`pinta3`), porque la de dibujo no sabe de qué lienzo viene. El tamaño nuevo se detecta dentro del dibujo y
  lo que no puede hacerse ahí se difiere con `mui_timer(1, ID_RANGO)`.
- **Entrada:** `mui_canvas_on_input`: clic (`clic` → `maqueta_nodo_en` → JS → enlace, formulario o vídeo), rueda y
  teclas (desplazamiento y formularios).
- **Páginas internas:** `dashweb:inicio`, `dashweb:marcadores`, `dashweb:cookies` (con `?borrar`), generadas como HTML.
- **Datos guardados**, en `PROGDIR:`: `dashweb.marcadores`, `dashweb.prefs` (`clave=valor`), `dashweb.cookies`.
- **Argumentos:** direcciones (una ventana cada una), `TRAZA` (línea de tiempo de la carga), `GCSIEMPRE` (GC de JS
  tras cada llamada, para cazar fallos).

## 4. Una página de punta a punta

Camino del navegador (sin bloquear):

1. **Carga.** `navegar` → `http_empezar` (una `Carga`). Cada tic, `avanzar_carga` → `http_avanzar`. Si las
   cabeceras dicen descarga (`documento_es_descarga`), se cancela y se baja a fichero tras preguntar la ruta.
2. **`documento_empezar`**, de una vez:
   - `_documento_de_tipo`: una imagen, un vídeo o `text/plain` se envuelven en una página propia.
   - `http_texto` → `texto_decodificar`: a Latin-1.
   - `dom_desde_html5`: el árbol (Hubbub).
   - `recursos_del_documento`: pide hojas CSS, `<script src>` y `@import`.
3. **`documento_avanzar`**, cada tic, hasta que llegan todos los recursos (4 a la vez). Es lo único incremental
   del montaje. Entonces, de una vez:
   - JS, si hay `<script>`: `js_nuevo`, `jsdom_preparar` (el preludio), `jsdom_ejecutar_scripts_con`.
   - Estilo: `estilo_hojas_con`, `estilo_aplicar`.
   - Pide fuentes e imágenes.
4. **`mostrar`** → `documento_maquetar`: si un `@media` cambia con el ancho, vuelve a aplicar el estilo; luego
   `maquetar` → una `Pagina`.
5. **Pintar:** MUI llama a la función de dibujo → `pinta_en` → `pintar(pagina, ...)` con la franja visible.

Después de mostrarla:

- **Imágenes y fuentes que llegan** (`documento_imagenes`): se vuelve a maquetar solo si una cambia el tamaño de
  su `<img>` o llega una fuente. Se repinta como mucho cada 2,5 s (`DOCUMENTO_REPINTAR`) y solo si se ve.
- **Cambios del JavaScript** (tras un clic o una tanda de temporizadores): `documento_al_dia` mira si cambió el
  DOM, intenta el restyle parcial (`estilo_aplicar_partes`) y si no puede lo rehace entero. **La maqueta se rehace
  siempre entera.**

Camino síncrono (`documento_abrir`, `documento_desde_html`): ficheros locales, páginas `dashweb:` y `src/visor.dash`.

## 5. Datos y quién es dueño de qué

| Estructura | Fichero | Qué guarda |
|---|---|---|
| `Documento` | `documento.dash` | Dirección, título, bytes, `doc: Nodo`, `hojas`, `im` (imágenes), `js` (puntero al motor, 0 si no hay), `recursos`, `videos`, `pagina`, ancho, contador de cambios |
| `Nodo` | `dom.dash` | Tipo, nombre, texto, `atributos`, `hijos`, **`weak padre`**, `estilo` (el estilo calculado, aquí mismo), pseudo `::before`/`::after`, cachés de clases e id, variables CSS, `toques` (en el documento) |
| `HojaCSS`, `Regla`, `Selector`... | `css.dash` | Lo leído de cada hoja, con `@media`, capas, `@font-face`, `@keyframes` |
| `Hojas` | `estilo.dash` | Las hojas de la página, los índices de selectores y lo necesario para invalidar |
| Estilo calculado | `Nodo.estilo` | Un diccionario texto → texto. Solo `font-size` va resuelto en px |
| `Pagina`, `Dibujo` | `maqueta.dash` | La lista **plana** de dibujos en coordenadas de página. No hay árbol de cajas |

Reglas:

- **El `Documento` es dueño de todo lo suyo.** `documento_liberar` suelta recursos, imágenes, vídeos y el motor JS.
  Se libera al mostrar otra página, al parar, al cerrar la ventana y al salir.
- **`padre` es `weak`.** Dash cuenta referencias y no libera ciclos hasta salir.
- **El JS retiene los nodos que ve** hasta que se libera el motor: la tabla nodo → objeto JS guarda una referencia de
  cada uno.
- **Cachés de todo el programa**, que no se vacían: fuentes abiertas, hoja del navegador leída, selectores leídos,
  fuentes web rasterizadas. Las fuentes web no se liberan al cambiar de página.
- **Cachés por documento:** imágenes por `src` y sus copias escaladas; las reglas ganadoras de la cascada.

## 6. HTML

- **Hubbub** (el analizador HTML5 de NetSurf, `third_party/hubbub`, `lib/html5.dash`) hace el árbol de toda
  página. Hubbub llama a funciones de C que anotan operaciones con números de nodo; Dash las repite creando sus
  `Nodo`. Así no hay punteros de C dentro del DOM.
- Recibe el texto ya en Latin-1, declarado como ISO-8859-1. Por eso `<meta charset>` no se usa; el juego de
  caracteres sale de la cabecera HTTP (sin ella, UTF-8).
- **El analizador propio** (`html.dash` + el constructor tolerante de `dom.dash`) sigue para: `innerHTML`,
  `createHTMLDocument`, el visor, los tests y como reserva si Hubbub se queda sin memoria. La tarea 37 prohíbe
  volver a él para las páginas.

## 7. CSS y estilo

- **Lectura** (`css.dash`): reglas, selectores con su especificidad, declaraciones. `@media` se guarda con la regla
  y se evalúa al indexar; `@supports` al leer; `@layer`, `@font-face`, `@keyframes` e `@import` (hasta 4 niveles).
  La hoja del navegador va en el código y se lee una vez.
- **Índice:** cada selector se guarda por su parte derecha (`#id`, primera clase o etiqueta); el resto, en
  "universales". Cada elemento prueba solo los suyos. Un filtro de antecesores descarta pronto los que no pueden
  cumplirse. El emparejado va de derecha a izquierda.
- **Cascada:** `!important`, origen, especificidad (con la capa: `capa × 1.000.000`), orden. `style=` pesa
  1.500.000.000, las animaciones 2.000.000.000, los atributos de presentación -1. Las reglas ganadoras se guardan en
  caché por la lista de reglas cumplidas.
- **Valores:** herencia por lista fija; `var()` con hasta 8 niveles, y solo se guardan las `--x` que alguien usa;
  `calc()`, `min()`, `max()`, `clamp()`; px, em, rem, vw, vh, vmin, vmax, ch, ex, %, pt, pc, in, cm, mm.
- **Restyle parcial** (`estilo_aplicar_partes`): el puente JS apunta cada cambio (`Toque`: atributo, contenido, entra,
  sale, vecino; como mucho 200, luego "todo"). Un atributo que ningún selector nombra no cuesta nada; una clase o un
  id recalculan el elemento y, si cambia, su subárbol; `+` y `~` llegan al padre. Se rehace todo con `:has()`, si
  cambió el ancho o si hay demasiados cambios. Bajó cascadas de 1,8-3 s a 0,05-0,15 s.
- **No hay** `:hover`, `:focus` ni `:active` (nunca se cumplen).

## 8. Maquetación

`maquetar` produce una lista plana de `Dibujo` (texto, rectángulo, borde, imagen, control, icono...). Cada dibujo
lleva su recorte, su capa y el nodo de donde sale.

- **Bloques:** márgenes (los de hermanos se funden), bordes, relleno, `width`/`min`/`max`, `height`, `box-sizing`,
  `margin: auto`, `aspect-ratio`, fondos, degradados, `box-shadow`, `border-radius`.
- **Líneas:** `white-space`, `text-align` (sin `justify`), `text-indent`, `text-transform`, `letter-spacing`,
  cortes de palabra, `text-overflow: ellipsis`, una `text-shadow`. Palabras seguidas con el mismo aspecto van en
  un solo dibujo. `inline-block` se mide maquetándolo aparte.
- **Flex, grid** (áreas, `repeat`, `minmax`, `fr`) **y tablas** (`colspan`/`rowspan`, automáticas y fijas): cada hijo
  se maqueta en (0,0) y se mueve a su sitio con su recorte.
- **Posicionado:** `relative`, `absolute`, `fixed` (respecto a la vista). `z-index` reordena por capas al final.
- **Float:** se colocan en filas, pero **el texto no los rodea**: va debajo.
- **`transform`:** traslación y escala; `rotate` solo en barras y a múltiplos de 45°; `skew` y 3D no.
- **`overflow`:** recorta, sin desplazamiento interno.
- **`opacity`** intermedia solo mezcla el fondo; `visibility: hidden` y `opacity: 0` quitan lo dibujado.
- **`line-height` no se aplica**: se lee y se hereda, pero la maqueta no lo usa. El alto de una línea es el de su
  pieza más alta más 2 px.
- **Animaciones:** solo se ve el estado final. `lib/animacion.dash` existe y tiene test, pero el navegador no lo
  importa (tarea 31q).
- **Medir texto** con las fuentes del Amiga (`font_text_width`...). Elección de fuente: `@font-face`; la de mapa de bits
  del Workbench (helvetica, times, courier) si hay ese tamaño; si no, la vectorial (CGTriumvirate, CGTimes,
  LetterGothic); y topaz como último recurso. Negrita y cursiva por software. `font-size` medio: 13 px.

## 9. Pintor y fuentes

- `pintar` recorre todos los dibujos y pinta los que caen en la franja visible, cada uno recortado a mano.
- **Color:** por lápices (`color_pen`, `ObtainBestPen` con caché de 128). En RGB directo: mezclas con alfa y
  degradados (`gfx_blend_rect`, `gfx_gradient_rect`); en pantallas de paleta salen tramados.
- **Desplazar** repinta toda la franja visible (sin `ScrollRaster`). El doble búfer evita ver el repintado.
- **Imágenes** con su copia escalada, `object-fit`, fondos con tamaño, posición y repetición (hasta 4000 mosaicos).
- **Iconos de fuentes de iconos** (Font Awesome) se dibujan con primitivas: esas fuentes no se bajan.
- **Fuentes web** (`fuente_web.dash`): stb_truetype rasteriza los caracteres 32-255 a 1 bit (sin suavizado) en un
  `TextFont` en memoria, y el pintor no nota la diferencia. TTF, OTF y WOFF1; no WOFF2. Siempre peso 400 normal.
  Como mucho 8 por página. A Google Fonts se le pide solo Latin-1 (`text=`): 50 KB por peso en vez de 325 KB.
- **Tamaño mínimo 2 px** al abrir una fuente (Dash D57): diskfont y bullet de AmigaOS 3.2 escriben fuera de su
  memoria con 0 o 1.

## 10. JavaScript

- **QuickJS** (2026-06-04, `third_party/quickjs`) compilado aparte a `build/qjs-lib/libqjs.a` (`tools/build_qjs.sh
  lib`), con FPU y fdlibm (la libm de la ROM daba resultados erróneos). Tres cambios para AmigaOS y un cuarto opcional
  (`quickjs_amiga.md`): un perfil por muestras dentro de QuickJS, solo con `-DJS_PERFIL`, para ver qué función de JS
  pesa. Ojo: ese documento aún describe el `malloc_usable_size` antiguo; el código ya guarda el tamaño en una
  cabecera de 8 bytes para que funcione el límite de memoria.
- **Un motor por página**, solo si tiene `<script>`. Se crea antes del estilo y se libera con el documento. Coste
  fijo: ~150 KB y evaluar el preludio (~46 KB de JS).
- **Límites:** 48 MB de memoria (`JS_MEMORIA`, por Next.js), 192 KB de pila de JS sobre 256 KB de `@stack`, 10.000
  trabajos de promesas por vaciado. **No hay límite de tiempo**: un bucle infinito en una página bloquea el navegador.
- **Puente DOM** (`jsdom.dash`), en tres capas:
  - C (`@c`/`@native`): una clase `Node` con el `Nodo` como dato opaco (`_dash_retain` al crear, `_dash_release` en
    el finalizador) y una tabla nodo → objeto, para que `a === b` funcione. Getters, setters y métodos básicos.
  - Dash: la lógica sobre `Nodo` (selectores, `innerHTML`, insertar, clonar, `getComputedStyle`, ejecutar scripts).
  - `jsdom_preludio.js`: el entorno de navegador en JS normal (eventos, temporizadores, `classList`, `dataset`,
    `style`, `document.*`, `window`, `URL`/`URLSearchParams`, `TextEncoder`, `ReadableStream`, `location`...).
    Cada interfaz (`HTMLElement`, `HTMLIFrameElement`, `SVGElement`, `Text`, `Window`, `EventTarget`...) tiene su
    `instanceof` con `Symbol.hasInstance`; está `PromiseRejectionEvent` (sin él, core-js cambia el `Promise` de QuickJS
    por el suyo, mucho más lento).
    `tools/preludio.py` lo convierte en `jsdom_preludio.dash`; los tests comprueban que esté al día.
- **Scripts:** en orden de documento, sin `async`/`defer` ni módulos. Un `src` que no llegó se baja en ese momento,
  de forma síncrona. Luego `DOMContentLoaded`, y `load` con el primer tic.
- **Eventos desde el navegador:** clic y envío de formulario. No: teclado, `input`, `change`, `focus`, `scroll`,
  `resize`.
- **Temporizadores:** una cola en el preludio. El navegador la avanza con `jsdom_temporizadores`, que devuelve cuánto
  falta para el siguiente; eso entra en `programar`.
- **Errores:** a la salida del programa ("JS: ..."), nunca a la interfaz. También las promesas rechazadas sin capturar.
- **Lo que falta:** `fetch`, `XMLHttpRequest`, `WebSocket`, `Worker`, `Blob`, `FormData`... `location.assign`/`replace`
  no navegan. Las medidas de maqueta que ve el JS son falsas (`offsetWidth` 100, rects en 0; tarea 37b). Shadow DOM solo
  mínimo (`attachShadow`). Lo que no es Latin-1 llega como `?` (tarea 37a4).

## 11. Red

- **Capas:** builtins `net_*`/`tls_*` de Dash → `red.dash` (`Conexion`, búfer propio, lectura por líneas y trozos) →
  `http.dash`.
- **Sin bloquear:** el nombre se busca en otro proceso; la conexión y la negociación TLS avanzan con `*_poll`. Como
  mucho 16 aperturas a la vez (runtime).
- **Reintento:** una conexión callada más de 5 s antes de TLS, o un TLS agotado, se abre otra vez (hasta 2).
- **Conexiones que se reutilizan:** solo en las cargas asíncronas (`http_seguir = true` en el navegador). Hasta 8
  libres, 10 s cada una. Ahorran un 10 %.
- **TLS** con AmiSSL 5, verificando el certificado. La reanudación de sesión está en el runtime (D55), pero el
  ahorro es pequeño (9,0 → 7,9 s por conexión en un A1200) porque las conexiones a un servidor se abren a la vez.
- **HTTP/1.1** (`Carga`): GET y POST, 5 redirecciones (tras un POST se sigue con GET salvo 307/308), `chunked`,
  gzip y deflate con el inflate de stb_image (solo textos; lo que va a fichero se pide `identity`).
  Cabeceras: `User-Agent: dashweb/0.1 (AmigaOS)`, `Accept-Encoding`, `Cookie`, `Connection`.
- **La respuesta entera va a memoria** antes de escribirse a fichero, también en descargas y vídeo, y no hay tope de
  tamaño. Una descarga muy grande puede agotar la memoria.
- **Tiempos de espera** (sin recibir nada): página 20 s, CSS/JS/imágenes 15 s, descarga 30 s, vídeo 60 s.
- **Cookies** (`cookies.dash`): RFC 6265 en lo que usan las webs (dominio, ruta, caducidad, Secure, HttpOnly; no
  SameSite ni sufijos públicos). Hasta 300. Las persistentes se guardan en `PROGDIR:dashweb.cookies`.
  `document.cookie` sin las HttpOnly.
- **Rastreadores:** los scripts de 20 dominios conocidos no se bajan (`url_rastreador`). gtag.js son 465 KB: la carga de
  freemem.space bajó de 31,4 s a 24,7 s.
- **Esquemas:** `http`, `https`, `file:` (como NetSurf: `file:///Vol/a` → `Vol:a`), `dashweb:`. **`data:` no**: una
  imagen `data:` sale como hueco.

## 12. Imágenes

- **Descarga** (`imagenes.dash`): 4 a la vez; el mismo `src` una vez; `loading=lazy` a menos de dos pantallas; los
  fondos, solo cuando alguna maqueta los pinta. Se guardan en `T:` y se borran con el documento.
- **Decodificar al tamaño en que se ve:** el del HTML, el de la maqueta o el de `srcset` (objetivo 1024 px); como
  mucho 1280x1024.
- **Decodificadores propios** (`imagen_dec.dash`, `build/img-lib/libimg.a`):

| Formato | Decodificador | Reducción |
|---|---|---|
| JPEG baseline | TJpgDec | Al decodificar: 1/2, 1/4, 1/8 |
| WebP | libwebp | Al decodificar |
| SVG | nanosvg | Rasteriza al tamaño visto (máx. 4096) |
| PNG, GIF, BMP, JPEG progresivo | stb_image | Después, por bloques |
| ILBM y el resto | datatypes (reserva, proceso principal) | — |

- **En otro proceso**, hasta 4: el pedido lleva su copia del nombre; la tarea lee el fichero (máx. 64 MB) y devuelve
  píxeles RGB(A). El principal pregunta en cada tic (`task_done`), recoge y crea la imagen (`image_from_rgb`). Si no
  puede crear el proceso, decodifica en el principal.
- **A pantalla** (runtime de Dash): en RTG, un BitMap escrito directamente en RGB (D54: de 120 ms a 5 ms por imagen); si
  no, picture.datatype con reasignación de colores. Transparencia con máscara de 1 bit (alfa ≥ 128).
- **Sin** AVIF, JPEG XL, WebP animado.

## 13. Vídeo

- **MintVID** (`third_party/mintvid`, `build/video-lib/libvideo.a`): MP4/MOV, AVI, MKV, TS; H.264 (libavc, con
  ensamblador de 68k), MPEG-1, MPEG-4, MJPEG y más. Sonido AAC-LC y MP3 por Paula (MintAMP). Fuera por licencia:
  MPEG-2, AC-3, DV.
- **Empieza mientras baja:** intenta abrir el fichero cada 256 KB de descarga.
- **El sonido manda el reloj.** Se salta lo que llega tarde; con más de 200 ms de retraso, H.264 pasa a modo turbo.
- **Pantalla completa** en una ventana MUI propia.
- **YouTube** (`youtube.dash`): la página del vídeo y la API `youtubei/v1/player` con varios clientes, hasta encontrar
  el MP4 de 360p (itag 18).
- Medidas: 640x360 a su tamaño, ~9 imágenes/s en el emulador objetivo; 320x180 escalado, 25/s. Sin medir en PiStorm.
- Los comentarios de cabecera de `video.dash` y `videos.dash` dicen "sin sonido": está desfasado.

## 14. Formularios

El estado de cada control vive en los atributos del nodo (`value`, `checked`, `selected`). La maqueta crea un dibujo
`D_CONTROL` y el pintor lo pinta. Un clic cambia el control (`formulario_clic`; un `select` pasa a la opción siguiente);
las teclas escriben (`formulario_tecla`). El envío (`formulario_envio`) hace GET o POST `x-www-form-urlencoded`; no
hay `multipart`.

## 15. Lo que Dash tuvo que añadir

| Tema | Tareas |
|---|---|
| Textos | D2, D3, D7, D15, D17, D22, D61 |
| Listas, diccionarios y tipos | D1, D4a, D4b, D4c, D5, D37, D49, D53 |
| Memoria y propiedad | D6 (`weak`), D16, D26 (`@native(borrow)`) |
| Módulos y nombres | D14, D18, D45 |
| Red y TLS | D8, D11, D36, D41, D52, D55, D60 (D30 se intentó y se deshizo) |
| Gráficos, fuentes e imágenes | D9, D12, D12b, D28, D40, D42, D43, D50, D51, D54, D56, D57 |
| MUI | D31, D32, D35, D38, D48, D58 |
| C de fuera, procesos y arranque | D10, D10b (`@link`, `@c`), D19, D20, D21, D24 (`@stack`), D25, D27, D47 (`task_start`), D59 |
| Herramientas | D23 (perfilador), D29, D34, D44, D46 |

## 16. Decisiones

| Decisión | Por qué | Bitácora |
|---|---|---|
| PiStorm y emulación con JIT como objetivo; 68020 + FPU | Decisión del usuario | Objetivo, 2026-10-15 |
| Todo en Dash; lo que falte, a Dash | dashweb existe para hacer crecer Dash | Tarea 2 |
| Estilo, maqueta y pintor propios (no NetSurf ni litehtml) | Decisión del usuario; la maqueta de NetSurf es GPL | 2026-10-16 |
| Hubbub para el HTML | El analizador propio no trataba etiquetas mal anidadas, tablas ni modos de inserción; Hubbub es MIT y ya va en 68k | Tarea 36 |
| QuickJS como librería, sin traducirlo a Dash | 69.000 líneas, meses de trabajo para tener lo mismo | 31k |
| Latin-1 en todo | Es el juego del Amiga y de sus fuentes | Tarea 4 |
| Decodificadores propios en vez de datatypes | Los datatypes decodifican a tamaño completo, sin límites y sin WebP ni SVG | Tarea 29 |
| Decodificar en otro proceso, prioridad -1 | La ventana responde; un poco más lento (46,7 s frente a 41,6 s) | 29c |
| QuickJS y libimg con FPU | Mezclar FPU y no FPU rompía los números devueltos (`Date.now()`, SVG de 0x0) | 28g, 29b |
| Un solo temporizador y "empezar / avanzar" | La red de FS-UAE no avisa por señal (D30 se deshizo) | 20a |
| Restyle parcial con "toques" | Las cascadas tras cada cambio del JS costaban segundos | 2026-10-17 |
| Repintar como mucho cada 2,5 s mientras llegan imágenes | Había 17 repintados de página entera por carga | 28l |
| Conexiones que se reutilizan y reintento a los 5 s | Un 10 % menos; un servidor no contesta a una conexión callada mucho tiempo | 28h, 28b |
| Bloquear rastreadores | 465 KB de JS que no aportan nada a la página | 2026-10-17 |
| CSS por módulos según la especificación, comparado con Chrome | Nada a medida de una web concreta | 31a |
| MintVID para el vídeo | Viable en 68k; MIT + Apache | 30a |
| Datos en `PROGDIR:` | No apuntado en la bitácora | 35a |

## 17. Rendimiento y memoria

Medidas en la máquina rtg emulada (68040 + JIT), las más recientes de la bitácora:

- **freemem.space entera:** de 105-128 s al principio a **21-23 s** (2026-10-20). La máquina va al 100 % todo el
  rato: solo baja quitando trabajo. Lo que más pesa: el primer estilo (~3,7 s) y cada maqueta (~1 s).
- **pre.opentimetrack.com** (encargo 37): una maqueta bajó de 21,7 s a 6,7 s (37a1) y los scripts de 31 s a 6,7 s
  (37a3: core-js cambiaba el `Promise` de QuickJS por el suyo). Ahora pesa la maqueta: 6,2-7 s cada una, y GSAP y React
  la hacen rehacer entera a cada cambio de `style` (37a5).
- **Optimizaciones que más ganaron:** mezclas por bloques (D51, 35 veces); imágenes directas en RTG (D54, 24 veces);
  estilo con índice, filtro de antecesores y caché (5,0 s → 1,5 s); quitar rastreadores (−7 s).
- **Memoria:** ~350 KB una página sencilla; motor JS recién creado ~150 KB; libavc pide 5 MB al crear el decodificador.
  Ejecutable MUI ~1,1 MB. Con 8 MB, jQuery se quedaba sin memoria.
- **Para medir:** `tools/medir_visor.py` (`--perfil`, `--traza`, `--captura`), `./dash --profile`.
- La tabla del README (A1200, 2026-10-16) está desfasada.

## 18. Pruebas

- `python3 tests/run.py`: un `test_*.dash` por módulo (57 ficheros hoy), compilados con `--fpu` y ejecutados en FS-UAE en un
  arranque, comparando con `# expect-out:`. Servidores locales (`tests/servers/http.py`, también TLS, lento, comprimido);
  nunca webs de terceros. Comprueba también que el preludio esté al día y que `src/` compile.
- `--memcheck`: 0 vivos al salir.
- `tools/comparar_chrome.py`: Chrome sin ventana a 940x614 (el tamaño de la zona de página en la máquina rtg) sobre 13
  webs (`tools/webs_prueba.txt`); a mano.
- Fallos intermitentes: N cargas limpias seguidas (p. ej. 20 de 20). Herramientas de caza: `_JS_GUARDAS`, cuarentena,
  `-D_DASH_PIXGUARD`, `docs/parches/caza_memoria_hubbub.patch`.
- El usuario lo prueba a mano en CoffinOS (Amiberry, MUI 3.8).

## 19. Límites conocidos y cosas a revisar

Del código (comprobado para este documento):

- `line-height` no se aplica; no hay `text-align: justify`.
- Las animaciones CSS no corren en el navegador (`animacion.dash` sin usar).
- El texto no rodea los flotantes; `overflow` no desplaza; `sticky` va como `relative`.
- Sin `:hover`/`:focus`.
- La maqueta se rehace entera tras cada cambio del JS.
- El JS no tiene límite de tiempo; no hay `fetch`/XHR; `location.assign` no navega; geometría falsa.
- Las respuestas HTTP van enteras a memoria, sin tope.
- `data:` no está.
- La red se pregunta cada 50 ms (tarea 39 con D60).
- **A revisar:** `tools/paquete.sh` compila `src/` sin `--fpu`, así que el código de Dash usa coma flotante por software y
  se enlaza con librerías compiladas con FPU. Los tests sí usan `--fpu`. La bitácora dice que mezclar las dos formas rompía
  los números devueltos entre funciones; no se ha comprobado si aquí cruza algún número con decimales.

Documentación desfasada encontrada:

- `quickjs_amiga.md`: el cambio de `malloc` ya no es la rama de Emscripten.
- Cabeceras de `maqueta.dash` ("position, más adelante") y de `video.dash`/`videos.dash` ("sin sonido").
- README: "reanuda la sesión TLS de cada servidor" es cierto, pero el ahorro apenas se nota.

Pendiente del plan (relevante para la arquitectura): 37a5 (maqueta lenta y rehecha a cada cambio), 37a4 (UTF-8 en el JS), 37b-37g (geometría
para el JS, `scroll`, `requestAnimationFrame`, `IntersectionObserver`, transformaciones, WOFF2), 39 (red por señal),
32 (APIs del navegador), 28j (Next.js agota la memoria), 31q (animaciones), 40 (lo de este apartado).

## 20. Constantes

| Constante | Valor | Dónde |
|---|---|---|
| `MAX_VENTANAS` | 4 | `src/dashweb.dash` |
| Tic de carga | 50 ms | `src/dashweb.dash` (`programar`) |
| `DOCUMENTO_REPINTAR` | 2500 ms | `documento.dash` |
| `RECURSOS_A_LA_VEZ` | 4 | `recursos.dash` |
| `IMAGENES_A_LA_VEZ`, `IMAGENES_DECODIFICANDO`, `FUENTES_A_LA_VEZ` | 4, 4, 4 | `imagenes.dash` |
| Fuentes web por página | 8 | `imagenes.dash` |
| `IMAGEN_MAX_ANCHO` × `IMAGEN_MAX_ALTO` | 1280 × 1024 | `imagenes.dash` |
| `IMAGEN_PILA` | 256 KB | `imagen_dec.dash` |
| `DOM_TOQUES_MAX` | 200 | `dom.dash` |
| `ESTILO_MEDIUM` | 13 px | `estilo.dash` |
| `JS_MEMORIA` | 48 MB | `js.dash` |
| Pila de JS / `@stack` | 192 KB / 256 KB | `js.dash` |
| `HTTP_MAX_REDIRECCIONES` | 5 | `http.dash` |
| `HTTP_LIBRES_MAX`, `HTTP_LIBRE_MS` | 8, 10 s | `http.dash` |
| `RED_CALLADA_MS` | 5 s (2 reintentos) | `red.dash` |
| `COOKIES_MAX` | 300 | `cookies.dash` |
| `VIDEO_PROBAR` | 256 KB | `videos.dash` |
| Pila del vídeo | 400.000 | `video.dash` |
| Aperturas de red / TLS / sesiones TLS | 16 / 16 / 8 | runtime de Dash |
