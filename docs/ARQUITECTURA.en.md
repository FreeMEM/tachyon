# dashweb architecture

*English | [Castellano](ARQUITECTURA.md)*

How dashweb is built inside, as the code stands on 2026-10-20 (commit `cdfe376`: v0.2.0-alfa plus task 37 in
progress). Replaces the draft from 2026-10-15.

What each document is:

- **This one:** the engineering: parts, data, processes, decisions and limits.
- `ingenieria/`: the full engineering package (requirements, use cases, flows, states, data model, interface,
  modules, tests, build, risks). Start at `ingenieria/00_INDICE.md`.
- `DASHWEB_LOOP.md`: the plan and the log (the diary; that is where the reasons and the measurements come from).
- `COMO_SE_CONSTRUYE.md` and `TUTORIAL.md`: how to build applications with Dash and MUI.
- `quickjs_amiga.md`: the changes to QuickJS.

It is updated when the architecture changes, not on every task. References are by file and function; line numbers
change.

## 1. Goal and constraints

- **Target machine:** PiStorm (Emu68) and emulation with JIT. Nothing is optimised for, or measured on, a real 68k.
  To measure "like the target": FS-UAE with a 68040, JIT and maximum speed; the usual test machine is the
  "rtg" one (68040 + JIT, AmigaOS 3.2, 1024x768 at 16 bits, 128 MB).
- **CPU:** 68020 or better with FPU. QuickJS and the C libraries are compiled with `-m68020 -m68881`.
- **System** (according to `paquete/LEEME`): AmigaOS 3.2, or 3.5/3.9, because outside RTG images go through
  picture.datatype V43; with 3.0/3.1 the page is shown without images. MUI 3.8 or 5. A TCP/IP stack with
  `bsdsocket.library`. AmiSSL 5 for HTTPS. Tens of MB of Fast memory.
- **Character set: Latin-1**, the Amiga's. All text from the network is converted on the way in.
- **Licences:** only code that can be redistributed under dashweb's MIT licence. Whatever cannot (MUI SDK, AmiSSL,
  ROMs, Workbench) is downloaded by scripts into `~/.cache`.
- **Everything in Dash.** Whatever Dash is missing gets added to Dash (`D<n>` tasks, section 15). C only in
  `third_party/` and in the glue to those libraries.

## 2. Overview

```
 src/dashweb.dash  ── MUI windows (navegador.dashui), event loop, one timer for everything
        │
        ▼
 lib/documento.dash ── one page: owns everything that belongs to it
        │
        ├─ network .... url → red → http (+ cookies) ............ Dash net_* / tls_* (bsdsocket, AmiSSL)
        ├─ resources .. the page's CSS and JS, 4 at a time
        ├─ HTML ....... html5 (Hubbub) → dom ; html + dom for innerHTML and as fallback
        ├─ JS ......... js (QuickJS) + jsdom (C bridge) + jsdom_preludio.js
        ├─ style ...... css → estilo (cascade, partial restyle)
        ├─ layout ..... maqueta → flat list of Dibujo
        ├─ painter .... pintor → Dash gfx_ on the MUI canvas
        ├─ images ..... imagenes (download, sizes) → imagen_dec (decoders, another process)
        ├─ fonts ...... fuente_web (stb_truetype → TextFont)
        └─ video ...... videos → video (MintVID) ; youtube
```

**AmigaOS processes running:**

| Process | Created by | What it does |
|---|---|---|
| Main | — | Everything: interface, network, HTML, JS, style, layout, painting |
| Name lookup | Dash runtime (`net_connect_start`) | `gethostbyname`, which always blocks; signals when done |
| Image decoders | `lib/imagen_dec.dash` (`task_start_with`, priority -1, 256 KB stack) | Up to 4 at a time. C only |

Nothing else runs in parallel. JavaScript, style, layout and painting run in the main process, each in one go.

**Programs:** `src/dashweb.dash` (the MUI browser) and `src/visor.dash` (phase A: no MUI, an Intuition window
with `Window`/`EventLoop`, synchronous loading; used to measure and test the engine).

