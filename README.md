# Tachyon

*English | [Castellano](README.es.md)*

(Formerly **dashweb**: the name changed on 2026-10-21 because there was already a browser called "Dash Web".)

Web browser for the **Commodore Amiga**, written in [Dash](https://github.com/FreeMEM/dash) with an
**MUI** (3.8 or 5) interface: XHTML, CSS, modern JavaScript and HTTPS.

It is also Dash's testbed: a large, demanding program that forces the language, its libraries and its
performance to grow.

**Download:** test release
[v0.7.3-alfa](https://github.com/FreeMEM/tachyon/releases/tag/v0.7.3-alfa) (`tachyon.lha`). It is an alpha:
it may freeze on some pages.

## Status

Phase A (no MUI): `src/visor.dash` opens a page (a file or an http/https URL), lays it out, draws it in a plain
window and runs its JavaScript. Phase B (MUI 5): `src/dashweb.dash`, the browser: address bar, back/forward, reload,
stop, history drop-down, bookmarks, home page, up to 4 windows, menu shortcuts, downloads to disk, cookies (kept
between sessions, viewed and deleted at `dashweb:cookies`), `file:///Volumen/ruta` addresses; pages load without
freezing the window (DNS lookup, connection and TLS handshake included, with an activity indicator; images,
stylesheets and scripts in parallel); links, anchors, forms (GET and POST). Plan and log in
[docs/DASHWEB_LOOP.md](docs/DASHWEB_LOOP.md), modules in [docs/ARQUITECTURA.en.md](docs/ARQUITECTURA.en.md).

- Network: TCP (`bsdsocket.library`), HTTP/1.1 (content length, `chunked`, redirects, reused connections,
  gzip-compressed responses) and HTTPS with AmiSSL 5, which resumes each server's TLS session (it saves
  little: 9.0 s to 7.9 s on freemem.space, D55). Downloads are written to the file as they arrive.
- Known tracking and advertising scripts are not downloaded (`URL_RASTREO_BLOQUEAR` in `lib/url.dash`):
  the page loads faster.
- HTML5 with NetSurf's parser (Hubbub, `lib/html5.dash`), DOM tree, entities, UTF-8 to Latin-1,
  presentational attributes.
- Amiga outline fonts (CGTriumvirate, CGTimes, LetterGothic) for the sizes not available as bitmaps. The 3.2
  diskfont and bullet write outside their memory when a font is opened at 1 pixel or less, and that broke
  QuickJS: Dash never asks for less than 2 (D57).
- When JavaScript changes the DOM, only the style of what is affected is recomputed.
- CSS 2.1 and CSS3 by modules, compared against Chrome on 13 real websites (`tools/comparar_chrome.py`): cascade with
  `@layer`, `@media` and `@supports`; Selectors 4 (`:is`, `:where`, `:has`, `:not` with lists); Flexbox, Grid and
  automatic table layout; `calc()`, `min()`, `max()`, `clamp()` and vw/vh/rem/ch; positioning (relative, absolute,
  fixed), `z-index` and `overflow`; `border-radius`, `box-shadow`, `opacity`; Transforms; Color 4 and 5 (`oklch`,
  `color-mix`...); Text 3 (`nowrap`, ellipsis, `text-shadow`, `text-indent`, `line-height`); `@font-face`
  (TTF, OTF, WOFF and WOFF2 turned into Amiga fonts with stb_truetype, with `font-stretch`); CSS animations
  (`@keyframes` for transform, opacity and color) and `:hover`. Only what changes is redrawn.
- Images: JPEG, PNG, GIF, BMP, WebP and SVG with its own decoders in a separate process (the window doesn't stall),
  with transparency; ILBM and the rest via datatypes. Inline SVG in the page (icons and sprites with `<use>`).
- Video: `<video>` and YouTube videos (MintVID), which start playing while they download, full screen.
- JavaScript with QuickJS (ES2023+, with FPU) and `Math.*` from fdlibm: DOM (`getElementById`, `querySelector(All)`,
  `innerHTML`, creating and moving nodes, added scripts...), events (mouse events too), `setTimeout`/
  `setInterval`, `fetch` and `XMLHttpRequest`, `TextEncoder`/`TextDecoder`, `crypto` (SHA-256, `randomUUID`),
  geometry (`getBoundingClientRect`, SVG). `document.cookie` works. A script that runs for more than 30 s is cut off.

Whatever dashweb has needed and Dash lacked has been added to Dash (`dashweb` branch, tasks D1-D68): fast
strings, typed lists and dictionaries, networking, TLS, fonts, images, external C (`@link`, `@c`), etc.

### Measurements (FS-UAE, 2026-10-16)

`objetivo` = 68040 + JIT at full speed (the closest thing to a PiStorm); `A1200` = 68020 at 14 MHz. In ms,
with the Workbench fonts (helvetica, times, courier).

| Page | Machine | load | html | js | style | images | layout | paint |
|---|---|---|---|---|---|---|---|---|
| prueba.html (8.8 KB) | objetivo | 7 | 17 | 0 | 76 | 0 | 242 | 22 |
| prueba.html | A1200 | 459 | 1091 | 15 | 5545 | 15 | 5829 | 92 |
| imagenes.html | objetivo | 2 | 2 | 0 | 15 | 5 | 155 | 24 |
| imagenes.html | A1200 | 53 | 113 | 1 | 1023 | 193 | 640 | 94 |
| js.html | objetivo | 2 | 2 | 28 | 15 | 1 | 156 | 16 |
| js.html | A1200 | 57 | 97 | 1635 | 1108 | 6 | 681 | 51 |

Memory: 350 KB for prueba.html (with the JS engine, 330 KB for a small page). In the target configuration
a page takes less than half a second. Today (2026-10-21) the browser takes up 3.4 MB when loaded, and a real
website such as freemem.space takes about 23 s to load fully (with its images and fonts) in the target configuration,
on the emulator's network, and uses 29-39 MB, almost all of it for its images (task 40h). On an A1200 style and layout are the slow parts: `./dash --profile` (Dash D23) points at the cascade (`_estilo_nodo`,
`_cumple_desde`: every element tries every selector) and word splitting (`_palabras`).

The first A1200 measurements (task 17) were three times slower: Dash's test mode (`--autoclose`)
checked the clock on every iteration of every `while` (fixed in Dash, D34).

## Expected requirements

- AmigaOS 3.x with a 68030 or better and an FPU (68881/68882 or the built-in one of the 040/060), and plenty of
  Fast RAM. An A500 or an unexpanded A1200 is not the target.
- MUI 3.8 or 5, AmiSSL 5 (HTTPS), a TCP/IP stack (`bsdsocket.library`). With MUI 3.8, full-screen video leaves
  a grey border a few pixels wide (the window spacing from its preferences).

## Package

`tools/paquete.sh` produces `build/dashweb.lha` (the browser, the viewer, `LEEME` with the installation instructions
and the licenses). Requirements on the Amiga: AmigaOS 3.x, 68020 or better, MUI 3.8 or 5, a TCP/IP stack
(bsdsocket.library) and, for HTTPS, AmiSSL 5.

## Testing

It needs the Dash toolchain (`m68k-amigaos-gcc` in `/opt/amiga`) and Dash in `~/Projects/FreeMEMLang/.worktrees/dashweb`
(or the `DASH` variable). The emulator variables are Dash's (Dash's `docs/INSTALACION.md`).

