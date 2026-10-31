# Tachyon

*[English](README.md) | Castellano*

(Antes **dashweb**: el nombre cambió el 2026-10-21 porque ya había un navegador "Dash Web".)

Navegador web para **Commodore Amiga**, escrito en [Dash](https://github.com/FreeMEM/dash) con
interfaz **MUI** (3.8 o 5): XHTML, CSS, JavaScript moderno y HTTPS.

Es también el banco de pruebas de Dash: un programa grande y exigente que obliga a hacer crecer el
lenguaje, sus librerías y su rendimiento.

**Descarga:** versión de prueba
[v0.7.5-alfa](https://github.com/FreeMEM/tachyon/releases/tag/v0.7.5-alfa) (`tachyon.lha`). Es una alfa:
puede pararse en algunas páginas. Si algo va mal, *Proyecto → Enviar informe de depuración...* manda lo que
Tachyon ha apuntado (lo ves entero antes) y te da un código para ponerlo en la
[incidencia](https://github.com/FreeMEM/tachyon/issues).

## Estado

Fase A (sin MUI): `src/visor.dash` abre una página (fichero o URL http/https), la maqueta, la pinta en una
ventana normal y ejecuta su JavaScript. Fase B (MUI 5): `src/dashweb.dash`, el navegador: barra de dirección,
atrás/adelante, recargar, parar, historial desplegable, marcadores, página de inicio, hasta 4 ventanas, atajos de
menú, descargas a disco, cookies (guardadas entre sesiones, se ven y se borran en `dashweb:cookies`), direcciones
`file:///Volumen/ruta`; las páginas llegan sin congelar la ventana (consulta DNS, conexión y negociación TLS incluidas, con un
indicador de actividad; imágenes, hojas y scripts a la vez); enlaces, anclas, formularios (GET y POST). Plan y bitácora en
[docs/DASHWEB_LOOP.md](docs/DASHWEB_LOOP.md), módulos en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

- Red: TCP (`bsdsocket.library`), HTTP/1.1 (longitud, `chunked`, redirecciones, conexiones que se reutilizan,
  respuestas comprimidas con gzip) y HTTPS con AmiSSL 5, que reanuda la sesión TLS de cada servidor (ahorra
  poco: 9,0 s a 7,9 s en freemem.space, D55). Las descargas se escriben al fichero según llegan.
- Los scripts de rastreo y publicidad conocidos no se descargan (`URL_RASTREO_BLOQUEAR` en `lib/url.dash`):
  la página va más rápida.
- HTML5 con el analizador de NetSurf (Hubbub, `lib/html5.dash`), árbol DOM, entidades, UTF-8 a Latin-1,
  atributos de presentación.
- Fuentes vectoriales del Amiga (CGTriumvirate, CGTimes, LetterGothic) para los tamaños que no hay en mapa de
  bits. diskfont y bullet de 3.2 escriben fuera de su memoria al abrirlas a 1 píxel o menos, y eso rompía
  QuickJS: Dash nunca pide menos de 2 (D57).
- Al cambiar el DOM desde JavaScript solo se recalcula el estilo de lo afectado.
- CSS 2.1 y CSS3 por módulos, comparado con Chrome en 13 webs reales (`tools/comparar_chrome.py`): cascada con
  `@layer`, `@media` y `@supports`; Selectors 4 (`:is`, `:where`, `:has`, `:not` con listas); Flexbox, Grid y
  tablas automáticas; `calc()`, `min()`, `max()`, `clamp()` y vw/vh/rem/ch; posicionado (relative, absolute,
  fixed), `z-index` y `overflow`; `border-radius`, `box-shadow`, `opacity`; Transforms; Color 4 y 5 (`oklch`,
  `color-mix`...); Text 3 (`nowrap`, puntos suspensivos, `text-shadow`, `text-indent`, `line-height`); `@font-face`
  (TTF, OTF, WOFF y WOFF2 hechas fuentes del Amiga con stb_truetype, con `font-stretch`); animaciones de CSS
  (`@keyframes` de transform, opacity y color) y `:hover`. Solo se repinta lo que cambia.
- Imágenes: JPEG, PNG, GIF, BMP, WebP y SVG con decodificadores propios en otro proceso (la ventana no se para),
  con transparencia; ILBM y lo demás por datatypes. SVG dentro de la página (iconos y sprites con `<use>`).
- Vídeo: `<video>` y los vídeos de YouTube (MintVID), que empiezan a verse mientras bajan, a pantalla completa.
- JavaScript con QuickJS (ES2023+, con FPU) y `Math.*` de fdlibm: DOM (`getElementById`, `querySelector(All)`,
  `innerHTML`, crear y mover nodos, scripts que se añaden...), eventos (también del ratón), `setTimeout`/
  `setInterval`, `fetch` y `XMLHttpRequest`, `TextEncoder`/`TextDecoder`, `crypto` (SHA-256, `randomUUID`),
  geometría (`getBoundingClientRect`, SVG). `document.cookie` funciona. Un script que pasa de 30 s se corta.

Lo que dashweb ha necesitado y no tenía Dash se ha añadido a Dash (rama `dashweb`, tareas D1-D68): textos
rápidos, listas y diccionarios con tipo, red, TLS, fuentes, imágenes, C de fuera (`@link`, `@c`), etc.

### Medidas (FS-UAE, 2026-10-16)

`objetivo` = 68040 + JIT a toda velocidad (lo más parecido a un PiStorm); `A1200` = 68020 a 14 MHz. En ms,
con las fuentes del Workbench (helvetica, times, courier).

| Página | Máquina | carga | html | js | estilo | imágenes | maqueta | pintar |
|---|---|---|---|---|---|---|---|---|
| prueba.html (8,8 KB) | objetivo | 7 | 17 | 0 | 76 | 0 | 242 | 22 |
| prueba.html | A1200 | 459 | 1091 | 15 | 5545 | 15 | 5829 | 92 |
| imagenes.html | objetivo | 2 | 2 | 0 | 15 | 5 | 155 | 24 |
| imagenes.html | A1200 | 53 | 113 | 1 | 1023 | 193 | 640 | 94 |
| js.html | objetivo | 2 | 2 | 28 | 15 | 1 | 156 | 16 |
| js.html | A1200 | 57 | 97 | 1635 | 1108 | 6 | 681 | 51 |

Memoria: 350 KB para prueba.html (con el motor JS, 330 KB para una página pequeña). En la configuración objetivo
una página va en menos de medio segundo. Hoy (2026-10-21) el navegador ocupa 3,4 MB al cargarse, y una web real
como freemem.space tarda unos 23 s entera (con sus imágenes y fuentes) en la configuración objetivo, en la red del
emulador, y gasta 29-39 MB, casi todo en sus imágenes (tarea 40h). En un A1200 el estilo y la maqueta son lo lento: `./dash --profile` (Dash D23) señala la cascada (`_estilo_nodo`,
`_cumple_desde`: cada elemento prueba todos los selectores) y el corte en palabras (`_palabras`).

Las primeras medidas del A1200 (tarea 17) eran el triple de lentas: el modo de pruebas de Dash (`--autoclose`)
miraba el reloj en cada vuelta de cada `while` (arreglado en Dash, D34).

## Requisitos previstos

- AmigaOS 3.x con un 68030 o superior y FPU (68881/68882 o la del 040/060), y mucha memoria Fast.
  Un A500 o un A1200 sin ampliar no son el objetivo.
- MUI 3.8 o 5, AmiSSL 5 (HTTPS), una pila TCP/IP (`bsdsocket.library`). Con MUI 3.8 la pantalla completa
  de los vídeos deja un marco gris de unos píxeles (el espaciado de ventana de sus preferencias).

## Paquete

`tools/paquete.sh` deja `build/dashweb.lha` (el navegador, el visor, `LEEME` con la instalación y las licencias).
Requisitos en el Amiga: AmigaOS 3.x, 68020 o mejor, MUI 3.8 o 5, una pila TCP/IP (bsdsocket.library) y, para
HTTPS, AmiSSL 5.

## Probar

Necesita el toolchain de Dash (`m68k-amigaos-gcc` en `/opt/amiga`) y Dash en `~/Projects/FreeMEMLang/.worktrees/dashweb`
(o la variable `DASH`). Las variables del emulador son las de Dash (`docs/INSTALACION.md` de Dash).

```bash
python3 tests/run.py                   # compila los tests y los ejecuta en FS-UAE
python3 tests/run.py --memcheck        # con la comprobación de memoria de Dash
tools/medir_visor.py --pagina prueba.html --maquina objetivo --captura visor.png
tools/medir_visor.py --maquina rtg --sistema ~/.cache/dash-emu/sys32rtg38 --programa src/dashweb.dash \
    --pagina https://freemem.space/ --captura mui38.png     # con MUI 3.8 (sys32rtg con el MUI 3.8 de Aminet)
tools/emu_sys_fuentes.sh ~/.cache/dash-emu/sys31ssl <disco del Workbench .hdf> ~/.cache/dash-emu/sys31web
```

## Compilar el motor JavaScript

Necesita el toolchain de Dash (`m68k-amigaos-gcc` en `/opt/amiga`) y el repo de Dash al lado
(`../FreeMEMLang`, o la variable `DASH`), del que se usa el float por software.

```bash
tools/build_qjs.sh 000                       # 68000, float por software (fp-bit)
tools/build_qjs.sh 020fpu -m68020 -m68881    # 68020+ con FPU
tools/build_qjs.sh lib                       # build/qjs-lib/libqjs.a para lib/js.dash (con fdlibm)
export DASH_KICKSTART=... DASH_EMU_SYS=...   # como en Dash
tools/emu_qjs.py build/qjs-000/qjs tests/js "hello.js" "test_language.js"
```

## Licencia

MIT (ver [LICENSE](LICENSE)). `third_party/quickjs` y `third_party/hubbub` también son MIT; `third_party/fdlibm`
lleva la licencia de Sun de cada fichero. Las demás librerías de `third_party` llevan la suya en su carpeta.