## 3. The program and its loop

`src/dashweb.dash`:

- **Windows:** `navegador.dashui` (main window and "About"), imported as a module. Up to 4 windows
  (`MAX_VENTANAS`), each one a `struct Ventana` with the generated struct (`v: Navegador`) and its state: the current
  page, the load in progress, the page being prepared, the history, the focus, the download to disk.
- **Events:** numbers from the `.dashui` repeated as constants, plus the program's own (`ID_TIC`, `ID_RANGO`,
  `ID_CERRADA + k`, the full-screen ones). An event's window is the active one (`mui_window_active`), except for
  closing, which carries a number per window.
- **A single timer** (`programar`): one `mui_timer` for all windows, with the shortest wait needed: 50 ms if
  something is arriving; the time of the next JS `setTimeout`; the next video frame. With nothing pending it is not
  armed and the program sleeps. Each `ID_TIC` calls `tic(w)` on every window.
- **The network does not wake the program up yet.** It is polled on every tick. `net_signal`/`task_signal` (Dash D60)
  exist, but no file in `src/` or `lib/` uses them: that is task 39. In FS-UAE `net_signal()` returns 0 (its
  `bsdsocket.library` has no `SO_EVENTMASK`), so the tick will still be needed there.
- **Canvas:** `mui_canvas` with double buffering (`mui_canvas_buffered`). One draw function per window
  (`pinta0`..`pinta3`), because the draw function does not know which canvas it comes from. A new size is detected
  inside the draw function, and whatever cannot be done there is deferred with `mui_timer(1, ID_RANGO)`.
- **Input:** `mui_canvas_on_input`: click (`clic` → `maqueta_nodo_en` → JS → link, form or video), wheel and
  keys (scrolling and forms).
- **Internal pages:** `dashweb:inicio`, `dashweb:marcadores`, `dashweb:cookies` (with `?borrar`), generated as HTML.
- **Saved data**, in `PROGDIR:`: `dashweb.marcadores`, `dashweb.prefs` (`clave=valor`), `dashweb.cookies`.
- **Arguments:** addresses (one window each), `TRAZA` (load timeline), `GCSIEMPRE` (JS GC after every call, to hunt
  bugs).

## 4. A page from end to end

The browser's path (non-blocking):

1. **Load.** `navegar` → `http_empezar` (a `Carga`). On each tick, `avanzar_carga` → `http_avanzar`. If the
   headers say download (`documento_es_descarga`), it is cancelled and fetched to a file after asking for the path.
2. **`documento_empezar`**, in one go:
   - `_documento_de_tipo`: an image, a video or `text/plain` is wrapped in a page of its own.
   - `http_texto` → `texto_decodificar`: to Latin-1.
   - `dom_desde_html5`: the tree (Hubbub).
   - `recursos_del_documento`: requests CSS sheets, `<script src>` and `@import`.
3. **`documento_avanzar`**, on each tick, until all the resources have arrived (4 at a time). It is the only
   incremental part of building the page. Then, in one go:
   - JS, if there is a `<script>`: `js_nuevo`, `jsdom_preparar` (the prelude), `jsdom_ejecutar_scripts_con`.
   - Style: `estilo_hojas_con`, `estilo_aplicar`.
   - Requests fonts and images.
4. **`mostrar`** → `documento_maquetar`: if an `@media` changes with the width, the style is applied again; then
   `maquetar` → a `Pagina`.
5. **Paint:** MUI calls the draw function → `pinta_en` → `pintar(pagina, ...)` with the visible strip.

After it is shown:

- **Images and fonts arriving** (`documento_imagenes`): the page is laid out again only if one changes the size of
  its `<img>` or a font arrives. It is repainted at most every 2.5 s (`DOCUMENTO_REPINTAR`) and only if visible.
- **Changes from JavaScript** (after a click or a batch of timers): `documento_al_dia` checks whether the DOM
  changed, tries the partial restyle (`estilo_aplicar_partes`) and if it cannot, redoes the whole thing. **The
  layout is always redone in full.**