```bash
python3 tests/run.py                   # builds the tests and runs them in FS-UAE
python3 tests/run.py --memcheck        # with Dash's memory check
tools/medir_visor.py --pagina prueba.html --maquina objetivo --captura visor.png
tools/medir_visor.py --maquina rtg --sistema ~/.cache/dash-emu/sys32rtg38 --programa src/dashweb.dash \
    --pagina https://freemem.space/ --captura mui38.png     # with MUI 3.8 (sys32rtg with MUI 3.8 from Aminet)
tools/emu_sys_fuentes.sh ~/.cache/dash-emu/sys31ssl <disco del Workbench .hdf> ~/.cache/dash-emu/sys31web
```

## Building the JavaScript engine

It needs the Dash toolchain (`m68k-amigaos-gcc` in `/opt/amiga`) and the Dash repo alongside
(`../FreeMEMLang`, or the `DASH` variable), whose software float is used.

```bash
tools/build_qjs.sh 000                       # 68000, software float (fp-bit)
tools/build_qjs.sh 020fpu -m68020 -m68881    # 68020+ with FPU
tools/build_qjs.sh lib                       # build/qjs-lib/libqjs.a for lib/js.dash (with fdlibm)
export DASH_KICKSTART=... DASH_EMU_SYS=...   # as in Dash
tools/emu_qjs.py build/qjs-000/qjs tests/js "hello.js" "test_language.js"
```

## License

MIT (see [LICENSE](LICENSE)). `third_party/quickjs` and `third_party/hubbub` are MIT too; `third_party/fdlibm`
carries Sun's license in each file. The other libraries in `third_party` carry their own in their folder.