Synchronous path (`documento_abrir`, `documento_desde_html`): local files, `dashweb:` pages and `src/visor.dash`.

## 5. Data and who owns what

| Structure | File | What it holds |
|---|---|---|
| `Documento` | `documento.dash` | Address, title, bytes, `doc: Nodo`, `hojas`, `im` (images), `js` (pointer to the engine, 0 if none), `recursos`, `videos`, `pagina`, width, change counter |
| `Nodo` | `dom.dash` | Type, name, text, `atributos`, `hijos`, **`weak padre`**, `estilo` (the computed style, right here), `::before`/`::after` pseudo-elements, class and id caches, CSS variables, `toques` (in the document) |
| `HojaCSS`, `Regla`, `Selector`... | `css.dash` | What was parsed from each sheet, with `@media`, layers, `@font-face`, `@keyframes` |
| `Hojas` | `estilo.dash` | The page's sheets, the selector indexes and what is needed for invalidation |
| Computed style | `Nodo.estilo` | A text → text dictionary. Only `font-size` is resolved to px |
| `Pagina`, `Dibujo` | `maqueta.dash` | The **flat** list of drawing items in page coordinates. There is no box tree |

Rules:

- **The `Documento` owns everything that belongs to it.** `documento_liberar` releases resources, images, videos and
  the JS engine. It is freed when showing another page, when stopping, when closing the window and when quitting.
- **`padre` is `weak`.** Dash uses reference counting and does not free cycles until exit.
- **JS keeps hold of the nodes it sees** until the engine is freed: the node → JS object table keeps a reference to
  each of them.
- **Program-wide caches**, which are never emptied: open fonts, the parsed browser sheet, parsed selectors,
  rasterised web fonts. Web fonts are not freed when changing page.
- **Per-document caches:** images by `src` and their scaled copies; the winning rules of the cascade.

## 6. HTML

- **Hubbub** (NetSurf's HTML5 parser, `third_party/hubbub`, `lib/html5.dash`) builds the tree of every page.
  Hubbub calls C functions that record operations with node numbers; Dash replays them, creating its `Nodo`s. That
  way there are no C pointers inside the DOM.
- It receives the text already in Latin-1, declared as ISO-8859-1. That is why `<meta charset>` is not used; the
  character set comes from the HTTP header (without one, UTF-8).
- **The in-house parser** (`html.dash` + the tolerant builder in `dom.dash`) is still used for: `innerHTML`,
  `createHTMLDocument`, the viewer, the tests and as a fallback if Hubbub runs out of memory. Task 37 forbids going
  back to it for pages.

## 7. CSS and style

- **Parsing** (`css.dash`): rules, selectors with their specificity, declarations. `@media` is stored with the rule
  and evaluated when indexing; `@supports` when parsing; `@layer`, `@font-face`, `@keyframes` and `@import` (up to 4
  levels). The browser's sheet is in the code and is parsed once.
- **Index:** each selector is stored by its rightmost part (`#id`, first class or tag); the rest, under
  "universal". Each element only tries its own. An ancestor filter discards early those that cannot match.
  Matching goes right to left.
- **Cascade:** `!important`, origin, specificity (with the layer: `layer × 1,000,000`), order. `style=` weighs
  1,500,000,000, animations 2,000,000,000, presentational attributes -1. The winning rules are cached by the list of
  matched rules.
- **Values:** inheritance by a fixed list; `var()` up to 8 levels deep, and only the `--x` someone uses are kept;
  `calc()`, `min()`, `max()`, `clamp()`; px, em, rem, vw, vh, vmin, vmax, ch, ex, %, pt, pc, in, cm, mm.
- **Partial restyle** (`estilo_aplicar_partes`): the JS bridge records each change (`Toque`: attribute, content, in,
  out, sibling; at most 200, then "everything"). An attribute no selector mentions costs nothing; a class or an id
  recompute the element and, if it changes, its subtree; `+` and `~` reach the parent. Everything is redone with
  `:has()`, if the width changed or if there are too many changes. It brought cascades down from 1.8-3 s to
  0.05-0.15 s.
- **There is no** `:hover`, `:focus` or `:active` (they never match).

## 8. Layout

`maquetar` produces a flat list of `Dibujo` (text, rectangle, border, image, control, icon...). Each drawing item
carries its clip, its layer and the node it comes from.

- **Blocks:** margins (sibling margins collapse), borders, padding, `width`/`min`/`max`, `height`, `box-sizing`,
  `margin: auto`, `aspect-ratio`, backgrounds, gradients, `box-shadow`, `border-radius`.
- **Lines:** `white-space`, `text-align` (no `justify`), `text-indent`, `text-transform`, `letter-spacing`,
  word breaking, `text-overflow: ellipsis`, one `text-shadow`. Consecutive words with the same look go in a single
  drawing item. `inline-block` is measured by laying it out separately.
- **Flex, grid** (areas, `repeat`, `minmax`, `fr`) **and tables** (`colspan`/`rowspan`, auto and fixed): each child
  is laid out at (0,0) and moved into place with its clip.
- **Positioning:** `relative`, `absolute`, `fixed` (relative to the viewport). `z-index` reorders by layers at the end.
- **Float:** they are placed in rows, but **text does not wrap around them**: it goes below.
- **`transform`:** translation and scale; `rotate` only on bars and in multiples of 45°; no `skew` or 3D.
- **`overflow`:** clips, no inner scrolling.
- Intermediate **`opacity`** only blends the background; `visibility: hidden` and `opacity: 0` remove what is drawn.
- **`line-height` is not applied**: it is parsed and inherited, but the layout does not use it. A line's height is
  that of its tallest piece plus 2 px.
- **Animations:** only the final state is shown. `lib/animacion.dash` exists and has a test, but the browser does not
  import it (task 31q).
- **Text is measured** with the Amiga's fonts (`font_text_width`...). Font choice: `@font-face`; the Workbench
  bitmap font (helvetica, times, courier) if that size exists; otherwise the outline one (CGTriumvirate, CGTimes,
  LetterGothic); and topaz as a last resort. Bold and italic in software. Medium `font-size`: 13 px.

## 9. Painter and fonts

- `pintar` walks all the drawing items and paints the ones that fall in the visible strip, each one clipped by hand.
- **Colour:** through pens (`color_pen`, `ObtainBestPen` with a 128-entry cache). In direct RGB: alpha blending and
  gradients (`gfx_blend_rect`, `gfx_gradient_rect`); on palette screens they come out dithered.
- **Scrolling** repaints the whole visible strip (no `ScrollRaster`). Double buffering keeps the repaint from being
  seen.
- **Images** with their scaled copy, `object-fit`, backgrounds with size, position and repeat (up to 4000 tiles).
- **Icons from icon fonts** (Font Awesome) are drawn with primitives: those fonts are not downloaded.
- **Web fonts** (`fuente_web.dash`): stb_truetype rasterises characters 32-255 at 1 bit (no anti-aliasing) into an
  in-memory `TextFont`, and the painter cannot tell the difference. TTF, OTF and WOFF1; not WOFF2. Always weight 400
  normal. At most 8 per page. Google Fonts is asked for Latin-1 only (`text=`): 50 KB per weight instead of 325 KB.
- **Minimum size 2 px** when opening a font (Dash D57): AmigaOS 3.2's diskfont and bullet write outside their memory
  with 0 or 1.

## 10. JavaScript

- **QuickJS** (2026-06-04, `third_party/quickjs`) compiled separately to `build/qjs-lib/libqjs.a` (`tools/build_qjs.sh
  lib`), with FPU and fdlibm (the ROM's libm gave wrong results). Three changes for AmigaOS and an optional fourth
  (`quickjs_amiga.md`): a sampling profiler inside QuickJS, only with `-DJS_PERFIL`, to see which JS function is
  heavy. Note: that document still describes the old `malloc_usable_size`; the code now stores the size in an 8-byte
  header so that the memory limit works.
- **One engine per page**, only if it has a `<script>`. It is created before the style and freed with the document.
  Fixed cost: ~150 KB and evaluating the prelude (~46 KB of JS).
- **Limits:** 48 MB of memory (`JS_MEMORIA`, because of Next.js), 192 KB of JS stack out of 256 KB of `@stack`,
  10,000 promise jobs per drain. **There is no time limit**: an infinite loop in a page locks up the browser.
- **DOM bridge** (`jsdom.dash`), in three layers:
  - C (`@c`/`@native`): a `Node` class with the `Nodo` as opaque data (`_dash_retain` on creation, `_dash_release`
    in the finaliser) and a node → object table, so that `a === b` works. Getters, setters and basic methods.
  - Dash: the logic on top of `Nodo` (selectors, `innerHTML`, inserting, cloning, `getComputedStyle`, running
    scripts).
  - `jsdom_preludio.js`: the browser environment in plain JS (events, timers, `classList`, `dataset`,
    `style`, `document.*`, `window`, `URL`/`URLSearchParams`, `TextEncoder`, `ReadableStream`, `location`...).
    Each interface (`HTMLElement`, `HTMLIFrameElement`, `SVGElement`, `Text`, `Window`, `EventTarget`...) has its
    `instanceof` via `Symbol.hasInstance`; `PromiseRejectionEvent` is there (without it, core-js replaces QuickJS's
    `Promise` with its own, which is much slower).
    `tools/preludio.py` turns it into `jsdom_preludio.dash`; the tests check that it is up to date.
- **Scripts:** in document order, without `async`/`defer` or modules. A `src` that has not arrived is fetched at that
  moment, synchronously. Then `DOMContentLoaded`, and `load` on the first tick.
- **Events from the browser:** click and form submission. Not: keyboard, `input`, `change`, `focus`, `scroll`,
  `resize`.
- **Timers:** a queue in the prelude. The browser advances it with `jsdom_temporizadores`, which returns how long
  until the next one; that goes into `programar`.
- **Errors:** to the program's output ("JS: ..."), never to the interface. Unhandled rejected promises too.
- **What is missing:** `fetch`, `XMLHttpRequest`, `WebSocket`, `Worker`, `Blob`, `FormData`... `location.assign`/`replace`
  do not navigate. The layout measurements JS sees are fake (`offsetWidth` 100, rects at 0; task 37b). Shadow DOM is
  only minimal (`attachShadow`). Anything that is not Latin-1 arrives as `?` (task 37a4).

## 11. Network

- **Layers:** Dash `net_*`/`tls_*` builtins → `red.dash` (`Conexion`, own buffer, reading by lines and chunks) →
  `http.dash`.
- **Non-blocking:** the name is looked up in another process; the connection and the TLS handshake advance with
  `*_poll`. At most 16 opens at a time (runtime).
- **Retry:** a connection that stays silent for more than 5 s before TLS, or a timed-out TLS, is opened again (up
  to 2).
- **Reused connections:** only in asynchronous loads (`http_seguir = true` in the browser). Up to 8 idle, 10 s each.
  They save 10 %.
- **TLS** with AmiSSL 5, verifying the certificate. Session resumption is in the runtime (D55), but the saving is
  small (9.0 → 7.9 s per connection on an A1200) because connections to a server are opened at the same time.
- **HTTP/1.1** (`Carga`): GET and POST, 5 redirects (after a POST it continues with GET except for 307/308),
  `chunked`, gzip and deflate with stb_image's inflate (text only; anything going to a file is requested as
  `identity`). Headers: `User-Agent: dashweb/0.1 (AmigaOS)`, `Accept-Encoding`, `Cookie`, `Connection`.
- **The whole response goes to memory** before being written to a file, also for downloads and video, and there is no
  size cap. A very large download can exhaust memory.
- **Timeouts** (with nothing received): page 20 s, CSS/JS/images 15 s, download 30 s, video 60 s.
- **Cookies** (`cookies.dash`): RFC 6265 as far as websites use it (domain, path, expiry, Secure, HttpOnly; no
  SameSite or public suffixes). Up to 300. Persistent ones are saved in `PROGDIR:dashweb.cookies`.
  `document.cookie` without the HttpOnly ones.
- **Trackers:** scripts from 20 known domains are not downloaded (`url_rastreador`). gtag.js is 465 KB: the load of
  freemem.space went down from 31.4 s to 24.7 s.
- **Schemes:** `http`, `https`, `file:` (like NetSurf: `file:///Vol/a` → `Vol:a`), `dashweb:`. **Not `data:`**: a
  `data:` image shows up as a gap.

## 12. Images

- **Download** (`imagenes.dash`): 4 at a time; the same `src` once; `loading=lazy` within two screens; backgrounds,
  only when some layout paints them. They are stored in `T:` and deleted with the document.
- **Decode at the size they are shown at:** the HTML's, the layout's or the `srcset` one (target 1024 px); at most
  1280x1024.
- **In-house decoders** (`imagen_dec.dash`, `build/img-lib/libimg.a`):

| Format | Decoder | Downscaling |
|---|---|---|
| Baseline JPEG | TJpgDec | While decoding: 1/2, 1/4, 1/8 |
| WebP | libwebp | While decoding |
| SVG | nanosvg | Rasterises at the displayed size (max. 4096) |
| PNG, GIF, BMP, progressive JPEG | stb_image | Afterwards, by blocks |
| ILBM and the rest | datatypes (fallback, main process) | — |

- **In another process**, up to 4: the request carries its own copy of the name; the task reads the file (max. 64 MB)
  and returns RGB(A) pixels. The main process polls on each tick (`task_done`), collects and creates the image
  (`image_from_rgb`). If it cannot create the process, it decodes in the main one.
- **To the screen** (Dash runtime): on RTG, a BitMap written directly in RGB (D54: from 120 ms to 5 ms per image);
  otherwise, picture.datatype with colour remapping. Transparency with a 1-bit mask (alpha ≥ 128).
- **No** AVIF, JPEG XL, animated WebP.

## 13. Video

- **MintVID** (`third_party/mintvid`, `build/video-lib/libvideo.a`): MP4/MOV, AVI, MKV, TS; H.264 (libavc, with 68k
  assembly), MPEG-1, MPEG-4, MJPEG and more. AAC-LC and MP3 sound through Paula (MintAMP). Left out for licence
  reasons: MPEG-2, AC-3, DV.
- **Starts while downloading:** it tries to open the file every 256 KB of download.
- **Sound drives the clock.** Whatever arrives late is skipped; with more than 200 ms of delay, H.264 switches to turbo
  mode.
- **Full screen** in a MUI window of its own.
- **YouTube** (`youtube.dash`): the video page and the `youtubei/v1/player` API with several clients, until the 360p
  MP4 (itag 18) is found.
- Measurements: 640x360 at its own size, ~9 frames/s on the target emulator; 320x180 scaled, 25/s. Not measured on
  PiStorm.
- The header comments of `video.dash` and `videos.dash` say "no sound": that is out of date.

## 14. Forms

Each control's state lives in the node's attributes (`value`, `checked`, `selected`). The layout creates a
`D_CONTROL` drawing item and the painter paints it. A click changes the control (`formulario_clic`; a `select` moves
to the next option); keys type (`formulario_tecla`). Submission (`formulario_envio`) does GET or POST
`x-www-form-urlencoded`; there is no `multipart`.

## 15. What Dash had to add

| Topic | Tasks |
|---|---|
| Strings | D2, D3, D7, D15, D17, D22, D61 |
| Lists, dictionaries and types | D1, D4a, D4b, D4c, D5, D37, D49, D53 |
| Memory and ownership | D6 (`weak`), D16, D26 (`@native(borrow)`) |
| Modules and names | D14, D18, D45 |
| Network and TLS | D8, D11, D36, D41, D52, D55, D60 (D30 was tried and reverted) |
| Graphics, fonts and images | D9, D12, D12b, D28, D40, D42, D43, D50, D51, D54, D56, D57 |
| MUI | D31, D32, D35, D38, D48, D58 |
| External C, processes and startup | D10, D10b (`@link`, `@c`), D19, D20, D21, D24 (`@stack`), D25, D27, D47 (`task_start`), D59 |
| Tools | D23 (profiler), D29, D34, D44, D46 |

## 16. Decisions

| Decision | Why | Log |
|---|---|---|
| PiStorm and emulation with JIT as target; 68020 + FPU | User's decision | Goal, 2026-10-15 |
| Everything in Dash; whatever is missing, into Dash | dashweb exists to make Dash grow | Task 2 |
| In-house style, layout and painter (not NetSurf or litehtml) | User's decision; NetSurf's layout is GPL | 2026-10-16 |
| Hubbub for HTML | The in-house parser did not handle misnested tags, tables or insertion modes; Hubbub is MIT and already runs on 68k | Task 36 |
| QuickJS as a library, without translating it to Dash | 69,000 lines, months of work to end up with the same thing | 31k |
| Latin-1 everywhere | It is the character set of the Amiga and its fonts | Task 4 |
| In-house decoders instead of datatypes | Datatypes decode at full size, with no limits and without WebP or SVG | Task 29 |
| Decode in another process, priority -1 | The window stays responsive; slightly slower (46.7 s versus 41.6 s) | 29c |
| QuickJS and libimg with FPU | Mixing FPU and non-FPU broke returned numbers (`Date.now()`, 0x0 SVGs) | 28g, 29b |
| A single timer and "start / advance" | FS-UAE's network does not signal (D30 was reverted) | 20a |
| Partial restyle with "toques" | The cascades after each JS change cost seconds | 2026-10-17 |
| Repaint at most every 2.5 s while images arrive | There were 17 full-page repaints per load | 28l |
| Reused connections and retry after 5 s | 10 % less; a server does not answer a connection that stays silent for long | 28h, 28b |
| Block trackers | 465 KB of JS that add nothing to the page | 2026-10-17 |
| CSS by modules following the specification, compared against Chrome | Nothing tailored to a particular website | 31a |
| MintVID for video | Viable on 68k; MIT + Apache | 30a |
| Data in `PROGDIR:` | Not recorded in the log | 35a |

## 17. Performance and memory

Measured on the emulated rtg machine (68040 + JIT), the most recent figures from the log:

- **Whole freemem.space:** from 105-128 s at the start to **21-23 s** (2026-10-20). The machine runs at 100 % all the
  time: it only gets faster by removing work. What weighs most: the first style pass (~3.7 s) and each layout (~1 s).
- **pre.opentimetrack.com** (task 37): one layout went down from 21.7 s to 6.7 s (37a1) and the scripts from 31 s to
  6.7 s (37a3: core-js was replacing QuickJS's `Promise` with its own). Now the layout is what weighs: 6.2-7 s each,
  and GSAP and React make it be redone in full on every `style` change (37a5).
- **Optimisations that gained the most:** blending by blocks (D51, 35 times); direct images on RTG (D54, 24 times);
  style with index, ancestor filter and cache (5.0 s → 1.5 s); removing trackers (−7 s).
- **Memory:** ~350 KB for a simple page; freshly created JS engine ~150 KB; libavc asks for 5 MB when creating the
  decoder. MUI executable ~1.1 MB. With 8 MB, jQuery ran out of memory.
- **To measure:** `tools/medir_visor.py` (`--perfil`, `--traza`, `--captura`), `./dash --profile`.
- The README table (A1200, 2026-10-16) is out of date.

## 18. Tests

- `python3 tests/run.py`: one `test_*.dash` per module (57 files today), compiled with `--fpu` and run in FS-UAE in a
  single boot, comparing against `# expect-out:`. Local servers (`tests/servers/http.py`, also TLS, slow,
  compressed); never third-party websites. It also checks that the prelude is up to date and that `src/` compiles.
- `--memcheck`: 0 alive at exit.
- `tools/comparar_chrome.py`: headless Chrome at 940x614 (the size of the page area on the rtg machine) over 13
  websites (`tools/webs_prueba.txt`); by hand.
- Intermittent failures: N clean loads in a row (e.g. 20 out of 20). Hunting tools: `_JS_GUARDAS`, quarantine,
  `-D_DASH_PIXGUARD`, `docs/parches/caza_memoria_hubbub.patch`.
- The user tests it by hand on CoffinOS (Amiberry, MUI 3.8).

## 19. Known limits and things to review

From the code (checked for this document):

- `line-height` is not applied; there is no `text-align: justify`.
- CSS animations do not run in the browser (`animacion.dash` unused).
- Text does not wrap around floats; `overflow` does not scroll; `sticky` behaves as `relative`.
- No `:hover`/`:focus`.
- The layout is redone in full after each JS change.
- JS has no time limit; there is no `fetch`/XHR; `location.assign` does not navigate; fake geometry.
- HTTP responses go entirely to memory, with no cap.
- `data:` is not there.
- The network is polled every 50 ms (task 39 with D60).
- **To review:** `tools/paquete.sh` compiles `src/` without `--fpu`, so the Dash code uses software floating point and
  is linked with libraries compiled with FPU. The tests do use `--fpu`. The log says that mixing the two broke numbers
  returned between functions; whether any decimal number crosses over here has not been checked.

Out-of-date documentation found:

- `quickjs_amiga.md`: the `malloc` change is no longer the Emscripten branch.
- Headers of `maqueta.dash` ("position, más adelante") and of `video.dash`/`videos.dash` ("sin sonido").
- README: "resumes each server's TLS session" is true, but the saving is barely noticeable.

Pending in the plan (relevant to the architecture): 37a5 (slow layout redone on every change), 37a4 (UTF-8 in JS), 37b-37g (geometry
for JS, `scroll`, `requestAnimationFrame`, `IntersectionObserver`, transforms, WOFF2), 39 (network by signal),
32 (browser APIs), 28j (Next.js exhausts memory), 31q (animations), 40 (the items in this section).

## 20. Constants

| Constant | Value | Where |
|---|---|---|
| `MAX_VENTANAS` | 4 | `src/dashweb.dash` |
| Load tick | 50 ms | `src/dashweb.dash` (`programar`) |
| `DOCUMENTO_REPINTAR` | 2500 ms | `documento.dash` |
| `RECURSOS_A_LA_VEZ` | 4 | `recursos.dash` |
| `IMAGENES_A_LA_VEZ`, `IMAGENES_DECODIFICANDO`, `FUENTES_A_LA_VEZ` | 4, 4, 4 | `imagenes.dash` |
| Web fonts per page | 8 | `imagenes.dash` |
| `IMAGEN_MAX_ANCHO` × `IMAGEN_MAX_ALTO` | 1280 × 1024 | `imagenes.dash` |
| `IMAGEN_PILA` | 256 KB | `imagen_dec.dash` |
| `DOM_TOQUES_MAX` | 200 | `dom.dash` |
| `ESTILO_MEDIUM` | 13 px | `estilo.dash` |
| `JS_MEMORIA` | 48 MB | `js.dash` |
| JS stack / `@stack` | 192 KB / 256 KB | `js.dash` |
| `HTTP_MAX_REDIRECCIONES` | 5 | `http.dash` |
| `HTTP_LIBRES_MAX`, `HTTP_LIBRE_MS` | 8, 10 s | `http.dash` |
| `RED_CALLADA_MS` | 5 s (2 retries) | `red.dash` |
| `COOKIES_MAX` | 300 | `cookies.dash` |
| `VIDEO_PROBAR` | 256 KB | `videos.dash` |
| Video stack | 400,000 | `video.dash` |
| Network opens / TLS / TLS sessions | 16 / 16 / 8 | Dash runtime |
