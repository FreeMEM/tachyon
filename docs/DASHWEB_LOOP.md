# dashweb: plan de trabajo (para `/loop`)

Arranque (desde cualquier directorio):

```
/loop Sigue las instrucciones de ~/Projects/tachyon/docs/DASHWEB_LOOP.md: haz UNA tarea y actualiza la bitácora. No hagas pausas entre vuelta y vuelta
```

**Encargo actual (usuario, 2026-10-20): la tarea 37, https://pre.opentimetrack.com, pasa delante de todo.**

**Después (usuario, 2026-10-24): "que se vea bien la web de youtube sería un puntazo": la 38 va la siguiente, tras
publicar la 0.7.2; luego la 53 (las webs de chat).**

## Objetivo

Un navegador ligero para AmigaOS 3.x escrito en Dash, con interfaz MUI 5: XHTML, CSS, JavaScript
(QuickJS, ya portado en `third_party/quickjs`) y HTTPS (AmiSSL).

**dashweb existe para hacer crecer Dash** (usuario, 2026-10-15): todo lo que le falte a Dash se le añade a
Dash. Nada de rodeos con `@native`: eso queda para lo que es C por naturaleza (el pegamento con QuickJS).

Máquina objetivo (decisión del usuario del 2026-10-15): **PiStorm (Emu68) y emulación (UAE con JIT)**.
No se optimiza para la velocidad de un 68k real ni se piden medidas en hardware real. Se compila para
68020 con FPU (`./dash --fpu`, `-m68020 -m68881`) y la versión sin FPU debe seguir compilando.

Dos fases:

- **Fase A (ya):** todo lo que no necesita MUI: red, HTTP/HTTPS, HTML, CSS, maquetación, dibujo en una
  ventana normal de Intuition, imágenes y JavaScript con su DOM.
- **Fase B:** la interfaz MUI. Empieza cuando Dash tenga MUI: tareas 1 a 11 de `docs/MUI_LOOP.md` en la
  rama `mui` de `~/Projects/FreeMEMLang` marcadas `[x]` (de eso se encarga otra sesión con su propio loop).

## Reglas de cada iteración

1. **Encargo y uso.** Coge la subtarea de la 37 que toque (regla 5) mientras la 37 no esté `[x]`. Si el uso semanal
   pasa del 90 %, apúntalo en la bitácora, para el loop y avisa con PushNotification (lo pidió el usuario).
2. **Rama.** Trabaja en `~/Projects/tachyon`, rama `dev` (sale de `main`). Sin push ni PR: eso lo pide el usuario.
3. **Dash.** Lo que le falte a Dash se añade a Dash, como tarea `D<n>` de la lista (sección "Dash"), pero **no lo
   hace el loop: se lo encarga a la sesión "dash"** (SendMessage a `dash`; `ListAgents` si no responde). El
   encargo lleva el porqué, cómo reproducirlo, lo que se propone y que avise con el commit. Mientras, el loop
   sigue con otra subtarea que no dependa de eso. Al recibir el aviso, el loop compila dashweb con ese Dash y
   lo apunta en la bitácora.
   - La sesión "dash" trabaja en el worktree `~/Projects/FreeMEMLang/.worktrees/dashweb` (sus ramas salen de `main` de
     FreeMEM/dash). El loop **no toca ese worktree** (ni `~/Projects/FreeMEMLang`): solo lo usa para compilar
     (`DASH` por defecto). Para probar un cambio de Dash antes de que esté hecho, una copia en el scratchpad.
   - Emulador y puertos de pruebas: antes de una batería o una medida larga, avisa a "dash" para no pisaros.
4. **Base.** `python3 tests/run.py` (cuando exista) antes de empezar. Anota si cambia respecto a la última entrada.
5. **Tarea.** Coge la primera subtarea sin hacer de la 37 (después, la primera tarea `[ ]` de la fase abierta). Si
   necesita algo de Dash que no está, encárgalo (regla 3) y coge la siguiente que no dependa de eso. Márcala `[~]` mientras trabajas. Una por
   iteración. Si es grande, divídela en la lista y haz solo la primera parte.
6. **Hacer.** Código del navegador en Dash (`src/`), módulos reutilizables en `lib/`. C solo en
   `third_party/` y en el pegamento con él. Cada cosa con su test en `tests/`, ejecutado en el emulador.
   Entorno (no va al repo):
   `export DASH_KICKSTART="/home/freemem/Descargas/Telegram Desktop/ks31a1200.rom"`,
   `DASH_EMU_SYS=~/.cache/dash-emu/sys31`, para MUI `DASH_EMU_SYS_MUI=~/.cache/dash-emu/sys31mui`, para AmiSSL
   `DASH_EMU_SYS_SSL=~/.cache/dash-emu/sys31ssl` y `DASH_EMU_SYS_32_SSL=~/.cache/dash-emu/sys32ssl`
   (`tools/get_amissl.sh` y `tools/emu_sys_amissl.sh` de Dash).
   Máquina rtg (`medir_visor --maquina rtg`): `DASH_KICKSTART_32="/home/freemem/Descargas/Telegram Desktop/Kickstart
   v3.2.3 A1200.47.115_Pack_noSCSI.rom"`; con MUI 3.8: `--sistema ~/.cache/dash-emu/sys32rtg38`.
   **Sin `DASH_KICKSTART` se usa la ROM AROS** y los resultados no valen. Para medir "como el objetivo":
   FS-UAE con `cpu = 68040`, `fpu = 68040`, `jit_compiler = 1`, `uae_cpu_speed = max`.
7. **Verificar.** Repite el paso 4. Nada que antes funcionaba puede romperse. Si algo se rompe y no lo
   arreglas en esta iteración, revierte.
7b. **Capturas.** El usuario quiere ver cómo evoluciona (2026-10-16): cuando una tarea cambie lo que se ve, una
   captura del emulador enviada con SendUserFile (sin esperar al final).
8. **Cerrar.** Marca `[x]`, añade una entrada a la bitácora y haz commit local `<tarea> - <resumen>`.
8b. **Panel de progreso** (usuario, 2026-10-21): https://claude.ai/artifact/6RpPSBd7iEVaXduBDX9QEA ("Progreso de
   dashweb"). Tras cada commit: pon al día `docs/panel/medidas.json`, `acid2.json` y `estandares.json` si cambian,
   `python3 tools/panel_progreso.py <dir del scratchpad>` y, por cada JSON que cambie, súbelo (Artifact publish con
   `url` del panel, `asset: true`) y actualiza su `datasets/<id>` con ArtifactData `update`: `source.url`, `name` y
   `updated` ({at, by}). Las tareas, las baterías ("Batería: N/M" en la bitácora) y los commits salen solos.
9. **Fin.** Si no quedan tareas `[ ]` en ninguna fase, escribe el resumen final, para el loop y avisa
   con PushNotification.

## Límites

- No instales paquetes del sistema. Un `venv` en `~/.cache/dashweb` sí vale.
- Nada con licencia que lo prohíba en git (SDK de MUI, AmiSSL, ROMs, Workbench): scripts que lo
  descargan a `~/.cache`, como hace Dash con MUI.
- No hagas push ni toques `main` de dashweb. No toques `~/Projects/FreeMEMLang`.
- Las pruebas de red usan servidores locales (Python en el PC; FS-UAE con `bsdsocket_library = 1` da
  red al Amiga emulado). Nada de pruebas automáticas contra webs de terceros.
- Si una tarea exige una decisión del usuario, déjala `[?]` con la pregunta y pasa a la siguiente.

## Coordinación con la sesión de MUI (`freememlang-49`, rama `mui`)

Acordado el 2026-10-15 por mensaje entre sesiones (escribirle con SendMessage si algo cambia):

- **Sus tareas, no las dupliques:** 8 (`mui_wait_event_signals`) y 9 (imágenes con `Dtpic`). Las imágenes
  fuera de MUI (datatypes a bitmap pintado con `gfx_`, D12) son nuestras: al hacerlas, avísale del nombre de
  los builtins, que su tarea 9 se apoyará en ellos.
- **Para no chocar en Dash:** lo nuestro va en diccionarios y plantillas propios (`NET_FUNCTIONS`/`NET_RUNTIME`,
  `FONT_FUNCTIONS`...), no en `MUI_FUNCTIONS` ni `CTemplates.MUI_RUNTIME` (suyos), y en líneas separadas de
  `_RUNTIME_FLAGS` y `GROUPS` de `tools/gen_builtins_doc.py`. Docs: secciones propias.
- **Convención de builtins:** los objetos (sockets, fuentes, imágenes...) son `LONG` en Dash, como ficheros y
  buffers. Runtime con nombre `_dash_*` y plantilla que es una llamada simple: así codegen hace los casts y la
  inclusión del runtime (`runtime_index` por nombre) sola.
- **Latin-1:** su tarea 3 trae `compiler/latin1.py` (los literales no ASCII salen en Latin-1) y `emu_run.py` lee
  la salida como Latin-1. Las páginas en UTF-8 las convierte dashweb (tarea 4).
- **Avisos técnicos:** MUI pide 32 KB de pila (codegen la sube sola). Las funciones `__inline` de los SDK que
  pasan `&tags` dan etiquetas basura con `-O2` (usar `NO_INLINE_STDARG` y arrays). En 68000, las macros
  `register asm` del NDK se machacan con llamadas a libgcc (`__mulsi3`...): calcular antes en variables.
- **Temporizadores:** su tarea 8 trae `mui_timer(ms, id)` (un disparo, timer.device) además de
  `mui_wait_event_signals(mask)` y `mui_signals()`. `setTimeout`/`setInterval` de JS (tarea 16) y las
  animaciones usan eso: no hacer temporizadores propios.
- **Coste de pintar (medido por ellos, A1200 3.1):** zona de 320x200, 20 ms el fondo y ~4,7 ms por línea de 50
  caracteres con `gfx_text_at` (página llena ~115 ms): el pintor (tarea 13) debe repintar por partes
  (solo lo que cambia) y usar `ScrollRaster` al desplazar.
- **Procesos:** cada sesión para solo sus procesos por PID (nada de `pkill fs-uae` ni `pkill -f run_tests`):
  el 2026-10-16 un `pkill` de la otra sesión tumbó una batería nuestra.
- **Zona de dibujo (en commit eec3247):** la API de `docs/MUI_DISEÑO.md` (`mui_canvas_on_draw(c, f)` con `f(x, y, ancho, alto)`
  pintando con `gfx_`). Nos avisará antes de cambiarla.

## Tareas

### Dash: lo que dashweb necesita (rama `dashweb`, regla 3)

Se hacen cuando una tarea de dashweb las pide ("necesita D<n>"). Los nombres concretos se deciden en cada
tarea, con el estilo de Dash.

- [x] D1. **Errores encontrados.** `lista + [x]` transpila pero da C inválido (error de gcc); `String < String`
      compara punteros (debe comparar el texto o dar error). Test de cada uno.
- [x] D2. **Texto.** Código de un carácter y carácter desde código; buscar un texto (desde una posición);
      empieza/termina por; mayúsculas/minúsculas; quitar espacios; texto a número (decimal y hex); comparar
      orden. Sin crear un texto por carácter. **Coste:** hoy `s[i]` recorre el texto desde el principio
      (`DashString_char_at` comprueba el final carácter a carácter) y `s.length` es `strlen`: recorrer un texto
      por posición es cuadrático. Arreglarlo (acceso directo; longitud guardada o calculada una vez).
- [x] D3. **Constructor de textos.** Añadir trozos sin coste cuadrático (para tokenizadores y para montar
      peticiones/respuestas). Medir con `bench`.
- [x] D4a. **Tipos de lista.** `[T]` en globales, `var`, parámetros, retornos y campos (conservan el tipo de sus
      elementos); `for x in` cualquier expresión de lista.
- [x] D4b. **Listas que crecen.** Añadir, quitar, insertar (sin copiar la lista entera); lista vacía con tipo
      que ya sepa qué guarda.
- [x] D4c. **Campo de un elemento.** `l[0].x = 5`.
- [x] D5. **Diccionario** texto → valor (con tipo), para cabeceras HTTP, propiedades CSS, entidades.
- [x] D6. **Referencia débil** (campo que no cuenta, para `padre` en el DOM) o romper ciclos, con `--memcheck`.
- [x] D7. **Ficheros a texto.** Leer un fichero entero a un `String` (y escribirlo); texto desde un buffer con
      longitud. Bytes nulos: decidir qué pasa.
- [x] D8. **Red.** Builtins sobre `bsdsocket.library`: resolver nombre, conectar, enviar, recibir, cerrar,
      tiempo límite, sin bloqueo y su máscara de señales (para `mui_wait_event_signals`). Test en FS-UAE
      (`bsdsocket_library = 1`) con un servidor Python local.
- [x] D9. **Fuentes y colores.** Abrir fuentes de disco con tamaño, estilo (negrita, cursiva, subrayado),
      medir texto con la fuente actual, colores RGB en pantallas de paleta (`ObtainBestPen`/`ReleasePen`) y en RTG.
- [x] D10. **C externo.** Enlazar objetos o librerías C desde el programa (directiva o opción) y llamar a
      funciones Dash desde C (callbacks), para QuickJS.
- [x] D11. **AmiSSL.** Conexiones TLS sobre los sockets de D8 (módulo o builtins), con verificación de
      certificado.
- [x] D12. **Imágenes.** Cargar PNG/GIF/JPEG por datatypes a un bitmap y pintarlo con `gfx_` (fuera de MUI).
      Avisar a la sesión de MUI del nombre (su tarea 9 lo usará).
- [x] D13. **`elif`.** (lo pidió la tarea 3)
- [x] D14. **Variables locales que tapan funciones.** Hoy, si un programa define `func b()`, ningún módulo puede
      usar una variable local `b` ("Cannot assign to 'b' - it's not a variable"): los módulos se rompen según
      los nombres del programa que los importa. Una variable local (o parámetro) debe tapar la función.
      Visto también en la tarea 18: una global del programa (`var actual`) es la misma variable que las
      locales `actual` de los módulos importados (css.dash), y una función `inicio()` del programa tapa las
      variables `inicio` de los módulos. En `src/dashweb.dash` se usan nombres `dw_*` mientras tanto.
- [x] D24. **Pila desde un módulo.** `@stack N` (lo pide la tarea 15: QuickJS necesita 256 KB).
- [x] D25. **Salir con el stdio de libnix.** Dash dejaba `DOSBase` a NULL al salir y libnix lo usa después:
      un programa con QuickJS (o `printf` en una `@native`) se colgaba al terminar. (Lo encontró la tarea 15.)
- [x] D26. **`@native(borrow)`.** La `@native` solo usa sus argumentos durante la llamada (lo pidió la 16a:
      el documento y el código de cada evaluación quedaban retenidos hasta salir).
- [x] D27. **Clic y temporizador en el EventLoop.** `On Click` (`click_x()`, `click_y()`) y `On Timer N`
      (lo pidió la 16b).
- [x] D28. **Medir textos sin ventana.** `font_*` sobre un RastPort propio si no hay `_dash_rp` (lo pidió la 18:
      con MUI la página se maqueta fuera de la zona de dibujo). D12b: `IMAGE_RUNTIME` con el prototipo de
      `DoMethod` (chocaba con las cabeceras de MUI).
- [x] D29. **Programas en segundo plano en `emu_run`.** Para las pruebas de interfaz del navegador (tarea 19).
- [x] D31. **Teclas como texto en la zona de dibujo de MUI.** `mui_canvas_char` (lo pidió la 21a).
- [x] D37. **Métodos de elementos.** `d["k"].push(x)`, `l[0].mover(1)` como sentencia, y el tipo de los elementos de
      `{String: [T]}` y `[[T]]` (lo pidió el índice de CSS).
- [x] D38. **Barra de herramientas.** `mui_image_button`, `mui_help`, `mui_window_size` (y en `.dashui`
      `image_button`, `help`, `size`) para una interfaz de navegador actual.
- [x] D40. **Imágenes desde píxeles.** `image_from_rgb(buffer, ancho, alto, alfa)` con picture.datatype V43
      (lo pidió la 29).
- [x] D41. **Plazos de la red sin espera.** El tiempo en que el programa no consulta no cuenta y el de la
      negociación TLS empieza de nuevo con cada paso (lo encontró la 28c: los fondos de freemem.space fallaban).
- [x] D36. **Conectar sin esperar.** `net_connect_start`/`_poll`/`_stage` (el nombre se busca en otro proceso,
      la conexión sin bloquear) y `tls_connect_start`/`_poll` (lo pidió la 20d).
- [x] D35. **Atajos de menú de MUI.** Amiga+tecla colgaba el programa (barra de menús puesta con `SetAttrs`
      después de crear la ventana) y cada elección daba además un evento 11 falso (`MUIA_UserData` de los
      elementos). Lo encontró la 22c.
- [x] D34. **Modo de pruebas sin frenar los bucles.** `--autoclose` miraba el reloj en cada vuelta (lo encontró D23).
- [x] D32. **Ventana activa en MUI.** `mui_window_active` (lo pidió la 22b).
- [x] D23. **Perfilador.** `./dash --profile`: cuántas veces se llama cada función y en cuál está el programa
      (muestras a 50 Hz desde la interrupción VBlank), escrito al salir. Lo pide la tarea 13: estilo y maqueta
      tardan 7 y 8 s en un A1200 con una página de 9 KB y no se ve dónde.
- [x] D22. **Textos largos sin copias.** (lo pidió la tarea 13)
- [x] D21. **Interior de una ventana.** `Win.inner_left/_top/_width/_height` (lo pidió el visor).
- [x] D20. **Reloj.** `time_ms()` (para medir el visor).
- [x] D19. **Argumentos del programa.** `arg_count()`, `arg(i)` (lo pidió el visor, tarea 13).
- [x] D18. **Funciones privadas por módulo.** Dos módulos con `_fuente` chocaban (lo pidió la tarea 12).
- [x] D17. **Texto prestado adoptado.** `s = t` con `t` un parámetro temporal del que llama lo liberaba al volver
      (lo encontró la tarea 11 con `--memcheck`).
- [x] D16. **`for` sobre una lista prestada.** La liberaba al acabar (lo encontró la tarea 9).
- [x] D15. **Carácter contra literal con escape.** `c == "\r"` comparaba punteros (lo pidió la tarea 5).
- [x] D71. **La caché de largos de texto expulsa el texto grande** (2026-10-26, tarea 38c; propuesta a la sesión "dash").
      _dash_str_len guarda el largo de 8 textos de 64 bytes o más y los cambia por turno: al leer la hoja CSS de
      YouTube (3,8 MB, 18 623 reglas), cada cuerpo de regla largo entra y a las 8 reglas sale la hoja, y el corte
      siguiente hace strlen de 3,8 MB: css_leer tarda 184 s en un 68040 con JIT (tests/bench/css_grande.dash).
      Propuesto: que entre en un hueco libre o en el del texto más corto (medirlo otra vez cuesta menos). Probado en
      una copia: 10,1 s, las mismas reglas.
      Hecha por la sesión dash (9142671 en la rama dashweb: _dash_sc_slot, con test en host_harness.c): 9,96 s.
- [x] D70. **Comparar textos con nil sin leer la dirección 0** (2026-10-23, tarea 43; propuesta a la sesión "dash").
      `a == b` entre String es `strcmp(a, b) == 0`: con `a` nil (un campo `String = nil`) lee la dirección 0. En un 68k
      clásico no se nota; AmigaOS 4 no lo deja y el programa se cae (un usuario con la v0.3.0). Propuesto: nil como
      texto vacío (o distinto de todo texto no nil) en las comparaciones.
      Hecha por la sesión dash (main 028c67d, PR #22): `_dash_str_cmp`, nil antes de todo texto y nil == nil.
- [x] D69. **La red desde una tarea de task_start** (usuario, 2026-10-23, tarea 42e; propuesta a la sesión "dash").
      net_* y tls_* usan la SocketBase y el AmiSSL de la tarea que arrancó el programa: una tarea de task_start (como
      la que decodifica imágenes) no puede abrir ni leer sockets. Con eso dashweb movería toda su red (DNS, conexión,
      TLS, envío y recepción) a una tarea aparte que avanza aunque el JavaScript o la maqueta tarden (hoy la red se
      para: el aviso de cookies de xataka.com sale a los ~280 s). Mientras, dashweb lo hace cooperativo (una bomba en C
      que se llama también desde dentro del JavaScript y de la maqueta).
      (2026-10-23) La sesión dash la ve viable: cada tarea abre su bsdsocket (BSDSOCKET_BASE_NAME por tarea) y su
      AmiSSL (InitAmiSSLA con su SocketBase y su errno); v1 con una sola dueña de la red (el programa o una tarea);
      en la tarea solo las variantes C (búferes); task_wake() despierta al programa. Aceptada (semáforo propio en C y
      task_wake); la hace en la rama dashweb. Tachyon espera a ella en vez de la bomba cooperativa.
- [ ] D66. **Menos copias de textos prestados** (2026-10-21, tarea 37e6; propuesta a la sesión "dash", que decide si
      es viable). Una variable String que solo se lee y se toma de un diccionario se copia (_dash_str_set_copy) y
      se libera; devolver un préstamo hace _dash_str_tmpcopy. _val y _px de lib/maqueta.dash: 3 millones de llamadas
      al bajar por pre.opentimetrack.com.
- [x] D65. **d.get(clave, defecto) en una búsqueda** (hecha por la sesión "dash", a19ece3; 2026-10-21, tarea 37e6). _val de
      lib/maqueta.dash (has + [] + []: tres búsquedas) se llama 2,4 millones de veces al bajar por
      pre.opentimetrack.com (9,5 % del perfil); estilo_px y _px igual.
- [x] D64. **Más de 64 imágenes vivas** (hecha por la sesión "dash", 1204998; 2026-10-21, tarea 37h2). `_DASH_IMG_MAX 64`
      en codegen.py: pre.opentimetrack.com tiene más de 100 iconos SVG (más las copias de image_scale); desde la
      65, image_from_rgb da 0 (ni iconos ni el esquema grande). Sin tope fijo (lista, o una marca en _DashImg para
      no buscar lineal en cada image_draw).
- [x] D63. **El ratón sobre un mui_canvas sin clic** (hecha por la sesión "dash", 3980c80; 2026-10-20, tarea 37f3).
      `mui_canvas_on_move(canvas, id)` (un aviso al mover dentro del área y al salir; varios seguidos, uno),
      `mui_canvas_pointer_x/_y(canvas)` (dónde está ahora) y `mui_canvas_pointer_inside(canvas)`; MUI 3.8 y 5.
- [x] D62. **Imágenes con alfa de verdad** (hecha por la sesión "dash", 31fd909) (2026-10-20, tarea 37; encargada a la sesión "dash"). `image_draw` e
      `image_draw_part` de una imagen de `image_from_rgb(..., alfa)` pintan el pixel si su alfa es 128 o más y si no
      nada: lo translúcido sale opaco o no sale. En trainalong.fit, el círculo y la curva grises (opacity .35 en el
      SVG) salen como una mancha blanca opaca junto a "En construcción" y sin la curva. Se propone: en pantallas RTG
      de 15 a 32 bits, mezclar con lo que hay debajo (WritePixelArrayAlpha de CyberGraphX V43 / Picasso96, o leer,
      mezclar y escribir); en pantallas de paleta, seguir con el umbral. Test en el emulador. Y `image_scale` al
      ampliar pierde filas de la máscara (BitMapScale): la curva de trainalong.fit (rasterizada a 1024 y ampliada a
      1100) sale con una fila transparente cada ~14.
- [x] D61. **Longitudes de textos hechos en C** (hecha por la sesión "dash", 8f04c61: la caché solo apunta los textos
      de Dash, que llevan una marca en su cabecera; 2026-10-20, tarea 37a3). La caché de
      longitudes de `_dash_str_len` (textos de 64 o más, por dirección) no se entera de un free() de C: el texto
      siguiente en esa dirección heredaba la longitud vieja (un selector de 104 caracteres de querySelector salía
      cortado). dashweb lo parchea con `_jsdom_soltar` (lib/jsdom.dash); el arreglo de fondo va en Dash.
- [x] D60. **La red despierta el bucle de MUI por señal** (usuario, 2026-10-20, por la sesión dashweb-f7; encargada a
      la sesión "dash", avisará con el commit). `mui_wait_event_signals`/`mui_signals` existen, pero no hay cómo
      obtener la señal de un socket: un builtin con la máscara de señal de la red (p. ej. `net_signal()`, con
      SocketBaseTags SBTC_SIGEVENTMASK); SO_EVENTMASK por socket (lectura, escritura, conexión, cierre, error),
      también en los de TLS; si es fácil, una señal para `task_done` (el decodificador de imágenes); test en el
      emulador; si bsdsocket no lo admite, `net_signal()` da 0 y se sigue sondeando.

### Fase A: sin MUI

- [x] 1. **Base del repo.** Clon de Dash (regla 3). `tests/run.py`: compila `tests/test_*.dash` con
      `$DASH/dash --fpu` y los ejecuta en FS-UAE con `$DASH/tools/emu_run.py`, comparando con sus
      `# expect-out:` (como el runner de Dash). Un test trivial. `CLAUDE.md` de dashweb (corto: qué es,
      comandos, reglas de este fichero). `.gitignore` de `build/`.
- [x] 2. **Arquitectura.** `docs/ARQUITECTURA.md`: módulos (red, URL, HTTP, TLS, texto, HTML, DOM, CSS,
      estilo, maquetación, dibujo, imágenes, JS, interfaz), qué va en Dash y qué en C, quién es dueño de la
      memoria de cada cosa, cómo se pasa de una fase a otra (bytes → tokens → DOM → estilo → cajas → dibujo).
      Repasa qué tiene Dash hoy (structs, listas, textos, `@native`, contador de referencias) y convierte
      lo que falte en tareas `D<n>` de la sección "Dash", con la tarea de dashweb que las necesita.
- [x] 3. **URL.** (necesita D1, D2, D13) Analizar y resolver URLs relativas (subconjunto de RFC 3986: esquema, host, puerto,
      ruta, consulta, fragmento; `..` y `.`). Tests con casos raros.
- [x] 4. **Texto.** (necesita D2, D3, D7, D4a) UTF-8 a Latin-1 (el juego de caracteres del Amiga), con sustituto para lo que no
      exista; entidades HTML (`&amp;`, `&#233;`, `&eacute;`...). Tests.
- [x] 5. **TCP.** (necesita D8) `lib/red.dash` sobre los builtins de red: conexión con tiempo límite y
      lectura por trozos. `tests/run.py` arranca el servidor Python local que pida el test (directiva nueva).
- [x] 6. **HTTP/1.1.** (necesita D3, D4, D5) GET con cabeceras, `Content-Length`, `chunked`, redirecciones (máx. 5),
      `Content-Type` y juego de caracteres, errores. Tests contra un servidor local que cubra cada caso.
- [x] 7. **HTTPS.** (necesita D11) AmiSSL 5 para OS3: script que lo descarga a `~/.cache` y lo mete en el sistema
      emulado; conexión TLS con verificación de certificado. Test contra un servidor HTTPS local con una CA
      propia. Si hace falta decidir algo de licencias o versiones, `[?]`.
- [x] 8. **Tokenizador HTML.** (necesita D2, D3, D4) Etiquetas, atributos (con y sin comillas), texto, comentarios, `DOCTYPE`,
      entidades, `<script>`/`<style>` como texto crudo. Tolerante con HTML mal formado; XHTML también.
- [x] 9. **Árbol DOM.** (necesita D4, D6) Nodos (elemento, texto, comentario), etiquetas implícitas (`html`, `head`, `body`),
      cierres implícitos (`p`, `li`, `td`...), elementos vacíos (`br`, `img`...). Tests con páginas reales
      pequeñas guardadas en `tests/pages/`.
- [x] 10. **CSS: lectura.** (necesita D2, D4) Tokenizador y analizador: reglas, selectores (tipo, clase, id, descendiente,
      hijo, atributo, `:hover` ignorado), declaraciones, `!important`, `@media` (solo `screen`/`all`),
      hojas `<style>` y `<link rel=stylesheet>` (vía HTTP).
- [x] 11. **CSS: estilo.** (necesita D4, D5) Incluye reunir las hojas del documento: `<style>`, `<link rel=stylesheet>`
      (HTTP o fichero) y sus `@import` (la tarea 10 solo los lee). Selección de elementos, cascada (origen, especificidad, orden), herencia,
      hoja por defecto del navegador, atributo `style`. Estilo calculado por nodo para las propiedades que
      se vayan a usar (display, colores, fuente, márgenes, relleno, bordes, ancho/alto, alineación, listas).
- [x] 12. **Maquetación.** (necesita D9) Cajas de bloque y en línea, cortes de línea con las medidas de la fuente
      (`TextLength`), márgenes/relleno/bordes, anchos y altos, listas. Sale una lista de cosas que dibujar.
      Tablas y `float`, más adelante (añadir tareas si hace falta).
- [x] 13. **Dibujo y visor sin MUI.** (necesita D9) Dibujar esa lista en una ventana normal de Intuition con los
      builtins `gfx_` de Dash (texto, rectángulos, bordes, colores). Programa `src/visor.dash`: abre un
      fichero HTML local, lo pinta y hace scroll con teclas. Captura de pantalla en el emulador. Medir el tiempo
      de cada fase en la configuración "objetivo" (regla 6).
- [x] 14. **Imágenes.** (necesita D12) Hace falta un cuerpo HTTP en buffer (`http_get` da texto: los bytes 0
      pasan a espacios y una imagen se rompería). Datatypes (PNG, GIF, JPEG) a bitmap y dibujarlas en la página; `width`/`height`
      del HTML; imágenes que llegan por HTTP.
- [x] 15. **QuickJS enlazable.** (necesita D10) Compilar QuickJS como objetos que se enlazan con un programa Dash
      (`tools/build_qjs.sh` con modo librería), fdlibm para que `Math.*` sea exacto (ver
      `docs/quickjs_amiga.md`), y un módulo `lib/js.dash` con `@native`: crear el motor, evaluar, errores,
      `console.log`. Test.
- [x] 16a. **DOM en JavaScript.** `document`, `getElementById`, `querySelector(All)` (con el selector
      de CSS de la tarea 11), `textContent`, `innerHTML`, `createElement`, `appendChild`, `setAttribute`;
      los `<script>` de la página (en línea y `src`). Tests en JS dentro de páginas.
- [x] 16b. **Eventos y temporizadores.** `addEventListener` (clic), `setTimeout`/`setInterval` (cola de
      temporizadores), volver a dar estilo y maquetar tras los cambios (`jsdom_cambios`).
- [x] 17. **Repaso de la fase A.** Tamaño del ejecutable, memoria (`--memcheck`), tiempos por fase en la
      configuración objetivo y en el A1200, páginas de prueba. Resumen en la bitácora y en el README.

### Encargo 37: pre.opentimetrack.com (usuario, 2026-10-20; delante de todo)

- [~] 37. **https://pre.opentimetrack.com como en Chrome, con sus animaciones.** Next.js (Turbopack, 12 scripts), 47 KB
      de CSS con 11 @keyframes (revelar, tachar, atenuar, pagina-sale/entra, parpadeo, apunte-entra, caracter-cambia,
      estampa, pista-baja, invita). Lo que se anima al bajar por la página es **GSAP con ScrollTrigger**: lee la
      posición de los elementos y el desplazamiento y pone en su `style` translate/rotate/scale/opacity y
      `transform: scaleX()` (una barra de progreso). La pila de fichas de arriba sigue al ratón. Fuentes: archivo
      (variable, 400-900, font-stretch) y doto (variable, los números de puntos), solo en WOFF2. Hoy en dashweb la
      geometría del JavaScript es falsa (offsetTop, getBoundingClientRect, scrollY: 0; innerWidth 640), no hay evento
      scroll, IntersectionObserver no avisa nunca y WOFF2 no se lee. Comparar siempre con Chrome al mismo ancho
      (tools/comparar_chrome.py) y bajando por la página (capturas a varias alturas con `medir_visor --acciones`),
      en la máquina rtg (MUI 5) y en sys32rtg38 (MUI 3.8, la del usuario en CoffinOS). Enviar capturas al usuario.
      Las páginas se leen con Hubbub (`dom_desde_html5`, lib/html5.dash), que es lo que se usa desde el 2026-10-20:
      nada de volver al analizador viejo (lib/html.dash); si Hubbub falla con esta página, se arregla Hubbub o su
      paso al DOM.
      Subtareas, por orden:
      [x] 37a. Primera carga: cómo sale hoy (captura, traza, errores de JavaScript, memoria: ver la 28j, Next.js sin
           memoria), y apuntar aquí lo que falte que no esté en la lista.
      [x] 37a1. Escapes de CSS en los selectores (`\:`, `\[`, `\]`, `\.`, `\/`, `\%` y los de hex, `\31 `): Tailwind los usa
           en todas sus variantes y valores a medida (`.md\:grid-cols-12`, `.h-\[1\.35em\]`) y hoy esas reglas se
           pierden: la cabecera sale en una columna y el logo (svg con h-[1.35em]) gigante. Con test.
      [x] 37a2. URL y URLSearchParams (es la 32b): el runtime de Turbopack cae al empezar ("'URL' is not defined", turbopack-
           *.js:1:4070) y Next.js no llega a montar nada (React, GSAP). Con test.
      [x] 37a3. Lentitud del JavaScript: de 31 s a 6,7 s (core-js cambiaba el Promise de QuickJS por el suyo), y
           Next.js ya monta la página sin errores.
      [x] 37a5. Maqueta lenta y repetida (hecha la parte de la velocidad: de 6,7 a 2,0 s; que un cambio que no mueve
           nada no rehaga la maqueta queda en la 37d): cada maqueta de esta página tarda 6,2-7 s (estilo_px, _borde, flex y grid en el
           perfil de Dash) y el JavaScript la rehace entera por cada cambio, aunque sea uno (GSAP y React cambian
           style a cada rato: 6,2 s por fotograma). Hacer la maqueta más rápida y que un cambio de style que no mueve
           nada (opacity, transform, color) no la rehaga (enlaza con 37d).
      [x] 37a4. El JavaScript con sus caracteres: hoy los scripts pasan a Latin-1 (al traerlos y en el DOM) y lo que no
           cabe sale "?" ("https://тест"); por eso core-js descarta el URL de dashweb y pone el suyo. Dar a QuickJS el
           texto UTF-8 de los scripts (traídos y en línea) sin pasar por Latin-1, y punycode en URL.host.
      [x] 37b. Geometría real para el JavaScript, de la última maqueta: la caja de cada elemento (guardarla al maquetar),
           offsetTop/Left/Width/Height y offsetParent, getBoundingClientRect y getClientRects (respecto a lo que se
           ve), clientWidth/Height, scrollWidth/Height, window.innerWidth/innerHeight (la zona de dibujo),
           window.scrollY/pageYOffset y documentElement.scrollTop (el desplazamiento de la ventana). Con test.
      [x] 37c. Desplazar y JavaScript: evento scroll en window y document al desplazar (como mucho uno por tic);
           scrollTo, scrollBy y scrollIntoView mueven la vista de verdad. Con test.
      [x] 37d. Fotogramas: requestAnimationFrame con el tic de las animaciones (31q), y cuando el JavaScript solo cambia
           opacity o transform (lo que hace GSAP), repintar sin rehacer la maqueta. Medir el coste por fotograma.
      [x] 37d2. LAS ANIMACIONES CSS NO CORREN (el usuario, 2026-10-20: "no veo que las animaciones estén funcionando", y
           trainalong.fit, con sus @keyframes, tampoco se mueve). lib/animacion.dash calcula fotogramas (31q paso 1,
           con test) pero nadie lo usa: dashweb pinta el estado final. Conectarlo: tras cada maqueta,
           animaciones_pagina; en el tic, animar(p, anims, ms) a 10-20 fotogramas por segundo mientras haya alguna
           viva y repintar (solo la parte que cambia si se puede); transitions al cambiar style o clases desde el
           JavaScript (lo que hace GSAP con CSS). Medir el coste en la máquina rtg. Probar con trainalong.fit (la curva
           que se dibuja, el punto que parpadea) y pre.opentimetrack.com (revelar, parpadeo, invita, pista-baja).
      [x] 37d3. Más propiedades en los fotogramas (lib/animacion.dash `animar` solo mueve con translate y vela con
           opacity < 0,5): scale (posición y tamaño de las cajas; el texto se queda en su letra), box-shadow (el pulso
           de "late" en trainalong.fit, "invita" en pre.opentimetrack.com), color y background-color (recolorear
           los dibujos), opacity de verdad en los fondos (ya se mezclan), clip-path: inset(). Repintar solo la caja de
           lo animado, no la página entera.
      [x] 37d4. SVG animado: trainalong.fit dibuja su curva con stroke-dasharray/stroke-dashoffset (@keyframes dibuja) y
           hace crecer sus círculos con transform: scale dentro del SVG. Hace falta: los guiones en el rasterizado
           (nanosvg no los tiene: añadirlos), las animaciones de los elementos de dentro del SVG, y volver a
           rasterizarlo en cada fotograma mientras dure (2,6 s una vez).
      [x] 37e. IntersectionObserver de verdad (threshold, rootMargin), con la geometría de 37b, mirado al desplazar y al
           maquetar. Con test.
      [x] 37e2. fetch y XMLHttpRequest (es la 32a): con el IntersectionObserver de verdad, Next.js pide por adelantado
           las páginas de los enlaces que se ven (prefetch) y su fetch (el de core-js, sobre XMLHttpRequest) falla:
           "XMLHttpRequest is not defined" (no rompe la página). Sobre las cargas sin espera de lib/http.dash.
      [x] 37e3. Rehacer la maqueta cuesta demasiado tras los cambios del JavaScript en pre.opentimetrack.com: 6-8 s por 2 o
           3 cambios (cada pocos segundos: la página nunca está quieta), 13,7 s tras los 201 del montaje.
      [x] 37e4. La maqueta entera aún cuesta: 13,8 s la del montaje de pre.opentimetrack.com (una vez).
      [x] 37e5. Los toques SALE (un nodo que sale) y un absoluto o fijo que pasa a display: none, sin maqueta.
      [~] 37h2. Lo que queda bajando por pre.opentimetrack.com (2026-10-21): crypto (getRandomValues, randomUUID,
           subtle.digest SHA-256) para la huella del informe; un "TypeError: not a function" en un trozo cargado al
           vuelo (init de una librería); el dibujo del esquema de "Ficha desde donde ya trabaja tu gente" no sale (sus
           rótulos sí) cuando lo monta el JavaScript; el móvil de la historia asoma sobre la sección siguiente (el fin
           de su sticky); cada cambio del JavaScript al bajar rehace la maqueta en 6-10 s.
      [~] 37e6. (Después de la 37h: tras el montaje la página ya no está ocupada, 37e3.) La maqueta del montaje de pre.opentimetrack.com sigue en ~8,5 s (más 1,7 de estilo) por elementos visibles
           que entran (React monta secciones): cada elemento se maqueta ~6 veces por las medidas de las cajas flex y
           cada bloque cuesta ~0,7 ms. Idea: rehacer solo la parte que cambió cuando la caja de su contenedor no cambia
           de tamaño (maqueta por trozos), o medir min/max-content sin maquetar.
           (2026-10-21: lo medido se guarda de una maqueta a otra, 37e6 (4-5): al bajar casi todas en 1,6-3 s; quedan
           los montajes grandes, 5-12 s.)
      [x] 37e7. (2026-10-21, D67) Repintar solo lo que cambia: cada fotograma de una animación del JS pinta toda la vista (~40 ms en el
           emulador, 2300 pintadas al bajar; pintar es ya el 29,5 % y la maqueta el 18 %). La ruta ligera sabe qué
           dibujos movió: pintar solo la unión de sus rectángulos de antes y de después (puede necesitar en Dash
           repintar una parte del lienzo de MUI: tarea D si falta).
      [x] 37f. El CSS que use la página y falte: translate, rotate y scale como propiedades sueltas, clip-path: inset(),
           filter: blur() (o ignorarlo sin romper), lo que salga al comparar.
      [x] 37f2. Lo que queda al comparar la portada de pre.opentimetrack.com con Chrome: la tarjeta girada (rotate: -1.2deg
           como propiedad suelta, md:-rotate-[1.2deg]) con su sombra, la portada más alta (min-height en svh/dvh?),
           el texto "Mueve el ratón por la pantalla" que no sale.
      [x] 37f3. El ratón (usuario, 2026-10-20: "cuando pasas con el ratón por encima de los gráficos, reaccionan en plan
           hover"): @media (hover: hover) y (pointer: fine) verdaderos (el Amiga tiene ratón: la página enseña "Mueve
           el ratón por la pantalla" solo así); los movimientos del ratón al JavaScript (mousemove/pointermove,
           mouseover/out, mouseenter/leave con clientX/Y, sobre el elemento de debajo: la pila de la portada sigue al
           ratón); :hover en el CSS del elemento de debajo (con la ruta ligera de 37d si no mueve nada). Sin inundar:
           un suceso por tic como mucho.
      [x] 37g. WOFF2 (es la 31h): Brotli (google/brotli, MIT, en third_party) y la reconstrucción de glyf/loca de WOFF2 a
           TTF para stb_truetype; las fuentes variables, con su instancia por defecto (o la del peso pedido si cabe).
      [~] 37h. Bajar por la página comparando con Chrome y arreglar lo que salga hasta que se vea bien. Cerrar la 37
           cuando el usuario lo dé por bueno.

- [x] 45. **La interfaz: menús, iconos, actividad e historial (usuario, 2026-10-23: "sorpréndeme").** Hacerla por pasos
      y probar cada uno en el emulador con capturas (rtg, MUI 3.8, y alguna en 4 colores) hasta que encaje.
      [x] a. Menús ordenados (dashui admite varios): Proyecto (Nueva ventana N, Cerrar ventana K, Ir a la dirección L
         —el cursor al campo, MUIA_Window_ActiveObject—, Acerca de ?, Salir Q); Navegar (Atrás, Adelante, Recargar R,
         Parar, Página de inicio H, Historial Y); Marcadores (Ver marcadores B, Añadir o quitar esta página D, Usar
         como página de inicio); Herramientas (Cookies, Buscar actualizaciones, No avisar de versiones nuevas).
      [x] b. Iconos: Actualizar como icono (no un botón de texto), con su ayuda "Actualizar a la 0.5.0-alfa" (mui_help)
         y otro para Reiniciar. Los iconos nuevos con 8 colores (los 4 del Workbench más verde, verde oscuro, rojo y
         amarillo; MUI los ajusta a la pantalla).
      [x] c. La actividad: fuera el punto de arriba; un led en la barra de estado, a la izquierda: verde que parpadea
         mientras algo llega, rojo un rato si la página falló, apagado parado (un lienzo de 12x12: barato).
      [x] d. El historial: fuera el panel lateral (no se leían las direcciones). Una página tachyon:historial como la de
         Chrome: lo visto (todas las ventanas), lo último arriba, con la hora, el título y la dirección entera, y un
         enlace para borrarlo; se guarda en Tachyon.historial (las últimas 300). El botón y el menú la abren. Atrás y
         adelante, con una lista propia de cada ventana.
      [x] e. Más: un candado junto a la dirección (cerrado con HTTPS, abierto con HTTP, nada en las páginas tachyon:);
         una estrella para el marcador (llena si la página está en marcadores; un clic la añade o la quita); en
         tachyon:marcadores, quitar cada uno; los atajos en el menú.
      [x] f. (2026-10-23) La página de inicio: el buscador (form con display: flex, input con flex: 1 y width: 400px, botón
         al lado) salía con el campo de ~200 px y el botón cortado ("Busc"); en Chrome, 520 px entre los dos. Puesto
         sin flex mientras; arreglar el flex en lib/maqueta.dash y volver a ponerlo. El logo, también en Acerca de.
         Hecho (2026-10-23; ver la bitácora): otra vez con flex.
      [x] h. Buscador por defecto (usuario, 2026-10-23): elegir uno de una lista (DuckDuckGo HTML, Google, Bing,
         Brave, Startpage, Mojeek, Ecosia, y Wikipedia y Aminet como búsquedas especiales), guardado en
         Tachyon.prefs; lo usan el buscador de la página de inicio y la barra de la dirección (unas palabras sin
         punto ni esquema se buscan, como en Chrome). Antes, ver en el emulador qué páginas de resultados salen bien.
         Hecho (2026-10-23): DuckDuckGo (HTML) por defecto, Google, Bing, Brave, Wikipedia y Aminet; Startpage,
         Mojeek y Ecosia fuera (piden demostrar que no se es un robot). Google enseña antes su aviso de cookies.
      [x] g. Catálogos de idiomas (usuario, 2026-10-23): los textos de la interfaz en catálogos de locale.library
         (Tachyon.catalog por idioma, español por defecto dentro), al menos inglés. Mirar si Dash tiene catálogos.
         (2026-10-23) Dash no los tiene: propuesto a la sesión dash como D71 (@catalog, tr(id, texto), ids en el
         .dashui y una herramienta .cd/.ct -> .catalog). Espera a ella.
         Hecha la primera parte (2026-10-24; ver la bitácora): la ventana, los menús, las ayudas, la barra de estado
         y la página de inicio, con el catálogo inglés; y luego las páginas tachyon: (descargas, buscadores,
         marcadores, historial, cookies), y la actualización automática baja también los catálogos de la versión
         nueva; Acerca de (sus créditos y el "compilado el"); y los errores de lib/http.dash y lib/documento.dash.
         Quedan en español: los de lib/red.dash (corre en la tarea de la red: que no abra ella el catálogo) y los de
         lib/actualizar.dash (en C).
         (2026-10-24, decisión del usuario por la sesión de las webs: "Inglés de serie y castellano en catálogo")
         Darle la vuelta: los textos del código en inglés (@catalog "Tachyon.catalog" 1, sin idioma) y un
         catalogos/español.ct con el castellano; las pruebas que miran textos de las páginas tachyon:, en inglés.
         Avisar a la sesión de las webs cuando salga la versión.
         (2026-10-23) Hecha (D71, Dash 9c1c1f6). Usuario: la traducción, para la 0.7.0 (la 0.6.0 sale antes).
         (2026-10-24) Hecho todo menos los errores de lib/red.dash y de lib/actualizar.dash: siguen en castellano
         (ahora que la interfaz es inglés de serie, se ven mezclados).
         Hecho (2026-10-24; ver la bitácora, 45g 8).
- [x] 47. **Gestor de descargas (usuario, 2026-10-23).** Hoy cada ventana baja una cosa a la vez (w.descarga) y solo
      lo dice la barra de estado. Una lista global: varias a la vez, que siguen aunque se cambie de página o se cierre
      la ventana; la página tachyon:descargas con cada una (nombre, dónde se guarda, KB de cuántos, velocidad, lo que
      falta), con parar, reintentar, quitar de la lista y "abrir el cajón" (el Workbench, OpenWorkbenchObject en 3.2);
      las acabadas se guardan en Tachyon.descargas. Un icono de descarga en la barra mientras alguna va (con la ayuda
      "2 descargas: 45 %"), que abre la página; menú Herramientas, Descargas (Amiga-J). Preguntar dónde guardar o usar
      un cajón por defecto (preferencia; por defecto, preguntar como hoy).
- [ ] 48. **Las webs de FreeMEM (usuario, 2026-10-23): tachyon.freemem.space, dash.freemem.space y
      trasfondo.freemem.space, que se vean decentes; y la animación de estrellas de tachyon.freemem.space "sería la
      rehostia".** Las tres son Next.js (turbopack). Las estrellas y la bola Boing de dash son un <canvas> 2D:
      a. Canvas 2D (lo que usan): getContext("2d"), fillStyle/strokeStyle con rgba, fillRect, clearRect, lineWidth,
         beginPath, moveTo, lineTo, stroke, setTransform; luego arc, fill y lo que pida la Boing. Un búfer de píxeles
         por lienzo (lo dibuja el JavaScript, en C), el pintor lo vuelca a su caja como un vídeo y cada
         requestAnimationFrame repinta solo esa zona. Las estrellas: 700 líneas por fotograma con estela (un fillRect
         translúcido): medir cuántos fotogramas da.
         Hecho (2026-10-24; ver la bitácora): el lienzo y las estrellas en una página local con su mismo código;
         en tachyon.freemem.space aún no: React no hidrata la portada y su efecto no llega a pedir el lienzo (48c).
      [x] c. tachyon.freemem.space: React no hidrata (ni __react* en los nodos ni efectos), así que el efecto de las
         estrellas no llega a pedir el lienzo. La salida (ya vaciada en cada tic) dice: React #412 "Connection
         closed" (el flujo de datos de Next, self.__next_f, se cierra con filas sin resolver). readyState y
         DOMContentLoaded van bien (tras todos los scripts). Sin ejecutar el script noModule de parches de Next
         (0cz1d0mv5g_q7.js) el #412 no sale, pero la página cambia (letras de una fuente web en cajitas) y
         tampoco hidrata a los 35 s: mirar qué parchea (Promise, ReadableStream, TextDecoder...) y si su
         flujo funciona con lo nuestro; y en esa vuelta, por qué salen cajitas.
         Hecho (2026-10-24; ver la bitácora): attributes no era viva y React se quedaba en un bucle sin fin.
      [~] d. Más velocidad para las estrellas: ~265 ms por fotograma en el emulador, casi todo el JavaScript de la
         página (~83 ms en pasar a texto los decimales del color, dtoa.c de QuickJS con enteros largos: uno más
         rápido ayudaría a todas las webs; ~90 ms en las 3500 llamadas; ~46 en sus cuentas).
         (2026-10-24) Los números a texto, con Ryu: hecho (ver la bitácora). La página de las estrellas de ahora
         ya no hace textos de color en cada fotograma: quedan las llamadas y sus cuentas.
      [x] e. La bola Boing de dash.freemem.space: la caja negra salía vacía (16 px de alto).
         Hecho (2026-10-24; ver la bitácora): un <canvas> con display: block y aspect-ratio.
      f. dpms.freemem.space (usuario, 2026-10-24): un Django con un fondo de Three.js (three-background.js:
         partículas, líneas y un plasma, con ShaderMaterial). Es WebGL con shaders: en Tachyon no (getContext
         "webgl" da null y WebGLRenderer lanza un error). Mirar que el resto de la página salga bien sin él; el
         fondo, solo si la web tiene uno en 2D cuando no hay WebGL (se le puede pedir a la sesión de las webs).
         Mirado (2026-10-24, rtg): entera en 37 s, el cartel, los textos y los botones bien; solo falta el fondo
         (el error de WebGL no para lo demás). "Qué es" e "Info del Evento" del menú parten en dos líneas.
      [x] g. trasfondo.freemem.space: las capturas (WebP diferidas) se quedaban en negro.
         Hecho (2026-10-24; ver la bitácora): las maquetas caras del JavaScript, como mucho un tercio del tiempo.
      [x] h. Maquetar otra vez solo una caja que no puede mover nada de fuera (absoluta con ancho y alto fijos, como
         el escritorio de trasfondo: 960x600): el panel cambia su "CPU 2,1 %" cada segundo y hoy eso es la maqueta
         entera (~730 ms y 160 de estilo en el emulador). Guardar al maquetar dónde y con qué se maquetó cada una
         (su contenedor, el pase, sus recortes y desplazamientos de fuera), quitar sus dibujos y poner los nuevos.
         Hecho (2026-10-24; ver la bitácora).
      [x] i. trasfondo: en el panel del escritorio, la fila "Red" junta "entra" y "sale" (y sus cifras: "133 B/s36 B/s");
         en Chrome van separadas.
         Hecho (2026-10-24; ver la bitácora): min-width.
      [x] j. trasfondo: los botones de las barras del escritorio y de sus ventanas (wb-profundidad, wb-cierre) son
         varios linear-gradient de un color con su background-position y background-size sobre un color: salen
         como un cuadro negro (o blanco). Pintar cada capa de fondo con su tamaño y su sitio.
         Hecho (2026-10-24; ver la bitácora).
      k. React #412 ("Connection closed") de vez en cuando (2 de ~10 cargas de la copia de trasfondo en el
         emulador): la página se queda sin hidratar. Next cierra el flujo de self.__next_f en DOMContentLoaded (o
         al momento si readyState ya no es "loading"): mirar si a veces se cierra antes de que corran todos los
         <script> en línea que lo llenan (el orden de los async frente a los de en línea).
         Medido (2026-10-24, copia con un script que apunta los push y el flujo): en las buenas, Next toma
         __next_f y crea su ReadableStream a ~4,5 s, llegan 2 push y DOMContentLoaded (cierre) ~760 ms después;
         en la del #412, solo 100 ms después: los scripts corrieron en otro orden (¿el async de Next tras los
         datos en línea?). Con el diagnóstico puesto, 0 de 14 cargas: sin reproducir; mirar cómo ordena
         lib/jsdom.dash los async que llegan tarde.
      b. Cada web: comparar con Chrome y arreglar lo que salga.

- [x] 49. **tachyon.freemem.space sale en azul en el CoffinOS del usuario (2026-10-24, con la compilación de 48c y
      48e).** Solo el fondo: ni la cabecera, ni los textos, ni las estrellas; "Listo" en la barra, y sigue así tras un
      minuto. En el emulador sale entera (18-25 s) en todas las pruebas: MUI 5 y MUI 3.8, 1024x768 y 1680x1050, 16 y
      32 bits (sys32rtg, sys32rtg38, sys32rtg38ancha, sys32rtg32, sys32rtg38ancha32), y sin hidratar (React #412) el
      contenido también se ve. Su CoffinOS: Amiberry, 68040 con JIT, MUI 3.8, una ventana de ~1700x1250. Pedida la
      salida: Traspaso:Tachyon/Tachyon https://tachyon.freemem.space/ >Traspaso:salida.txt. Hasta entenderlo, sin
      versión nueva (sería un paso atrás en su sistema).
      Hecho (2026-10-24; ver la bitácora): la FPU empezaba en precisión simple.
- [x] 54. **Enviar un informe de depuración (usuario, 2026-10-25: "para mañana", la primera; luego "haz ya la tarea 54
      y crea una release con eso").** Que un usuario,
      cuando algo le falla, pueda mandar desde Tachyon los registros de depuración a un servidor nuestro, para abrir
      una incidencia con ellos. Pensar antes de hacer: qué se guarda (errores de JavaScript, de red, la dirección,
      memoria, versión, sistema, MUI, CPU), cuánto (un registro circular en memoria o en T:), cómo lo pide el usuario
      (un menú "Enviar informe..." que enseña lo que se va a mandar y pide permiso; nada sin que lo pida), a dónde
      (un servidor propio con HTTPS; ¿o crear la issue en GitHub?), qué devuelve (un código para citarlo en la
      issue) y la privacidad (sin cookies ni contraseñas ni lo escrito en formularios; direcciones, solo si quiere).
      Hecho (2026-10-25; ver la bitácora).
- [~] 38. **youtube.com (usuario, 2026-10-20; 2026-10-24: "sería un puntazo", la siguiente).** Que la portada y la
      página de un vídeo de https://www.youtube.com funcionen bien (hoy los vídeos de YouTube incrustados ya se ven,
      tarea 30). Empezar como la 37a: cómo sale, errores, memoria, y partirla en subtareas.
      (2026-10-24) A "Tachyon/0.7 (AmigaOS)" YouTube le da la aplicación de escritorio para navegadores viejos (276 KB
      de HTML, desktop_polymer en ES5) con sus polyfills: web-animations, webcomponents-all-noPatch (customElements y
      ShadyDOM), fetch e IntersectionObserver. Tachyon no tiene customElements (el polyfill lo pone) y su
      MutationObserver no avisa nunca: el polyfill lo necesita para mejorar los elementos que entran después.
      a. Cómo sale hoy en la máquina RTG: errores, memoria, tiempo.
      b. MutationObserver de verdad (childList, attributes, characterData, subtree; takeRecords; en una microtarea):
         sirve a muchas webs, no solo a YouTube.
      c. Lo que pida después (customElements nativo si el polyfill no basta, ShadyDOM, ytd-app...).
      a y b hechas (2026-10-25; ver la bitácora). Para la c: style de un envoltorio de ShadyDOM, "not a function"
      en playerApi y attached (el reproductor), la memoria (46 MB de JavaScript al final) y una captura pintada.
      Partes de la c (2026-10-26):
      [x] c1. La hoja CSS de 3,8 MB: leerla son 184 s de los ~400 de la carga (necesita D71: 10 s). Hecha.
      [x] c2. El cuelgue sin mensaje hacia los 400 s de la carga (dos veces sin --memcheck; con él, no): el emulador
          deja de responder (ni las capturas). YouTube no da siempre lo mismo: a veces el script principal entero
          (10,8 MB), a veces partido (base de 1,2 MB y "late,app" de 9,6 MB, que llega después).
          Hecha (2026-10-27): las hojas leídas otra vez sin soltar las de antes (29 MB más); y el JavaScript deja una
          reserva al sistema.
      [ ] c3. Lo de antes: style de un envoltorio de ShadyDOM (YouTube pone ShadyDOM={force:true,noPatch:true}: en
          Chrome también lo usa, así que es otro camino de su código), "not a function" en playerApi y attached.
      [ ] c5. El velo gris sobre toda la portada (no es un "backdrop") y la rejilla, que se queda en el esqueleto.
          En parte (2026-10-27): el velo era el fondo del diálogo de cookies, que ya sale con sus textos y botones.
          Falta: pulsar "Reject all" cae en el fondo (tp-yt-iron-overlay-backdrop, z-index 2201 y fixed) y no en el
          botón: el diálogo (tp-yt-paper-dialog) se maqueta con capa 0 y a la izquierda, sin el position: fixed ni
          el z-index que le pone iron-overlay/iron-fit. Después, la portada de verdad.
          Hecho el botón (2026-10-27): el diálogo, centrado encima de la portada; "Reject all" lo cierra y YouTube
          guarda la elección ("Your YouTube History is off", como sin cuenta). La rejilla de vídeos sin probar.
      [ ] c6. La memoria: 46-52 MB de JavaScript y ~29 MB la hoja de 3,8 MB leída; en la máquina de 128 MB quedan
          6 MB y no cabe ni una captura de 1680x1050 (se mira con medir_visor --memoria 256).
      [ ] c4. Una captura de la portada pintada y comparada con Chrome.
      [~] c7. La velocidad (usuario, 2026-10-27: "Velocidad y luego botón"; el botón es lo que falta de c5). En la
          máquina RTG ancha: primer pintado a los 190 s y "entera" a los 300 s; 158 s eran los scripts, y de ellos
          138 s compilar el principal (10,8 MB). Hecho: find_var con un índice (compilarlo, 66 s) y el estilo por
          partes también con :has() (de 18 estilos enteros a 4). Siguen: la maqueta entera con cada cambio y los
          temporizadores de YouTube (90 s de los 140 entre los scripts y "entera").
- [ ] 53. **Las webs de chat (usuario, 2026-10-24: "si se viesen las webs de gemini, chatgpt, claude, etc y se pudiese
      conversar con ellas... ya sería la releche").** gemini.google.com, chatgpt.com, claude.ai: que se vean y se pueda
      escribir y leer la respuesta. Lo difícil: piden entrar con una cuenta (formularios, cookies, redirecciones de
      Google), son aplicaciones de JavaScript muy grandes, la respuesta llega a trozos (fetch con ReadableStream o
      EventSource; ¿WebSocket?) y suelen tener la comprobación de Cloudflare contra robots. Empezar mirando cada una
      (cómo sale, errores, qué API le falta) y partirla en subtareas. Después de la 38.
- [x] 52. **El idioma de Locale para las webs (pendiente de la 51).** navigator.language era 'es-ES' fijo y no se
      mandaba Accept-Language: Google, DuckDuckGo y demás elegían el idioma por su cuenta. Que las dos sigan al
      primer idioma de las Preferencias de Locale ("español": es-ES; uno que no se conoce, en-US).
      Hecho (2026-10-24; ver la bitácora).
- [~] 46. **Pestañas (usuario, 2026-10-23; le preocupa la memoria).** Varias páginas en una ventana. Una sola zona
      de dibujo y un Documento por pestaña (la barra de pestañas encima). La de delante, entera; las de detrás sin
      sus imágenes decodificadas (se vuelven a pintar al volver: están en la caché de disco o se piden otra vez) y con
      su JavaScript parado; con poca memoria libre, las de detrás se "descartan" como en Chrome (solo dirección,
      título y desplazamiento; se cargan al volver). Medir cuánto ocupa cada una antes y después.
      Diseño (2026-10-24): Dash no añade ni quita objetos MUI mientras corre, pero sí los enseña y esconde
      (mui_set_visible): la barra, una fila de 8 botones en navegador.dashui (como mucho 8 pestañas por ventana),
      escondida con una sola; cada botón con el título de su página (cortado) y la de delante marcada. Ventana se
      queda con los campos de la pestaña de delante (actual, desde, pasos, visto, carga, preparando, js_cuando, foco,
      empezada, io_pagina, animando, fotograma...): cambiar de pestaña los guarda en su Pestana y trae los de la otra
      (así casi todo el código sigue igual). Las de detrás, quietas: sin temporizadores ni cargas (la carga sigue al
      volver) y, más adelante, sin imágenes decodificadas. Menú Proyecto: Nueva pestaña (Amiga-T), Cerrar pestaña
      (Amiga-W); un enlace con el botón central del ratón, en una pestaña nueva.
      Hecha la primera parte (2026-10-24; ver la bitácora): abrir, cambiar y cerrar pestañas. Falta: soltar las
      imágenes decodificadas de las de detrás y descartarlas con poca memoria: hecho (ver la bitácora). Falta
      medir lo demás de cada una (su JavaScript, su maqueta) y volver al mismo desplazamiento tras descartarla.
      Volver al mismo desplazamiento: hecho (2026-10-24; ver la bitácora). Queda medir.
      Un enlace con Mayúsculas o Amiga pulsada, en una pestaña nueva: hecho, sin poderlo ver en el emulador (ver la
      bitácora).

- [x] 44. **Actualizarse desde Tachyon (usuario, 2026-10-23), como Chrome.** Al arrancar (como mucho una vez al día;
      una preferencia lo apaga) y desde el menú ("Buscar actualizaciones"), mirar la última versión publicada en
      GitHub (api.github.com/repos/FreeMEM/tachyon/releases: también las pre-release, que /releases/latest no da) y
      compararla con DASHWEB_VERSION. Si hay una nueva, un aviso en la barra (un botón "Actualizar", sin ventanas que
      salten) y nada más: solo al pulsarlo se baja el ejecutable, se guarda como Tachyon.new junto al actual, se
      renombra el actual a Tachyon.old y el nuevo a Tachyon (en AmigaOS el ejecutable no queda bloqueado tras
      LoadSeg), y se ofrece reiniciar. Si algo falla, el actual se queda como estaba. Tachyon no sabe abrir .lha:
      cada versión publica también el ejecutable solo comprimido con gzip (Tachyon.gz; lo inflate de lib/http.dash),
      con su tamaño y su SHA-256 en las notas para comprobarlo antes de cambiar nada (tools/paquete.sh y la
      publicación). Probar en el emulador con una versión de mentira servida en local.
      Hecho (2026-10-23; ver la bitácora). AL PUBLICAR UNA VERSIÓN: subir también build/Tachyon.gz (lo deja
      tools/paquete.sh junto a build/tachyon.lha), o las versiones de antes no la ven como actualización. Y desde
      la 0.7.0, también build/Tachyon-<idioma>.catalog (los catálogos sueltos: la actualización los baja tras
      instalar; 45g).
- [x] 43. **Cuelgue al arrancar en AmigaOS 4 (usuario, 2026-10-23: lo reportó un usuario con v0.3.0-alfa).** Un DSI
      (Grim Reaper) al iniciar, en código 68k bajo Petunia; luego otra vez sí arrancó y navegó (Aminet). En sus
      registros: ___main+0x300 (la vuelta de main al arranque), una llamada a FreeVec (LVO -690) y _strchr+0x10.
      Sospecha: una lectura de un puntero nulo (o liberado) que en un 68k clásico pasa sin ruido y OS4 no deja (la
      página cero no está). Buscarlo en FS-UAE con MMU (68040 con MMU) y MuForce/Enforcer: arrancar desde el icono y
      desde el Shell, con y sin red, y arreglar cada acceso que salga. Pedir al usuario el registro entero (con la
      pila) si vuelve a pasar.
      Hecho (2026-10-23): strcmp con un texto nil en _palabras_texto (ver la bitácora); falta que lo pruebe él.

- [ ] 39. **Cargas despertadas por la red, no por un tic (necesita D60; después de la 37).** El bucle de
      src/dashweb.dash espera con `mui_wait_event_signals(net_signal() | señal de las tareas)` y, al llegar una
      señal (ev == 0), avanza las cargas de las ventanas. `mui_timer` queda solo para lo que va por reloj
      (setTimeout/setInterval de las páginas, cuadros de vídeo, animaciones); hoy `programar()` pone un tic de 50 ms
      mientras algo llega, que retrasa cada paso de red (DNS, connect, TLS) y despierta la CPU 20 veces por segundo.
      D60 está (0389bef, rama dashweb de Dash): `net_signal()` antes de cada espera (vacía la cola de sucesos),
      `task_signal()` para los decodificadores; la bsdsocket de FS-UAE no tiene SO_EVENTMASK y da 0: ahí sigue el tic
      de 50 ms, y aunque haya señal, un temporizador lento (~1 s) para los plazos de net_connect_poll. Medir antes y
      después en Amiberry (en FS-UAE no se puede). docs/ARQUITECTURA.md lo rehace la sesión dashweb-f7: no tocarlo,
      apuntar el cambio en la bitácora. Va delante de la 38 salvo que el usuario diga otra cosa: es
      pequeña y acelera todas las cargas.
- [ ] 42. **Lo que el usuario vio en CoffinOS (2026-10-22, pantalla de unos 1650 px, con la compilación de las 00:50:
      sin la 41a3).** Va antes que lo que queda de la 41. Probar con una pantalla igual de ancha (modo de uaegfx mayor
      en una copia de sys32rtg38) y comparar con Chrome:
      [x] a. es.wikipedia.org/wiki/Commodore_Amiga_1200: el artículo aplastado (líneas encima de otras) y las pestañas
         Leer/Discusión/Editar pisadas. Mirar si con la v0.3.0-alfa (ya con la 41a3) sigue.
         Hecho (2026-10-24; ver la bitácora): el artículo ya salía bien; la cabecera, en una fila como Chrome. Quedan,
         menores: el pie de la foto, la raya bajo los títulos, la llamada de la referencia en alto, "Ir al contenido"
         visible arriba y el campo del buscador (width: 100%) más estrecho que en Chrome en una prueba local.
      [x] b. google.com: el icono de las aplicaciones (nueve puntos) sale como nueve círculos enormes.
      [x] c. Resultados de Google: el logo se parte ("Googl" y la "e" debajo); el título y la dirección de cada resultado
         van en la misma línea (la dirección debe ir aparte).
      d. meneame.net: la columna de las noticias sale vacía (solo la barra de la derecha).
      e. xataka.com: "Aceptar y Cerrar" del aviso de cookies no hace nada; las imágenes de la portada no salen (cajas
         vacías).
         (2026-10-23, con el tope de 120 s) El aviso ya no sale antes de unos 280 s: el loader de Didomi
         (sdk.privacy-center.org) se pide a los 5 s pero sale a los 103 s, su SDK (810 KB) llega a los 198 s y su
         interfaz se pide a los 274 s. No es la cola de descargas: las peticiones salen a golpes (61, 100, 153, 273 s),
         también las de conexiones ya abiertas, porque mientras corre el JavaScript de la página (y las maquetas de
         ~9 s) nada avanza la red. Haría falta que la red (DNS, TLS, envío y recepción) avance aparte del bucle
         principal (otra tarea, como las imágenes), o partir el trabajo largo para dar paso a tic.
      [x] f. amigaworld.net (comparada con Chrome): letra más grande, enlaces subrayados, temas centrados. Causa probable: su
         hoja va en `<style><!-- @import url(.../style.css); --></style>` y dashweb no salta `<!--`/`-->` (CDO/CDC de
         CSS 2.1 4.1.1) y pierde el @import (body 12px, a sin subrayado). Ojo también con "color;#000000; font-size:
         12px;" en esa hoja: una declaración rota no debe llevarse la siguiente.
      g. (usuario, 2026-10-22, al comparar con Amelinium) Los iconos que salen como cuadrados vacíos: en Wikipedia
         el ☰ del menú y el ⋮ de las herramientas (mask-image con SVG), en Xataka los del menú, el buscador, las redes
         y la fila de webs del grupo. Amelinium los pinta. Mirar con qué los hace cada página (mask-image, fuente de
         iconos, SVG en línea o en <use>) y pintarlos.
         Hechos (2026-10-23): los de máscara (Wikipedia) y los de fuentes de iconos que no son Font Awesome (Xataka).
         Hecho todo lo de Xataka (2026-10-23): la fila de favicons arriba, las redes y las secciones, la noticia
         destacada con su foto grande (no salía) y el icono de "NUEVO" a su derecha.
      h. (de la misma comparación) Wikipedia: el buscador sin su texto ("Buscar en Wikipedia") ni el botón "Buscar".
         amigaworld.net: las » del menú de la izquierda salen como "?".
         Hecho (2026-10-23): el texto del buscador (los campos con display block llevan su control). Las » de
         amigaworld: igual que Chrome (la cabecera HTTP dice UTF-8 y los bytes son Latin-1: U+FFFD; no es fallo).
         El botón "Buscar" ya sale (era la caja anónima del flex sin padre, 42i (2)) y con su texto centrado (flex
         con min-height, 2026-10-23). Lo de antes: salía de 25 px (medido a
         1 de ancho); en una copia local de la cabecera (tests, sin JS) sale de 41 (Chrome 71) y con letra de 13 px
         (Chrome 14: font-size var(--font-size-small, 0.875rem), y --font-size-medium se nombra a sí misma). No es
         rem (con html { font-size: 100% } rem ya vale 16).
      l. (2026-10-23) Wikipedia: la flecha del índice sale a veces como un cuadrado negro (la máscara de relleno de 1x1
         en vez del SVG), según la carga; con @supports ya bien en otras. Mirar el orden de las hojas que mete el
         JavaScript (skins.vector.icons) frente al de Chrome.
      [x] j. tools/traza.py (máquina objetivo, sys31) no acaba con una imagen data:image/svg+xml;utf8,... de fondo o de
         máscara (el navegador, en 3.1 y en 3.2, sí: es la herramienta); así no se puede trazar Wikipedia en local.
         Hecho (2026-10-23): compilaba traza_maqueta sin --fpu (nanosvg con floats mal); ya con --fpu.
      k. meneame.net (2026-10-23): sale bien pero entera a los 208 s (10 maquetas de ~5 s por imágenes que llegan
         poco a poco) y a cada título de noticia le falta la primera línea (en Chrome: "Susto en directo: una ola
         engulle a un reportero de ETB2 mientras informaba en pleno temporal"; dashweb solo "pleno temporal").
         Hecho (2026-10-23): los títulos enteros. Queda: entera a los 208 s. Probado (2026-10-23) espaciar las
         maquetas por imágenes al doble de lo que tardó la última: 6 maquetas en vez de 10 pero entera a los 261 s (la
         red varía mucho de una carga a otra); deshecho. Lo que pesa es lo de 42e: la red no avanza mientras se
         maqueta o corre el JavaScript.
         (2026-10-23) Con la red en tarea (D69): entera a los 168 s.
      i. (usuario, 2026-10-22, captura de CoffinOS) github.com/freemem: el avatar enorme (sin su tamaño, tapa la
         columna izquierda), "Skip o c ntent" (le faltan letras), las pestañas muy separadas y el contador de
         repositorios en una pastilla alta con el número dos veces.
         Hecho (2026-10-23): el avatar y la columna (las --x con mayúsculas), las pestañas y su contador (la caja
         anónima del flex). Queda: el gráfico de contribuciones (se queda cargando).
- [ ] 41. **Baterías de estándares (usuario, 2026-10-20: antes de youtube.com).** Medir con pruebas de fuera qué falta
      de HTML, CSS y JavaScript, y añadirlo. Por orden:
      41a. Acid2 (CSS 2.1: la cara sonriente): copiarla a tests/pages, comparar la captura con la de referencia y
           arreglar lo que salga.
      41a2. (2026-10-22, de Acid2: 10 de 11 piezas con la 41a) Flotantes como en CSS 2.1 (9.5): un bloque que
           sigue a un flotante no baja bajo él: va donde iría sin el flotante (lo solapa) y son sus líneas las que se
           acortan para dejarle sitio (el texto rodea la imagen flotante; hoy todo lo que no flota va debajo). Con
           eso los ojos de Acid2 (#eyes-c sobre #eyes-b). Y el colapso del margen de arriba de un hijo con el de su
           padre (8.3.1; la sonrisa de Acid2 queda 3 px baja). Comprobar con páginas de verdad antes y después.
           Hechos: el texto rodea (1), el bloque pasa por debajo (2), el margen de arriba (3). Falta: el de abajo;
           y Acid2 en el navegador, que sale peor que en las piezas de test_acid2 (#top deja ver "Hello World!",
           hueco entre la frente y la sonrisa, barra roja a lo ancho; captura del 2026-10-22).
      [x] 41a3. (2026-10-22) es.wikipedia.org/wiki/Amiga_1200: el texto del artículo sale aplastado (líneas de 2-3 px,
           unas encima de otras); ya pasaba antes de los cambios de hoy (comprobado con 286a218). Mirar qué CSS de
           Wikipedia lo da (font-size con clamp/var/calc, line-height...).
      41b. (2026-10-23: el corredor ya está, tools/wpt.py y tools/wpt_reftest.dash; normal-flow 73/100 de las primeras,
           en docs/wpt/; 76/100 con las tablas y las imágenes en línea)
           Web Platform Tests (github.com/web-platform-tests/wpt), las pruebas de pintado (reftests: cada página con su
           referencia, que debe verse igual): un guion que las corra en el emulador y compare las dos capturas, sin
           Chrome. Empezar por trozos: css/CSS2 (normal-flow, box, margin-padding-clear), css-flexbox, css-grid; apuntar
           el porcentaje que pasa en cada uno y subirlo.
      41c. css3test.com y html5test.com como lista de lo que falta (miden lo que el JavaScript dice que hay, no si se
           pinta bien); Acid3 (DOM y JavaScript, nota sobre 100). test262 no: QuickJS ya lo pasa casi entero.
      41d. Web Platform Tests entero, como en wpt.fyi (usuario, 2026-10-20: "en algún momento habrá que hacerlo"):
           también las pruebas de JavaScript (testharness.js: la página dice por sí misma qué pasa y qué no), por
           carpetas (html/, dom/, css/, fetch/, url/, encoding/...), con un resumen por carpeta como el de wpt.fyi
           (pasan / total) guardado en docs/ para ver cómo sube. Ir tarea a tarea por las carpetas con más fallos.
      Las pruebas de fuera no van al repo enteras: un guion que las baje (tools/) y las que se arreglen, copiadas
      como test con su licencia (WPT es BSD de 3 cláusulas).

- [ ] 40. **Lo que encontró la sesión dashweb-f7 al rehacer docs/ARQUITECTURA.md (2026-10-20; después de la 37,
      salvo la (a), que va antes de la próxima versión).** Comprobado en el código por ella:
      [x] (a) tools/paquete.sh compila dashweb y el visor sin --fpu, pero libqjs, libimg y libvideo van con -m68881: la
      bitácora (28g, 29b) dice que mezclar las dos formas rompía números (Date.now, SVG de 0x0). Mirar si algún
      número con decimales cruza entre las dos partes en la v0.2.0-alfa y, casi seguro, añadir --fpu.
      [x] (b) (2026-10-21) lib/http.dash guarda la respuesta entera en memoria, también en http_empezar_a_fichero (descargas,
      imágenes, vídeo), sin tope: un .lha grande puede agotar la memoria. Escribir al fichero según llega, o un tope
      con un aviso claro.
      [x] (c) (2026-10-21) Sin JS_SetInterruptHandler: un bucle infinito en el JavaScript de una página cuelga el navegador. Cortar
      un script que pase de N segundos y decirlo.
      [x] (d) (2026-10-21) line-height no se aplica: estilo.dash lo lee y lo hereda, pero maqueta.dash nunca lo usa (alto de línea =
      la pieza más alta + 2 px en _poner_linea).
      [x] (e) (2026-10-21, D68) data: no está en las imágenes: una <img> o url(data:...) sale como hueco (_imagen_traer lo trata como
      fichero).
      [x] (f) (hecha en la 37d2: documento_animar) Las animaciones de CSS no corren en dashweb: lib/animacion.dash tiene su test, pero nadie lo importa ni
      llama a animar() (la 31q no está acabada aunque el README diga otra cosa).
      [x] (g) (2026-10-21) Textos desfasados: docs/quickjs_amiga.md (el malloc ya es una cabecera de 8 bytes con el tamaño), las
      cabeceras de maqueta.dash ("position, más adelante", tablas), video.dash y videos.dash ("sin sonido"), el
      README (el ahorro de reanudar TLS apenas se nota: D55, 9,0 -> 7,9 s; la tabla de medidas es del 2026-10-16).
      [x] (h) (usuario, 2026-10-21: cuánto ocupa) La memoria de las imágenes: freemem.space gasta ~29-39 MB, casi todo
      imágenes en RGBA de 32 bits (sus 10 imágenes a tamaño original son 30 MB; se decodifican hasta 1280x1024 y
      además se guarda la copia escalada; los fondos del carrusel, que no se ven a la vez, enteros) y el pico al
      decodificar llega a ~64 MB. En un A1200 con 8 MB no cabe. Ideas: decodificar fondos e imágenes sin medidas al
      tamaño al que se ven y soltar el original; guardar en el formato de la pantalla (16 u 8 bits); no decodificar
      lo que no se ve (diapositivas ocultas).

### Fase B: con MUI (cuando la regla 1 la abra)

- [x] 18. **Ventana del navegador.** Con la API de MUI de Dash (`docs/MUI_DISEÑO.md` del clon): barra
      de URL, atrás/adelante/recargar, barra de estado y de progreso. La zona de página es la clase de dibujo
      propia de MUI (su tarea 7) pintando con el código de la tarea 13.
      Nota de la sesión de MUI (2026-10-16): la ventana se puede describir en un `.dashui` (formato en
      `docs/MUI_EDITOR.md` del clon) e importarla; `Principal_create()` devuelve un struct con los objetos.
      Ejemplo hecho: `examples/mui_navegador.dashui` + `examples/mui_navegador_editor.dash` (mui 2dd0e0a, plan MUI terminado).
- [x] 19. **Navegación.** Clic en enlaces, historial, recargar, scroll con ratón y teclado, título de la
      ventana, errores de red mostrados en la página.
- [x] 20a. **Bucle de eventos: la página principal.** Se recibe sin congelar la ventana (sondeo cada 50 ms
      con `mui_timer`, junto con los temporizadores del JS) y se puede parar.
- [x] 20b. **Bucle de eventos: imágenes.** Las imágenes llegan sin esperar (4 a la vez) y la página se vuelve a
      maquetar al llegar cada una.
- [x] 20c. **Bucle de eventos: hojas y scripts.** CSS (con sus `@import`) y `<script src>` llegan a la vez y sin
      esperar; la página se monta cuando están todos, en el orden del documento.
- [x] 21a. **Formularios: controles y GET.** `input` (texto, password, checkbox, radio, submit, hidden), `button`,
      `select` dibujados en la página; clic y teclado (foco, escribir, marcar, elegir); enviar por GET.
- [x] 21b. **Formularios: textarea, POST y JS.** `textarea`; envío POST (`application/x-www-form-urlencoded`);
      `.value`/`.checked` y `submit`/`onsubmit` en JavaScript.
- [x] 22a. **Marcadores y página de inicio.** Menú Proyecto: Página de inicio, Marcadores (una página con los
      enlaces), Añadir marcador, Usar como página de inicio.
- [x] 22b. **Varias ventanas.** Cada una con su página, historial y carga (hoy el estado del navegador es global).
- [x] 22c. **Atajos de menú.** Respuesta del usuario (2026-10-16): hay que hacerlos funcionar; averiguar si el
      fallo es de Dash. Hay otro emulador en esta máquina (Amiberry). Intentado sin éxito: tecla con cualificador,
      secuencia completa y ratón (MUI 5 usa menús propios). Inyectar Amiga derecha + tecla con `input.device` en un
      programa MUI cuelga el sistema con 68040+JIT (también un programa MUI mínimo con un menú) y en el A1200 sin JIT
      el atajo no llega. Averiguar si es la inyección, MUI, Dash o FS-UAE (un programa MUI mínimo en C; Amiberry).
- [x] 22d. **Historial plegable.** Preferencia del usuario (2026-10-16, vía la sesión de MUI): la lista de historial
      de la izquierda, oculta al abrir y accesible si se despliega. Patrón de `examples/mui_navegador.dash` de Dash:
      botón "_Historial" en la barra; la lista y el balance llevan `"hidden": true` en el `.dashui` y el botón los
      alterna con `mui_set_visible`.
- [x] 20d. **Bucle de eventos: conectar.** Respuesta del usuario (2026-10-16): la consulta DNS, la conexión y la
      negociación TLS no pueden congelar el navegador; mientras, un indicador de actividad (como los navegadores
      modernos). Hoy `http_empezar` espera a que conecte. Si una pila TCP/IP real da `SIGIO`, usarlo con
      `mui_wait_event_signals` (FS-UAE no lo da). Probarlo con un retraso artificial (servidor que tarda en
      aceptar o en responder al TLS).
- [x] 24. **Interfaz actual y la web real.** Petición del usuario (2026-10-16): "la interfaz debería asemejarse a un
      browser sencillo pero actual y con un buen UX", y cargar https://freemem.space.
- [x] 25. **jQuery.** freemem.space (WordPress) usa jQuery 3.7: falta DOM (createDocumentFragment, cloneNode,
      insertBefore, hermanos, eventos en document/window, readyState), `navigator`, `location`...
- [x] 26. **Maqueta más rápida.** 5 s en el A1200 para la página de prueba de 9 KB; ahora es la fase más lenta.
- [x] 27. **Emulación RTG.** Petición del usuario (2026-10-16): "poner la emulación en RTG a una resolución más alta".
      Un sistema emulado con tarjeta gráfica (uaegfx de FS-UAE con Picasso96, o el RTG de AmigaOS 3.2), pantalla
      de 1024x768 o más en 16/24 bits, con MUI, AmiSSL y fuentes; `medir_visor --maquina objetivo` lo usa. Como una
      PiStorm con RTG.
- [ ] 28. **Igual de bien que Chrome.** Petición del usuario (2026-10-16): comparar https://freemem.space en Chrome (en
      esta máquina, shiva) y en dashweb con RTG, al mismo ancho, y "tratar de alcanzar que se vea igual de bien".
      Capturas lado a lado; cada vuelta, la diferencia más visible (columnas con float/flex, position, márgenes,
      fuentes, imágenes, menús...) hasta que se parezcan. Partir en subtareas según lo que salga.
- [x] 28a. **@media con el ancho de la página.** Se evalúan como 640 px: con RTG (unos 940) salen las reglas de
      móvil (la barra superior de freemem.space se esconde). El ancho real de la zona de dibujo; volver a leer las
      hojas si cambia de lado de un corte.
- [x] 28b. **float.** left/right y clear en la maqueta (la fecha, el logotipo, las cinco entradas destacadas).
- [x] 28c. **Imágenes de fondo y position.** background-image (cover, center, no-repeat) en bloques;
      position relative/absolute (el título encima de la imagen), top/left/bottom.
- [x] 28d. **Tipografía.** text-transform, letter-spacing, fuentes web (Lato...) a las del Amiga, tamaños.
- [x] 28e. **Iconos.** Los de Font Awesome más comunes (menú, lupa, calendario, comentario) dibujados.
- [x] 28f. **Degradados.** linear-gradient (los títulos de las entradas destacadas sobre una sombra) leído y en la
      maqueta (`D_DEGRADADO`); pintarlo mezclado con lo de debajo necesita D42 (tarea 6 de la otra sesión:
      `gfx_blend_rect`, `gfx_gradient_rect`). Mientras, solo los tramos casi opacos.
- [x] 30. **Vídeo dentro de la página (prioridad del usuario, 2026-10-16).** `<video>` y YouTube reproducidos en su
      recuadro y a pantalla completa, "directo al vídeo integrado" (sin el paso de abrir MintVID aparte), con el
      núcleo de MintVID (github.com/boingball/MintVID, MIT; C99 portable): H.264 con libavc (Apache-2.0) y AAC.
      MintVID saca el MP4 de 360p (itag 18) o el HLS de la página de YouTube en el propio Amiga; en PiStorm/Emu68
      con RTG reproduce 360p. Licencias: dashweb es MIT; fuera libmpeg2 y a52dec (GPL); AAC: buscar un
      decodificador de licencia permisiva o usar el Helix de MintAMP (RPSL: publicar sus fuentes y avisos).
      Partes: 30a traer y compilar el núcleo y libavc (decodificar un MP4 local en el emulador); 30b reproducir en
      el recuadro de `<video>` (imagen por imagen en la zona de dibujo, sonido); 30c YouTube (de la página del
      vídeo al MP4/HLS); 30d controles y pantalla completa.
- [x] 30e. **Vídeo: el cartel antes del clic.** La miniatura del vídeo (la de YouTube, i.ytimg.com/vi/ID/hqdefault.jpg;
      el atributo poster de `<video>`) antes del clic. Captura del artículo de freemem.space con su YouTube.
- [x] 30f. **Vídeo: que empiece antes.** Reproducir mientras se baja (hoy espera el fichero entero).
- [x] 28g. **JavaScript más rápido.** El perfil de la otra sesión (carga real de freemem.space, 12 s en la máquina
      objetivo): QuickJS 24 %. libqjs.a va sin FPU (fp-bit): compilarlo para 68020+FPU como dashweb.
- [x] 28h. **Menos negociaciones TLS.** red_abrir_avanzar 14 % y red_recibir_ya 7 %: conexiones keep-alive para los
      recursos del mismo servidor.
- [x] 29. **Imágenes con decodificadores propios.** Pregunta del usuario (2026-10-16): ¿son óptimos los datatypes? No:
      decodifican a tamaño completo (una foto de freemem.space no acabó en 5 min en la máquina RTG), sin límites de
      memoria ni tiempo, sin WebP/SVG y distintos en cada sistema. Decodificar en C (third_party: stb_image para
      JPEG/PNG/GIF/BMP, libwebp para WebP) al tamaño en que se va a ver (JPEG a 1/2, 1/4, 1/8 al decodificar), sin
      esperar y con límites; datatypes solo para lo demás.
- [x] 29b. **SVG.** Logos e iconos en SVG (muchas webs): un subconjunto (path, rect, circle, fill/stroke) dibujado
      con gfx_ o rasterizado a RGB (nanosvg, zlib) al tamaño en que se ve.
- [x] 28i. **Lo que le falta al JavaScript de las webs de hoy.** commodoremalacca.club (Next.js), probado a mano
      por el usuario el 2026-10-17: "ReferenceError: 'TextEncoder' is not defined" en su webpack. TextEncoder y
      TextDecoder (UTF-8) en jsdom; luego, lo siguiente que pida esa página.
- [x] 28l. **Repintar menos (el usuario, 2026-10-17: "todo se re-renderiza varias veces").** Imágenes que llegan
      pintadas juntas; doble búfer en la zona de dibujo (D48, encargada).
- [~] 31. **CSS de verdad, módulo a módulo (decisión del usuario, 2026-10-17).** Hasta ahora el motor es general (nada
      a medida de una web), pero se iba completando con lo que pedía freemem.space, y otras webs se ven mal. Ahora,
      cada módulo de CSS entero según su especificación, con sus tests (páginas propias en tests/pages), y
      comprobado a mano contra Chrome (capturas al mismo ancho, tools/comparar_chrome.py) en la lista de webs de
      abajo. Orden:
      [x] 31a. Herramienta de comparación: captura de Chrome (headless, ancho de la zona de dibujo de dashweb en la
           máquina RTG) y de dashweb, una al lado de la otra, para una web o la lista entera. Solo a mano (no en la
           batería: son webs de terceros).
      [x] 31b. Flexbox (CSS Flexible Box Layout 1): flex-direction, flex-wrap, flex-grow/shrink/basis, justify-content,
           align-items/self/content, order, gap, márgenes auto, inline-flex, mínimos automáticos.
      [x] 31c. calc(), min(), max(), clamp() y las unidades que faltan (vw, vh, vmin, vmax, ch, ex; rem y em en todo).
      [x] 31d. Grid (CSS Grid 1): grid-template-columns/rows (fr, repeat, minmax, auto-fill/fit), áreas, gap, colocación
           automática y explícita, alineación.
      [x] 31e. Apilado y recorte: z-index (contextos de apilado), overflow (hidden, auto, scroll: recorte), position
           sticky.
      [x] 31f. border-radius de verdad (esquinas redondeadas con su radio, también en fondos e imágenes), box-shadow.
      [x] 31g. vertical-align, tablas completas (colspan/rowspan, anchos automáticos), aspect-ratio, object-fit.
      31h. @font-face (fuentes de la web: woff/woff2/ttf) y font-weight/style reales.
      [x] 31k. Selectors 4: :is(), :where(), :has(), :not() con listas (ami64.com usa :is() en querySelector).
      [x] 31l. Transforms completo: translate con %, scale, rotate de cualquier ángulo (en cajas e imágenes).
      [x] 31m. Transitions y Animations: el estado final (sin animar) y lo que pidan las webs de la lista.
      [x] 31n. Color 4: hsl(), hwb(), lab()/oklch(), color-mix(), y la sintaxis nueva rgb(r g b / a).
      [x] 31o. Text 3: text-overflow: ellipsis, overflow-wrap, word-break, text-shadow, hyphens básico.
      [x] 31p. @supports y @layer (Conditional 3 y Cascade 5): antes se perdía todo lo de dentro.
      34. Instalador e iconos (lo pide el usuario, 2026-10-17, para la alfa): iconos de Workbench (.info clásicos de 4
          colores, de 3.0 a 3.2) para el cajón, dashweb, el visor, el LEEME y el instalador, hechos con un script; un
          guion para el Installer del sistema que pregunte dónde instalar, copie el cajón y avise si faltan MUI,
          AmiSSL o una pila TCP/IP. Probarlo en el emulador con el Installer del disco de AmigaOS 3.2.
      33. RENDIMIENTO (lo pide el usuario, 2026-10-17: "está relento"; pasa delante de lo demás). freemem.space tarda
          105-120 s en la máquina RTG (68040 con JIT: medido que el JIT va, sin él todo tarda 2-2,5 veces). Primero
          medir con `tools/medir_visor.py --perfil` (tabla de tiempo por función de ./dash --profile) en las webs de
          la lista y atacar lo que más pese (cascada, maqueta repetida al llegar imágenes y fuentes, pintado entero,
          JavaScript, TLS), midiendo antes y después.
          33b. gzip (lo pregunta el usuario, 2026-10-17): lib/http.dash pide `Accept-Encoding: identity`, así que todo
               llega sin comprimir (la portada de freemem.space: 91 KB frente a 15 KB con gzip). Pedir gzip y
               deflate y descomprimir con el inflate de stb_image (ya va en libimg.a); medir antes y después, y
               apuntar dónde se va la espera (Main propio 80 %: red, TLS o temporizadores).
      36. HTML5 de verdad con Hubbub (el usuario, 2026-10-17, señala https://www.netsurf-browser.org/projects/hubbub/ y el código en https://github.com/netsurf-browser/libhubbub, con https://github.com/netsurf-browser/libparserutils;
          va detrás de la línea de tiempo de la carga de la tarea 33, antes que la 35): el analizador de NetSurf
          (C, licencia MIT, con libparserutils, también MIT; ya funciona en AmigaOS 3 dentro de NetSurf) en
          third_party/, compilado a una librería como libimg.a. Su árbol se construye por funciones de vuelta
          (crear elemento, añadir hijo, mover hijos...): el lado de C apunta las operaciones en una lista con números
          de nodo y Dash la repite creando los Nodo de lib/dom.dash (nada de punteros de C dentro del DOM). Trae lo
          que falta: etiquetas mal anidadas (adoption agency), contenido suelto en tablas (foster parenting), los
          modos de inserción, todas las entidades y el juego de caracteres de <meta charset>. Comprobar con los
          tests de html5lib (tree-construction) unos cuantos casos en el emulador, medir velocidad y memoria
          contra lib/html.dash + lib/dom.dash en las webs de la lista, y dejar el viejo solo si Hubbub no cabe.
      35. Lo que le falta frente a NetSurf (tabla del usuario, 2026-10-17), por este orden: (a) cookies HTTP
          (Set-Cookie y Cookie por dominio y ruta, Secure, caducidad; las mismas que document.cookie; guardadas en
          PROGDIR: entre sesiones); (b) estabilidad: Next.js lo deja sin memoria y se cierra (medir qué se come la
          memoria y fallar con un aviso, nunca cerrarse); (c) descargas (lo que no es una página se guarda con un
          requester de ficheros), guardar la página y la imagen; (d) imprimir (printer.device, la vista pintada).
      31q. Animar el CSS de verdad (lo pide el usuario, 2026-10-17: trainalong.fit dibuja sus curvas con @keyframes al
           abrirse). Ahora (31m) solo se pinta el estado final. Plan: (1) un reloj de animaciones con el tic de dashweb
           (unos 10-20 por segundo mientras haya alguna viva) y las funciones de tiempo (linear, ease y cubic-bezier,
           steps), delay, duración, vueltas, direction y fill-mode; (2) lo que no mueve la maqueta se aplica sobre los
           dibujos ya colocados del elemento y se repinta solo su caja: opacity, color y background-color, transform;
           (3) transitions (al cambiar :hover o las clases desde JavaScript); (4) lo que mueve la maqueta (width,
           height, margin...) rehaciendo la maqueta a pocos fotogramas; (5) SVG (stroke-dashoffset, transform de sus
           partes) volviendo a rasterizar el SVG en cada fotograma. Medir el coste en la máquina RTG.
      (El usuario, 2026-10-17: "mejor CSS 3". CSS 3 es el conjunto de módulos posteriores a CSS 2.1, que sigue siendo
      la base: el bloque 31 los va completando.)
      31j. ami64.com sale en blanco (averiguar); amigang.com, la cabecera rota; muylinux.com, el menú escondido sale
           a la vista; dpms.freemem.space, la imagen de fondo enorme (primera comparación, 2026-10-17).
      [x] 31i. SVG dentro de la página (<svg> con sus hijos, <use href="#icono"> de un sprite): los iconos y logos de
           casi todas las webs de la lista salen como cuadraditos vacíos (xataka.com, la primera comparación).
      Webs de prueba (del usuario): https://trainalong.fit/ https://meneame.net https://xataka.com
      https://dpms.freemem.space https://commodoremalacca.club https://www.muylinux.com/ https://amigaworld.net/
      https://www.ami64.com/ https://amigastore.eu/es/ https://aminet.net/ https://amiga.abime.net/
      https://amigang.com/community/ y https://freemem.space.
- [ ] 32. **JavaScript de las webs de hoy (pregunta del usuario, 2026-10-17).** El lenguaje está completo (QuickJS,
      ES2023); falta navegador. Orden:
      32z. Primero, los errores de JavaScript de las webs de la lista: amigastore.eu (jQuery 1.7: "not a function" al
           poner un style), amigang.com ("cannot read property 'replace' of undefined" en sus enlaces: ¿a.hash,
           a.pathname?), ami64.com (Wix: "'set'/'get' of undefined"; :is() en querySelector).
      32a. fetch y XMLHttpRequest (sobre las cargas sin espera de lib/http.dash; promesas y eventos), con Headers,
           Request/Response básicos.
      32b. URL y URLSearchParams, FormData, Blob (lo básico), crypto.getRandomValues y randomUUID.
      32c. <script type="module"> e import estáticos (traídos con la red de dashweb), import() dinámico.
      32d. customElements (define, connectedCallback) y los observadores de verdad (MutationObserver al menos).
      32f. Intl (QuickJS no lo trae): toLocaleString de números y fechas, Intl.NumberFormat, DateTimeFormat,
           Collator, PluralRules y Segmenter básicos (es y en), en el preludio.
      32g. Fallos de QuickJS que salgan con las webs de la lista: arreglados en C (parches pequeños, anotados en
           third_party/quickjs, con su test) y avisados a su autor.
      32e. Canvas 2D (lo básico: rectángulos, texto, imágenes) sobre la zona de dibujo.
- [ ] 28j. **Next.js sin agotar la memoria.** Con ReadableStream (escrita en el preludio como
      __dashweb_ReadableStream, sin poner), el JavaScript de commodoremalacca.club sigue (React montando la página) y
      deja el Amiga sin memoria (malloc falla: no es QuickJS, que ya tiene tope de 48 MB) y dashweb se cierra; salen
      también excepciones "null". Averiguar qué crece (¿el DOM de Dash?) y ponerle freno; luego poner ReadableStream.
- [ ] 28k. **commodoremalacca.club como en Chrome.** Su portada sale con el texto blanco sobre fondo claro (falta el
      fondo oscuro del bloque principal) y el botón redondeado "Ver Eventos" dibujado como una elipse.
- [x] 29c. **Decodificar sin parar la interfaz.** Hoy una imagen se decodifica entera en imagenes_avanzar (la
      ventana no responde mientras): por trozos (TJpgDec por bloques, libwebp incremental) o en otra tarea.
- [x] 23. **Repaso final.** Tamaño, memoria, tiempos en la configuración objetivo, documentación,
      paquete LHA con instrucciones de instalación (MUI 5, AmiSSL 5, pila TCP/IP).

## Bitácora

Formato:

### YYYY-MM-DD — Tarea N
- Hecho:
- Tests:
- Pendiente / riesgos:

### 2026-10-15 — Plan
- Hecho: plan creado. Estado de MUI en Dash: tarea 1 hecha, tarea 2 en curso (otra sesión, rama `mui`).
- Fase B: cerrada.

### 2026-10-15 — Tarea 1 (base del repo)
- Hecho: clon de Dash en `~/.cache/dashweb/dash` (rama `mui`, commit b8439a1). `tests/run.py`: compila con
  `$DASH/dash --fpu` (con `PYTHONPATH=$DASH`: `./dash` ejecuta `python3 -m compiler.main` y escribe `build/` en
  el directorio actual) y ejecuta en FS-UAE (A1200 + 68882) los que tienen `# expect-out:`; directivas
  `# dash-flags:`, `# cflags:`, `# emu-config:` (agrupa arranques por opciones) y `# emu-needs:`.
  `tests/test_hola.dash`. `CLAUDE.md` de dashweb. `.gitignore` ya tenía `build/`.
- Tests: 1/1. Comprobado que el runner detecta una línea distinta y que `import "../lib/x.dash"` funciona.
- Pendiente / riesgos: MUI en Dash va por la tarea 2 (diseño hecho), fase B cerrada.

### 2026-10-15 — Tarea 2 (arquitectura)
- Hecho: `docs/ARQUITECTURA.md` (flujo de una página, módulos, datos, memoria, juego de caracteres, red, JS).
  Probado qué tiene Dash: `s.length`, `s[i]` (da un `char`, sin crear texto), `"n=" + 42`, recursión con `nil`,
  `@native` con `String`. No tiene: listas que crecen, funciones de texto, diccionarios, fuentes/colores RGB,
  red. Errores: `a + [3]` transpila a C inválido; `"abc" < "abd"` compara punteros.
- Cambio de reglas (usuario): lo que falte a Dash se añade a Dash. Worktree `~/Projects/FreeMEMLang-dashweb`,
  rama `dashweb` desde `mui` (b8439a1); borrado el clon de `~/.cache`. Tareas D1-D12. `tests/run.py` usa el worktree.
- Coordinación con la sesión de MUI por mensaje: reparto y convenciones en la sección "Coordinación".
- Tests: 1/1.
- Pendiente / riesgos: choques al hacer `rebase mui` en `amiga_builtins.py`/`codegen.py` (minimizados con
  bloques propios).

### 2026-10-15 — D1 (Dash: sumar listas, orden de textos)
- Hecho (rama `dashweb` de Dash, commit 3db48f3 tras el rebase): `a + b` une listas en una nueva
  (`DashArray_concat`, toma el tipo de la primera tipada y es dueña de sus textos y structs); `[1] + ["a"]` y
  `lista + 3` son errores claros (antes C inválido). `<`, `>`, `<=`, `>=` entre textos usan `strcmp`. Los
  parámetros `Array` se tratan como listas en codegen (antes `"number"`). Docs: manual y referencia rápida.
- Tests (Dash): `test_list_concat` (con `--memcheck`, 0 vivos), `test_string_order`, `errors/list_add_mixed`,
  `errors/list_add_number`. Mismo C en los 115 tests y ejemplos previos. 293/293 con `--emu --emu-a500
  --emu-32`, ejemplos 31/31. Tras el rebase sobre `mui` (24cd343, tarea 3 de MUI con `latin1.py`): sin
  emulador todo pasa y los dos tests nuevos pasan en el emulador.
- dashweb: 1/1.
- Pendiente / riesgos: sumar en un bucle copia la lista entera (cuadrático): `push` llega en D4. Encontrado
  para D2: `s[i]` y `s.length` cuestan O(n).

### 2026-10-15 — D2 (Dash: texto)
- Hecho (rama `dashweb`, af3ca65 tras rebase sobre la tarea 5 de MUI): `TEXT_RUNTIME` y builtins `str_code`,
  `str_char`, `str_find`, `str_find_from`, `str_starts`, `str_ends`, `str_lower`, `str_upper` (Latin-1),
  `str_trim`, `str_to_int`, `str_from_int`, `str_replace`; `Int("42")`, `Int(s[i])` (0-255). `s[i]` y `s.length`
  usan una caché de longitudes de textos largos (>= 64 bytes, 4 entradas, se olvida en `_dash_str_drop`):
  recorrer 8 KB por posición, 91,9 s → 0,15 s en el A1200 real. Campo `reads_only` en `BuiltinFunc`: los
  builtins que solo leen no copian para siempre sus argumentos (sin él, cada llamada dejaba un texto escapado).
- Corrección de D1: la comparación "mismo C" de D1 estaba mal (`python3 -m compiler.main` carga el compilador
  del directorio actual: las dos pasadas usaban el nuevo). Hecha bien (script `cmpc.sh` en el scratchpad): la
  suma de listas pasa a `ARRAY_CONCAT_RUNTIME` (solo si se usa) y los parámetros `Array` cuentan referencias
  como los structs (cambia `test_refcount_paths`, que pasa con `--memcheck`). Ahora solo cambia el C de los
  programas que usan `s[i]`, `s.length`, `str_*` o la suma de listas.
- Tests (Dash): `test_text` (con `--memcheck`, 0 vivos y 0 escapados); `expect-c` de `test_loops` y
  `test_arrays_adv` al nombre nuevo. 298/298 con `--emu --emu-a500 --emu-32` (con esos dos ya corregidos),
  ejemplos 32/32. Tras el rebase: 130/130 sin emulador y los tests de D1/D2 en el emulador.
- Pendiente / riesgos: un texto modificado por dentro desde C con la misma dirección daría una longitud vieja
  (los textos de Dash no se modifican; documentarlo si aparece algún caso).

### 2026-10-15 — D13 (Dash: `elif`)
- Hecho (rama `dashweb`, a20e520): `elif` en la gramática; el transformador lo pliega en `if` anidados dentro del
  `else`, así que el C es el mismo de siempre (comprobado con `tools/cmp_dash_c.sh`: solo aparece el test nuevo).
  Manual y referencia rápida.
- Tests (Dash): `test_elif` en A1200, A500 y 3.2. 131/131 sin emulador, ejemplos 32/32. No relancé la batería
  completa con emuladores: el C de todos los programas anteriores es idéntico.
- Encontrado: `for x in [1, 2]` no compila (solo variables): apuntado en D4.
- Pendiente: `lib/url.dash` escrito (tarea 3, sin probar ni commit): la siguiente vuelta.

### 2026-10-15 — Tarea 3 (URL)
- Hecho: `lib/url.dash`: `struct Url` (esquema y host en minúsculas, puerto -1 si no se da, `tiene_*` para
  distinguir partes vacías de ausentes), `url_parse`, `url_resolve` (RFC 3986 5.2.2), `url_remove_dots` (5.2.4),
  `url_text`, `url_port` (80/443). IPv6 entre corchetes, usuario, URLs relativas.
- `tests/run.py --memcheck`: compila con `--memcheck` y falla si la línea de resumen no dice 0 vivos y 0 errores.
- Tests: `test_url` con los 42 ejemplos del RFC 3986 (5.4.1 y 5.4.2) y 6 de análisis: todo a la primera.
  2/2, y 2/2 con `--memcheck` (0 objetos y 0 textos vivos).
- Pendiente / riesgos: sin `%xx` (codificar/decodificar): cuando haga falta (HTTP y formularios).

### 2026-10-16 — D3 (Dash: textos que crecen)
- Hecho (rama `dashweb`, cb49e29 tras rebase sobre la tarea 7 de MUI): `s = s + a + b...` sobre una variable
  String dueña de su texto (local, global, o parámetro reasignado, que Dash ya copia) emite
  `_dash_str_append` por cada parte: copia al final si cabe; si no, bloque del doble. La caché de longitudes de
  D2 se actualiza (`_dash_str_setlen`). No se aplica si otra parte de la suma lee la variable. No hizo falta
  una API nueva. Construir 20.000 caracteres de uno en uno: 231 s → 0,87 s en el A1200 real.
- Tests (Dash): `test_string_append` (`--memcheck`, global, parámetro, `s = s + s`). 318/318 con
  `--emu --emu-a500 --emu-32`, 195/195 con `--emu --memcheck`, ejemplos 32/32. Tras el rebase: 134/134 sin
  emulador y 199/199 en el A1200 (incluidos los de MUI).
- C: cambian los programas que hacen `s = s + ...` y los que ya usaban el runtime de texto (trae dos funciones
  más).
- Pendiente / riesgos: campos de structs (`self.t = self.t + x`) siguen copiando: si el HTML los necesita, ampliar.

### 2026-10-16 — D7 (Dash: ficheros y buffers como texto)
- Hecho (rama `dashweb`, f710a0e tras rebase sobre la tarea 8 de MUI): `file_read_text` (fichero entero; `nil`
  si no se puede leer), `file_write_text`, `str_from_buffer`, `str_to_buffer`. Los bytes 0 pasan a espacios (un
  String termina en el 0). En `TEXT_IO_RUNTIME`, solo si se usan: mismo C en todos los programas anteriores.
- Tests (Dash): `test_text_files` (`--memcheck`, fichero de 30 KB, fichero que no existe, vacío, buffers) en
  A1200, A500 y 3.2. Tras el rebase: 136/136 sin emulador, 203/203 en el A1200 (con MUI), ejemplos 32/32.
- Pendiente: los conflictos del rebase son siempre `docs/BUILTINS.md` (generado): se regenera.

### 2026-10-16 — D4a (Dash: tipos de lista)
- Motivo: la tabla de entidades HTML de la tarea 4 (lista de textos global) se leía como enteros: una lista
  perdía el tipo de sus elementos en globales, parámetros, retornos y campos. D4 dividida en D4a/D4b/D4c.
- Hecho (rama `dashweb`, 392b05c): tipo `[T]` (terminal `TYPE_NAME`, sin espacios); el analizador da
  `elem_struct`/`ARRAY_STRING` a globales, `var`, parámetros (funciones, lambdas, métodos) y mira el tipo
  declarado de llamadas y campos; codegen lleva `array:string`/`array:struct:X`/`array:array` a esos sitios
  y a los accesos `f()[i]`, `obj.campo[i]`. `for x in <expresión>` (antes solo una variable): campos,
  llamadas y literales, con el tipo de sus elementos. Error claro para `[Cosa]` inexistente.
- Tests (Dash): `test_list_types` (`--memcheck`) en A1200, A500 y 3.2; `errors/list_type_unknown`. 138/138
  sin emulador, ejemplos 32/32. Mismo C en los 129 programas previos (`tools/cmp_dash_c.sh`).
- Pendiente: la tarea 4 (`lib/texto.dash`) sigue a medias; `lib/entidades.dash` generado debe usar `[String]`.

### 2026-10-16 — Tarea 4 (texto)
- Hecho: `lib/texto.dash`: `utf8_a_latin1` (tramos ASCII de una vez; bytes sueltos se toman como Latin-1),
  `cp1252_a_latin1`, `texto_decodificar(s, juego)` (ISO-8859-1 se lee como Windows-1252, como los navegadores),
  `latin1_de(cp)` con sustitutos (comillas, guiones, "...", EUR, (TM), OE...), `html_entidades` (con nombre,
  `&#nnn;`, `&#xhh;`; sin `;` solo amp/lt/gt/quot) y `entidad_codigo` (búsqueda binaria con el `<` de textos de
  D1). `lib/entidades.dash` (159 entidades) generado por `tools/gen_entidades.py` desde `html.entities` de Python,
  como listas globales `[String]`/`[Int]` (D4a).
- Tests: `test_texto` (UTF-8 de 2, 3 y 4 bytes, inválido, Windows-1252, entidades, búsqueda). 3/3, también con
  `--memcheck`.
- Encontrado: una función del programa llamada `b` impide a los módulos usar una variable local `b` → D14.

### 2026-10-16 — D8 (Dash: red TCP)
- Hecho (rama `dashweb`): `NET_FUNCTIONS`/`NET_RUNTIME`: `net_connect(host, puerto, ms)` (DNS o dirección,
  conexión sin bloqueo con `WaitSelect` y tiempo límite), `net_send`, `net_send_buffer`, `net_recv` (texto; `""` si
  nada en el tiempo dado, `nil` al cerrarse), `net_recv_buffer`, `net_wait`, `net_close`, `net_resolve`,
  `net_error` (en español). `bsdsocket.library` se abre al usarla y se cierra al salir. Runner de Dash:
  `# emu-net: PUERTO` → arranque aparte con `bsdsocket_library = 1` y un servidor de eco en 127.0.0.1 del PC.
- Tests (Dash): `test_net` (resolver, conectar, enviar, recibir hasta el cierre, puerto cerrado, host
  inexistente) en A1200, A500 y 3.2 y con `--memcheck`. 140/140 sin emulador, ejemplos 32/32. Mismo C en los
  programas previos.
- Pendiente: señales de los sockets para el bucle de MUI (apuntado en la tarea 20).

### 2026-10-16 — Tarea 5 (TCP) y D15
- Hecho: `lib/red.dash`: `struct Conexion` (socket, espera, lo pendiente con su posición, cerrada, error),
  `red_abrir`, `red_enviar`, `red_leer_linea` (quita `\r\n`; nil al cerrarse), `red_leer(c, n)`,
  `red_leer_todo`, `red_cerrar`. Lo ya leído se descarta antes de traer más. `tests/run.py`: directiva
  `# emu-server: script.py PUERTO` (FS-UAE con `bsdsocket_library = 1` y el script de `tests/servers/` en el PC).
- D15 (Dash, e7d2a1e): `c == "\r"` comparaba un carácter con un puntero (nunca cierto); ahora con `'\r'`.
  Test `test_char_escapes` en A1200, A500 y 3.2; 141/141 sin emulador; solo cambia el C de ese test.
- Tests: `test_red` contra `tests/servers/lineas.py` (líneas con `\r\n` y `\n`, 3000 bytes en dos envíos, hasta el
  cierre, eco, puerto cerrado). 4/4, también con `--memcheck`.

### 2026-10-16 — D4b (Dash: listas que crecen)
- Hecho (rama `dashweb`, b2097c7): `l.push(x)`, `l.pop()`, `l.insert(i, x)`, `l.remove(i)`, `l.clear()` en
  `LIST_RUNTIME` (solo si se usa): el bloque de datos se dobla al llenarse; con listas tipadas, `_obj`/`_str` (la
  lista retiene structs y es dueña de textos; `pop` los entrega como temporales; `remove`/`clear` los sueltan).
  Gramática: llamadas a métodos como instrucción a través de campos (`n.hijos.push(h)`, `self.l.clear()`). El
  analizador revisa nombre, número de argumentos y tipo del elemento. 20.000 `push` en 0,44 s (A1200 real, con
  `--memcheck`).
- Tests (Dash): `test_list_methods` (`--memcheck`) en A1200, A500 y 3.2; errores `list_method_unknown`,
  `list_push_type`, `list_method_args`. 141/141 + nuevos sin emulador. Mismo C en los 133 programas previos.

### 2026-10-16 — D5 (Dash: diccionarios)
- Hecho (rama `dashweb`, 6cb1367 tras rebase sobre la tarea 10 de MUI): tipo `{String: T}`, literal `{"k": v}`,
  `d[k]`, `d[k] = v`, `has`, `remove`, `keys` (lista de textos), `clear`, `length`; valores Int, Bool, String,
  structs y listas. `DICT_RUNTIME` (solo si se usa): tabla hash (djb2, sondeo lineal, borrado desplazando hacia
  atrás, crece al 75 %), dueña de claves y valores. Gramática: asignar a un índice a través de campos
  (`h.reglas["k"] = v`, `self.l[i] = v`). Errores: claves no texto, `for k in d`, métodos que no existen.
  2.000 altas + 2.000 lecturas + 1.000 bajas con claves `"k" + i`: 3,4 s en el A1200 real.
- Tests (Dash): `test_dict` (`--memcheck`) en A1200, A500 y 3.2; errores `dict_int_key`, `dict_for`,
  `dict_method_unknown`. Mismo C en los 134 programas previos. Tras el rebase: todo pasa sin emulador y en el A1200.

### 2026-10-16 — Tarea 6 (HTTP/1.1)
- Hecho: `lib/http.dash`: `struct Respuesta` (estado, razón, cabeceras `{String: String}` en minúsculas —las
  repetidas se unen con ", "—, cuerpo, URL final, tipo y juego de caracteres de `Content-Type`, error);
  `http_get(url, ms)` sigue hasta 5 redirecciones (301/302/303/307/308, `Location` relativa o absoluta);
  cuerpo por `Content-Length`, `chunked` (con cabeceras finales) o hasta el cierre; `http_texto(r)` lo pasa a
  Latin-1 con `lib/texto.dash`. Petición con `Host`, `User-Agent`, `Accept-Encoding: identity`, `Connection: close`.
- Tests: `test_http` contra `tests/servers/http.py` (longitud, chunked, UTF-8, redirección relativa y absoluta,
  bucle, 404 con cabeceras repetidas, sin longitud, petición enviada sin el fragmento, esquema no admitido, puerto
  cerrado). 5/5, también con `--memcheck`.
- Pendiente: HTTPS (tarea 7); cuerpos binarios en buffer (apuntado en la tarea 14); conexiones persistentes y
  compresión, más adelante si hace falta.

### 2026-10-16 — D11 (Dash: TLS con AmiSSL)
- Hecho (rama `dashweb`, 692ca21 tras rebase sobre la tarea 12 de MUI): `tls_connect(socket, host)` (verifica
  certificado y nombre contra `AmiSSL:Certs`), `tls_send`, `tls_send_buffer`, `tls_recv`, `tls_recv_buffer`,
  `tls_close`; errores por `net_error()` ("hostname mismatch"...). AmiSSL 5.27 (Apache 2.0) fuera de git:
  `tools/get_amissl.sh` (descarga del GitHub oficial con SHA-256) y `tools/emu_sys_amissl.sh` (sistema emulado con
  AmiSSL y una CA de prueba en `~/.cache/dash-amissl/testca`, puesta en `AmiSSL:Certs`; `UserCerts` no se lee por
  defecto). `./dash` y el runner añaden `-I` del SDK si el C usa AmiSSL (`compiler/cflags.amissl_flags`).
- Encontrado: OpenSSL 3 (AmiSSL) se cuelga en `SSL_CTX_new` con poca pila: el programa pide 64 KB si usa TLS.
- Runner de Dash: `# emu-net-tls: PUERTO` (servidor de eco TLS con certificado para 127.0.0.1 firmado por la CA de
  prueba); los tests con `# emu-needs: amisslmaster.library` arrancan `$DASH_EMU_SYS_SSL`/`$DASH_EMU_SYS_32_SSL`
  y se saltan en el A500 (AmiSSL pide 68020).
- Tests (Dash): `test_tls` (`--memcheck`) en A1200 y 3.2 (~30 s cada uno: cargar AmiSSL en la emulación). Tras
  el rebase: 151/151 sin emulador, 226/226 en el A1200, ejemplos 33/33.

### 2026-10-16 — Fase B abierta
- MUI 1-11 completas en la rama `mui` (f63dbcf, aviso de la otra sesión). La rama `dashweb` ya está encima
  (rebase hecho). Referencias: `examples/mui_navegador.dash` del worktree; capturas con
  `tools/emu_run.py --autoclose 30 --screenshot 20 shot.png prog.dash`. Medidas suyas en A1200: abrir app y
  ventana 1,9 s; `mui_list_add` 35 ms por línea (7 ms con `mui_list_quiet`).
- Orden: se siguen haciendo primero las tareas `[ ]` de la fase A (regla 5: la primera `[ ]` de la fase
  abierta; las dos fases están abiertas, se van cogiendo en orden de la lista).

### 2026-10-16 — Tarea 7 (HTTPS)
- Hecho: `lib/red.dash`: campo `tls` en `Conexion`, `red_abrir_tls` (conexión + `tls_connect` con certificado y nombre
  comprobados), envío y lectura por TLS cuando lo hay; `red_cerrar` termina TLS y cierra el socket.
  `lib/http.dash`: `https:` (puerto 443 por defecto). AmiSSL (descarga, sistema emulado, CA de prueba) quedó en D11 de Dash.
- `tests/run.py`: los tests con `# emu-needs: amisslmaster.library` arrancan `$DASH_EMU_SYS_SSL`.
  `tests/servers/http.py PUERTO tls`: el mismo servidor con HTTPS (certificado firmado por la CA de prueba).
- Tests: `test_https` (longitud, chunked, redirección a https, nombre que no coincide). 6/6, también con `--memcheck`.

### 2026-10-16 — Tarea 8 (tokenizador HTML)
- Hecho: `lib/html.dash`: `html_tokenizador(texto)` y `html_siguiente(t)` (un token cada vez; nil al final):
  `HT_TEXTO`, `HT_INICIO` (nombre en minúsculas, `[Atributo]` en orden —el primero gana si se repite—,
  `autocierre`), `HT_FIN`, `HT_COMENTARIO`, `HT_DOCTYPE`. Atributos con comillas dobles, simples o sin ellas, y
  sin valor. Entidades cambiadas en texto y atributos. Texto crudo en script, style, textarea, title, xmp, iframe,
  noembed, noframes, plaintext (hasta su cierre sin mirar mayúsculas; entidades solo en textarea y title).
  XHTML: `<![CDATA[...]]>` como texto, `<?xml ...?>` como comentario. Un `<` que no abre etiqueta es texto; como
  en HTML5, `<y<input` es una etiqueta llamada `y<input`. `html_atributo(tok, nombre)`.
- `tests/run.py`: directiva `# memcheck` (siempre con `--memcheck`).
- Tests: `test_html_tokens` (`--memcheck`). 7/7, también con `--memcheck`.

### 2026-10-16 — D6 (Dash: campos weak)
- Hecho (rama `dashweb`, d00c956): `weak padre: Nodo` en un struct: el constructor, la asignación y el destructor
  no cuentan esa referencia. Con `--memcheck`, leer un `weak` cuyo objeto ya se liberó da
  `memcheck: ERROR campo weak de un objeto ya liberado` y `nil` (`WEAK_RUNTIME`, solo si hay campos weak).
  Error si se usa con Int/String/... Medido: 101 árboles con padre fuerte dejan 1010 objetos y 505 textos vivos
  al salir; con `weak`, 0.
- Tests (Dash): `test_weak`, `test_weak_dangling` (los dos con `--memcheck`) en A1200, A500 y 3.2;
  `errors/weak_int`. 154/154 sin emulador, ejemplos 33/33. Mismo C en los programas previos.

### 2026-10-16 — Tarea 9 (árbol DOM) y D16
- Hecho: `lib/dom.dash`: `struct Nodo` (tipo, nombre, texto, `[Atributo]`, `hijos: [Nodo]`, `weak padre`),
  `dom_desde_html(texto)` con pila de elementos abiertos: html/head/body implícitos (lo de head mientras no empieza
  el cuerpo), cierres implícitos (`p` ante bloques, `li`, `dt`/`dd`, `option`, `tr`, `td`/`th`, `thead`/`tbody`/
  `tfoot`, con límites de tabla y lista), elementos vacíos, autocierre XHTML, cierres sueltos ignorados (`</br>`
  = `<br>`), textos seguidos unidos, DOCTYPE en el documento. `dom_buscar`, `dom_por_id`, `dom_texto`,
  `dom_atributo`, `dom_esquema` (para pruebas).
- D16 (Dash, 2d13636 tras rebase sobre la 13b de MUI): un `for` sobre una lista prestada (temporal del que llama)
  la liberaba al acabar: un bucle que la recorría dos veces leía memoria liberada (6 → 2). Ahora `_dash_hold`.
  Test `test_for_lent_list`. Batería: 380/380 con `--emu --emu-a500 --emu-32` y 233/233 con `--emu --memcheck`
  (la primera pasada la tumbó un `pkill fs-uae` de la otra sesión). Tras el rebase: 157/157 y 237/237 en el A1200.
- Tests: `test_dom` (`--memcheck`, 0 vivos). 8/8.
- Pendiente: las páginas de prueba como ficheros en `tests/pages/` (el runner aún no copia ficheros al emulador):
  para el visor (tarea 13).

### 2026-10-16 — Tarea 10 (CSS: lectura)
- Hecho: `lib/css.dash`: `css_leer(texto, orden)` → `HojaCSS` (reglas con su número de orden e `importes`);
  `css_declaraciones` (bloques y atributo `style`, `!important`); `css_selector` (tipo, `*`, `#id`, `.clase`,
  `[atr]` con `= ~= |= ^= $= *=`, `:pseudo(...)`, `::pseudo` y los de CSS2 con un `:`, combinadores descendiente,
  `>`, `+`, `~`; especificidad como ids*10000 + clases*100 + tipos); `css_selector_texto` para pruebas. Comentarios
  fuera; `;` dentro de comillas o paréntesis (`url("a;b")`) respetados; `@media` solo screen/all/consultas; `@import`
  a `importes`; `@charset`, `@font-face` y demás reglas `@` saltadas; selectores que no se entienden, descartados.
- Tests: `test_css` (`--memcheck`). 9/9.
- Pendiente: reunir `<style>`/`<link>`/`@import` del documento → tarea 11.

### 2026-10-16 — Tarea 11 (CSS: estilo)
- Hecho: `lib/estilo.dash`: hoja del navegador (bloques, display none de head/script/style, márgenes de p y h1-h6,
  negritas y cursivas, listas, pre, a:link, tablas...); `estilo_hojas(doc, base)` reúne en orden `<style>` y
  `<link rel=stylesheet>` (HTTP(S) o fichero) con sus `@import` (hasta 4 niveles); selectores evaluados de derecha a
  izquierda con los cuatro combinadores, atributos y pseudo-clases sin interacción (first/last/only-child, link,
  root, empty; hover y demás no se cumplen; pseudo-elementos no); cascada por importancia, origen (con !important gana
  el navegador), especificidad y orden; atributo `style`; atajos (margin, padding, border y lados, border-*-*,
  background, list-style, font); herencia de las propiedades que se heredan; `inherit`; font-size calculado en px
  (keywords, smaller/larger, em, %, pt); `estilo_px` (px, em, ex, %, pt, pc, in, cm, mm, dos decimales).
  Estilo guardado en `nodo.estilo` (`{String: String}`, campo nuevo de `Nodo`). Tamaño normal: 13 px.
- `css_partir` público (lo usa estilo).
- Tests: `test_estilo` (`--memcheck`), `test_estilo_enlaces` (link + @import por HTTP contra `tests/servers/http.py`).
  11/11. Corrección: al cerrar escribí "también con `--memcheck`" sin haberlo visto; con `--memcheck` fallaba
  `test_estilo_enlaces` (la hoja enlazada no cargaba). Causa: fallo de Dash, D17 (un texto prestado se adoptaba y se
  liberaba). Con D17 arreglado: 11/11 con `--memcheck`.
- Pendiente: rendimiento con muchas reglas (todas contra todos los elementos; indexar por id/clase/etiqueta si
  hace falta, se medirá en la tarea 17).

### 2026-10-16 — D17 (Dash: texto prestado adoptado)
- Hecho (rama `dashweb`, 295e2e1 tras rebase sobre la 14 de MUI): al guardar un parámetro o variable de bucle String
  (en variable, campo, lista, diccionario o constructor) se copia (`_dash_str_dup(t, TRUE)`); antes
  `_dash_str_set` adoptaba el temporal del que llama y lo liberaba al volver. Test `test_lent_string`. Cambia el C
  de 3 programas previos (los que guardan parámetros de texto, entre ellos `examples/mui_navegador`).
- Batería: 392/392 con `--emu --emu-a500 --emu-32`; con `--emu --memcheck` 238/239 (`test_window_handles`, timeout:
  solo pasa en las dos versiones, con y sin D17; se tomó por carga de la máquina, con la otra sesión usando
  emuladores a la vez). Tras el rebase: 159/159 y 240/240 en el A1200. dashweb: 11/11 con `--memcheck`.

### 2026-10-16 — D9 (Dash: fuentes y colores)
- Hecho (rama `dashweb`): `font_open(nombre, tamaño)` (OpenDiskFont, o OpenFont para la de la ROM; 0 si no hay),
  `font_use`, `font_close`, `font_style` (1 subrayado, 2 negrita, 4 cursiva), `font_height`, `font_baseline`,
  `font_text_width` (TextExtent), `font_size`; `color_pen(r, g, b)` (ObtainBestPen en la pantalla de la ventana del
  RastPort —vale también en la zona de MUI— o la pública por defecto; caché de 128; se devuelven al salir).
- Encontrado: `SetSoftStyle` con la máscara de `AskSoftStyle` dejaba la negrita de topaz en subrayado; se usa la
  máscara fija de los tres estilos. La negrita del sistema no ensancha el texto (mismo ancho medido).
- Tests (Dash): `test_fonts` (`--memcheck`) en A1200, A500 y 3.2. 160/160 sin emulador, ejemplos 33/33. Mismo C
  en los programas previos.
- Pendiente: el sistema emulado de los tests no tiene `FONTS:` (solo topaz de la ROM): para la maquetación y el visor
  hará falta uno con las fuentes del Workbench (amitools en un venv en `~/.cache/dashweb`).

### 2026-10-16 — Tarea 12 (maquetación) y D18
- Hecho: `lib/maqueta.dash`: `maquetar(doc, ancho)` → `Pagina` (lista de `Dibujo`: D_RECT, D_TEXTO, D_LINEA, D_IMAGEN;
  alto; fondo de html/body). Bloques con márgenes (los de hermanos seguidos se funden), bordes (anchos thin/medium/
  thick o px; color o el del texto), relleno, `width` (y centrado con `margin: auto`), `height`, fondo puesto antes del
  contenido y medido al final. Texto en línea: palabras medidas con las fuentes del Amiga (`font_` de D9: familia
  serif → times, sans → helvetica, mono → courier; la topaz de la ROM si no hay), espacios colapsados (o `pre`),
  cortes, `text-align`, negrita/cursiva/subrayado, tachado, enlaces (el `href` va en el dibujo), `br`, `img` como
  hueco de `width`x`height`. Las palabras seguidas con el mismo aspecto van en un solo texto (pintar texto cuesta).
  Listas con marca (cuadrado o número). Tablas sencillas: celdas del mismo ancho. `lib/colores.dash`: `css_color`
  (nombres, #rgb, #rrggbb, rgb()/rgba()).
- D18 (Dash, 535f94f): las funciones `_x` de cada módulo se renombran (`_x_m<n>_<fichero>`) con sus llamadas: dos
  módulos pueden tener su `_fuente`. Llamar a la privada de otro módulo sigue dando "is private to module". Test
  `test_private_per_module`; `test_import_nested` actualizado al nombre nuevo. 161/161 y 247/247 en el A1200.
- Encontrado y arreglado: doble espacio cuando un texto acababa en blanco y el siguiente elemento empezaba palabra.
- Tests: `test_maqueta` (`--memcheck`, 26 líneas comprobadas a mano con la topaz 8: márgenes, centrado, sangrías,
  marcas, celdas, caja con borde y relleno, pre). 12/12, también con `--memcheck`.
- Pendiente: `float`, `position`, anchos de tabla según contenido, `line-height`, `vertical-align`; fuentes reales en
  las pruebas (sistema con `FONTS:`).

### 2026-10-16 — D19 (Dash: argumentos del programa)
- Hecho (rama `dashweb`, 0d07cda, sobre la 15a de MUI): `arg_count()`, `arg(i)` (`ARGS_RUNTIME`; `main(argc, argv)`
  solo en los programas que los usan). `tools/emu_run.py`: `run_programs(..., args=[...])`; runner: `# emu-args:`.
  Test `test_args` (comillas incluidas) en A1200, A500 y 3.2. 165/165 sin emulador, 250/250 en el A1200, ejemplos.
- Sigue la tarea 13 (pintor y visor).

### 2026-10-16 — D20 y D21 (Dash: reloj e interior de ventana)
- D20 (6cfad76): `time_ms()` (EClock de timer.device desde el arranque; `TIME_RUNTIME` solo si se usa; `TimerBase`
  como definición provisional para convivir con `bench_lib`). Test `test_time_ms` en las tres máquinas.
- D21: `Win.inner_left`, `.inner_top`, `.inner_width`, `.inner_height` (bordes reales de la ventana abierta; 0
  cerrada). Test `test_window_inner` en las tres máquinas. Mismo C en los programas previos en los dos.

### 2026-10-16 — Tarea 13 (pintor y visor), D21b y D22
- Hecho: `lib/pintor.dash`: `pintar(p, desde, x, y, ancho, alto)` pinta la franja de la página en un rectángulo del
  RastPort actual (fondo, rectángulos y bordes recortados, texto con `font_use`/`font_style` y lápices por
  `color_pen`, imagen como marco gris; una línea de texto que no cabe entera no se pinta). `src/visor.dash`: sin
  argumentos, página de demostración; con un fichero o una URL http(s), esa página. Teclas: abajo/arriba (20 px),
  espacio/retroceso (una pantalla), Esc; escribe el tiempo de cada fase antes del bucle de eventos.
- `tools/medir_visor.py`: sirve `tests/pages/` por HTTP (`tests/servers/http.py` sirve `/pages/<fichero>`), abre la
  página en el visor dentro de FS-UAE y escribe los tiempos; `--maquina objetivo` (68040 + JIT a toda velocidad),
  `--captura`, `--fases` (`tests/bench/fases.dash`: tokenizar, árbol, hojas, estilo, maqueta por separado),
  `--sistema`. `tools/emu_sys_fuentes.sh`: copia un sistema emulado y le añade `Fonts/` del disco del Workbench
  (amitools en el venv `~/.cache/dashweb/venv`); `~/.cache/dash-emu/sys31web` = sys31ssl + fuentes.
- `tests/pages/prueba.html`: 8,8 KB (títulos, párrafos, listas, tabla, enlaces, `<style>`).
- Medidas (prueba.html, ms): A1200 antes de D22: carga 5013, html 18290, estilo 6947, maqueta 8211, pintar 61.
  Tokenizar eran 45 ms por token: cada `s = t.texto` copiaba los 9 KB y cada `s[a:b]` medía el texto con `strlen`.
  Después: A1200 carga 3728, html 1627, estilo 7394, maqueta 8531, pintar 61; objetivo carga 36, html 27,
  estilo 96, maqueta 121, pintar 19 (con fuentes de disco: maqueta 289, por abrir y escalar fuentes).
- D22 (Dash): un campo String pasado a una función va sin copia si ningún código asigna ese campo de ese struct y
  el dueño es una variable local o un parámetro (macro `_DASH_LEND_<Struct>_<campo>`, decidida al final de generar
  el C); `DashString_slice` y `_dash_str_dup` usan y llenan la caché de longitudes (8 entradas, antes 4).
  `lib/html.dash` pasa el texto como parámetro en vez de copiarlo en cada token. Test `test_text_field_lend`
  (`--memcheck`; el campo asignado sigue copiándose). Manual y referencia rápida.
- D21b (Dash, ya en la rama): las ventanas de Dash son GimmeZeroZero: `inner_left`/`inner_top` = 0 y el ancho es
  el de la capa interior.
- Encontrado y arreglado: `más</a>.` cortaba la línea entre "más" y "."; las piezas sin blanco entre ellas
  (`Pieza.pegada`) pasan juntas a la línea siguiente. Caso nuevo en `test_maqueta`.
- Capturas en el emulador: con topaz (sys31) y con helvetica/times (sys31web); la franja gris de la izquierda
  era de `shot.c` (arreglado en la rama mui).
- Tests: dashweb 12/12, también con `--memcheck`. Dash (D22, 3c7c357): 169/169 sin emulador, 427/427 en A1200, A500
  y 3.2, ejemplos 33/33; el C solo cambia en los programas con textos (lo previsto).
- No probado: el desplazamiento con teclas en el emulador (no hay forma de mandar teclas); repintar por partes
  (ScrollRaster) queda para la fase B. Pendiente: la carga por HTTP tarda 3,7 s en el A1200 (9 KB en red local).

### 2026-10-16 — D12 (Dash: imágenes por datatypes)
- Rebase de `dashweb` sobre `mui` (tareas 15-22 de MUI: ReAction, varias ventanas, editor `.dashui`). Los conflictos
  eran todos el mismo trozo (`needs_asl` en `codegen.py`, quedó la versión de MUI) y `docs/BUILTINS.md` (regenerado;
  commit aparte "BUILTINS.md al día tras el rebase").
- Hecho: `image_load(fichero)` (datatypes, con remap a la pantalla de la ventana actual), `image_width`,
  `image_height`, `image_draw(img, x, y)`, `image_draw_part(img, sx, sy, x, y, w, h)`, `image_scale(img, w, h)`
  (copia con `BitMapScale`, máscara incluida), `image_free`. `IMAGE_RUNTIME` solo si se usa; las que quedan se
  liberan al salir. Transparencia: la máscara del datatype (`PDTA_MaskPlane`) o el canal alfa leído con
  `PDTM_READPIXELARRAY` antes del layout, copiada a chip con las filas del bitmap (para `BltMaskBitMapRastPort`).
- Test `test_image` (Dash): ILBM de 8x4 escrito con `file_write_byte`, entero, trozo, al doble, imagen liberada dos
  veces, fichero que no existe; A1200, A500 y 3.2, y con `--memcheck`.
- A mano en 3.2: GIF transparente (máscara del datatype) bien, también escalado. PNG con alfa: el `png.datatype`
  de 3.2 da alfa 0 en todos los píxeles, sin transparencia (documentado). 3.1 solo trae ILBM.
- Mismo C en todos los programas previos (`cmp_dash_c.sh`). Avisada la sesión de MUI de los nombres.
- Dash (3839f52, tras el último rebase sobre `mui` 2dd0e0a: el plan de MUI está terminado y esa rama queda quieta):
  174/174 sin emulador, 440/440 en A1200, A500 y 3.2 (antes del último rebase, que entró limpio), ejemplos 34/34.
  dashweb 12/12.

### 2026-10-16 — Tarea 14 (imágenes)
- `lib/red.dash` recibe en un buffer de bytes (`net_recv_buffer`/`tls_recv_buffer`): las líneas y los textos salen
  de ahí con `str_from_buffer` y `red_copiar(c, fichero, n)` lleva los bytes tal cual a un fichero (n = -1: hasta el
  cierre). El buffer crece si una línea no cabe; se libera en `red_cerrar`.
- `lib/http.dash`: `http_a_fichero(url, fichero, espera)`: el cuerpo de una respuesta 2xx va al fichero (con
  longitud, por trozos o hasta el cierre; `r.bytes`); otra respuesta deja su cuerpo en `r.cuerpo`.
- `lib/imagenes.dash`: `imagenes_cargar(im, doc, base)` trae cada `<img>` (HTTP/HTTPS a `T:dashweb_img<n>`, o de
  disco), la carga con `image_load` (D12) y pone el `width`/`height` que falte (tamaño real, o proporción si viene
  uno). `imagenes_a_tamano` da la copia escalada (guardada). `imagenes_liberar` libera y borra los ficheros.
- `lib/pintor.dash`: `pintar(p, im, ...)` pinta las imágenes recortadas al rectángulo (`image_draw_part`); sin
  imagen, el marco gris. `src/visor.dash` las carga (tiempo "imagenes").
- Encontrado y arreglado: el blanco detrás de una imagen se sumaba a su `src` y a su ancho; ahora lo toma la pieza
  siguiente (`Maquetador.blanco`).
- Tests: `test_http` (20.000 bytes con todos los valores, con longitud y por trozos; un 404), `test_imagenes` (ILBM
  por HTTP a su tamaño, con `width`, y uno que no existe; posiciones y lápices leídos de la ventana; `--memcheck`).
  13/13, también con `--memcheck`. `tests/pages/imagenes.html` + `dibujo.iff`: captura en el emulador con la imagen
  a su tamaño y al doble dentro del texto.
- Medidas: objetivo, imagenes.html: imágenes 6 ms. A1200, prueba.html: carga 3771 ms (igual que antes: lo lento
  no era la red de textos; queda para el perfilador D23).
- Pendiente: GIF/PNG solo con los datatypes del sistema (3.1 trae ILBM); CSS `width`/`height` de las imágenes;
  `alt` cuando no se puede cargar.

### 2026-10-16 — D10 (Dash: C de fuera)
- Hecho: `@link "ruta"` enlaza un fuente C, un objeto o una librería (`.c`, `.o`, `.a`; ruta relativa al `.dash`
  que lo dice, también en módulos importados; si no existe, error del compilador). El C generado lleva
  `/* dash-link: ruta */` y `./dash` y el runner (también en modo multifichero) se lo pasan a gcc detrás del C,
  con su directorio en `-I` (`compiler/cflags.py` `link_flags`). `@c """ ... """ end`: C libre después de los
  prototipos de Dash y antes de las `@native` (callbacks con firma de C que llaman a funciones Dash). `@header`
  entiende `\"`.
- Tests de Dash: `test_c_link` (un `.c` enlazado, una `@native` que le pasa un callback de `@c` que llama a una
  función Dash, un texto de C), `errors/link_missing`. Mismo C en los programas previos. Manual y referencia rápida.
  176/176 sin emulador, 445/445 en A1200, A500 y 3.2, ejemplos 34/34.
- Para la tarea 15: QuickJS se enlaza como `libqjs.a` con `@link` desde `lib/js.dash`, con `quickjs.h` al lado.

### 2026-10-16 — D24 (Dash: `@stack`)
- La tarea 15 necesita 256 KB de pila para QuickJS y un módulo (`lib/js.dash`) no podía pedirla. Hecho: `@stack N`
  en un programa o un módulo; el programa toma la mayor (sobre 16 KB, 32 KB con MUI y 64 KB con TLS); `--stack`
  sigue mandando. Test `test_stack_directive` (módulo con 40000 sobre el programa con 20000; la pila de la tarea
  se mide con `FindTask`) en A1200, A500 y 3.2, y en modo multifichero. 178/178 sin emulador, ejemplos 34/34. Mismo
  C en los programas previos, así que la batería completa en emulador no cambia (no se repitió).

### 2026-10-16 — Tarea 15 (QuickJS enlazable), D10b y D25
- `third_party/fdlibm`: la fdlibm 5.3 de Sun (de GNU Classpath, en las fuentes de GCC del toolchain; licencia
  de Sun en cada fichero), sin `mprec.h`. `tools/build_qjs.sh lib` deja `build/qjs-lib/libqjs.a` (QuickJS,
  fdlibm y fp-bit) con `quickjs.h` al lado; `tests/run.py` lo construye si falta o está viejo.
- `lib/js.dash`: `js_nuevo()`, `js_evaluar(js, código, nombre)` (resultado como texto; "" con excepción),
  `js_error(js)` (mensaje y pila), `js_liberar(js)`; `console.log/info/warn/error` a la salida; Latin-1 <->
  UTF-8 al entrar y al salir. `@link` de la librería, `@header` de `quickjs.h`, `@stack 262144` y el C de
  apoyo en un `@c`.
- D10b (Dash): el C de `@native` y `@c` que nombra funciones del runtime (`_dash_str_dup`) trae su runtime.
  En `test_c_link`.
- D25 (Dash): al terminar, Dash cerraba `dos.library` y dejaba `DOSBase` a NULL; `DOSBase` es de libnix y su
  stdio lo usa al salir (QuickJS usa stdio): el programa se colgaba al acabar. Ahora cierra su apertura y deja
  el puntero. Test `test_libnix_stdio` (se colgaba antes del arreglo). Cambia el C de todos los programas
  (una línea de la limpieza). Dash (commit aparte): 179/179 sin emulador, 454/454 en A1200, A500 y 3.2,
  273/273 con `--memcheck`, ejemplos 34/34.
- Test `test_js`: resultado, `console.log`, acentos de ida y vuelta, excepción con pila, `Math` (los dígitos
  de fdlibm en un PC: `exp(1)` = 2.7182818284590455; V8 da ...045), JSON, estado entre evaluaciones;
  también con `--memcheck`.
- Medidas: ejecutable mínimo 889 KB. A1200: crear el motor 429 ms, `fib(20)` 5,95 s (el lanzador de pruebas
  daba 4,3 s: pendiente), liberar 131 ms. Objetivo: 7, 59 y 2 ms.

### 2026-10-16 — Tarea 16a (DOM en JavaScript) y D26
- Tarea 16 partida en 16a (DOM y scripts) y 16b (eventos, temporizadores, volver a maquetar).
- `lib/jsdom.dash`: la parte Dash (`jsdom_selector` con los selectores de `css.dash` y `estilo_cumple`, textos,
  atributos, crear, agregar (mueve el nodo; no deja meter un nodo dentro de sí mismo), quitar, `innerHTML` leído
  como HTML escapado y puesto leyendo el trozo como un `<body>`) y la de C: una clase `Node` de QuickJS con un
  objeto por nodo (tabla por dirección: `a === b`), que retiene su `Nodo` hasta `js_liberar` (enganche
  `liberar_extra` de `js.dash`). `tagName`, `nodeName`, `nodeType`, `textContent`, `innerHTML`, `id`, `className`,
  `parentNode`, `children`, `childNodes`, `firstChild`, `lastChild`, `get/set/has/removeAttribute`,
  `appendChild`, `removeChild`, `querySelector(All)`, `getElementsByTagName`; `document.getElementById`,
  `createElement`, `createTextNode`, `body`, `documentElement`, `title`; `window`. `jsdom_ejecutar_scripts`:
  en orden, en línea y `src` (http(s) o fichero); un error se escribe en una línea y se sigue. `jsdom_cambios`.
- El visor ejecuta los scripts antes del estilo (si la página tiene alguno). `tests/pages/js.html`: lista hecha
  por un script, captura en el emulador; js 12 ms en el objetivo.
- D26 (Dash, 4c63280 tras el rebase sobre main): `@native(borrow)`: los argumentos se prestan durante la llamada como a una función Dash,
  en vez de retenerse hasta salir. `--memcheck` daba 131 objetos y 86 textos vivos en `test_jsdom`; ahora 0.
  Cabecera de `tools/emu_sys_amissl.sh` corregida (`DASH_EMU_SYS_SSL`, lo vio la sesión de MUI).
- Tests: `test_jsdom` (página con 5 scripts: búsquedas, selectores, mismo objeto, `src` por HTTP, un error
  que no para el resto, crear/mover/quitar, `innerHTML`, atributos; el árbol visto después desde Dash;
  `--memcheck`). dashweb 15/15, también con `--memcheck`. Dash: 180/180 sin emulador, ejemplos 34/34.
- La sesión de MUI fusiona `dashweb` (hasta 942d2b3) en `main` y lo sube a GitHub a petición del usuario.

### 2026-10-16 — Tarea 16b (eventos y temporizadores) y D27
- Rebase de `dashweb` sobre `main` (la sesión de MUI fusionó y subió `main` = 942d2b3 + documentación,
  3dafc57; desde ahora trabaja en `main`). Regla 3 actualizada: la base es `main`.
- D27 (Dash, 8832a2e): `On Click` (botón izquierdo en la ventana; `click_x()`, `click_y()` dentro de los
  bordes, tomados antes de devolver el mensaje) y `On Timer N` (número o variable, leída cada vez;
  `timer.device` mientras el bucle espera). Test `test_on_click_timer` (un proceso hace clic con
  `input.device`) en A1200, A500 y 3.2. Mismo C en los programas previos. 181/181, ejemplos 34/34.
- `lib/jsdom.dash`: preludio en JS con `addEventListener`/`removeEventListener`, `onclick` (propiedad y
  atributo, `return false`), el evento sube hasta `document` (`target`, `currentTarget`), `preventDefault`,
  `stopPropagation`, `dispatchEvent`, `click()`; `setTimeout` (también con texto), `setInterval`,
  `clearTimeout`/`clearInterval` con una cola ordenada por tiempo (`__dashweb_reloj` = `time_ms`). Desde
  Dash: `jsdom_clic(js, nodo)` (false si se paró) y `jsdom_temporizadores(js)` (ms al siguiente, -1 si no
  hay). Los errores de JS en eventos y temporizadores salen en una línea.
- `lib/maqueta.dash`: cada `Dibujo` (texto, imagen, fondo de caja) sabe su elemento (`nodo`);
  `maqueta_nodo_en(p, x, y)` da el elemento bajo un punto. Textos de elementos distintos ya no se juntan
  en un solo dibujo.
- `src/visor.dash`: `On Click` busca el nodo y despacha el clic; `On Timer` corre los temporizadores; si
  `jsdom_cambios` cambió, estilo, imágenes y maqueta otra vez, y se pinta. `tests/pages/reloj.html`: un
  contador con `setInterval` que sube solo en la captura (unos 140 ms por vuelta en el objetivo, sobre todo
  por volver a maquetar entera la página).
- Tests: `test_jsdom_eventos` (burbujeo, `preventDefault`, `onclick` del atributo, orden de temporizadores,
  nodo bajo un punto; `--memcheck`). dashweb 16/16, también con `--memcheck`.
- No probado: el clic dentro del visor en el emulador (sí `jsdom_clic` y `maqueta_nodo_en` por separado).
  Pendiente: seguir enlaces (tarea 19), volver a maquetar solo lo que cambió.

### 2026-10-16 — Tarea 17 (repaso de la fase A)
- Medidas con el visor (`tools/medir_visor.py`, fuentes del Workbench en `sys31web`), en ms, objetivo / A1200:
  prueba.html (8,8 KB): carga 40/3770, html 28/1626, estilo 102/7363, maqueta 295/9463, pintar 21/90.
  imagenes.html: estilo 33/2501, imágenes 6/316, maqueta 157/769. js.html: js 29/1633 (crear el motor y
  ejecutar), estilo 34/2589, maqueta 157/793. Memoria (libre antes - después): 357, 173 y 333 KB. El visor
  ocupa 1.040.908 bytes (QuickJS casi todo). El visor escribe ahora la memoria gastada.
- Lo que más pesa en un A1200: el estilo tiene un coste fijo de unos 2,5 s aunque la página sea mínima (la hoja
  del navegador se lee y se aplica cada vez) y la maqueta de una página de 9 KB son 9,5 s; la carga por HTTP de
  9 KB, 3,8 s. En el objetivo todo va en menos de medio segundo. Para el A1200 hace falta el perfilador (D23).
- `--memcheck`: los 16 tests de dashweb con 0 vivos. README con el estado, las medidas y cómo probar.
- Fase A terminada. Siguiente: fase B (tarea 18, ventana del navegador con MUI).

### 2026-10-16 — Tarea 18 (ventana del navegador con MUI), D28 y D12b
- `src/dashweb.dash` + `src/navegador.dashui` (el `.dashui` del ejemplo de la sesión de MUI, con la zona de
  dibujo más baja para caber en 640x256): barra de URL (Return), atrás/adelante, recargar, historial,
  barra de estado (bytes y ms) y de progreso, título de la página en la ventana, barra de desplazamiento
  y rueda; clic en la zona → `jsdom_clic`; temporizadores del JS con `mui_timer`. Página de inicio propia;
  con un argumento abre esa dirección.
- `lib/documento.dash`: abrir (cargar, árbol, scripts, hojas, estilo, imágenes), maquetar a un ancho,
  `documento_al_dia` (si el JS cambió algo: estilo, imágenes y maqueta otra vez), liberar.
- Encontrado: `mui_width` del lienzo (441) no es el ancho que recibe la función de dibujo (424); la página se
  maqueta otra vez al pintar y pide `ID_RANGO` con `mui_timer`, que es uno solo y cancelaba el del JS (el
  contador de reloj.html se quedaba en 1). `ID_RANGO` vuelve a poner los temporizadores del JS.
- D28 (Dash, 5b196e0): medir textos sin ventana. D12b (Dash, db39ece): `DoMethod` con prototipo.
- `tests/run.py` compila también los programas de `src/` (sin ejecutarlos) y construye `libqjs.a` si hace
  falta. `tools/medir_visor.py --programa src/dashweb.dash`; `~/.cache/dash-emu/sys31muiweb` = sys31mui +
  fuentes. Capturas en el emulador: js.html, reloj.html (el contador sube) y prueba.html con la barra de
  estado. dashweb 18/18 (16 tests y los 2 programas), también con `--memcheck`.
- No probado en el emulador: botones, historial, barra y rueda (no hay forma de mandarles eventos desde
  `medir_visor`). Pendiente: los nombres que chocan entre programa y módulos (D14).

### 2026-10-16 — Tarea 19 (navegación)
- `src/dashweb.dash`: un clic va primero al JavaScript (`jsdom_clic`) y, si no lo para, sigue el `<a href>` que
  contiene al nodo (`javascript:` no). Navegar descarta lo que había delante en el historial; atrás, adelante,
  la lista y recargar abren la entrada que toca. Un enlace `#ancla` de la misma página solo desplaza; al abrir
  una dirección con fragmento, la página empieza en él (`id` o `<a name>`). Teclas en la zona de la página:
  abajo/arriba 20 px, espacio/retroceso una pantalla (las da `mui_canvas_key` con el ratón encima); la rueda,
  30 px. El título de la página va al de la ventana y los errores de red salen como página ("No se pudo
  cargar").
- `lib/documento.dash`: `documento_enlace`, `documento_y_de`, `documento_sin_fragmento`/`documento_fragmento`.
- Test `test_navegacion` (sin ventana, gracias a D28; `--memcheck`). dashweb 19/19 compila.
- Pruebas de interfaz: D29 (Dash, `tools/emu_run.py` con programas en segundo plano) y
  `tools/amiga/clicar.dash` (espera una ventana por su título, la trae al frente y le manda clics y teclas con
  `input.device`); `tools/medir_visor.py --acciones "dashweb e 150 c 150 62 ..." --guardar DIR`. Probado en el
  emulador: clic en un enlace de `tests/pages/enlaces.html` → abre `js.html` (historial con dos entradas, "<"
  activo); después el botón "<" → vuelve (">" activo). Encontrado al montarlo: la consola de arranque quedaba
  delante (la salida del programa en segundo plano iba a ella).
- Aún sin probar en el emulador: anclas, teclas en la zona, rueda, historial por la lista.

### 2026-10-16 — Tarea 20a (cargar sin congelar la ventana) y D29
- Tarea 20 partida en 20a (la página principal) y 20b (el resto de recursos, conectar sin bloquear).
- Intento de D30 (señal de los sockets): `SocketBaseTagList(SBTC_SIGIOMASK)` + `FIOASYNC`, y también
  `SetSocketSignals`; el `bsdsocket.library` de FS-UAE no manda la señal en ninguna de las tres máquinas, así
  que no se puede probar aquí y no se quedó en Dash (revertido). En su lugar, sondeo: leer sin esperar.
- `lib/red.dash`: `red_recibir_ya` (lo que haya, sin esperar; -1 cerrada), `red_pendientes`. `lib/http.dash`:
  conectar y leer separados (`_http_conectar`, `_http_leer`); carga por pasos: `http_empezar` (conecta y pide:
  eso aún espera), `http_avanzar` (true al acabar: la respuesta se analiza cuando la conexión se cierra o ya llegó
  todo el `Content-Length`; redirecciones; tiempo agotado si nada llega en `espera` ms), `http_recibidos`,
  `http_total` (cabeceras + `Content-Length`, -1 si aún no se sabe), `http_cancelar`.
- `src/dashweb.dash`: por http(s) `abrir` empieza la carga y vuelve; un solo `mui_timer` (ID_TIC) cada 50 ms
  mientras llega y, si no, al siguiente temporizador del JS (`programar`); barra de progreso por bytes;
  botón "Parar" (nuevo en `navegador.dashui`). `lib/documento.dash`: `documento_desde_respuesta`. El historial
  apunta la dirección pedida (la página aún no ha llegado).
- `tests/servers/http.py`: `/lento` (media respuesta, 1,5 s de pausa, el resto). `tools/medir_visor.py --pagina
  /ruta`. Test `test_http_carga` (longitud, chunked, redirección, 404, progreso a medias, cancelar, rechazada;
  `--memcheck`). En el emulador: reloj.html llega y el contador sigue; clic en "Parar" durante /lento → "Parado".
  dashweb 20/20, también con `--memcheck`.

### 2026-10-16 — Tarea 20b (imágenes sin esperar)
- Tarea 20b acotada a las imágenes; CSS, scripts y conectar sin bloquear pasan a 20c.
- `lib/http.dash`: `http_empezar_a_fichero` (el cuerpo de una 2xx al fichero, como `http_a_fichero`, sin
  esperar; `Carga.fichero`). `lib/imagenes.dash`: `imagenes_pedir` (las de http(s) a una cola, las de disco
  ya), `imagenes_avanzar(im, doc)` (como mucho 4 descargas a la vez; al llegar una, `image_load` y el tamaño en
  todos sus `<img>`; cuántas llegaron), `imagenes_pendientes`; `imagenes_liberar` cancela las que faltan.
  `imagenes_cargar` (esperando) sigue para el visor.
- `lib/documento.dash`: pide las imágenes sin esperar; `documento_imagenes(d)` (true si llegó alguna: vuelve a
  maquetar). `src/dashweb.dash`: el tic sigue cada 50 ms mientras faltan imágenes, repinta cuando llegan y lo
  dice en la barra de estado.
- Test `test_imagenes_carga` (mismo `src` dos veces, uno con `width`, uno que no existe; `--memcheck`). En el
  emulador: imagenes.html en el navegador, las imágenes salen tras la página. dashweb 21/21, también con
  `--memcheck`.

### 2026-10-16 — Tarea 20c (hojas y scripts sin esperar)
- `lib/recursos.dash`: `recursos_del_documento` pide los `<link rel=stylesheet>`, los `<script src>` y los
  `@import` de los `<style>`; `recursos_avanzar` (4 a la vez; los `@import` de una hoja que llega se piden; las
  de disco se leen ya); `recursos_pendientes`, `recursos_cancelar`; `r.traidos` (dirección → texto, "" si
  falló). `lib/estilo.dash`: `estilo_hojas_con(doc, base, traidos)`; la hoja del navegador se lee una vez por
  programa (global `estilo_ua_leida`; antes, en cada página). `lib/jsdom.dash`: `jsdom_ejecutar_scripts_con`.
- `lib/documento.dash`: `documento_empezar` (árbol y recursos pedidos) y `documento_avanzar` (cuando están
  todos: scripts en orden, estilo, imágenes pedidas). `src/dashweb.dash`: tras la página, "Trayendo hojas de
  estilo y scripts: faltan N"; "Parar" también corta eso (`parar_carga`).
- Tarea 20 partida otra vez: lo que falta (conectar, DNS y TLS sin bloquear) es 20d.
- Tests: `test_recursos` (hoja con `@import` descubierto al llegar, script, uno que no existe; estilo y script
  con lo traído; `--memcheck`). En el emulador: `tests/pages/externos.html` en el navegador (colores de la hoja
  y de su `@import`, el script de fuera usado por uno de dentro). dashweb 22/22, también con `--memcheck`.

### 2026-10-16 — Tarea 21a (formularios: controles y GET) y D31
- 20d (conectar sin bloquear) movida al final de la fase B: en el emulador conectar es instantáneo.
- D31 (Dash, 637977b): `mui_canvas_char(zona)`: el carácter de la última tecla con mayúsculas y keymap (la zona
  guarda cualificadores y tecla muerta; `_dash_map_key`). Test con un proceso que teclea por `input.device`, en
  A1200 y 3.2, también con `--memcheck` (lo preguntó la sesión de MUI).
- `lib/maqueta.dash`: `input`, `select` y `button` son piezas de control (`D_CONTROL`, del tamaño de su fuente:
  `size` caracteres, el texto del botón, la opción más ancha); `hidden` no ocupa. `formulario_etiqueta`,
  `formulario_opcion`. `lib/pintor.dash`: botones en relieve, casillas y radios con su marca, campos y
  desplegables con su valor (password con asteriscos, lo último escrito si no cabe), borde azul y cursor en el
  campo con el foco (`pintor_foco`). `lib/url.dash`: `url_codificar` (UTF-8, `+` para el espacio).
- `lib/formularios.dash`: `formulario_clic` (foco, casilla, radios del mismo nombre, desplegable a la opción
  siguiente, enviar), `formulario_tecla` (escribir, retroceso, `maxlength`, Return envía),
  `formulario_datos`/`formulario_destino` (GET a `action` con los datos; el botón con nombre cuenta).
- `src/dashweb.dash`: clic → JS → formulario → enlace; las teclas van al campo con el foco. Encontrado: un texto
  largo en la barra de estado ensanchaba el mínimo de la ventana más que la pantalla y MUI la desordenaba (barras
  de desplazamiento): `dw_estado` corta a 48 caracteres. Otra vez D14 (`func estado` chocaba con variables
  `estado` de los módulos).
- Tests: `test_formularios` (sin ventana; `--memcheck`). En el emulador con `clicar`: clic en el campo, "hola",
  Return → el navegador pide `GET /eco?q=hola&todo=on&orden=fecha` y muestra la respuesta. dashweb 23/23,
  también con `--memcheck`.

### 2026-10-16 — D14 (Dash: nombres del programa y de sus módulos)
- Dash (e952095): las funciones de un módulo no ven las globales del programa principal (`actual = 0` en un módulo
  es su local aunque el programa tenga `var actual`; analizador y codegen), y asignar un nombre que es una
  función crea una variable nueva en vez de dar error. Test `test_module_scope` (también multifichero). Mismo C
  en los programas previos; 185/185, ejemplos 34/34. Los nombres `dw_*` de `src/dashweb.dash` se quedan (no
  hacen daño).

### 2026-10-16 — Tarea 21b (textarea, POST y formularios en JavaScript)
- `lib/http.dash`: método y cuerpo en la petición (`_http_conectar_con`), `http_empezar_post(direccion, cuerpo,
  tipo, espera)` (`application/x-www-form-urlencoded` por defecto); una redirección tras un POST se sigue con
  GET (salvo 307/308). `tests/servers/http.py`: `/eco` devuelve también el cuerpo; `/tras_post` (303 → GET).
- `lib/formularios.dash`: `textarea` (foco, Return salta de línea, su valor es su texto), `formulario_valor` y
  `formulario_poner_valor` (input, textarea, select), `formulario_envio` → `Envio` (GET con la consulta, o POST
  con el cuerpo). `lib/maqueta.dash`/`lib/pintor.dash`: el `textarea` (`cols` x `rows`, las últimas líneas que
  caben, cursor).
- `lib/jsdom.dash`: `.value` (input, textarea, select) y `.checked`; `form.submit()` (lo recoge
  `jsdom_envio`); `jsdom_evento(js, nodo, tipo)` para cualquier evento (el navegador manda `submit` al form antes
  de enviarlo: `onsubmit`/`preventDefault` lo paran).
- `src/dashweb.dash`: `enviar` (evento submit, después GET o POST), `abrir_post`, `envio_del_js` tras clics y
  temporizadores; `apuntar` (historial).
- Tests: `test_formularios_post` (POST, 303, textarea, `.value`/`.checked` desde JS, `onsubmit`, `submit()`;
  `--memcheck`). En el emulador: post.html, escribir "hola", Return, "ab" y clic en Enviar → el servidor recibe
  `nota=hola%0Aab`. dashweb 24/24, también con `--memcheck`.

### 2026-10-16 — Tarea 22a (marcadores y página de inicio)
- Tarea 22 partida: 22a (marcadores e inicio), 22b (varias ventanas), 22c (atajos de menú en el emulador).
- `lib/marcadores.dash`: marcadores en `PROGDIR:dashweb.marcadores` (`dirección<TAB>título`, sin repetir),
  `marcadores_html` (una página con un enlace por marcador), preferencias `clave=valor`
  (`preferencia`, `preferencia_poner`) en `PROGDIR:dashweb.prefs`.
- `src/navegador.dashui`: menú Proyecto con Página de inicio (H), Marcadores (B), Añadir marcador (D), Usar como
  página de inicio, Acerca de, Salir. `src/dashweb.dash`: páginas internas `dashweb:inicio` y `dashweb:marcadores`;
  sin argumentos abre la preferencia `inicio` si la hay.
- Test `test_marcadores` (`--memcheck`). dashweb 25/25, también con `--memcheck`. El navegador arranca con el
  menú nuevo (captura).
- No probado en el emulador: los elementos del menú. `tools/amiga/clicar.dash` aprendió `a COD` (tecla con Amiga
  derecha), pero un atajo de menú inyectado cuelga el emulador con 68040+JIT, también en un programa MUI mínimo
  con un solo menú (Amiga+Q), y en el A1200 sin JIT no llega al programa. No es de dashweb; queda como 22c.

### 2026-10-16 — Tarea 22b (varias ventanas) y D32
- D32 (Dash, 71dc1df): `mui_window_active(win)`: las ventanas hechas con el mismo `.dashui` comparten los números
  de evento y la activa dice de cuál viene. Test en A1200 y 3.2. Cambia el C de los programas MUI (una función más
  en el runtime, sin usar): los tests mui y dashui en las dos máquinas.
- `src/dashweb.dash` reescrito con el estado por ventana (`struct Ventana`: documento, historial, carga, recursos,
  temporizadores, foco); hasta 4 ventanas, cada una con su función de dibujo (`pinta0`..`pinta3`: MUI no dice qué
  zona pinta); un `mui_timer` para todas; cada ventana con su evento de cerrar (`ID_CERRADA + k`); al cerrar la
  última, se acaba. Menú: Nueva ventana (N), Cerrar ventana (K). Con varios argumentos, una ventana por dirección;
  las ventanas nuevas se corren un poco (`MoveWindow`: MUI las ponía en el mismo sitio).
- En el emulador: dos ventanas (reloj.html y enlaces.html); clic en el enlace de la segunda → navega ella sola
  mientras el reloj de la primera sigue; cerrar la segunda con su botón → queda la primera contando; cerrar la
  única → el programa acaba (10 s en vez de los 60 del cierre automático).
- Intentos para 22c: la secuencia completa de teclado (Amiga derecha 0x67 y la tecla, consejo de la sesión de MUI)
  tampoco funciona; con el ratón no se puede porque MUI 5 usa menús propios (`MenuStrip` vacío). `clicar` aprendió
  `m MENÚ ELEMENTO` (menús de Intuition, para otros programas). Sin probar: Nueva ventana y Cerrar ventana desde
  el menú.
- dashweb 25/25.

### 2026-10-16 — D4c, D23 y D34 (Dash), y medidas corregidas
- D4c (Dash, 4078996): `l[0].x = 5`, `caja.items[i].nombre = "z"` (regla `indexed_member_assign`). Test con
  `--memcheck`. Mismo C en los programas previos.
- D23 (Dash, 2c6f140): `./dash --profile`: cada función se apunta en una pila (variable con `cleanup`, también en
  los `return`) y una interrupción VBlank mira 50 veces por segundo dónde está el programa; al salir, la tabla
  (propio, total, llamadas). Runner de Dash: `# profile`, `# ignore-out:`. `tools/medir_visor.py --perfil`.
- Lo que encontró el perfil: el 15 % del tiempo en `utf8_a_latin1` (una llamada de 3,6 s para 9 KB). Buscando la
  causa (no era la caché de longitudes: un intento, D33, no mejoró nada y se deshizo; ni la red de FS-UAE): el modo
  de pruebas (`DASH_TEST_AUTOCLOSE`, que usan `emu_run --autoclose` y `medir_visor`) llamaba a `DateStamp` en cada
  vuelta de cada `while`. D34 (Dash, 748748a): una vez cada 1024 vueltas; runner `# autoclose: N`, test.
- Medidas buenas (A1200, prueba.html): carga 459 ms (antes 3770), html 1091 (1626), estilo 5545 (7363), maqueta
  5829 (9463). El README tiene la tabla nueva. Perfil real del A1200: `_estilo_nodo` 16 % propio y 40 % total,
  `_palabras` 14 %, `_cumple_desde` 12 % (11.262 llamadas para 271 elementos: cada uno prueba todos los
  selectores), `estilo_px` 6 %. Mejora apuntada para después: agrupar las reglas por el último selector
  (etiqueta, id, clase) como los navegadores.
- La sesión de MUI paró la fusión a `main` por un fallo de `test_mui_canvas_char` (D31): el programa salía sin
  esperar a su proceso que teclea y en 3.2 se colgaban las pruebas MUI siguientes. Arreglo suyo commiteado en la
  rama `dashweb-fusion` (9ee00c3, sobre e952095), probado en un worktree aparte; `main` avanzará hasta ahí.
- Pendientes con pregunta: 20d y 22c (`[?]`).

### 2026-10-16 — Tarea 23 (repaso final y paquete)
- `tools/paquete.sh` → `build/dashweb.lha`: `dashweb` (MUI, 1,1 MB), `visor` (1 MB), `LEEME` (requisitos: AmigaOS 3,
  68020, MUI 3.8/5, pila TCP/IP, AmiSSL 5 para HTTPS; instalación, uso, menús, lo que falta) y `Licencias/`. Lhasa
  (el `lha` de Linux) solo descomprime: `tools/lha_lh0.py` escribe el LHA sin comprimir (`-lh0-`, cabeceras de
  nivel 0, CRC-16/ARC), que LhA lee; comprobado con Lhasa (lista, CRC, lo extraído igual). 2,1 MB.
- El `dashweb` del paquete arranca en el emulador (sistema con MUI y fuentes) con su página de inicio.
- Tamaño, memoria y tiempos: en el README (tabla de la tarea 17 rehecha sin el freno del modo de pruebas).
- Quedan `[?]` 20d y 22c (preguntas al usuario).


### 2026-10-16 — Resumen final (regla 9)
- Rama `dashweb` de Dash rebasada sobre `main` (9ee00c3): D32 (50f577c), D4c (6e9f50f), D23 (3df25fa), D34
  (305e84c). Mismo árbol que el probado: run_tests 189/189, compile_all 34/34, `--emu --emu-a500 --emu-32`
  489/489, `--emu --memcheck` 292/292. Una primera pasada falló al arrancar ("Address already in use" en el
  servidor de eco de `# emu-net`): las dos sesiones probaban red a la vez; repetida, bien. La sesión de MUI
  hará la fusión a `main`.
- dashweb: tareas 1-23 hechas. Navegador MUI con pestañas de carga sin bloquear, CSS, imágenes, JavaScript
  (QuickJS), formularios GET/POST, marcadores, varias ventanas y paquete `build/dashweb.lha`.
- Pendientes con pregunta al usuario: 20d (conectar/DNS/TLS sin bloquear) y 22c (atajos de menú: ¿probar en
  hardware real?).
- Mejora apuntada: agrupar las reglas CSS por el último selector (el estilo es lo más lento: 5,5 s en A1200).

### 2026-10-16 — Respuestas del usuario a 20d y 22c
- 20d: la consulta DNS, la conexión y la negociación TLS no pueden congelar el navegador; un indicador de
  actividad mientras tanto. 22c: hay que hacer funcionar los atajos; averiguar si es cosa de Dash (otro
  emulador en esta máquina: Amiberry). Las dos vuelven a `[ ]`.
- La sesión de MUI pasa una preferencia del usuario: el historial de la izquierda, oculto y desplegable (22d).

### 2026-10-16 — Tarea 22c (atajos de menú) y D35
- Un programa MUI mínimo en C con un menú (Amiga+P, Amiga+Q) y las mismas teclas inyectadas por `input.device`
  funciona en el A1200 y con 68040+JIT: ni la inyección ni MUI ni FS-UAE tenían la culpa. El mismo programa en
  Dash se colgaba. Montando el menú en C como lo monta Dash se cuelga igual: la causa es poner la barra de menús
  con `SetAttrs(MUIA_Window_Menustrip)` después de crear la ventana (MUI 21.227 lo admite según su autodoc, pero
  se cuelga con el primer atajo; MUI 3.8 ni lo admite). Con la barra dada al crear la ventana, aunque vacía y
  llenada después, funciona. No hizo falta Amiberry.
- Segundo fallo: cada elección de menú daba además un evento 11. MUI devuelve el `MUIA_UserData` del elemento
  elegido como evento, y Dash guardaba ahí el tipo de objeto (11 = elemento de menú). En dashweb el 11 es
  `ID_TIC` (un tic de más, sin daño); en el ejemplo de la sesión de MUI era su botón de historial.
- D35 (Dash, 1985971): `mui_window_begin` crea la barra vacía con la ventana; los elementos de menú
  dejan el `UserData` a 0 y se reconocen por `MUIA_Menuitem_Title`. Test `test_mui_menu_keys` (un proceso
  teclea Amiga+P, Amiga+O sobre un elemento desactivado y Amiga+Q; `mui_press` sobre un elemento): pasa en 3.1 y
  3.2 y se cuelga sin el arreglo. Dash: 190/190, 34/34, `--emu --emu-a500 --emu-32` 492/492.
- `clicar` aprendió `r X Y` (pulsar el botón derecho), `p X Y` (llevarlo pulsado a un punto de la pantalla) y
  `s` (soltarlo): los menús de MUI 5 se dibujan en la barra de la pantalla y no están en `MenuStrip`.
- En el navegador (68040+JIT): Amiga+D añade el marcador y Amiga+B abre la página de marcadores con él;
  Amiga+N dos veces y Amiga+K dejan dos ventanas; Amiga+Q cierra el programa. Con el ratón: botón derecho,
  Proyecto, Marcadores → la página de marcadores.

### 2026-10-16 — Tarea 22d (historial plegable)
- Botón "Historial" (evento 20) en la barra; la lista y el balance (`separador`) llevan `"hidden": true` en
  `navegador.dashui` y el botón los alterna con `mui_set_visible` (patrón de `examples/mui_navegador.dash`).
  Sin subrayado en la etiqueta: una letra de atajo le quitaría esa tecla a los campos de los formularios.
- Sin la lista la ventana salía estrecha: la página pide 500 de ancho (antes 400) y el campo de dirección tiene
  peso 400. En el emulador: oculto al abrir; un clic lo despliega (la ventana se ensancha) y otro lo esconde (la
  página se maqueta al ancho nuevo).

### 2026-10-16 — Tarea 20d (conectar sin congelar) y D36
- D36 (Dash, 5d99337): `net_connect_start(host, puerto, ms)` crea el socket y busca el nombre en un proceso aparte (la
  pila no tiene consulta DNS sin espera; el proceso abre su propia `bsdsocket.library`, empieza con más
  prioridad para recoger su trabajo y baja a la del programa); `net_connect_poll` conecta sin bloquear y dice
  1/0/-1; `net_connect_stage` 0 buscando, 1 conectando. Los ocho últimos nombres se recuerdan. `net_close` de
  uno que se abre lo deja (el proceso libera su trabajo al acabar); al salir, el programa espera a las consultas
  en marcha (su código está en el programa). `tls_connect_start`/`tls_connect_poll`: la negociación con el
  socket sin bloquear (`SSL_ERROR_WANT_READ/WRITE` = todavía no). Tests `test_net_async` y `test_tls_async`.
  En PiStorm el cálculo de la negociación es corto; lo que esperaba era la red.
- dashweb: `red_abrir_empezar`/`red_abrir_avanzar`/`red_fase`; la `Carga` de `http_empezar` abre así y manda la
  petición cuando la conexión está abierta; `http_fase` (buscando, conectando, negociando, recibiendo). La barra
  de estado lo dice ("Buscando x...", "Conectando con x...", "Conexión segura con x..."). De paso: `red_abrir` y
  `red_abrir_tls` no liberaban el buffer al fallar.
- Indicador de actividad: una zona de dibujo de 16x16 a la derecha de la dirección con ocho puntos que giran
  (cada 100 ms, con el tic de 50 ms de las cargas) mientras llega la página, sus hojas, scripts o imágenes. Con
  los lápices 1, 3 y 2 de la pantalla: los grises de `color_pen` salían azules o del color del fondo con 4 colores.
- Para probarlo: `tools/lento/dns_lento.c` (con `LD_PRELOAD` en FS-UAE, los nombres `.lento` tardan lo que diga
  `DNS_LENTO_MS` y dan 127.0.0.1), `tests/servers/http.py PORT tls-lento` (espera `TLS_LENTO_S` antes de la
  negociación) y `tools/medir_visor.py --host --dns-lento --tls --tls-lento --captura-en`. Sistema con MUI,
  AmiSSL y fuentes: `~/.cache/dash-emu/sys31muisslweb` (sys31muiweb + AmiSSL de sys31ssl y su Startup-Extra).
- En el emulador (68040+JIT): consulta DNS de 20 s → "Buscando servidor.lento...", el indicador gira y el botón
  Historial responde; con 8 s llega la página. Parar durante la consulta → "Parado". Negociación TLS de 20 s →
  "Conexión segura con 127.0.0.1...", la ventana responde; con 8 s llega la página por HTTPS. 10.255.255.1 →
  "Conectando con..." y a los 20 s "tiempo agotado al conectar". `test_http_carga` con `http_fase` y cancelar
  mientras se busca. dashweb 25/25, también con `--memcheck`. Dash con D36: 192/192, 34/34,
  `--emu --emu-a500 --emu-32` 499/499, `--emu --memcheck` 298/298.

### 2026-10-16 — Tarea 24 (interfaz actual; freemem.space)
- https://freemem.space no acababa de cargar: 90 KB de HTML, 330 KB de CSS (Font Awesome 100 KB) y 600 KB de JS. El
  perfil (400 s): `_tiene_clase` 56 %, probar selectores 72 %. Cada elemento probaba todos los selectores.
- Índice de selectores en `lib/estilo.dash`: por la parte de la derecha (#id, .clase, etiqueta o universal); cada
  elemento prueba solo los suyos. Fuera los que nunca se cumplen (::before, :hover...). `_tiene_clase` sin crear
  textos. El orden de las reglas era de 1000 en 1000 por hoja (una hoja de más de 1000 reglas pisaba a la
  siguiente): ahora de 100000. Con todo, el estilo de freemem.space es el 2 % del tiempo; la página de prueba en el
  A1200 pasa de 5566 a 3802 ms. Necesitó D37 de Dash (`indice[clave].push(e)`).
- `@media` se evalúa como una pantalla de 640x480 (min-/max-width y -height, orientation, prefers-color-scheme;
  print no); antes valía cualquiera con paréntesis. `css_importes` busca los @import sin leer la hoja entera
  (`lib/recursos.dash` leía cada hoja dos veces). El texto solo para lectores ("Saltar al contenido": position
  absolute con clip) no se pinta.
- Dash: D37 y D38 en 875f97d (rama dashweb, sobre main 7582230).
- La máquina "objetivo" de `medir_visor` tiene 128 MB (Zorro III), como una PiStorm: con 8 MB jQuery se quedaba
  sin memoria. `--pagina` admite una dirección entera.
- Interfaz: barra de iconos (atrás, adelante, recargar que pasa a parar mientras carga, inicio; historial a la
  derecha) con ayuda en globo; la dirección ocupa el resto; el indicador de actividad; la ventana abre al 96x90 %
  de la pantalla; título "Página - dashweb"; la barra de progreso solo mientras carga. Atrás y adelante sin uso
  llevan un icono apagado (un botón desactivado de MUI sale tapado por una trama). Iconos ILBM de 16x14 en los 4
  colores del Workbench: `tools/iconos.py` → `iconos/`, en el paquete y copiados al disco emulado. D38 de Dash.
- freemem.space carga y se ve con su título (jQuery falla: tarea 25). Capturas enviadas al usuario.

### 2026-10-16 — Tarea 25 (jQuery)
- jQuery 3.7.1 (`tests/pages/jquery-3.7.1.min.js`, MIT) funciona: `test_jquery` prueba selectores (también los
  suyos, :first, :eq, :contains), clases, attr/data, css, html, eventos y delegados, recorrido, hide/show,
  val/prop, remove/wrap/empty, utilidades, Deferred, serialize, ready y load (memcheck).
- DOM nuevo en C (`lib/jsdom.dash`): hermanos, insertBefore, replaceChild, cloneNode, contains,
  compareDocumentPosition, matches, getElementsByClassName, ownerDocument, outerHTML, nodeValue/data,
  defaultValue, offsetWidth/Height (0 si no se ve: display none, sin maqueta), attributes, createComment,
  createDocumentFragment (tipo 11: al añadirlo pasan sus hijos), head, createHTMLDocument, getComputedStyle (lo de
  lib/estilo.dash) y matchMedia (`css_media_vale`). querySelector y matches dan SyntaxError con lo que no
  entienden (así jQuery usa su buscador). lib/estilo.dash: :checked, :disabled, :enabled, :not(), :nth-child(),
  :nth-last-child(), :nth-of-type(), :first/last/only-of-type.
- El entorno de navegador en JS pasa a `lib/jsdom_preludio.js` (JS normal; `tools/preludio.py` lo convierte en
  `lib/jsdom_preludio.dash`; `tests/run.py` comprueba que esté al día): eventos con captura y subida hasta window,
  Event/CustomEvent/MouseEvent..., once, handleEvent; style (Proxy sobre el atributo), classList, dataset,
  atributos como propiedades, insertAdjacentHTML, append/prepend/before/after/remove, closest; navigator,
  location, history, localStorage/sessionStorage, document.cookie, matchMedia, performance, CSS.escape, btoa/atob,
  requestAnimationFrame, observadores vacíos, Image/Option; DOMContentLoaded y load al acabar los scripts.
- QuickJS no ejecutaba los Promise.then (`JS_ExecutePendingJob`): ahora tras cada evaluación, evento y temporizador.
- Un fallo encontrado: asignar `document.hidden`/`open`/`charset` llamaba a los setters de los elementos (atributos
  en el documento): las propiedades de document se ponen con defineProperty.
- freemem.space: ningún error de JS (jQuery, Migrate, Google Tag Manager, el tema). Captura enviada.

### 2026-10-16 — Tarea 27 (emulación RTG)
- `tools/emu_sys_rtg.sh` hace `~/.cache/dash-emu/sys32rtg`: AmigaOS 3.2 con MUI, AmiSSL y fuentes, más Picasso96 2.0
  (Libs/Picasso96*, Devs/Monitors/uaegfx), C:IPrefs y C:Copy sacados de AmigaOS-v3.2-WHD-RTG-AHI.hdf (partición
  DOS7: xdftool la lee), y ScreenMode.prefs con el modo UAE 1024x768 de 16 bits (0x50051100; un programa listó los
  125 modos que da Picasso96 con uaegfx). Arranque: el monitor uaegfx, la preferencia a ENV: e IPrefs.
- `tools/medir_visor.py --maquina rtg`: Kickstart 3.2 ($DASH_KICKSTART_32), 68040 con JIT, 128 MB y
  `graphics_card = uaegfx`.
- Capturas: `tools/amiga/shot.c` de Dash (rama dashweb) lee las pantallas de más de 8 bits con p96ReadPixel.
- dashweb se ve a 1024x768 con sus colores. Primera comparación con Chrome (tarea 28) enviada al usuario: faltan la
  barra superior, el menú con iconos de Font Awesome y la rejilla de entradas con imágenes de fondo y texto encima.

### 2026-10-16 — Tarea 28a (@media con el ancho de la página)
- Las reglas de dentro de un @media guardan sus condiciones (`Regla.medios`) y se miran al indexar con
  `css_vista(ancho, alto)`: dashweb la pone con la zona de dibujo (+16 de la barra, que en un navegador cuenta) antes
  de leer cada página; `documento_maquetar` la cambia con el ancho y, si algún corte cambia de lado
  (`estilo_cambia_con`), vuelve a calcular el estilo. Las de print ni se guardan. matchMedia mira lo mismo.
- freemem.space en RTG: aparecen la barra azul con la fecha y el título a su tamaño (la página ya no es "de móvil").

### 2026-10-16 — Tareas 28b y 28c (float, position, fondos) y 29 a medias (decodificadores), D40 y D41
- Maqueta (`lib/maqueta.dash`): flotantes en filas (left desde la izquierda, right desde la derecha; bajan de
  fila si no caben; sin width miden su contenido); lo que no flota va debajo (el texto aún no los rodea) y el
  bloque los abarca (como clearfix). inline-block con bloques dentro (o con width/height) como un flotante.
  position absolute/fixed respecto al padre (top/left/right/bottom, encima del contenido). min-height,
  max-width (con margin auto), box-sizing: border-box, visibility: hidden y opacity: 0 (ocupan sitio, no se
  pintan). Fallo encontrado: un flotante recibía su ancho resuelto y volvía a aplicarle su width en %
  (`_bloque_de`: los % del contenedor).
- Imágenes de fondo: el atajo background da image/repeat/position/size; `imagenes_pedir` las trae (con la
  dirección completa en el estilo); `D_FONDO` y el pintor (cover, contain, px, %, posición, repeat/no-repeat/
  -x/-y, recortado a la caja). rgba con alfa < 0,5 es transparente.
- Los fondos de freemem.space no salían: sus 4 descargas empezaban durante 28 s de JavaScript sin tics y la
  negociación TLS se agotaba. D41 en Dash (el tiempo sin consultar no cuenta) no bastaba: el servidor no contesta
  a una conexión TCP que lleva tanto callada. `lib/red.dash` abre otra si la conexión se pidió hace más de 5 s
  (el programa estaba ocupado) y reintenta una vez si la negociación se agota. Reproducido y comprobado con 5
  descargas, 28 s sin consultar y después 1,9 s.
- Herramientas: `tools/traza.py` (con `tools/traza_maqueta.dash`): una página de disco o de la red, con sus
  hojas y scripts, maquetada a un ancho con la caja de cada bloque y los dibujos entre dos alturas
  (`maqueta_traza`). La maqueta de freemem.space tarda 1 s; leer su CSS es lo lento.
- Tarea 29 (en marcha): D40 en Dash (`image_from_rgb`); `lib/imagen_dec.dash` con TJpgDec (third_party/tjpgd,
  JPEG reducido 1/2-1/8 al decodificar) y stb_image (third_party/stb: JPEG progresivo, PNG, GIF, BMP), en
  `build/img-lib/libimg.a` (`tools/build_img.sh`); `imagen_cargar` los usa y, si no, los datatypes (3.1). Medido
  en la máquina RTG: un JPEG de 1376x768 tarda 2,6 s (los datatypes 2,2): la ventaja es decodificar reducido.
- Tests: `test_maqueta_cajas`, `test_imagen_dec` (memcheck), `test_estilo` con la vista a 1000 px.
- freemem.space en RTG: barra con la fecha, márgenes del tema, título en dos líneas como en Chrome y la rejilla
  de entradas destacadas con sus imágenes y títulos encima. Comparación enviada al usuario. Falta: iconos de
  Font Awesome (menú, lupa), tipografía (Lato, el lema en mayúsculas espaciadas), un "contenido" que se cuela
  arriba.
- `--fpu` no arranca en el 68040 de sys32rtg: la comprobación de libnix mira AFF_68881, que pone 68040.library
  al cargarla SetPatch (explicación de la sesión de MUI). Pendiente: SetPatch y 68040.library en sys32rtg.
- Dash rebasado sobre main 45231f8 (interpolación nueva, ReAction con varias ventanas...): D40/D41 en ef0022f.
  Dash 196/196, 34/34, 514/514 en tres máquinas y 306/306 con memcheck (antes del rebase); dashweb 28/28 sobre
  el Dash rebasado. Desde ahora los cambios de Dash los hace la otra sesión por encargo (lo pidió el usuario).

### 2026-10-16 — Estilo más rápido (algoritmo) y la FPU del 68040 en sys32rtg
- Perfil de la otra sesión (8,0 s leer y aplicar el CSS de freemem.space en 68040+JIT; aplicar 6 s): cada
  _cumple_simple volvía a leer class con dom_atributo. Ahora `dom_clases`/`dom_id` guardan las clases y el id
  partidos en el Nodo (se olvidan al cambiar un atributo: jsdom, formularios) y un filtro de antecesores
  (`_antepasados`: cuántos antecesores tienen cada etiqueta, #id y .clase mientras se recorre el árbol) descarta
  los selectores cuyas partes de antes de un descendiente/hijo no están entre los antecesores. Medido con
  `tools/traza.py` sobre la copia local: 7.632 ms → 4.465 ms (leer, árbol, CSS y estilo); maqueta 1 s. dashweb
  28/28 con memcheck.
- La otra sesión acelera lo de Dash por su cuenta (rama `rendimiento`): copias de textos al devolver, la lista
  de temporales, retain/release en los for.
- sys32rtg: `C:SetPatch` con `680x0.library`, `68040.library` y `mmu.library` (la de 3.2 es de MMULib): pone
  AFF_68881 y los programas de `./dash --fpu` arrancan (libnix comprueba ese bit).

### 2026-10-16 — Decisión del usuario: el motor, en Dash
- Pregunta del usuario: ¿no hay un motor de CSS/HTML ya hecho? Sí: NetSurf (libcss, libdom y hubbub, MIT, ya
  en 68k; su maqueta es GPL) y litehtml (C++, BSD). Respuesta del usuario: "vamos a seguir haciéndolo todo en
  Dash". Se miran esos motores para ver cómo resuelven cada cosa, sin usarlos.

### 2026-10-16 — Tareas 28d (tipografía) y 28e (iconos y cajas de CSS)
- Tipografía: los tamaños sin fuente de mapa de bits salen de una vectorial (CGTriumvirate, con
  bullet.library en los sistemas de pruebas; `_tamano_de_mapa`); text-transform; letter-spacing (el pintor
  pone las letras una a una). Imágenes: el ancho y alto del `<img>` limitan lo que se decodifica.
- Estilo: propiedades `--x` heredadas y `var()` (con valor por defecto y calc sencillo); ::before y ::after
  como nodos virtuales (`Nodo.pseudo_antes/pseudo_despues`; índice aparte de sus selectores) con su texto o
  un icono de Font Awesome (códigos del área privada: nodo `::icono`).
- Maqueta y pintor: `D_ICONO` (menú, lupa, calendario, comentario, flechas, usuario, reloj, etiqueta,
  carpeta, sobre, casa, aspa y marca, dibujados con líneas y rectángulos; los demás, un cuadrado pequeño).
  inline-block en la línea como una pieza que no se corta, alineada por su último texto (así "1 COMENTARIO"
  no se parte); con width o bloques dentro sigue flotando a la izquierda salvo con el texto centrado o a la
  derecha (el menú de freemem.space, centrado como en Chrome). Un `<button>` con elementos dentro o sin texto
  se maqueta como una caja más (lo dibuja su CSS). border-radius ≥ 50 % en una caja casi cuadrada: `D_ELIPSE`
  (rellena o con borde); transform translate (px o %) y rotate de 45 grados en una barra: `D_TRAZO` (la lupa
  del tema, hecha con ::before y ::after). Un absoluto sin top ni left queda donde estaría (tras el relleno).
- Fallo de gcc encontrado: la pasada `s` de -fbbb (bebbo) da código erróneo (un absoluto con right: 0 salía
  con ancho 1; desaparece al añadir un Print). Encargado a la otra sesión quitarla de `compiler/cflags.py`
  (tarea 3); mientras, DASH_CFLAGS="-fbbb=abcfhilmnpz0".
- `tools/traza.py` con una página de tests/pages la sirve por `tests/servers/http.py` (6 s en vez de 10 min).
- Test nuevo `test_maqueta_css` (memcheck). Comparación con Chrome enviada al usuario (comparar6): menú,
  lupa, iconos y metadatos como en Chrome.
- Encargos a la otra sesión: tarea 2 (Dash comprueba el tipo de return; str_contains y str_split: hechos en la
  rama `tipos`), 1b (recorrer las claves de un diccionario sin copiarlas) y 3 (-fbbb sin s).

### 2026-10-16 — Tarea 26 (estilo y maqueta más rápidos)
- Medido con `tools/traza.py` sobre la copia local de freemem.space (`~/.cache/dashweb/bench`), máquina objetivo
  (68040 + JIT): aplicar el estilo 5,0 s → 2,0 s; maquetar 1,47 s → 1,26 s. Mismo resultado (alto 7186, 368
  dibujos).
- Estilo: las propiedades --x van aparte del estilo y un hijo comparte el diccionario de su padre mientras no
  declare otro valor (WordPress hereda unas 60 y Tailwind repite 45 en cada elemento con `*`); las --x que ningún
  var() nombra no se guardan (`Hojas.vars_usadas`), salvo en el atributo style. Los atajos (margin, border,
  background, font...) se parten una vez por regla (`Regla.expandidas`), no en cada elemento. ::before y
  ::after solo se calculan si se cumple alguna regla suya con content (`Regla.con_content`).
- Una caché de lo declarado por conjunto de reglas cumplidas (`_ganadoras_hechas`) colgaba la página:
  Dash usa memoria liberada con un diccionario de diccionarios. Caso mínimo en
  `~/.cache/dashweb/repro/dict_de_dicts.dash`; encargado (tarea 4 de la otra sesión). La caché queda
  apagada (`_ganadoras_cache`) hasta el arreglo.
- Maqueta: las fuentes se abren una vez por programa (antes cada maquetación las abría otra vez sin
  cerrarlas); se buscan primero por el font-family tal cual. `estilo_px` sin crear textos.
- Dash no tiene operadores de bits: encargado (tarea 5). Dash fusionado en `dashweb`: `rendimiento` (copias y
  temporales, -fbbb sin la pasada s) y `tipos` (return comprobado, str_contains, str_split).
- Pendiente visto: un atajo con var() (padding: var(--x)) se parte antes de sustituir la variable.
- `tools/traza.py`: cualquier página de disco se sirve por HTTP con su carpeta; TRAZA_PERFIL=1 (tabla de
  --profile), TRAZA_TIEMPO, TRAZA_CAPTURA; `traza_maqueta` mide aparte el estilo de la página ya cargada.
- Test nuevo `test_estilo_vars` (memcheck). Trabajo hecho en un worktree (`~/Projects/dashweb-w`, rama dev2)
  para no mover el árbol que usan las baterías de la otra sesión.

### 2026-10-16 — Tarea 28: atajos con var() y degradados (28f, a medias)
- Un atajo con var() (`padding: var(--x) 1px`, también en el atributo style) se guarda entero y se parte en
  `_calcular` tras sustituir la variable (antes se partía el texto "var(--x," como si fuera una medida).
- linear-gradient en background y background-image: dirección (to top/right/left, grados) y el primer y
  último color con su opacidad (`css_alfa`, `css_color_opaco` en lib/colores.dash, también `rgb(r g b / a)`
  y `#rrggbbaa`) en un `D_DEGRADADO`. El pintor pinta los tramos casi opacos; la sombra de freemem.space
  (negro de 0,5 a 0) necesita mezclar con la imagen: D42 encargada a la otra sesión (tarea 6).
- Comparación con Chrome (rtg_fm18): lo que más se nota ya es esa sombra bajo los títulos.
- Tests: test_estilo_vars y test_maqueta_css ampliados.

### 2026-10-16 — Tarea 29 (parte): srcset e imágenes al tamaño en que se ven
- `dom_img_src` (lib/dom.dash): de srcset (descriptores w o x, comas dentro de la dirección) y de los
  `<source>` de `<picture>` con un tipo que se lee, la imagen más pequeña que no se queda corta para el width
  del `<img>` (o 1024 sin width: fijo, para que no cambie con la ventana); webp/avif fuera. Lo usan la
  maqueta y lib/imagenes.dash.
- Cada imagen se decodifica al tamaño mayor al que se ve en la última maqueta (`imagenes_vista`, lo llama
  documento_maquetar): las `<img>` con width y height y los fondos con cover/contain (su tamaño en la página no
  depende de la imagen). freemem.space en la máquina RTG a los 55 s: antes faltaban 12 imágenes, ahora todo
  cargado (captura enviada al usuario).
- Pregunta del usuario: "¿estamos construyendo un renderizador de XHTML y CSS?". Sí: lib/html, css, estilo,
  maqueta y pintor, todo en Dash (su decisión).
- Test nuevo `test_srcset` (memcheck). dashweb 31/31 normal y con memcheck.
- Otra sesión: tareas 4 (diccionarios de diccionarios), 5 (operadores de bits) y 6 (gfx_blend_rect,
  gfx_gradient_rect, gfx_pixel_rgb) hechas en ramas encadenadas `dicts`, `bits`, `blend`; se fusionan cuando
  acabe su batería. Acordado: no lanzar tests de red de dashweb a la vez que los suyos (chocan los puertos).

### 2026-10-16 — Tarea 29 (WebP; cerrada, sigue en 29b y 29c)
- libwebp 1.4.0 (BSD), solo el decodificador en C (sin SSE/NEON/MIPS; las cabeceras del codificador que pide
  lossless.h) en third_party/libwebp; `tools/build_img.sh` lo mete en build/img-lib/libimg.a (230 KB) y usa ya
  -fbbb sin la pasada s. `_imgdec_webp`: con y sin pérdida y con alfa (no animado: entonces los datatypes),
  reducido al decodificar (use_scaling) a lo más pequeño que cubre maxw x maxh. srcset y `<source>` aceptan
  webp; quedan fuera avif y jxl.
- Tests: test_imagen_dec con cuatro WebP (con pérdida, sin pérdida, alfa, 640x320 reducido a 300x150).
- Partida: 29b (SVG) y 29c (decodificar sin parar la ventana).

### 2026-10-16 — Tarea 29b (SVG)
- nanosvg (memononen/nanosvg, licencia zlib; su AI_POLICY trata de contribuciones al proyecto, no de usarlo)
  en third_party/nanosvg, en libimg.a con `nanosvg_impl.c`. `_imgdec_svg`: un texto que empieza por XML y
  lleva `<svg` se dibuja a su tamaño (width/height o viewBox, sin pasar de 1280x1024) o, si se sabe a qué
  tamaño se ve (imagenes_vista), a la escala más pequeña que lo cubre; RGBA con su transparencia.
- Los SVG salían de 0x0 en el Amiga: libimg se compilaba sin FPU y nanosvg llamaba a las funciones de -lm del
  programa (con FPU: el resultado en fp0, no en d0/d1). `tools/build_img.sh` compila ahora para 68020 con FPU
  como dashweb (IMG_CPU="" para uno sin FPU). El test de decodificadores baja de 124 s a 95 s en el A1200.
- Test: test_imagen_dec con un SVG (rectángulos, un círculo, una parte transparente) a su tamaño y al doble.
- Tras pasar `dev` a esta versión hay que rehacer build/img-lib en ~/Projects/dashweb (`tools/build_img.sh`).

### 2026-10-16 — Tarea 28f (degradados y fondos semitransparentes)
- Dash fusionado: diccionarios de diccionarios, operadores de bits y D42 (gfx_blend_rect, gfx_gradient_rect,
  gfx_pixel_rgb) de la otra sesión (dashweb 54571e8).
- El pintor mezcla `D_DEGRADADO` con lo de debajo (gfx_gradient_rect, con los colores de los bordes recortados
  calculados sobre el degradado entero) y los fondos rgba con su opacidad (`D_RECT` con espaciado = alfa;
  antes, por debajo de 0,5 no se pintaban y por encima eran opacos). `-webkit-`/`-moz-`/`-o-linear-gradient`
  con su dirección vieja (top = to bottom): es el que da la sombra en freemem.space. Comparación enviada
  (comparar7): la sombra bajo los títulos y el título de la cuarta casilla, como en Chrome.
- La caché de reglas cumplidas (`_ganadoras_cache`) encendida: estilo 2,0 s → 1,5 s (era 5,0 s).
- Perfil de la otra sesión de la carga real (12 s): QuickJS 24 %, TLS 21 %, imágenes 14 %, estilo 14 %.
  Nuevas 28g (QuickJS con FPU) y 28h (keep-alive).
- Usuario: explicado otra vez lo de YouTube (en su recuadro o a pantalla completa solo con la conversión en
  otro ordenador). 30a/30b siguen igual.
- Tests: test_maqueta_cajas (fondo rgba con alfa), test_maqueta_css (-webkit-linear-gradient).

### 2026-10-16 — Vídeo: MintVID (corrección)
- El usuario pasó una conversación sobre YouTube en AmigaOS. Comprobado en su repositorio: MintVID (Darren Banfi,
  MIT; libavc Apache-2.0) reproduce H.264 y AAC en 68k acelerados y saca los vídeos de YouTube en el propio Amiga
  (página del vídeo: MP4 itag 18 de 360p o HLS); en PiStorm/Emu68 con RTG, YouTube a 360p. Lo dicho antes
  ("no viable en un 68k", "hace falta un servidor") era falso para la máquina objetivo. 30a ahora abre MintVID;
  30b, el vídeo en su recuadro con el núcleo de MintVID. Otros proyectos citados: AmiTube y BoingTube
  (conversión en un servidor, para Amigas lentos).

### 2026-10-16 — Decisión del usuario: vídeo integrado primero
- "Prefiero ir directo al vídeo dentro, integrado en el navegador y también a pantalla completa": la tarea 30 (vídeo
  en la página con el núcleo de MintVID) pasa delante de 28g y 28h; sin el paso de abrir MintVID aparte.
- Licencias explicadas al usuario: MintVID MIT y libavc Apache-2.0 valen para dashweb (MIT); libmpeg2 y a52dec (GPL)
  no; Helix AAC (RPSL) con condiciones.

### 2026-10-17 — Tarea 30a (núcleo de MintVID en el emulador)
- MintVID (main, con submódulos libavc y MintAMP; ~/Projects tiene la copia solo en el scratchpad) compila con
  nuestro gcc 6.5 de bebbo: `make -f Makefile.amiga mr_decode CPU=68040 CPUFLAGS="-m68040 -D_sfdc_vararg=ULONG"`
  (el _sfdc_vararg es de sus cabeceras de red más nuevas). Su programa de prueba `mr_decode` decodifica un MP4
  como los de YouTube (H.264 Main 640x360 25 imágenes/s + AAC 96k, hecho con ffmpeg) en la máquina objetivo:
  normal 89 + 23 ms por imagen (decodificar + pasar a RGB, ~9/s), fast 61 + 23 (~12/s), turbo (decodifica una de
  cada dos) 56 + 21. El vídeo se ve, no en tiempo real a 25/s en el emulador (la PiStorm real está por medir).
  Necesita 320 KB de pila (Stack 400000 en el sistema de prueba).
- Pasos siguientes (30b): una librería libvideo.a con lo justo del núcleo (mr_codec, mr_source, mr_demux, mr_mov,
  mr_h264 + libavc + libavc_port, mr_yuv, mr_scale; sin libmpeg2/a52/libdv, que son GPL/LGPL, ni su red), una
  interfaz en C (abrir de memoria o fichero, siguiente imagen en RGB, su tiempo) y lib/video.dash. Para pintar,
  D43 encargada a la otra sesión (tarea 9: gfx_rgb_draw y gfx_rgb_draw_scaled con WritePixelArray/p96).

### 2026-10-17 — Tarea 30b, primera parte (el núcleo de MintVID dentro de dashweb)
- third_party/mintvid: el subconjunto de MintVID (b3be6f3, MIT) sin cambios: su núcleo (contenedores MP4/MOV,
  AVI, MKV, TS/PS; códecs H.264, MPEG-1, MPEG-4/DivX, MJPEG, Cinepak, WMV1/2, H.263, MS Video 1, RLE; YUV a
  RGB en ensamblador de 68k) y libavc (Apache-2.0, sin codificador, MVC/SVC ni otras arquitecturas) con su
  adaptación libavc_port. Fuera: libmpeg2, liba52 (GPL), libdv (LGPL), su red y MintAMP. README.dashweb lo
  explica. `dashweb_video.c` (nuestro): sustitutos vacíos de lo que falta y la interfaz dwv_* (abrir, tamaño,
  imágenes por segundo, códecs, siguiente imagen en RGB24 con drain/flush para los B-frames, instante, modo
  rápido de H.264, cerrar).
- `tools/build_video.sh` → build/video-lib/libvideo.a (830 KB): la lista de ficheros del mr_decode de MintVID,
  -m68020-60 -m68881, y sus redirecciones de enlace (--wrap, las rutas en ensamblador de libavc) resueltas con
  ld -r dentro de la librería. tests/run.py la compila si falta (y ya no rehace QuickJS por cualquier fichero de
  third_party).
- `lib/video.dash`: video_abrir, video_ancho/alto, video_fps_mil, video_codecs, video_siguiente, video_rgb,
  video_paso, video_ms, video_rapido, video_cerrar. Probado en el emulador (un MP4 H.264 de 160x48 con
  B-frames): códecs, tamaño, 10 imágenes de 10 con su instante, colores bien, memcheck sin nada.
- Test nuevo `test_video` (emu-server 40863, pila de 400 KB; MintVID pide 320 KB).
- Falta (30b): pintarlo en el recuadro de `<video>` (D43 encargada: gfx_rgb_draw), al ritmo del reloj, y
  el sonido.

### 2026-10-17 — Tarea 30b, segunda parte (vídeo en la página)
- `<video>` en la maqueta (`D_VIDEO`): 300x150 si no dice más, width en px o %, alto con la proporción de sus
  atributos; su dirección, la de src o la del primer `<source>` con un tipo que se reproduce (`video_src`).
- `lib/videos.dash`: un reproductor por `<video>`. Un clic lo trae (HTTP/HTTPS a T:) y lo reproduce en modo
  rápido de H.264; otro lo pausa; al acabar, otro lo vuelve a empezar. Cada tic decodifica hasta la imagen que
  toca según el reloj (salta las que llegan tarde). Sin imagen, un recuadro negro con el botón de reproducir.
  `@stack 400000` en lib/video.dash (MintVID pide 320 KB).
- Pintor: `D_VIDEO` con gfx_rgb_draw_scaled (D43, rama `rgb` de la otra sesión, aún sin fusionar);
  `pintar_videos` solo repinta los vídeos. dashweb.dash: clic en un vídeo, tic cada 20 ms mientras suena.
- Probado en la máquina RTG (tests/pages/video.html, H.264 320x180 a 640x360): se reproduce entero (captura
  enviada al usuario). Fallos: los rellenos (círculo, polígono) colgaban en el lienzo de MUI (Dash: tarea 10,
  hecha en la rama `areas`); al repintar solo el vídeo MUI borra el lienzo y la página queda gris (Dash:
  tarea 11, mui_canvas_update). Hasta fusionar rgb, dashweb no compila con el Dash de `dashweb`: commit en
  dev2, sin pasar a dev.

### 2026-10-17 — Tarea 30b, tercera parte (vídeo fluido)
- Dash: fusionadas `bools` (true/false al escribir un Bool; 5 expect-out de dashweb cambiados) y `rgb`
  (gfx_rgb_draw, gfx_rgb_draw_scaled). Probadas sin fusionar aún `areas` (rellenos en lienzos de MUI),
  `canvasupd` (mui_canvas_update / mui_canvas_updating: repintar solo el vídeo sin que MUI borre la página) y
  `rgbfast` (escalado en el formato de la pantalla: 2x de 16 a 5,5 ms).
- Reproducción: la imagen siguiente se decodifica justo después de pintar la actual (`videos_adelantar`) y se
  enseña cuando toca, hasta 30 ms antes; si al acabar un tic la siguiente ya toca, se enseña en el mismo tic
  (hasta 4): cada vuelta por el bucle de eventos cuesta ~27 ms en la máquina RTG emulada (medido: el temporizador
  despierta tarde, pida lo que pida). Se enseña toda imagen decodificada; con más de 200 ms de retraso, H.264
  en turbo hasta alcanzar el reloj (turbo+ no: con una imagen clave cada 10 s se salta el vídeo). Barra de
  estado: "Vídeo: N s, X imágenes/s"; al acabar, el botón de volver a empezar.
- Medido en la máquina objetivo (68040+JIT, RTG): 320x180 escalado a 640x360, 300 de 300 imágenes en 12 s
  (25/s, tiempo real; antes 8/s). 640x360 a su tamaño: ~9 imágenes/s (decodificar cuesta ~87 ms), el vídeo va
  un 50 % más lento que el reloj. En una PiStorm real está por medir.

### 2026-10-17 — Tarea 30b, cuarta parte (sonido)
- El sonido de MintVID en libvideo.a: su adaptador (audio/mr_audio_decode.c: AAC, MP3, MP2, PCM), los
  decodificadores Helix de MintAMP (AAC-LC sin SBR y MP3, RPSL, con su ensamblador de 68k; aac/ y real/ tienen
  ficheros con el mismo nombre: prefijo de carpeta en los objetos) y su salida por Paula (amiga/audio_paula.c).
  AC-3 fuera (liba52, GPL): `sin_a52/` son cabeceras sustitutas propias. SIN_SONIDO=1 hace la librería sin él.
- dashweb_video.c: el sonido de cada paquete va a Paula (empieza con 150 ms en cola); dwv_reloj (lo que ya ha
  sonado: reloj maestro), dwv_servicio, dwv_pausa, dwv_con_sonido. lib/videos.dash: la imagen sigue al reloj
  del sonido; pausa también lo para; tics de 20 ms como mucho mientras suena.
- Probado en la máquina RTG con un MP4 H.264 320x180 + AAC 44,1 kHz de 8 s: el reloj del sonido llega a 8034
  ms (Paula lo consumió entero; en el emulador no se oye, va sin altavoz) y se ven las 200 imágenes.
- Fallo encontrado y no de Dash: libavc pide 5 MB al crear el decodificador; en los 8 MB del A1200 de pruebas
  ya no cabía con el sonido. test_video usa un 68030 con 64 MB (emu-config) y abre también un vídeo con AAC.
- Fallo de Dash encargado: un @native que devuelve Bool no se escribe true/false al concatenarlo.

### 2026-10-17 — Tarea 30c (YouTube)
- `lib/youtube.dash`: el recorrido de MintVID (mr_youtube.c) con la red de dashweb y sin esperar: la página
  del vídeo (User-Agent de navegador) y, si no trae el MP4, youtubei/v1/player con los clientes ANDROID,
  ANDROID_VR, WEB_EMBEDDED_PLAYER y WEB; clave y versión de la página (o la clave pública de WEB si no las
  trae, p. ej. la página de consentimiento). Los analizadores son los de MintVID en C (dwv_youtube_id,
  dwv_youtube_mp4: itag 18, H.264 + AAC), con su red sustituida. El MP4 se baja con el User-Agent del
  cliente que lo dio (http_con_agente, nuevo en lib/http.dash).
- `<iframe>` de YouTube (embed, watch, youtu.be, shorts, nocookie) maquetados como vídeo (`dom_es_video`).
  Reproductor: fase "preguntando a YouTube", y "trayéndolo, N % de M KB" en la barra de estado. El vídeo
  conserva su proporción (franjas negras), como en los navegadores.
- Prueba manual, una vez, con YouTube de verdad en la máquina RTG ("Me at the zoo", jNQXAC9IVRw): resuelto,
  bajado y reproducido entero con sonido, 284 imágenes en 19 s (14,8/s; el vídeo es de 15), reloj del sonido
  18,86 s. Captura enviada al usuario. Test sin red `test_youtube` (identificadores, el MP4 de una respuesta
  del reproductor guardada en tests/pages/youtube_player.json, la configuración de la página).
- Pendiente: pantalla completa (30d); empezar a reproducir antes de tener el fichero entero; la miniatura
  del vídeo antes del clic.

### 2026-10-17 — Tarea 30d (pantalla completa)
- Esquina de abajo a la derecha del vídeo (icono de cuatro esquinas, 24 px, cuando ya hay imagen): un clic abre
  una ventana MUI a pantalla completa (`mui_window_fullscreen`, D de la otra sesión, rama `fullscreen`) con un
  lienzo negro y el mismo reproductor con su proporción. Clic o Esc la cierran; la barra espaciadora para y
  sigue. Al cerrar se repinta la página.
- Los `<iframe>` de YouTube que el CSS de la página pone como bloque o con posición absoluta (temas de
  WordPress, p. ej. freemem.space) también son vídeo: `_contenido` no los trata como bloque y `_absoluto`
  tiene su caso. Un vídeo visto solo en parte se pinta igual (lo recorta MUI).
- Probado en la máquina RTG (1024x768) con video_sonido.html: clic para reproducir y clic en la esquina; el
  vídeo 320x180 escalado a 1024x576 a pantalla completa, 200 imágenes de 200, sonido entero (reloj 8034 ms).
  Captura enviada al usuario.
- Sin probar: la captura del artículo de freemem.space con su YouTube (el intento se paró por tiempo).
- Base con Dash de la rama `fullscreen` (d21cecc): 33/33 tras pasar a true/false las líneas esperadas de
  test_imagen_dec, test_jsdom_eventos y test_formularios_post (un Bool ya se escribe así en Dash).
- Captura pedida por el usuario: el artículo de freemem.space ("Análisis de la evolución de la popularidad...")
  en la máquina RTG, bajado con el teclado hasta su primer YouTube (bnWKfEWPAaM) y pulsado: resuelto, bajado
  (540x360) y reproducido entero dentro de la página, 289 imágenes de 289 en 48 s (el vídeo es de 6 por
  segundo), reloj del sonido 47,99 s. Enviada al usuario.

### 2026-10-17 — Tarea 30e (el cartel del vídeo)
- `dom_youtube_id` (en Dash: embed, shorts, youtu.be, ?v=) y `dom_video_poster`: el poster de `<video>` o, en un
  YouTube, https://i.ytimg.com/vi/ID/hqdefault.jpg. `imagenes.dash` lo pide con las demás imágenes y deja la
  dirección completa en el atributo poster. El pintor lo pone sobre negro mientras el vídeo no ha empezado
  (o falló), con el botón encima: la miniatura de YouTube cubre el recuadro, el poster cabe entero (contain).
  Los repintados parciales del vídeo que suena no tocan los vídeos con cartel.
- Test `test_video_cartel` (identificadores, la dirección de la miniatura, píxeles de contain y cover). Base: 34/34.
- `tools/medir_visor.py`: varias capturas en una ejecución (`--captura a.png,b.png --captura-en 100,200`), con
  D44 de Dash (rama `capturas`, ya en `dashweb`).
- Probado en la máquina RTG con el artículo de freemem.space: antes del clic se ve la miniatura del vídeo;
  después, reproducido entero (283-289 imágenes según la vuelta, reloj del sonido 48 s). Capturas del cartel y
  del vídeo sonando (segundo 17) enviadas al usuario.

### 2026-10-17 — Tarea 30f (el vídeo empieza mientras se baja)
- La red de dashweb guarda la respuesta en memoria hasta el final: `http_parcial` (dónde está ya el cuerpo de
  una respuesta 2xx con Content-Length; se mueve al crecer el búfer), `http_parcial_listos`, `http_parcial_total`.
- `dashweb_video.c`: una fuente de MintVID (mr_source_create, por el hueco de su red) que lee de esa memoria y,
  al acabar la descarga, del fichero (`dwv_abrir_bajando`, `dwv_bajado`, `dwv_bajado_fichero`). Lo que no ha
  llegado no se lee: `dwv_siguiente` da 2 (esperar). Parche en `core/mr_mov.c` (anotado en README.dashweb):
  un paquete que no se pudo leer no se da por consumido.
- `lib/videos.dash`: mientras se trae, prueba a abrirlo cada 256 KB (un MP4 con el índice al principio suena
  enseguida; con el índice al final, al llegar entero). Suena y sigue bajando; si se queda sin datos, se para
  (también el sonido) con "esperando a que llegue" y sigue solo. La barra dice "(trayéndolo, N %)".
- Servidor de pruebas: `/goteo/<fichero>` (64 KB, una pausa de GOTEO_S s, el resto). Test `test_video_bajando`
  (abre antes del final, imágenes mientras baja, espera, mismas imágenes que entero). Base: 35/35.
- Probado en la máquina RTG con `video_goteo.html` (GOTEO_S=10): suena con el 21 % traído, espera en la imagen
  40 y sigue; 200 imágenes de 200, sonido entero (8034 ms). Capturas enviadas al usuario.

### 2026-10-17 — Tarea 28g (QuickJS con FPU)
- `tools/build_qjs.sh lib` compila ahora para 68020 con FPU (`-m68020 -m68881`, como `./dash --fpu`);
  `QJS_CPU=""` lo deja sin FPU (fp-bit) para un dashweb sin `--fpu`.
- Fallo encontrado (y arreglado con esto): con libqjs.a sin FPU dentro de un programa con FPU, las
  conversiones de libgcc (enteros de 64 bits a double: `__floatdidf`...) son las de la FPU y devuelven el
  resultado en fp0, pero QuickJS lo leía de d0/d1. `Date.now()` daba 8,8e-312, `(s + i) | 0` en un bucle de
  100.000 vueltas daba 704927097 (bien: 704982704) y un generador de números aleatorios salía distinto.
  Con FPU, los mismos números que el cálculo en el PC. Test: `test_js` (Date.now, BigInt a número).
- `tools/bench_js.py` (nuevo): tests/bench/bench.js en la máquina objetivo, con AmigaOS 3.2 y su
  68040.library. Sin ella (los sistemas 3.1 de pruebas no la traen) un programa con FPU se cuelga en el 68040
  emulado: la máquina "objetivo" de medir_visor (3.1) no sirve para programas con FPU; la RTG (3.2) sí.
- Medidas con FPU (68040 + JIT; Date.now va de 20 en 20 ms): fib20 60 ms, intloop100k 100, float20k 40,
  mathsin5k 60, strcat5k 80, arrjoin 100, objects5k 140, sort5k 200, json 200, regexp 60, map5k 220,
  closures 60, parse30k 420. Sin FPU no se pudo medir: su Date.now no funcionaba. Base: 35/35.

### 2026-10-17 — Tarea 28h (conexiones que siguen abiertas)
- `lib/http.dash`: con `http_seguir = true` (dashweb lo pone al empezar; `http_cerrar_libres()` al salir), las
  cargas sin espera piden "Connection: keep-alive" y, tras una respuesta entera de HTTP/1.1 sin "Connection:
  close", la conexión queda libre (hasta 8, 10 s como mucho) para la siguiente petición al mismo servidor y
  puerto: sin conectar ni negociar TLS otra vez. Una conexión libre que el servidor ya cerró se descarta; si
  se nota al mandar o al no recibir nada, la petición se repite en una nueva. Las peticiones que esperan
  (http_get...) siguen con "Connection: close".
- Respuestas que acaban sin cerrar: chunked termina con su trozo de tamaño 0 y sus cabeceras finales
  (`_chunked_fin`); 204, 304 y 1xx no tienen cuerpo.
- Servidor de pruebas: varias peticiones por conexión si se piden con keep-alive; `/conexion` ("c1 r4": qué
  conexión y qué petición de ella) y `/cerrar_tras`. Test `test_http_seguir`.
- dashweb escribe en la salida cuánto tarda una página entera, con sus imágenes ("entera en N ms").
- Medido en la máquina RTG con https://freemem.space/ (dos veces cada uno): con conexiones abiertas 46,5 y
  44,9 s; sin ellas 50,0 y 51,7 s: un 10 % menos. Base: 36/36 (y 36/36 con memcheck en la batería de la otra sesión).

### 2026-10-17 — Tarea 29c (imágenes decodificadas en otro proceso)
- Con D47 de Dash (`task_start_with`, rama `tareas`, ya en `dashweb`): `lib/imagen_dec.dash` decodifica en otro
  proceso (`imagen_empezar`, `imagen_lista`, `imagen_acabar`), con prioridad -1 y 256 KB de pila. El C de los
  decodificadores solo usa memoria de exec y el malloc de libnix (con semáforo). La imagen de pantalla
  (image_from_rgb) se hace luego en el programa. Si no se puede crear el proceso, se decodifica como antes.
- `lib/imagenes.dash`: cada imagen pasa por bajándose → llegada → decodificándose; hasta 4 a la vez.
- Encontrado midiendo: cada imagen que llegaba volvía a maquetar la página entera (freemem.space: ~1,4 s cada
  vez en la máquina RTG). Ahora (`documento_imagenes`) solo se maqueta si la imagen le pone tamaño a su `<img>`
  (si ya lo tenía, basta con repintar) y, mientras siguen llegando, como mucho cada 2 s desde la anterior.
  También sirve sin otro proceso: 45 → 41,6 s.
- Medido en la máquina RTG con https://freemem.space/ (la página entera, con sus imágenes):
  sin otro proceso 41,6 y 41,6 s; en otro proceso, uno a la vez 51,8 y 50,2 s; cuatro a la vez 46,7 s
  (prioridad -1) y 45,3 s (prioridad 0). Se queda en cuatro a la vez con prioridad -1: algo más lento que sin
  otro proceso, pero la ventana responde mientras se decodifican.
- Fallo de Dash encontrado y arreglado por la otra sesión: una función privada pasada por su nombre a
  task_start daba "is private to module" (ac3884a).
- `image_from_rgb` necesita picture.datatype V43: en AmigaOS 3.1 devuelve 0 (y dashweb usa los datatypes);
  `test_imagen_dec` mira lo decodificado por la tarea sin pasarlo a pantalla (`imagen_acabar_probar`).
- Prueba a mano del usuario en una ventana del emulador: commodoremalacca.club (Next.js) pide TextEncoder, que
  no tenemos: tarea 28i. Base: 36/36.

### 2026-10-17 — Tarea 28i (TextEncoder, TextDecoder)
- En el preludio de jsdom: TextEncoder (encode, encodeInto) y TextDecoder (UTF-8 con BOM, stream y fatal, como
  el estándar de WHATWG; también UTF-16LE y Latin-1). Sin listas intermedias: dos pasadas sobre Uint8Array (la
  primera versión, byte a byte en una lista, se quedó sin memoria con los datos de una página de Next.js).
  Comprobados en el PC contra los de Node: casos a mano, 3000 secuencias de bytes al azar, 2000 textos al azar con
  encodeInto en destinos de 0 a 5 bytes, y trozos partidos al azar con stream: todo igual.
- commodoremalacca.club (Next.js) pedía después ReadableStream. Escrita (cola, lectores con promesas, pull, for
  await), pero con ella el JavaScript sigue y deja el Amiga sin memoria y dashweb se cierra: se queda sin poner
  (tarea 28j) y la página se sigue viendo como antes (entera en 57,7 s).
- lib/js.dash: tope de memoria de 48 MB para el JavaScript de una página (JS_SetMemoryLimit): si lo pasa, su
  script recibe "out of memory" en vez de dejar sin memoria al Amiga.
- Test `test_jsdom_texto`. Apuntado lo que se ve mal en esa portada: tarea 28k. Base: 37/37.

### 2026-10-17 — Tarea 28l (repintar menos)
- El usuario, probando dashweb en una ventana del emulador: tras cargar la página "todo se re-renderiza varias
  veces". Medido en la máquina RTG con freemem.space (avisos temporales en cada repintado): 17 repintados de la
  página entera después de abrirla, cada uno de ~0,7 s y visible (se pinta en la ventana, que se borra antes):
  uno al llegar la página, dos de los temporizadores del JavaScript que cambian el DOM, y 14 de imágenes que
  llegan (aunque la 29c ya no maquetaba por cada una, sí repintaba todo).
- `documento_imagenes`: las imágenes que llegan se pintan juntas, como mucho cada 2,5 s mientras siguen llegando
  y la última enseguida; se maqueta solo si alguna cambió el tamaño de su `<img>`. Ahora: 6 repintados por
  imágenes en lugar de 15; la página entera en 44,0 s en lugar de 51,6 (las dos con los avisos puestos).
- Encargado a Dash (D48): doble búfer en mui_canvas, para que un repintado no se vea a medias.
- `js_memoria` y `js_limite` (lib/js.dash): lo que ocupa el JavaScript de un motor y su tope. Midiéndolo salió
  un fallo: en Amiga, QuickJS contaba 0 bytes por bloque (nuestro parche de malloc_usable_size devolvía 0, libnix
  no lo tiene), así que el tope de 48 MB de la 28i nunca saltaba. Arreglado en third_party/quickjs: en Amiga cada
  bloque guarda su tamaño delante (8 bytes). Un motor recién hecho: 149.728 bytes. Test en test_js: con un tope de
  1 MB, un script que pide más recibe el error (InternalError, o null si ni ese objeto cabe) y el programa sigue.
- Base: 37/37.
- 28j (en marcha, sin resultados): con ReadableStream puesta y avisos de memoria cada 3 s, el emulador se quedó
  colgado sin escribir nada (la salida se pierde): habrá que mirarlo con el disco guardado o capturas.

### 2026-10-17 — Tareas 31a y 31b (comparar con Chrome; flexbox)
- El usuario preguntó si el motor de XHTML/CSS se estaba haciendo completo o solo para freemem.space. Revisado:
  no hay nada a medida de una web, pero se completaba con lo que pedía freemem.space y faltaban módulos enteros
  (flexbox y grid se trataban como bloques, sin calc, z-index, overflow, border-radius de verdad, @font-face...).
  Decisión del usuario: tarea 31, módulo a módulo según su especificación, con su lista de 13 webs.
- 31a: `tools/comparar_chrome.py` (y `tools/webs_prueba.txt`): Chrome sin ventana (google-chrome-stable
  --headless) a 940x614, el tamaño de la zona de la página de dashweb en la máquina RTG, y dashweb en esa máquina
  (recortado a su página), juntas en una imagen. Solo a mano.
- 31b: flexbox en `lib/maqueta.dash` (`_flex`), según CSS Flexible Box Layout 1: elementos flex (texto suelto y
  reemplazados en cajas anónimas, order), tamaño base (flex-basis, width/height, contenido) e hipotético con
  min/max y el mínimo automático, líneas (flex-wrap), espacio libre con flex-grow/flex-shrink congelando a los que
  violan sus límites (9.7, también con flex-grow que suman menos de 1), tamaño cruzado de las líneas, align-content,
  stretch (vuelve a maquetar con el alto de la línea), justify-content (con space-*) y márgenes auto, align-self,
  gap, row/column y -reverse. Cada elemento se maqueta una vez en 0,0 y sus dibujos se mueven a su sitio (solo el
  estirado lo vuelve a maquetar). Atajos en la cascada: flex, flex-flow, gap, grid-gap.
- Test `test_maqueta_flex`: 31 cajas en 13 casos, todas como dice la especificación a la primera.
- D48 (doble búfer, rama `dobleb`, ya en `dashweb`): la página de dashweb se pinta aparte y llega de una vez
  (`mui_canvas_buffered`): ya no se ve redibujarse. Probado en la máquina RTG con freemem.space.
- D49 encargado (fallo de Dash): una variable con el [String] que devuelve una función perdía el tipo de sus
  elementos en un for (en `_flex_atajo`, rodeado con `var partes: [String]`). Arreglado en la rama `tipolista`.
- Base: 38/38.

### 2026-10-17 — Primera comparación con Chrome (13 webs)
- Casi igual: freemem.space, amigastore.eu. Cerca pero sin iconos ni logo (SVG dentro de la página, 31i):
  xataka.com, meneame.net (Chrome tapa la página con el aviso de cookies). Sin el fondo y el texto grande del bloque
  principal: commodoremalacca.club, trainalong.fit. Tablas con las columnas mal: aminet.net (31g). amigang.com
  (cabecera), muylinux.com (logo, menú escondido a la vista), dpms.freemem.space (fondo enorme), ami64.com (en
  blanco): 31j. amigaworld.net: Chrome no la cargó a tiempo. amiga.abime.net: las dos se quedan en su pantalla
  antirobots (Anubis). Mosaicos enviados al usuario.

### 2026-10-17 — Tareas 31c a 31f (calc y unidades; grid; z-index y overflow; border-radius y box-shadow)
- 31c (`lib/estilo.dash`): calc(), min(), max() y clamp() (anidados, con paréntesis, + - * /, en centésimas de
  píxel) dentro de estilo_px, solo cuando el valor empieza por letra (lo normal sigue igual de rápido). rem es
  ahora el font-size de <html> (antes valía como em). vw, vh, vmin, vmax (de la zona de la página: estilo_vw lo
  pone maquetar, estilo_vh dashweb) y ch. Test `test_estilo_calc`.
- 31d (`lib/maqueta.dash`, `_grid`): CSS Grid 1: pistas (px, %, fr, auto, min-content, max-content, minmax,
  fit-content, repeat con auto-fill/auto-fit), grid-template-areas, colocación explícita (números, negativos,
  span, áreas, grid-column/row/area) y automática (row y column, sin dense), pistas implícitas, tamaño de las
  pistas (lo que piden los elementos, el libre hasta los límites, las fr sin bajar de su base, las auto
  estiradas), gap, justify/align-content y justify/align-self (stretch vuelve a maquetar). Test
  `test_maqueta_grid` (24 cajas en 8 casos; un fallo de verdad encontrado: justify-self con width fijado).
- 31e: z-index (cada elemento posicionado con z-index pone su capa a todo lo suyo; la página se ordena por
  capas al final, estable) y overflow hidden/clip/auto/scroll (lo de dentro lleva su recorte, también anidado,
  y el pintor pinta solo ahí). position: sticky sigue en su sitio (como relative). Test `test_maqueta_capas`.
- 31f: border-radius de verdad (1 a 4 radios, px/em/%; D_REDONDO: el pintor rellena fila a fila en las
  esquinas, o solo el anillo si es un borde; con transparencia y recorte) y box-shadow (la primera no inset:
  desplazada y con su extensión, más clara si es difuminada; redondeada si la caja lo es). En
  `test_maqueta_capas` (píxeles de la esquina, el medio y el borde).
- D49 (Dash, listas devueltas por funciones) fusionada; el rodeo de `_flex_atajo` ya no hace falta.

### 2026-10-17 — Tarea 31g (tablas, atributos de presentación, aspect-ratio, object-fit)
- Tablas según CSS 2.1 (17.5): rejilla con colspan y rowspan (también rowspan=0), anchos automáticos (mínimo y
  máximo de cada columna por su contenido o su width; las celdas de varias columnas reparten lo que les falta; la
  tabla reparte entre mínimo y máximo, o lo que sobra en proporción a las columnas sin ancho fijado),
  table-layout: fixed, border-spacing (0 con border-collapse), caption, alto de las filas (rowspan: lo que falta a
  la última), fondo de las filas y vertical-align de las celdas (middle por omisión, top, bottom: la celda se
  vuelve a maquetar con el alto de su área y su contenido baja; sus fondos y bordes no). Antes: anchos iguales.
- Atributos de presentación de HTML (la parte "Rendering" de HTML), como CSS de autor que pierde con cualquier
  regla: width/height, bgcolor, background, align (tabla centrada o flotante; texto), valign, border, cellspacing,
  cellpadding (de su tabla), nowrap, text de body, y color/face/size de <font>. En la hoja del navegador:
  border-spacing 2px, vertical-align middle en las celdas.
- `_ancho_flotante` (lo que mide el contenido, para flex, grid y tablas) cuenta ahora las cajas de los elementos
  con width fijado (antes solo el contenido: un <div> de ancho fijo con fondo medía 0).
- aspect-ratio (con el alto sin fijar) y object-fit (contain, cover, scale-down) en las imágenes.
- Test `test_maqueta_tabla` (16 cajas en 7 casos). test_maqueta: su tabla ahora se ajusta al contenido y lleva
  border-spacing (como Chrome): sus líneas esperadas, al día. Base: 42/42 (test_http_seguir falló una vez por
  servidores de pruebas huérfanos de una batería parada a mano; sin ellos, pasa).

### 2026-10-17 — Tarea 31i (SVG dentro de la página)
- `lib/imagenes.dash`: cada <svg> de la página se vuelve a escribir como un fichero SVG (T:dashweb_svgN.svg) que
  decodifica nanosvg: nombres de SVG con su caja (el lector de HTML los deja en minúsculas: viewBox,
  linearGradient, clipPath...), currentColor con el color del <svg>, fill/stroke/opacity que pone el CSS de la
  página a cada elemento, y <use href="#id"> (o xlink:href) sustituido por lo que nombra (de un <symbol>: sus hijos,
  y su viewBox para un <svg> sin viewBox, como en los sprites de iconos). La maqueta lo pone como una imagen, a su
  tamaño de CSS, de sus atributos o, sin nada, 300x150 (con viewBox, el alto en proporción).
- Test `test_svg_pagina` (el SVG generado, lo que decodifica nanosvg de un rectángulo y de un icono de sprite, y
  su sitio en la maqueta). Base: 43/43.

### 2026-10-17 — Tarea 31k (Selectors 4)
- `:is()` (y sus alias :matches, :-webkit-any, :-moz-any), `:where()`, `:has()` con selectores relativos (> hijo,
  + hermano siguiente, ~ hermanos siguientes, o descendiente) y `:nth-last-of-type()`; `:not()` ya aceptaba listas.
  Especificidad de Selectors 4: :where cuenta 0; :is, :not y :has, la de su argumento más específico. También en
  querySelector (lo que pedía ami64.com). Test `test_selectores4`.
- Pregunta del usuario: ¿el problema de JavaScript es QuickJS? No: el lenguaje está completo (ES2023); lo que falta
  son las APIs del navegador (bloque 32). Traducir QuickJS a Dash (69.000 líneas de C) se descarta: meses de trabajo,
  más lento y con fallos nuevos, para tener lo mismo; QuickJS sigue como librería de C y lo de alrededor, en Dash.
  Orden decidido por el usuario: primero el bloque 31, luego el 32.
- Base: 44/44.

### 2026-10-17 — Tarea 31l (Transforms)
- `_transformar` (lib/maqueta.dash) reescrita: compone las funciones de izquierda a derecha en una matriz de escala
  (milésimas) y desplazamiento (px), alrededor de `transform-origin` (palabras, % o longitudes; por omisión el
  centro). translate/translateX/Y/3d con % de la propia caja y con calc() dentro (paréntesis anidados); scale,
  scaleX/Y/3d (también con %); matrix() y matrix3d() sin giro (con giro, solo su desplazamiento); ángulos en deg,
  rad, grad y turn. Las propiedades sueltas `translate`, `rotate` y `scale` (Transforms 2) van delante de
  `transform`. scale(0) quita lo dibujado; scale(-1) da la caja vuelta (el texto se mueve, no cambia de letra).
  Las zonas de recorte de overflow que van dentro se transforman con ello.
- Lo que no: girar una caja con contenido a un ángulo cualquiera (haría falta girar texto e imágenes en el pintor);
  una barra sola se gira al múltiplo de 45 más cercano, como antes. skew y los giros 3D se ignoran.
- Test `test_maqueta_transform` (9 casos).
- Base: 45/45.

### 2026-10-17 — Tarea 31m (Animations: el estado final)
- dashweb no anima: pinta lo que la animación deja puesto. lib/css.dash guarda de cada @keyframes (y
  @-webkit-/-moz-keyframes) su último fotograma (to o 100 %) y el primero (from o 0 %); lib/estilo.dash junta los de
  todas las hojas (el último de un nombre manda) y, en un elemento con animation (o -webkit-animation, o las
  sueltas animation-name, -fill-mode, -iteration-count, -direction), si el fill-mode es forwards o both y las
  vueltas son finitas, declara las del fotograma final por encima de todo lo que no es !important (sobre una
  copia: las ganadoras se comparten entre elementos). Con reverse, alternate y vueltas pares o alternate-reverse
  e impares acaba en el primero. Es el caso de las webs que ponen opacity: 0 y una animación de aparecer.
- Transitions: sin cambios de estado no hay nada que hacer (el estilo de siempre es el final).
- Test `test_estilo_animacion` (8 casos, con cubic-bezier() con comas dentro del atajo).
- Base: 46/46.

### 2026-10-17 — Tarea 31n (Color 4 y 5)
- lib/colores.dash rehecho alrededor de un lector (`_color_leer`: el color y su opacidad en `_color_alfa`);
  css_color, css_alfa y css_color_opaco salen de él. Ahora entiende #rgba y #rrggbbaa, rgb()/rgba() con comas o
  con espacios y "/ alfa" (y decimales), hsl()/hsla(), hwb(), lab(), lch(), oklab(), oklch(), color(srgb ...)
  (también srgb-linear y xyz; display-p3 y los demás, como sRGB), color-mix() (mezcla premultiplicada en sRGB,
  diga el espacio que diga), light-dark() (el claro), none en los canales, los 148 nombres (salen de una tabla en
  un texto: antes había unos 40) y los colores del sistema (Canvas, CanvasText, ButtonFace...).
- Todo en enteros (diezmilésimas): seno por tabla de grados con interpolación, gamma de sRGB por una tabla de
  256 y búsqueda binaria. Dash no tiene sqrt/pow/sin para Float (solo fx_sqrt/fx_sin de Fixed); no hizo falta.
- Lo que no: la sintaxis relativa (rgb(from ...)) da -1; color-mix in oklab/oklch mezcla en sRGB.
- Test `test_colores4` (21 colores; lab y oklab a 1 de la fórmula en coma flotante).
- Base: 47/47.

### 2026-10-17 — Tarea 31o (Text 3)
- white-space: nowrap no se miraba: ahora las palabras de un texto nowrap van pegadas (no se corta la línea entre
  ellas). overflow-wrap/word-wrap: break-word o anywhere y word-break: break-all o break-word parten una palabra
  más ancha que la línea en trozos que caben (break-all no rellena la línea de antes: solo parte lo que no cabe).
  text-overflow: ellipsis, en una caja con overflow que no sea visible, cambia lo que no cabe por "..." (Latin-1
  no tiene el carácter de los tres puntos). text-shadow: la primera sombra, como copia del texto desplazada con su
  color (o el del texto); no se pinta si es casi transparente o difuminada más de 4 px (los halos quedarían
  peor sin difuminar). text-shadow, overflow-wrap, word-wrap y word-break se heredan.
- Lo que no: white-space: pre-wrap y pre-line siguen como pre (no parten líneas largas); hyphens.
- Test `test_maqueta_texto3`.
- Base: 48/48.

### 2026-10-17 — Tarea 31p (@supports y @layer)
- Las reglas dentro de @supports y @layer se tiraban enteras (solo se entraba en @media). Ahora @supports evalúa
  su condición ((propiedad: valor), not, and, or, paréntesis, selector()): una propiedad vale si está en la lista
  de las que dashweb pinta (CSS_CONOCIDAS en lib/css.dash; display, salvo contents/ruby/math; las --x siempre;
  las -webkit- y backdrop-filter, filter, mask... no). @layer (con nombre, anónimas, anidadas "a.b" y la
  declaración "@layer a, b;") da a cada regla el puesto de su capa por orden de aparición; fuera de capas, 1000.
  En la cascada la capa pesa más que la especificidad (especificidad + capa x 1.000.000; el atributo style pasa a
  1.500.000.000 y las animaciones a 2.000.000.000). Las capas se reinician en cada documento.
- Lo que no: con !important el orden de las capas no se invierte; @container sigue sin entrar (haría falta el
  tamaño del contenedor al aplicar el estilo); @scope.
- Test `test_estilo_capas` (9 casos). Mi primera versión del test esperaba mal: una regla p sin capa gana a una
  clase en capa, como dice la especificación.
- Base: 49/49.
- Segunda comparación con Chrome (versión 4cc45c7, la de la 31g: sin SVG ni 31k-31p; mosaicos enviados al
  usuario). Para la 31j: commodoremalacca.club sin la imagen de fondo del bloque principal (la primera línea del
  título, blanca, no se ve) y el aviso de cookies no sale; dpms.freemem.space, un texto gigante ("amiga p", "POS")
  en vez del cartel; muylinux.com, el logo tapado por círculos y sin las noticias; ami64.com en blanco (Wix);
  amigang.com sin el menú y con la imagen de cabecera enorme; amiga.abime.net, el reto anti-bots de Anubis (la
  imagen sin su tamaño); xataka.com sin logo ni iconos (SVG: la 31i ya los pone) y sin el menú. aminet.net,
  amigastore.eu, amigaworld.net (Chrome no la cargó), trainalong.fit, meneame.net y freemem.space, parecidas a Chrome.

### 2026-10-17 — Tarea 31j, primer arreglo (commodoremalacca.club)
- La portada pone sobre su cabecera una capa azul semitransparente con position: absolute; top/right/bottom/left
  a 0 y sin height (el título blanco va encima). dashweb le daba el alto de su contenido (0): sin capa, el título
  blanco quedaba sobre el fondo claro. Ahora un absoluto con top y bottom y height auto mide el hueco entre los
  dos (menos márgenes, y bordes y rellenos si no es border-box); se pone un height de un momento al maquetarlo.
  La imagen de debajo la pinta JavaScript en el navegador (BAILOUT_TO_CLIENT_SIDE_RENDERING de Next.js).
- Caso nuevo en `test_maqueta_transform`.
- Base: 49/49.

### 2026-10-17 — Tarea 31j, segundo arreglo (dpms.freemem.space)
- El texto gigante de dpms era su logo: un PNG de 3000x3000 con `height: 50px; width: auto; max-width: 200px`.
  Una <img> en la línea tomaba solo sus atributos width/height (o lo que mide la imagen cargada) y no el CSS.
  Ahora `_img_medida` aplica width (px o % de la línea) y height (px) del CSS, saca el que es auto de la
  proporción, y después max-width y max-height con la misma proporción (como ya hacían los vídeos).
- Casos nuevos en `test_maqueta_transform` (3 imágenes).
- Comparación de hoy (commodoremalacca, dpms, muylinux, xataka) con la versión de la 31p: muylinux ya tiene su logo;
  xataka sigue sin logo ni menú, y muylinux sin las noticias (lozad.js: falta NodeList en JavaScript, bloque 32).
- Base: 49/49.

### 2026-10-17 — Tarea 31j, tercer arreglo (xataka.com: el logo)
- El logo de xataka es el fondo SVG de un <a> con `display: inline-block; width: 100%; height: 100%` dentro de
  un h1 de 160x84. dashweb no resolvía ningún height en %: la caja del fondo medía 0. Ahora `_bloque_en` lleva el
  alto fijo del contenido de la caja que maqueta (`_alto_definido`: height en px, o en % de otro fijo) y un
  height en % de un hijo sale de él (CSS 2.1, 10.5), también en flex y grid (alto_fijo). El de html y body
  sigue sin fijarse (cambiaría el alto de la página entera).
- El menú de xataka (flex con overflow: hidden y 20 px de alto) sigue sin salir: queda para otra vuelta.
- Casos nuevos en `test_maqueta_transform` (uno directo y otro encadenado).
- Base: 49/49.
- Comprobado en la máquina RTG contra Chrome (versión be47543): commodoremalacca ya tiene la capa azul con el
  título blanco legible, y dpms el logo a 50 px y el cartel en su sitio. Falta en dpms: el título "Posadas Party
  2026" sale como una caja blanca (texto con degradado: background-clip: text) y el fondo de estrellas (Three.js).

### 2026-10-17 — Tarea 31j, cuarto arreglo (dpms: el título con degradado)
- `background-clip: text` (y -webkit-) con `-webkit-text-fill-color: transparent`: el fondo solo se ve en las
  letras. dashweb pintaba la caja del degradado (la caja blanca de dpms) y las letras transparentes. Ahora una caja
  con background-clip: text no pinta fondo (color, degradado ni imagen) y sus letras toman el color de en medio
  del degradado (o el background-color). -webkit-text-fill-color con un color manda sobre color, y se hereda.
- Caso nuevo en `test_maqueta_texto3`.
- Base: 49/49.

### 2026-10-17 — Tarea 31j, quinto arreglo (recortes que se quedaban atrás; position: relative)
- Flex, grid, tablas y los absolutos con bottom maquetan en (0, 0) y luego mueven lo dibujado a su sitio, pero la
  zona de recorte de overflow (rx0..ry1, en coordenadas de página) se quedaba donde estaba: lo de dentro de una
  caja con overflow: hidden que fuera hija de un flex (el menú de xataka) quedaba fuera de su propia zona y no se
  pintaba. Ahora todos mueven con `_mover`, que lleva el recorte con el dibujo.
- position: relative con left/right/top/bottom no movía nada (no había código): ahora `_relativo` desplaza lo
  dibujado de la caja (CSS 2.1, 9.4.3; top/bottom en % no, como height). Solo en cajas de bloque e inline-block,
  no en un <span> relativo.
- Casos nuevos en `test_maqueta_transform`.
- Base: 49/49.
- Tercera comparación con Chrome, las 13 webs (versión 5cf086e, 4 grupos a la vez: 12 min en vez de 35; mosaicos
  enviados al usuario). Mejor que en la segunda: muylinux ya tiene sus noticias, xataka su menú, commodoremalacca
  su capa azul, dpms su logo y su título. Pendiente: el logo de xataka sale como texto "Xataka" (falta
  text-indent negativo y su fondo SVG); amigang, el menú encima de la cabecera; ami64 en blanco (Wix, JavaScript);
  meneame y muylinux sin el aviso de cookies (lo pone JavaScript); trainalong sin la curva (SVG de fondo) ni sus
  letras (@font-face, 31h). Velocidad: la configuración de la máquina RTG ya es la más rápida (JIT a tope; la
  caché del JIT al máximo, el JIT de la FPU y sin sonido dieron lo mismo en tools/bench_js.py).
- Un emulador para el usuario (ventana, para usar dashweb a mano) hecho con `medir_visor --guardar` se cerraba solo
  a los pocos segundos: medir_visor compila con DASH_TEST_AUTOCLOSE = --segundos (el visor se cierra solo). Para
  uno interactivo hay que compilar sin esa variable (`./dash src/dashweb.dash -o p0`). No era un fallo de dashweb.

### 2026-10-17 — Tarea 31j, sexto arreglo (text-indent; el logo de xataka)
- text-indent no estaba implementado: `_lineas` desplaza la primera línea (px, em o % del ancho) y le quita ese
  ancho al partirla; negativo, la saca por la izquierda (con text-align: center se centra en lo que queda, como
  Chrome: -9999px sigue fuera). Es la forma clásica de esconder el texto de un logo que se pinta como fondo (xataka:
  "Xataka" encima de su SVG). Se hereda (también a los inline-block, como en los navegadores). Se aplica en cada
  tramo de líneas de una caja, no solo en el primero (una caja con texto, un bloque y más texto sangra los dos).
- Caso nuevo en `test_maqueta_texto3`.
- Base: 49/49.

### 2026-10-17 — Tarea 31j, séptimo arreglo (amigang: la capa oscura de la cabecera)
- El tema Mesmerize oscurece la imagen de la cabecera con un ::before en position: absolute, width/height 100 %,
  fondo negro y opacity: 0.78; el menú blanco va encima. Dos fallos: un absoluto con height en % medía 0 (en un
  absoluto el alto del contenedor ya se sabe: ahora sale de él, como top/bottom), y opacity entre 0 y 1 no se
  aplicaba. Ahora la opacidad de una caja mezcla su fondo (el rectángulo con espaciado = alfa; el pintor no
  mezcla texto ni imágenes: lo de dentro se pinta entero).
- Caso nuevo en `test_maqueta_transform`.
- Base: 49/49.
- Comprobado contra Chrome (35c6fca): xataka ya esconde el texto del logo y amigang tiene la capa oscura; el menú
  de amigang sigue desordenado (queda pendiente) y el logo SVG de xataka seguía sin verse: ver el arreglo siguiente.

### 2026-10-17 — Tarea 31j, octavo arreglo (las url() de las hojas externas)
- Las url() de una hoja se resolvían contra la página, no contra la hoja: `url(images/head-brand-logo.svg)` en
  img.weblogssl.com/css/xataka/... se pedía a www.xataka.com/images/... (404). Afecta a cualquier web con
  imágenes de fondo con rutas relativas en una hoja externa. Ahora `_estilo_agregar` reescribe las url()
  relativas de cada hoja (también las de @import, con su propia dirección) a direcciones completas; data: y #
  se quedan como están.
- Caso nuevo en `test_estilo_capas`.
- Base: 49/49.
- Comprobado contra Chrome (f589209): el logo SVG de xataka ya sale, pero sobre un cuadro negro (sin su
  transparencia). Sospecha en el runtime de Dash: `_dash_image_scale` escala la máscara con el BytesPerRow del
  bitmap de colores, que en RTG (16 bits) no es el de la máscara de 1 bit. Encargado a la otra sesión (D50).
  trainalong: igual que antes (le faltan la curva de fondo y sus letras de @font-face).

### 2026-10-17 — Tarea 31j, noveno arreglo (los @media con un rango; el menú de amigang)
- Traza de amigang (tools/traza.py): en la columna del menú quedaba el botón del menú del móvil (541 px) y el menú
  se encogía a 176 px. Ese botón se esconde con `@media (min-width:768px) and (max-width:1023px)`, pero al leer
  la hoja `_css_media_posible` tiraba los @media que no valen con ningún ancho de 320, 640, 1024 y 1920, y un rango
  de tableta no contiene ninguno: sus reglas se perdían a cualquier ancho. Afecta a cualquier web con un rango
  así (Bootstrap md, WordPress...). Ahora se prueban también los anchos que nombra la consulta (y el de al lado;
  em a 16 px).
- Caso nuevo en `test_estilo_capas`.
- Base: 49/49.

### 2026-10-17 — Tarea 31j, décimo arreglo (imágenes y SVG absolutos; position: fixed)
- trainalong pinta su curva de fondo con un <svg class="trazos"> en position: fixed (right: -8vw; bottom: -6vh;
  width: min(1100px, 120vw)). Traza: salía como un bloque de 940x0. Una <img> o un <svg> con position absolute o
  fixed se maquetaba como un bloque sin contenido (no salía nunca); ahora `_absoluto_imagen` lo pone a su tamaño
  (el del CSS, o el suyo, con la proporción) en su sitio, con su z-index. Y position: fixed va respecto a la
  ventana (0, 0, estilo_vw x estilo_vh: la de arriba del todo; al desplazar la página no se queda quieto).
- Casos nuevos en `test_maqueta_transform`.
- Base: 49/49 (con D50 en Dash, 3dff061).
- Comprobado contra Chrome (29231ab, con D50): xataka ya tiene su logo SVG con transparencia, como Chrome;
  amigang, su menú en una fila sobre la cabecera oscura (sin el título "Amiga Community", que queda tapado);
  trainalong, la curva (solo la de lima, rayada, y más arriba que en Chrome: falta la segunda y su sitio exacto).

### 2026-10-17 — Tarea 31h, primer paso (una fuente TTF hecha TextFont del Amiga)
- Plan de la 31h: (1) TTF a fuente del Amiga; (2) leer @font-face (familia, src con format, peso, estilo) y bajar
  las fuentes (ttf/otf; woff con el inflate de zlib; woff2 necesita Brotli: más adelante; a Google Fonts, con un
  User-Agent al que sirva TTF); (3) que la maqueta use la fuente de la web cuando el font-family la nombra.
- Paso 1: `lib/fuente_web.dash`. stb_truetype (third_party/stb/stb_truetype.h v1.26, dominio público; en
  build/img-lib/libimg.a con tools/build_img.sh) rasteriza los caracteres de Latin-1 (32-255 y uno para los que
  falten) al tamaño del em y se monta un `struct TextFont` en memoria (un solo AllocVec: tablas CharLoc,
  CharSpace y CharKern y un plano de 1 bit, umbral 112 de 255). Es lo que esperan font_use, font_text_width y
  Text(): el pintor no cambia. `fuente_web_liberar` (nunca font_close).
- Test `test_fuente_web` con Bitstream Vera Sans Mono (tests/pages/VeraMono.ttf, sin modificar, con su
  licencia en VeraMono.LICENSE): alto 24 a 20 px, monoespaciada de 12, un fichero que no es fuente da 0, y
  pintada pone tinta.
- Base: 50/50.

### 2026-10-17 — Tarea 31h, segundo paso (@font-face en las hojas; WOFF)
- lib/css.dash lee cada @font-face como una `CaraFuente` (familia en minúsculas y sin comillas, src, peso
  100-900 y estilo) y `css_fuente_src` elige del src el primero que se sabe leer: TrueType, OpenType o WOFF,
  por su format() o por la extensión (sin contar ?...); ni woff2 ni local(). lib/estilo.dash deja completas las
  url() de esos src (respecto a la hoja) y `estilo_caras` las junta todas.
- lib/fuente_web.dash lee también WOFF 1.0 (rehace la fuente TrueType: cada tabla descomprimida con el inflate
  de stb_image si vino con zlib).
- El servidor de pruebas sirve /woff/<nombre>.woff hecho al vuelo del .ttf de tests/pages (no se guarda una
  copia convertida de la fuente). `test_fuente_web` con WOFF y con dos @font-face.
- Falta (paso 3): bajarlas al cargar la página y que la maqueta las use cuando el font-family las nombra.
- Base: 50/50.

### 2026-10-17 — El indicador de actividad y la barra de progreso (lo pide el usuario)
- El indicador de carga (ocho puntos que giraban, diez repintados de MUI por segundo mientras cargaba) era caro
  en el Amiga: ahora es un punto quieto que solo se pinta al empezar y al acabar.
- La barra de progreso (abajo a la derecha, junto al estado) solo se veía mientras llegaba el HTML: ahora, con
  la página puesta, sigue a la vista mientras faltan imágenes y avanza con las llegadas sobre las pedidas.
- Base: 50/50.

### 2026-10-17 — Tarea 31h, tercer paso (bajar las fuentes y usarlas)
- Las fuentes van por la cola de las imágenes (lib/imagenes.dash, 4 descargas a la vez, sin parar la ventana):
  `imagenes_pedir_fuentes` pide hasta 8 de los @font-face (lo que elige css_fuente_src) y, al llegar, una
  `Pedida` con `fuente` no se decodifica: se registra (`fuente_web_registrar`, "familia|peso|estilo" -> fichero)
  y cuenta como cambio de maqueta (las letras cambian de ancho). lib/documento.dash las pide junto a las imágenes.
- `fuente_web_para(font-family, peso, estilo, tamaño)`: la primera familia de la lista que tenga fuente, con el
  peso más cercano (y del mismo estilo si hay); cada fichero y tamaño se hace TextFont una vez. La maqueta la
  mira antes que las fuentes del Amiga (lo elegido se guarda con fuentes_web_version: al llegar otra, se vuelve
  a elegir). De momento pide siempre 400 normal (la negrita y la cursiva las pone el sistema, como antes).
- Lo que no: WOFF2 (Brotli) ni TTF con contornos CFF (OTF "OTTO": stb_truetype los lee, pero sin probar); las
  fuentes hechas no se liberan al cambiar de página. trainalong solo trae WOFF2: seguirá sin sus letras.
- Caso nuevo en `test_fuente_web` (una fuente registrada cambia el ancho del texto en la maqueta).
- Base: 50/50.
- Google Fonts da a dashweb ("dashweb/0.1 (AmigaOS)") las fuentes en TTF (format('truetype')), no en WOFF2: las
  webs con Google Fonts ya pueden tener sus letras sin Brotli.
- Ojo: build/ no va a git. Tras traer el commit de la 31h (1) hay que ejecutar `tools/build_img.sh` en cada árbol
  (en dashweb-w faltaba stb_truetype.h y dashweb no compilaba: la comparación salió sin capturas de dashweb).
- Comprobado contra Chrome (d2c4778): amigang ya sale con las letras de Google Fonts (el menú en mayúsculas de
  Muli, el logo); freemem.space, parecida. Sigue en amigang la imagen de la cabecera, más grande que en Chrome.

### 2026-10-17 — Tarea 31q, primer paso (el cálculo de las animaciones)
- lib/css.dash guarda ahora todos los fotogramas de cada @keyframes (`Fotograma`: sitio por mil y
  declaraciones, en orden; "0%, 100%" da dos) y lib/estilo.dash los junta en `Hojas.cuadros`.
- lib/animacion.dash (nuevo): `animaciones_de(nodo, hojas)` lee animation (y -webkit-) y las sueltas
  animation-name, -duration, -delay, -iteration-count, -direction, -fill-mode, -timing-function (listas con
  comas, en vuelta si son cortas); `animacion_progreso(a, ms)` dice en qué punto (0-1000) va: nada antes del
  retardo sin backwards ni acabada sin forwards, direction con sus vueltas, y la función de tiempo (linear, ease,
  ease-in/out, cubic-bezier por bisección en enteros, steps y step-start/end); `animacion_valor(a, propiedad, p)`
  interpola entre los dos fotogramas que la tienen (sin fotograma en 0 o 1000, el valor del propio elemento):
  colores por canales (y su alfa) y, si no, los números de dentro con el mismo texto alrededor (opacity,
  translateX(-20px), stroke-dashoffset...).
- Test `test_animacion`. Falta: aplicarlo a lo dibujado y el reloj (paso 2).
- Base: 51/51.

### 2026-10-17 — Tarea 31q, segundo paso (a): las animaciones sobre lo dibujado
- La maqueta marca lo que dibuja un elemento con animation (`Dibujo.anim`; el más de dentro se queda el suyo) y
  `maqueta_desplazamiento` da lo que mueven los translate de un transform (% de la caja del elemento).
- lib/animacion.dash: `animaciones_pagina(página, hojas)` junta las de los elementos marcados; `animar(página,
  animaciones, ms)` es un fotograma: guarda la primera vez dónde estaba cada dibujo (bx, by), mueve lo de cada
  elemento lo que digan sus translate en ese instante (con su recorte) y lo vela si su opacity baja de 0,5 (el
  pintor no pinta lo velado: no mezcla texto); dice si queda alguna viva.
- Un elemento que la 31m deja con opacity 0 (acaba invisible) no se dibuja y no se anima: lo normal, aparecer
  (opacity 0 y una animación a 1 con forwards), sí.
- Casos nuevos en `test_animacion`. Falta (b): el reloj en dashweb y repintar solo lo que cambia.
- Base: 51/51.

### 2026-10-17 — Una imagen abierta sola (lo vio el usuario)
- Al pulsar en una foto que enlaza a su .jpg, dashweb pintaba los bytes del JPEG como texto: todo lo que llegaba
  se trataba como HTML. Ahora lib/documento.dash mira el Content-Type (o, sin él, la extensión): una imagen da una
  página que la muestra centrada sobre fondo oscuro (como Chrome), con su nombre de título; un vídeo, un
  <video controls>; text/plain, un <pre>. El servidor de pruebas da image/jpeg, text/plain y font/ttf.
- Test `test_documento_tipo`.
- Comparado el artículo https://freemem.space/s4a-robotica-para-ninos/ con Chrome a 940 px: la foto del texto sale
  a su tamaño (500x375), pero faltaba la foto destacada de arriba. Una <img> (o <svg>) con display: block no se
  dibujaba nunca (se maquetaba como una caja sin contenido): ahora `_imagen_en_bloque` la pone como una línea con
  ella (con el enlace del <a> de fuera). Caso nuevo en `test_maqueta_transform`. En la ventana más ancha del
  usuario la foto del texto salía a 904x578: sin reproducir aún (a 940 px va bien).
- Base: 52/52.

### 2026-10-17 — Tarea 33, primera medida (perfil de freemem.space)
- `medir_visor --perfil` con freemem.space en la máquina RTG (128 s): sin contar la espera, lo que más pesa es
  pintar: `_mezcla_recortada` (gfx_blend_rect: cajas con fondo semitransparente) 29,9 % con solo 46 llamadas y
  `_degradado_pintar` (gfx_gradient_rect) 6,9 %; la cascada de CSS (`_estilo_nodo`) un 8 %; JavaScript un 3 %;
  red y TLS un 5 %. Causa: en pantallas de color directo el runtime de Dash mezcla píxel a píxel (una lectura y
  una escritura de la librería por píxel). Encargado a la otra sesión (D51): mezcla por bloques con
  p96ReadPixelArray/p96WritePixelArray. Siguiente: medir cuántas veces se maqueta y se pinta la página entera.

### 2026-10-17 — El paquete y la versión alfa
- tools/paquete.sh mete ya todas las licencias de lo que va dentro (libwebp, nanosvg, MintVID, TJpgDec y la
  nota de stb, además de dashweb, QuickJS y fdlibm). El LEEME dice lo que de verdad hace falta: AmigaOS 3.2 (o
  3.5/3.9: las imágenes usan picture.datatype V43), un 68020 con FPU o un 040/060, memoria Fast (decenas de MB
  para las webs de hoy), MUI, una pila TCP/IP y AmiSSL; y el indicador nuevo y la barra de progreso.
- El usuario quiere publicar una alfa en GitHub: v0.1.0-alfa (pre-release sobre dev, con dashweb.lha), después
  del arreglo de velocidad de la mezcla (D51), medido.

### 2026-10-17 — Tarea 33, primer arreglo (los selectores de dentro de :not(), :is(), :has())
- El perfil daba 118.000 llamadas a css_selector al aplicar el estilo de freemem.space: las listas de :not(),
  :is()/:where() y :has() se volvían a leer cada vez que se miraba un elemento. Ahora `_selectores_de` las lee una
  vez por texto y las guarda. Del reparto de la carga (128 s): pintar ~70 % (la mezcla lenta, D51), estilo ~19 s
  (3 veces: la de JavaScript lo repite), imágenes ~15 s, red ~12 s, JavaScript ~7 s; maquetar, poco (5 veces).
- Base: 52/52.

### 2026-10-17 — Tarea 33, segundo arreglo (no repintar por imágenes que no se ven)
- Mientras llegaban imágenes, la página entera se repintaba (22 veces en freemem.space, con sus mezclas). Ahora
  lib/imagenes.dash apunta los src llegados (`Imagenes.recien`) y `documento_imagenes_visibles(d, desde, alto)`
  solo pide repintar si alguna de ellas se dibuja en lo que se ve, si se volvió a maquetar
  (`Documento.remaquetada`) o si ya no falta ninguna; las de más abajo se ven al desplazar. Caso nuevo en
  `test_documento_tipo`.

### 2026-10-17 — Tarea 34 (instalador e iconos)
- tools/iconos_wb.py hace los iconos de Workbench (.info clásicos, DiskObject con dos planos: los 4 colores del
  Workbench, de 3.0 a 3.2) del cajón, dashweb y el visor (herramientas, pila 64 KB), el LEEME (proyecto, se abre
  con SYS:Utilities/MultiView) e Instalar (proyecto del Installer, APPNAME=dashweb).
- paquete/Instalar: guion del Installer del sistema (3.1 a 3.2): avisa (y deja seguir) si falta FPU, MUI,
  AmiSSL, bsdsocket.library o picture.datatype V43, pregunta dónde y copia el cajón con sus iconos.
- tools/paquete.sh: los iconos, el instalador y el LEEME en Latin-1 (el Installer y MultiView no leen UTF-8);
  tools/lha_lh0.py acepta varias rutas (el cajón y su dashweb.info al lado). build/dashweb.lha: 5,7 MB.
- Para que el usuario lo pruebe en su CoffinOS (Amiberry): el paquete en ~/Amiberry/LHA, montado en
  Configurations/coffin.uae como Traspaso: (copia de la configuración en coffin.uae.antes-traspaso).
- Sin probar aún en un Amiga: los iconos y el guion.

### 2026-10-17 — Tarea 33, medida con D51
- Con D51 (mezcla por bloques en el runtime de Dash, e7c81d0 de la rama dashweb) y el arreglo de los selectores,
  sin el de las imágenes que no se ven: freemem.space entera en 47 s (antes 128 s). `_mezcla_recortada` baja de
  29,9 % a 0,4 % y `_degradado_pintar` de 6,9 % a 0,2 %. Ahora casi todo es espera (Main propio 80 %: red y
  temporizadores); de lo demás, red y TLS 5,7 %, JavaScript 3,3 %, decodificar imágenes 2,6 %, la cascada 3,1 %.

### 2026-10-17 — Direcciones file:// como las de NetSurf
- El usuario abrió en CoffinOS `file:///Programs/Network/NetSurf/Resources/en/welcome.html` y salió «Inserte
  volumen file»: el documento leía la dirección tal cual, y las hojas, scripts e imágenes solo quitaban la "/"
  (`Programs/Network/...`, relativa). Ahora `url_fichero` (lib/url.dash) da la ruta del Amiga: el primer trozo es
  el volumen (`Programs:Network/...`, como NetSurf), sigue valiendo `file:///DH0:a.html`, admite
  `file://localhost/` y `file://Volumen/`, y deshace los %XX (los de UTF-8 a Latin-1). La usan documento,
  estilo, recursos, jsdom e imágenes (eran cuatro copias del mismo código). Casos nuevos en `test_url`.
- Arreglado también `test_documento_tipo` (dos variables con el mismo nombre: la batería anterior dio 51/52).
- Base (con el repintado de solo lo visible): 52/52.

### 2026-10-17 — Tarea 33b (gzip)
- lib/http.dash pide `Accept-Encoding: gzip, deflate` para los textos (lo que va a un fichero, identity: imágenes,
  vídeo y fuentes ya vienen comprimidos y http_parcial necesita los bytes tal cual). El cuerpo comprimido se junta
  en bytes (`Bytes`, `red_juntar` en lib/red.dash: un texto cambiaría sus bytes 0) y se descomprime con el inflate
  de stb_image (`_http_inflar`: gzip con su cabecera, deflate con zlib o sin cabecera). Test nuevo
  `test_http_gzip` (servidor: /comprimido/<modo> y /acepta), con y sin esperar, también en trozos.
- Medida: freemem.space entera en 47,0 s (antes 47,1 s). `red_recibir_ya` baja de 3,4 % a 2,9 % del perfil, pero
  el total no cambia: los bytes no eran el freno. Ojo al leer los perfiles: cubren los 200 s de la medida, así
  que el 80 % de Main es sobre todo la espera después de cargar. En los 47 s de carga lo que pesa es: JavaScript
  ~8 s, recibir (TLS) ~7 s, decodificar imágenes ~6 s, abrir conexiones (TLS) ~5 s, la cascada ~7 s. Que el
  total no se mueva ni un poco apunta a algo que espera un tiempo fijo: siguiente, una línea de tiempo de la carga.

### 2026-10-17 — Tarea 33, la línea de tiempo de la carga
- lib/traza.dash: con el argumento TRAZA (`tools/medir_visor.py --traza`) dashweb saca cada paso con sus ms:
  pedir, enviar (y si la conexión se reusó), llegar (estado, bytes, ms) de cada descarga; scripts, estilo,
  maqueta, pintado, temporizadores del JavaScript y lo que rehacen, y cada imagen decodificada.
- freemem.space (45 s en la máquina RTG): HTML y recursos hasta 4 s; scripts 7 s (hasta 11 s); estilo 3,7 s;
  maqueta 1 s; primera pintada a los 16 s. Luego los temporizadores del JavaScript cambian la página dos veces y
  cada una rehace el estilo entero y la maqueta: 2,7 s y 4 s. Las fuentes: 4 pesos de Inter de Google Fonts
  (325 KB cada uno: el TTF entero, con todos los alfabetos) y 4 de Font Awesome (700 KB), 1,3 MB en total.
- Las imágenes esperaban en la misma cola detrás de las 8 fuentes: empezaban a bajarse a los 28 s. Ahora las
  fuentes tienen sus propias descargas (`FUENTES_A_LA_VEZ = 2`) y las imágenes llegan desde los 22 s. El total
  no cambia (44,8 s): la máquina va al 100 % todo el rato y todo compite por el procesador (TLS de las descargas,
  estilo, maqueta, decodificar). Probado también decodificar con prioridad 0 en vez de -1: se decodifican antes
  pero las descargas van más lentas; el total igual (45,5 s), así que se queda en -1 (la ventana responde mejor).
- Conclusión: para bajar el total hay que quitar trabajo. Por orden de lo que se ahorraría: (1) volver a calcular
  el estilo solo de lo que cambió el JavaScript (~6 s); (2) WOFF2 (31h): Google Fonts lo da en trozos por
  alfabeto, ~25 KB por peso en vez de 325 KB; (3) el primer estilo (3,7 s); (4) image_from_rgb en el proceso
  principal (~6 s en total); (5) JavaScript (7 s).

### 2026-10-17 — Tarea 33, el estilo solo de lo que cambia el JavaScript
- Antes, cualquier cambio del JavaScript rehacía la cascada entera. Ahora lib/jsdom.dash apunta cada cambio en el
  documento (`Toque` en lib/dom.dash: un atributo con su valor de antes y de después, un elemento que entra, sale,
  sus vecinos, o los hijos cambiados de golpe) y `estilo_aplicar_partes` rehace solo lo que puede haber cambiado,
  como las "invalidation sets" de los navegadores: al indexar las hojas se apunta qué clases, ids y atributos
  nombra algún selector y, por cada uno que sale antes de la última parte, las claves de esa última parte
  (".menu a" -> "a"). Una clase que nadie nombra no cambia nada; si la nombran, el elemento solo, y si su estilo
  cambió, todo lo suyo; si no, solo los de debajo con alguna de esas claves. Con + o ~, todo el padre; con :has(),
  todo. `_estilo_nodo` se parte en `_estilo_propio` (el elemento) y sus hijos; Nodo.vars guarda las --x de cada uno.
- freemem.space: el JavaScript mete el sticky-header (6 cambios) y luego pone la clase sld-plus en <body>. La
  cascada de esos cambios pasa de ~1,8 s y ~3 s a 0,15 s y 0,05 s; la página entera, de 44,7 s a 41,7 s. Lo que
  queda de cada vuelta es maquetar otra vez y volver a buscar las imágenes (0,9 s y 2,5 s).
- Dash: `x = d[k]` con d un diccionario de diccionarios pierde el tipo del valor (un `for k in x.keys()` da
  claves Int y "Dictionary keys are Strings"): se declara `var x: {String: Int} = d[k]`.
- Test nuevo `test_estilo_partes`: tras cambios de clases, un elemento nuevo delante de otro, una variable de CSS
  y una clase en <body> que nombran ".z li" y ".z", lo hecho por partes es igual que rehacerlo todo.
- Lo que entra directamente en <html> (el <div> con que se mide la barra de desplazamiento) ya no obliga a
  rehacerlo todo aunque haya :nth-child en las hojas. La traza dice también cuánto tarda buscar las imágenes tras
  cada cambio: en la segunda vuelta de freemem.space, 1,5 s (siguiente cosa a mirar).
- Base: 54/54.

### 2026-10-17 — Tarea 33, los vecinos de lo que entra en <html>
- A veces (según cuándo llega el temporizador) el <div> con que jQuery mide la barra de desplazamiento sigue en
  <html> cuando se rehace el estilo: <body> salía como su vecino y, con selectores de hermanos en las hojas, se
  rehacía entero (1,9 s). Lo que entra directamente en <html> ya no toca a sus vecinos (head y body).
- La traza separa buscar las imágenes (15-20 ms) de avanzar las que llegan (lo de 1,5 s era eso: fuentes e
  imágenes que llegaban justo entonces, trabajo que hay que hacer igual).
- freemem.space: 41,2 s y 42,2 s en dos medidas (el estilo de cada vuelta del JavaScript, 0,16 s y 0,05 s).
  Tests de estilo y jsdom: 10/10.

### 2026-10-17 — Tarea 33, menos bytes de fuentes
- Google Fonts da el TTF entero (Inter: 325 KB por peso, todos los alfabetos). `url_fuentes_latin1` (lib/url.dash)
  añade a las hojas de fonts.googleapis.com/css y /css2 un `text=` con los caracteres que dashweb sabe pintar
  (Latin-1 32-126 y 160-255): Google devuelve solo esos, 53 KB por peso. Lo usan recursos.dash y los @import.
- Las fuentes de iconos ya no se bajan (`imagenes_fuente_de_iconos`: Font Awesome, dashicons, Material Icons...):
  sus letras están fuera de Latin-1, que es lo único que lee lib/fuente_web.dash, y los iconos los dibuja el
  pintor (D_ICONO). En freemem.space eran 700 KB.
- freemem.space: de 41-42 s a 39 s con las fuentes reducidas y a 37,7 s sin las de iconos. Tests: test_url y
  test_documento_tipo (casos nuevos). Base (con D53 de Dash): 54/54.

### 2026-10-17 — Tarea 33, imágenes perezosas y fondos sin pintar
- Como los navegadores: una <img loading=lazy> no se baja hasta que está a menos de dos pantallas de lo que se
  ve (`Imagenes.hasta`, que pone dashweb al pintar y al desplazar; `Imagenes.posiciones`: la y de cada src en la
  última maqueta), y un background-image no se baja hasta que alguna maqueta lo pinta (las diapositivas ocultas
  de un carrusel, lo que tiene display: none). Mientras, esas pedidas no cuentan en `imagenes_pendientes` (así
  no hay tic cada 50 ms esperando algo que no se va a pedir); al desplazar, dashweb vuelve a programar el tic.
- freemem.space: entera en 31,4 s (antes 37,7 s): 10 imágenes en vez de 18; la captura, igual que antes.
- Probado desplazando con clics en la barra (`medir_visor --acciones`): al bajar se piden las perezosas que
  quedan cerca (Captura de 2018, reportaje9gr, IMG_2014..., github...) y se ven en su sitio.
- Base: 52/54 en la batería, con la otra sesión usando la red de pruebas a la vez (había un servidor suyo en el
  40841); test_documento_tipo y test_formularios_post solos, 2/2.

### 2026-10-17 — Tarea 33, sin scripts de rastreo
- `url_rastreador` (lib/url.dash): los <script src> de estadísticas, publicidad y rastreo (Google Tag Manager y
  Analytics, DoubleClick, AdSense, Facebook, Hotjar, Clarity, TikTok, stats.wp.com, Taboola, Criteo...) no se
  bajan ni se ejecutan (recursos.dash los da por traídos y vacíos; jsdom no los trae). En freemem.space,
  googletagmanager.com/gtag/js son 465 KB: los scripts pasan de 7 s a 1,1 s y la página entera de 31,4 s a 24,7 s.
  No cambian la página (el gtag() de la página solo apunta en dataLayer). Decisión de diseño: avisado al usuario.
- Tests: test_url (casos nuevos), jsdom, js, recursos y estilo: 16/16 (la red de pruebas la tenía la otra sesión).

### 2026-10-17 — Tarea 33, las fuentes de una vez; un cierre de dashweb sin aviso
- Con las fuentes ya pequeñas, `FUENTES_A_LA_VEZ = 4`: las 4 de Inter llegan juntas y la página se vuelve a
  maquetar una vez por ellas, no dos (0,65 s menos). freemem.space: 21,4-22 s.
- Otra traza: `maquetada otra vez por N imágenes o fuentes`. medir_visor tiene `--memcheck` (una carga de
  freemem.space con memcheck: errores 0).
- Dos de unas 15 medidas acabaron con dashweb cerrado a los 9,5 s (justo tras la primera pintada, en los
  temporizadores del JavaScript) y "returncode 127", que es el abort() de libnix: QuickJS se para con assert() o
  abort() (71 abort en su código), sin decir nada visible. No se ha vuelto a dar en 12 intentos más. lib/js.dash
  pone ahora su propio `__assert_func` y `abort` que escriben dónde fallan (fichero, línea, función) por la
  salida antes de salir: la próxima vez se sabrá. Pendiente.
- Encargado a la otra sesión: D54 (image_from_rgb en RTG sin picture.datatype: 11 % del tiempo, 0,4 s por imagen)
  y D55 (reusar la sesión TLS por servidor: la negociación es otro 10 %).

### 2026-10-18 — Un fallo del recolector de QuickJS; el bloqueo de rastreo, apagado
- El cierre de dashweb con "returncode 127" es un assert de QuickJS: `js_rc(p)->ref_count > 0` en
  `gc_decref_child` (quickjs.c:6727), al pasar el recolector de ciclos durante los temporizadores del JavaScript,
  justo tras la primera pintada de freemem.space. Algún objeto tiene menos referencias de las que le apuntan: una
  referencia de menos en algún sitio (el C de lib/jsdom.dash o lib/js.dash revisado: no se ve; o memoria pisada).
- Sale con el bloqueo de scripts de rastreo: 3 de 17 cargas; sin bloqueo, 0 de 10. Sustituir gtag.js por un
  script que vacía dataLayer.push no lo arregla (2 de 14). Una prueba aislada con arguments en dataLayer y
  JS_RunGC no lo reproduce. Lo más probable: el fallo está ahí siempre y sin los 7 s de gtag.js el recolector
  pasa en otro momento. Hasta encontrarlo, `URL_RASTREO_BLOQUEAR = false` (lib/url.dash): freemem.space vuelve a
  unos 28 s.
- lib/js.dash pone su propio `__assert_func` y `abort`: escriben el fichero, la línea y la función por la salida
  (antes solo "Program aborted", y el assert iba a stderr).
- Pendiente (prioridad): reproducirlo a voluntad (un modo que llame a JS_RunGC tras cada script y temporizador)
  y buscar la referencia que falta; después, volver a encender el bloqueo.
- Encargos hechos por la otra sesión, aún en su rama tlssess: D54 (image_from_rgb en RTG: 120 -> 5 ms) y D55
  (sesión TLS reanudada; con TLS 1.3 ahorra poco: 9,0 -> 7,9 s; para reanudar hay que abrir primero una conexión
  y esperar a su primera lectura).
- Más pruebas del fallo de QuickJS (con el bloqueo encendido a mano, 14 cargas cada una):
  - `GCSIEMPRE` (argumento de dashweb; `medir_visor --gc-siempre`; `js_gc_siempre` en lib/js.dash): el
    recolector tras cada script, llamada y trabajo. No lo reproduce (2 cargas con bloqueo y 2 sin él, limpias): el
    recolector falla cuando salta solo, a mitad de algo, no entre script y script.
  - Sin los procesos que decodifican las imágenes (todo en el principal): 1 de 14, y esta vez abort() en vez del
    assert, después de los scripts. No es que esos procesos pisen memoria a la vez.
  - Hay que tomar con cuidado el 0 de 10 sin bloqueo: con un fallo de ~10 % por carga, 10 limpias seguidas salen
    una vez de cada tres. Se repite con 14 más.
  - Sin bloqueo (lo publicado, c60f2d0): 0 de 14 más, 0 de 24 en total (28,4-34,2 s). Con bloqueo, 6 de 59. Con un
    10 % por carga, 24 limpias seguidas saldrían 8 de cada 100 veces: sin bloqueo se puede dar por estable en
    freemem.space. El fallo de QuickJS sigue sin encontrar (pendiente, antes de volver a encender el bloqueo).

### 2026-10-18 — Tarea 35a (cookies HTTP)
- lib/cookies.dash (nuevo): el tarro de cookies (RFC 6265, lo que usan las webs). Set-Cookie con Domain (el host o
  un padre suyo con punto; sin Domain, solo ese host), Path (por defecto, la carpeta de la petición), Expires
  (fechas de los tres formatos; dos cifras: 70-99 son 19xx) y Max-Age (gana a Expires; 0 o menos borra), Secure
  (solo se recibe y se manda por https) y HttpOnly (document.cookie no la ve ni la pisa). La misma (nombre,
  dominio, ruta) se reemplaza. Se mandan las de ruta más larga primero. Hasta 300. La hora: DateStamp del Amiga
  (`cookies_ahora`, segundos desde 1970); un Int llega hasta 2038 (lo que caduca después, en enero de 2038).
- lib/http.dash: cada Set-Cookie va a `Respuesta.set_cookies` (no se juntan con comas: Expires lleva una), al
  tarro al leer la respuesta (también en las redirecciones: un inicio de sesión que redirige), y la cabecera
  Cookie en cada petición.
- document.cookie (lib/jsdom_preludio.js): lee y pone en el mismo tarro (`__dashweb_galletas`,
  `__dashweb_galleta`), sin las HttpOnly. Antes era un diccionario solo del JavaScript.
- dashweb guarda las que duran en PROGDIR:dashweb.cookies al salir y las carga al empezar.
- Test nuevo `test_cookies` (servidor: /galletas/dar, /galletas/borrar, /galletas/salto, /galletas/ver).
- Pendiente: el usuario no tiene aún forma de ver ni borrar las cookies (una página dashweb:cookies).
- Base: la batería dio 45/54 con la otra sesión pasando la suya de dashweb a la vez (mismos puertos: el test de
  conexiones vio la 4.ª en vez de la 1.ª); las que fallaron, solas y con D54/D55 ya en la rama dashweb de Dash,
  9/9; test_cookies, 1/1. Cerrado un lineas.py mío (40841) que llevaba suelto desde el día 17.

### 2026-10-18 — Medida con D54 y D55
- Con D54 (image_from_rgb en RTG con p96WritePixelArray) y D55 (sesión TLS guardada por servidor) en la rama
  dashweb de Dash: freemem.space entera en 28,8 y 29,1 s (antes 28,4-34,2 s): sin cambio que se note, la página
  sale igual. D55 solo ahorra si se abre primero una conexión a cada servidor y las demás esperan a su primera
  lectura (dashweb abre hasta 4+4 a la vez); con TLS 1.3 la reanudación repite el intercambio de claves y el
  ahorro es pequeño (9,0 -> 7,9 s por conexión en el A1200): no se ha hecho.
- Lo siguiente que más pesaría: el fallo del recolector de QuickJS (para volver a quitar los scripts de rastreo,
  ~6 s en freemem.space), el primer estilo (3,7 s) y las maquetas (1 s cada una).
- dashweb:cookies (enlazada desde la página de inicio, con los marcadores): las guardadas con su dominio, valor,
  caducidad, https y HttpOnly; "dashweb:cookies?borrar" las borra todas y "?borrar=dominio" las de un dominio
  (`cookies_borrar`, `cookies_html`, `cookies_dia`). Casos nuevos en test_cookies. Sin probar a mano en la ventana.

### 2026-10-18 — El fallo del recolector de QuickJS era de image_from_rgb; bloqueo de rastreo encendido
- Con D54 (image_from_rgb en RTG con p96WritePixelArray, sin picture.datatype) en la rama dashweb de Dash, el
  bloqueo de scripts de rastreo encendido a mano: 0 de 16 cargas con QuickJS instrumentado (escribía qué objeto
  tenía la cuenta a 0 y quién lo apuntaba) y 0 de 16 con el QuickJS de siempre. Antes, 6 de 59 (y también uno
  sin los procesos decodificadores). Con un 10 % por carga, 32 limpias seguidas saldrían 3 de cada 100 veces: el
  camino viejo (picture.datatype en una pantalla RTG, desde el proceso principal) pisaba memoria, y el bloqueo
  solo hacía que las imágenes llegasen mientras el JavaScript seguía vivo. `URL_RASTREO_BLOQUEAR = true` otra vez.
- freemem.space: entera en 20,7-22,3 s (sin bloqueo, 28,4-34,2 s). Tests: test_url, js y recursos, 6/6.
- Ojo: en pantallas de paleta image_from_rgb sigue yendo por picture.datatype. Si allí aparece el mismo assert,
  ya se sabe dónde mirar.

### 2026-10-18 — Tarea 36, Hubbub (hecho, pero aún sin usar para las páginas)
- third_party/hubbub: libhubbub y libparserutils de NetSurf (MIT; versión en VERSION), con lo que generaba su
  construcción ya hecho (entities.inc, aliases.inc, y en lugar de gperf, que no hay, la tabla de element-type
  ordenada: ver su LEEME). tools/build_img.sh los mete en libimg.a (sin iconv, con NDEBUG, sin el optimizador de
  bebbo: -fbbb=-); sus cabeceras quedan en build/img-lib/hubbub. libimg.a pasa de ~400 a 660 KB (solo cuenta en
  los programas que importan lib/html5.dash).
- lib/html5.dash: `dom_desde_html5(texto)` da el mismo tipo de árbol que dom_desde_html. Hubbub llama a funciones
  de C nuestras (crear elemento, texto, comentario, doctype; añadir, insertar antes, quitar, clonar, mudar los
  hijos, el padre, si tiene hijos, añadir atributos); el C guarda el árbol con números de nodo (los textos
  seguidos se juntan, como espera Hubbub) y al acabar Dash lo copia a Nodos (de UTF-8 a Latin-1). Se le da el
  texto ya en Latin-1 ("ISO-8859-1" fijo): lo de <meta charset> queda para cuando se le den los bytes tal cual.
- Test nuevo `test_html5`: <b><i>x</b>z</i> reabre el i fuera del b, el texto suelto de una tabla sale delante,
  un <p> cierra otro, entidades que el viejo no sabía (&hellip;, &rarr;, &amp sin punto y coma), html/head/body,
  atributos sin comillas y el doctype.
- Velocidad (A1200 emulado, la portada de freemem.space, 91 KB): el viejo 13,5 s y 2069 nodos; Hubbub 14,5 s y
  2094 nodos (casi todo es crear los Nodos de Dash, igual en los dos). La batería entera con Hubbub en las
  páginas (documento.dash y el visor): 56/56.
- Pero con Hubbub en las páginas vuelve el assert del recolector de QuickJS en freemem.space: 3 de 26 cargas
  (con el analizador viejo, 0 de 46 desde D54). Compilado en el PC con AddressSanitizer y UBSan (64 y 32 bits),
  Hubbub y el puente no dan ningún error con esa página; sin el optimizador de bebbo, igual (1 de 14). Lo más
  probable: el fallo de QuickJS o de jsdom no lo arregló D54, solo cambió cómo queda el montón de malloc (como
  ahora Hubbub). Por eso documento.dash sigue con dom_desde_html hasta encontrarlo.
- Siguiente: buscar ese fallo a fondo (un uso de memoria ya liberada que depende de lo que haya en el montón).
  Idea: con Hubbub sale 1 de cada 9 cargas: sirve para reproducirlo; en el PC no se puede, porque jsdom es Dash.

### 2026-10-18 — El fallo de QuickJS es memoria pisada (encargado a Dash como D56)
- Con Hubbub en las páginas (sale 1 de cada 6-9 cargas) y QuickJS instrumentado (al saltar el assert escribe el
  hijo, el padre, sus propiedades y sus variables capturadas): el objeto roto es una función de JavaScript cuyo
  array de variables capturadas está lleno de basura (0xebfffbed, 0x7feffffd, 0x7ffffdcf): parecen píxeles de 16
  bits casi blancos (el fondo de freemem.space en la pantalla RTG de 16 bits). Algo escribe píxeles de pantalla
  fuera de su búfer y cae en la memoria de malloc de QuickJS. No es la cuenta de referencias de jsdom.
- Encargado a la otra sesión (D56): revisar las rutinas de Dash que escriben píxeles de pantalla
  (_dash_rgb_draw_scaled, gfx_blend_rect/gfx_gradient_rect por bloques, image_from_rgb directo, el escalado y las
  máscaras) y poner zonas de guarda en sus búferes. Los parches para reproducirlo (Hubbub en documento.dash y la
  instrumentación de QuickJS) están en el scratchpad de esta sesión, no en el repositorio.
- Hasta entonces: el bloqueo de rastreo sigue encendido y documento.dash con el analizador viejo (0 de 46).

### 2026-10-18 — Tarea 35c (descargas)
- Lo que no es una página se guarda: `documento_es_descarga` (lo que no es text/*, image/*, video/* ni XHTML,
  XML, JSON, JavaScript o RSS; o Content-Disposition: attachment; sin Content-Type, por la extensión: .lha, .lzx,
  .zip, .adf, .dms, .pdf...) y `documento_nombre_descarga` (el filename de Content-Disposition o lo último de la
  dirección; `url_fichero_nombre` deshace los %XX y cambia ":" y "/"). dashweb pregunta dónde con el selector de
  ficheros del sistema (dialog_file, para guardar; si se elige un cajón, el nombre de la dirección) y lo baja tal
  cual a ese fichero sin esperar (`http_empezar_a_fichero`, con lo bajado en la barra de estado); la página que
  había se queda. La primera respuesta llegó como texto (los bytes 0 cambian): se pide otra vez.
- Casos nuevos en test_documento_tipo. Sin probar a mano (el selector necesita a alguien delante).
- Dash: dejó hacer `a = Respuesta(...)` con `a` ya Bool en el mismo Main (el test daba un resultado raro, sin
  error al compilar). Apuntado para la otra sesión.
- Ya no se baja dos veces: `http_cabeceras_ya(c)` (lib/http.dash) da estado, cabeceras y tipo en cuanto han
  llegado, sin esperar al cuerpo; dashweb lo mira mientras recibe y, si es una descarga, corta la carga y la
  empieza directamente al fichero. Caso nuevo en test_http_carga (/lento: las cabeceras antes de acabar).
- Pendiente: "Guardar la página" en el menú.

### 2026-10-18 — Cierre al 89 % de uso
- Base de lo publicado (572c407, con D54/D55 y la rama pixguard de Dash sin su macro): 56/56. Paquete rehecho en
  ~/Amiberry/LHA.
- D56: la otra sesión dejó zonas de guarda en los búferes de píxeles de Dash (rama pixguard, e197b1d; se encienden
  con DASH_CFLAGS=-D_DASH_PIXGUARD) y revisó sin encontrar fallo _dash_rgb_draw_native, _dash_blend_block,
  image_from_rgb directo, _dash_img_mask, el TmpRas y el lienzo con doble búfer. Según ella, la basura
  (0xebfffbed...) no casa con #f5f9f8 en R5G6B5: es casi todo unos con ceros sueltos, como una máscara de 1 bit
  de una imagen casi opaca o un plano de bits. Lanzada una caza con PIXGUARD y Hubbub (scratchpad, caza "pix_").
- Para seguir: si sale "PIXGUARD <búfer>", es ese búfer de Dash; si el var_refs roto sale con 0xDEADBEEF, QuickJS
  usa memoria que Dash soltó; si no sale nada, mirar las escrituras de Picasso96 en bitmaps o QuickJS.
- Pendiente del usuario: publicar la alfa v0.1.0-alfa y si se quedan bloqueados los scripts de rastreo.
- Caza con PIXGUARD (zonas de guarda en todos los búferes de píxeles de Dash) y Hubbub: falla en la 6.ª carga con
  otro assert de QuickJS (`js_rc(p)->mark == 0` en gc_decref: la lista de objetos del recolector o la cabecera
  de un objeto, pisadas) y sin ningún aviso PIXGUARD. No son los búferes de píxeles de Dash. Quedan: lo que
  Picasso96 y picture.datatype escriben en bitmaps y máscaras, los decodificadores (stb, tjpgd, libwebp, nanosvg)
  en sus búferes de malloc, y el propio QuickJS en 68k. Siguiente idea: guardas en cada bloque que pide QuickJS
  (JS_NewRuntime2 con funciones de memoria propias), que al liberar digan qué se escribió encima.
- lib/js.dash tiene ahora `_JS_GUARDAS` (DASH_CFLAGS=-D_JS_GUARDAS; apagado no cambia nada): QuickJS pide la
  memoria con funciones propias (JS_NewRuntime2) que ponen 16 bytes de cabecera (tamaño, lista, magia) y 16 de
  0x5A detrás de cada bloque, los revisan todos tras cada script, llamada y trabajo, y rellenan con 0xDB lo que
  se libera. Dos cazas (con Hubbub): el assert sale (2.ª y 4.ª carga) sin ningún aviso de guarda pisada: nadie
  escribe fuera de los bloques de QuickJS desde fuera. En la segunda, con la instrumentación de quickjs.c, el
  objeto "padre" es él mismo basura: su shape tiene nombres de propiedad imposibles, salvo constructor y deref
  (el prototipo de WeakRef), y su home_object y var_refs están liberados. Lo más probable ya no es memoria pisada
  sino un objeto liberado que sigue en la lista del recolector (algo de QuickJS: quizá WeakRef/FinalizationRegistry
  o el ciclo de vida de los objetos de jsdom), que solo se ve según cómo queda el montón.
- Para seguir (la próxima sesión): (1) mirar si el QuickJS de third_party (CONFIG_VERSION 2026-06-04) tiene
  arreglos posteriores del recolector o de WeakRef; (2) probar a quitar WeakRef/FinalizationRegistry del contexto
  (o no tocar weak refs en el preludio) y repetir la caza con Hubbub; (3) instrumentar free_object para guardar la
  dirección de los últimos objetos liberados y, al saltar el assert, ver si el "padre" está entre ellos.
- Descartado el relleno de áreas (TmpRas de graphics.library): sin ningún gfx_circle_fill, gfx_ellipse_fill ni
  polígono (ni el punto del indicador), con Hubbub, falla 2 de 30. La basura cambia de una vez a otra (máscaras,
  atoms imposibles): encaja con un objeto de QuickJS liberado mientras algo aún lo apunta, cuya memoria reutiliza
  luego otro (Hubbub, o antes el camino viejo de las imágenes). Siguiente: cuarentena de bloques liberados.
- Cuarentena (en `_JS_GUARDAS`: lo que libera QuickJS se rellena de 0xDB y no vuelve a malloc hasta pasar de
  12 MB, los más viejos primero), con Hubbub: 0 de 30 cargas (sin ella, ~1 de cada 6: saldrían limpias 30 seguidas
  4 de cada 1000 veces). Y QuickJS no tocó ningún bloque en cuarentena (habría saltado con cuentas 0xDBDBDBDB).
  Conclusión: no es QuickJS usando memoria suya ya liberada, sino otro que escribe en memoria que él soltó
  cuando ya es de QuickJS (si QuickJS no reutiliza enseguida, el que escribe cae en memoria de nadie). Quién: algo
  del proceso principal o de los procesos de las imágenes que libere un búfer y siga escribiendo en él; libnix
  (malloc/free/realloc con semáforo, revisado) parece bien. Ojo: AllocVec y los bloques grandes de libnix
  (AllocMem de __MEMORY_STEP) salen de la misma memoria del sistema: un búfer de AllocVec liberado puede acabar
  dentro de un bloque de malloc de QuickJS.
- Arreglo provisional posible: dejar la cuarentena encendida en dashweb (12 MB de memoria; el tiempo de
  freemem.space no cambia: 21-22 s). No se ha hecho: esconde el fallo. Siguiente: buscar quién escribe tarde
  (los procesos decodificadores al cancelar una página, las máscaras e imágenes que se liberan mientras se
  pintan, los mapas de bits de las imágenes escaladas).
- Cazado en el acto (cuarentena que comprueba su relleno 0xDB en cada revisión y al soltar): en una de 12
  cargas, alguien escribió en un bloque de 4056 bytes que QuickJS ya había liberado, a partir de +1922:
  `ff fb ff ff ff ff ff ff ff fb df ff ff ff fb ff fb ff ff ff ff ff`. Es una máscara de 1 bit casi llena (la de
  una imagen casi opaca: las capturas PNG de freemem.space) y empieza a mitad de bloque (filas con un salto
  mayor que su búfer, o un puntero viejo). No es QuickJS: es quien escribe máscaras en memoria Fast. Candidatos:
  la máscara de image_scale (BitMapScale de un plano con BytesPerRow = mmod hacia un AllocBitMap de 1 plano y
  _dash_img_mask), _dash_rgba_mask, picture.datatype y su PDTA_MaskPlane, los planos de las fuentes web
  (lib/fuente_web.dash, _fw_crear). Encargado a la otra sesión con estos datos.
- Descartado image_scale (escalar imágenes y su máscara): sin escalar ninguna, con Hubbub, falla 5 de 30.
  Descartados ya: búferes de píxeles de Dash (PIXGUARD), procesos decodificadores, rellenos de área, image_scale,
  los planos de las fuentes web (revisados: filas y bits comprobados; además van con AllocVec). La otra sesión
  ve poco probables el BitMapScale y PDTA_MaskPlane. Lo que sí se sabe: alguien escribe una máscara de 1 bit casi
  llena en memoria que QuickJS soltó, y con la cuarentena de QuickJS (_JS_GUARDAS) no falla nunca (0 de 30).
- Para la próxima sesión: (1) mirar las máscaras que crea MUI o picture.datatype para las imágenes con alfa en
  el camino de image_load (¿hay PNG de freemem.space que vayan por datatypes?); (2) en la cuarentena, guardar
  también cuándo (en qué paso de la traza) se escribe tras liberar, para saber qué estaba haciendo dashweb;
  (3) mientras, una salida provisional sería dejar la cuarentena encendida en dashweb (12 MB; no cambia el tiempo).
- Loop parado al 89 % de uso semanal (el usuario pidió parar al 90 %): lo publicado, sin Hubbub en las páginas,
  no ha fallado en 46 cargas con D54.

### 2026-10-18 — Publicada la alfa v0.1.0-alfa
- El usuario dijo que sí a las dos: publicar la alfa y dejar bloqueados los scripts de rastreo
  (`URL_RASTREO_BLOQUEAR = true`, como estaba). Etiqueta v0.1.0-alfa en b768b49 (rama dev), pre-release en
  https://github.com/FreeMEM/dashweb/releases/tag/v0.1.0-alfa con build/dashweb.lha (5,5 MB), hecho con
  tools/paquete.sh y el Dash de la rama pixguard (e197b1d, sin su macro: el mismo código que D55).

### 2026-10-18 — Cazado el fallo de memoria: las fuentes vectoriales del Amiga
- Puntos de control con la cuarentena de `_JS_GUARDAS` (`js_control(etiqueta)`, revisa la cuarentena y dice
  entre qué dos puntos fue la escritura). En la carga 8: `JSGUARDA entre "antes de maquetar" y "tras
  maquetar"`, el mismo bloque de 4056 bytes y la misma máscara de siempre (`ff fb ff ff ... df ff`).
- En `maquetar` solo se mide texto y se abren fuentes. El plano de `fuente_web` está acotado (revisado). Queda
  `font_open` de las vectoriales (CGTriumvirate, CGTimes, LetterGothic): diskfont/bullet pinta sus letras
  como máscaras de 1 bit.
- Prueba: Hubbub en las páginas y sin vectoriales (`if false and not _tamano_de_mapa(...)` en `_fuente_de`),
  sin guardas: **0 de 30** fallos (con ellas, 1 de cada 6). Son las vectoriales.
- No está arreglado: falta saber si es un fallo de diskfont/bullet de 3.2 o cómo las abre y cierra Dash
  (`font_open`/`CloseFont`). Arreglo provisional posible: Hubbub sí y vectoriales no (las letras salen de las
  de mapa de bits, peor escaladas). Decisión del usuario.
- Los cambios de prueba (js_control, puntos de control, Hubbub en documento.dash y la vectorial apagada) están
  en `docs/parches/caza_memoria_hubbub.patch` (sobre b768b49). El árbol dev2 queda limpio.
- Parado: uso semanal al 90 %.
- **Decisión del usuario (2026-10-18): arreglo provisional, Hubbub sí y vectoriales no.** Primera tarea en
  cuanto baje el uso: aplicar de `docs/parches/caza_memoria_hubbub.patch` solo Hubbub en documento.dash y la
  vectorial apagada en `_fuente_de` (sin los js_control), batería completa, y abrir la causa de fondo en Dash.

### 2026-10-20 — En CoffinOS no se pintaba nada: MUI 3.8 (D58); D57 cazado por la otra sesión
- El usuario, en CoffinOS (Amiberry, 68040, 3.2): la página se carga entera (traza: descargas, estilo, maqueta,
  imágenes) pero el lienzo queda gris; ni una «pintada». Su muimaster.library es la 19.35 (MUI 3.8); los
  sistemas de prueba tenían MUI 5 (21.227). Reproducido con `~/.cache/dash-emu/sys32rtg38` (sys32rtg con el MUI
  3.8 de Aminet, mui38usr.lha) y con tests/test_mui_canvas.dash de Dash.
- Causa (Dash): MUI 3.8 manda MUIM_Draw con msg->flags = 0 (Area lo rellena en la llamada a la superclase) y
  `_dash_canvas_dispatch` lo leía antes: nunca llamaba a la función de dibujo. Arreglo: si no trae
  MADF_DRAWOBJECT ni MADF_DRAWUPDATE, se toman de mad_Flags. Probado en una copia de Dash: test_mui_canvas pasa
  con MUI 3.8 y 5, y freemem.space se pinta con MUI 3.8. Encargado a la otra sesión como D58.
- D57 (la otra sesión, c9e09a4 en la rama fuente0 de Dash): `font_open` con tamaño 0 hacía que diskfont 47 de
  3.2 pisara memoria (la caza lo cogió dentro de font_open); ahora un tamaño menor que 1 pide 1. **No cierra el
  fallo**: con c9e09a4 y vectoriales, 1 de 15 cargas sigue dando el assert de gc_decref_child. Hay al menos otra
  escritura; la otra sesión sigue cazando. Las vectoriales siguen apagadas.
- Al usuario, en Traspaso:dashweb/dashweb: Hubbub, vectoriales apagadas, D57 y D58 (Dash de una copia en el
  scratchpad); la anterior en dashweb_antes.
- Desde el Workbench, las dos líneas que dashweb escribe (JQMIGRATE y «entera en») abren una ventana de consola.
  Pendiente: no escribir nada por la salida si no se pide (TRAZA).

### 2026-10-20 — D57 cerrado: vectoriales encendidas otra vez
- La otra sesión (450d45e en fuente0 de Dash): diskfont 47 y bullet de 3.2 escriben 40-60 bytes fuera de lo suyo
  al abrir una vectorial con tamaño 1 (y 0); CGTriumvirate deja justo la "máscara" de las cazas (una fila de una
  letra de 1 píxel). De 2 en adelante, nada. font_open pide como mínimo 2. En dashweb el 0 venía de
  `font-size: 0` (0 * 6 / 5). Reproductor: tools/amiga/vectoriales_memoria.dash de Dash.
- Con 450d45e y las vectoriales encendidas: 20 de 20 cargas limpias (la otra sesión) y 20 de 20 aquí (rtg, MUI 5,
  Dash f946ff9), 21-23 s cada una. Antes, 1 de cada 6. `_fuente_de` vuelve a usarlas.
- Dash: D58 (7ab1d6c) y D57 (450d45e) en la rama fuente0, sin subir. dashweb main (PR #1) los necesita para MUI
  3.8 y las vectoriales.

### 2026-10-20 — Sin consola al abrirlo desde el icono (D59)
- libnix, al arrancar desde el Workbench, abre `__stdiowin` ("CON://///AUTO/CLOSE/WAIT") en cuanto se escribe
  algo: el console.log de JQMIGRATE y «entera en» sacaban una ventana negra. Dash D59 (4991f13 en fuente0, de la
  otra sesión): la directiva `@workbench_output "NIL:"` define `__stdiowin`. src/dashweb.dash la pone.
- Probado arrancándolo desde el Workbench (un lanzador con OpenWorkbenchObjectA de workbench.library 44, LoadWB,
  dashweb.prefs con inicio=https://freemem.space/): sin la directiva sale la consola con las dos líneas; con ella,
  ninguna ventana y la página igual.
- Dash: fuente0 (D57, D58, D59 y el merge de origin/main, 8c3934d) se sube con PR a main.
- El usuario lo ha probado en CoffinOS (MUI 3.8) desde el icono: funciona bien. Fusionados FreeMEM/dash#1 y
  FreeMEM/dashweb#2.

### 2026-10-20 — Publicada la v0.2.0-alfa
- Base: 56/56 (738 s). Etiqueta v0.2.0-alfa sobre main (da9fde3: Hubbub, vectoriales con D57, MUI 3.8 con D58, sin
  consola con D59), pre-release https://github.com/FreeMEM/dashweb/releases/tag/v0.2.0-alfa con build/dashweb.lha
  (5,9 MB), hecho con tools/paquete.sh y Dash 8c3934d (= main de FreeMEM/dash tras su PR #1). README enlaza a ella
  (en dev, pendiente de llevar a main).

### 2026-10-20 — Tarea 37a (pre.opentimetrack.com, primera carga)
- Base: 56/56 (la batería de la alfa, mismo código).
- Máquina rtg, MUI 5, Hubbub: carga entera en 28,4 s y sin cierres (rc 0). Scripts 5,7 s, estilo 0,8 s y la
  primera maqueta **21,7 s**. 16 recursos (12 scripts, 2 hojas). Captura enviada al usuario.
- Lo que se ve: el texto y los colores bien; la cabecera en una columna (en Chrome, dos), el logo (un svg)
  enorme encima del título, la pila de fichas como franjas, "Menú" como botón gris.
- Causas: (1) dashweb no entiende los escapes de CSS en los selectores, y Tailwind los pone en todas sus
  variantes (`.md\:grid-cols-12`) y valores a medida (`.h-\[1\.35em\]`): se pierden esas reglas. (2) El
  JavaScript cae al empezar: `ReferenceError: 'URL' is not defined` en el runtime de Turbopack, así que Next.js,
  React y GSAP no arrancan. (3) La maqueta tarda 21,7 s. Apuntadas como 37a1, 37a2 y 37a3, delante de la 37b.
- Nueva tarea 38 (youtube.com), después de la 37, a petición del usuario.

### 2026-10-20 — Tarea 37a1 (escapes de CSS en los selectores)
- lib/css.dash: `_css_fin_nombre` lee los nombres de clase, id y etiqueta con sus escapes (CSS Syntax 3: "\" y un
  carácter, o "\" y 1-6 cifras hex con un espacio que no cuenta) y `css_desescapar` los quita (lo que no cabe en
  Latin-1, "?"). `_css_buscar` y `_css_cierre` se saltan lo escapado fuera de comillas (un `\{` o `\,` ya no corta).
  Test nuevo test_css_escapes: los de Tailwind (`.md\:grid-cols-12`, `.h-\[1\.35em\]`, `.w-1\/2`), hex (`.\31 0`),
  dentro de @layer y @media, especificidad, y desde querySelectorAll.
- pre.opentimetrack.com (rtg): la cabecera en dos columnas, el logo a su tamaño, las fichas al lado; la maqueta
  pasa de 21,7 s a 6,7 s y la carga de 28,4 s a 13,2 s. Captura enviada.
- Base: 57/57 (761 s).

### 2026-10-20 — Tarea 37a2 (el JavaScript de Next.js arranca en pre.opentimetrack.com)
- URL y URLSearchParams en el preludio (WHATWG: relativas, puertos por defecto, puntos de la ruta, codificación,
  file:, data:, blob:, IPv6, origin, searchParams enlazado con search, forEach sobre la lista viva, canParse/parse,
  createObjectURL): iguales a los de Node en 29 casos. Sin punycode (apuntado en 37a4).
- Detrás de "URL is not defined" salieron, uno a uno: `document.currentScript` (Turbopack lo lee para saber qué
  trozo se registra; ahora el <script> que corre, null fuera: `jsdom_script_actual`), `script.src` relativo
  (Next.js hace `new URL(document.currentScript.src)`: href, src y action se leen ya como dirección completa, y
  a/area tienen protocol, host, pathname, search, hash...), y `ReadableStream` (puesto: estaba apagado por la 28j;
  con el tope de QuickJS, commodoremalacca.club acaba con "out of memory" dentro de su JavaScript pero sin cerrarse:
  rc 0, página pintada en 40 s).
- lib/js.dash avisa de las promesas rechazadas sin capturar (`JS (promesa sin capturar): ...` por la salida):
  sin eso los errores de React y de la carga de trozos no se veían.
- Resultado: sin errores de JavaScript; los scripts pasan de 5,6 s a 31 s (React hidratando). La página se ve igual
  (en Chrome tampoco cambia hasta bajar). Apuntadas 37a3 (lentitud) y 37a4 (UTF-8 en el JavaScript: core-js
  descarta el URL propio porque "https://тест" llega como "https://????" y pone el suyo).
- Test nuevo test_js_url (URL, URLSearchParams, currentScript, src/href completos, a.pathname). Base: 58/58 (847 s).
- D60 hecha por la sesión dash (0389bef): marcada; la 39 dice cómo usarla.
- Para docs/ARQUITECTURA.md (lo rehace dashweb-f7): el preludio trae URL/URLSearchParams propios,
  document.currentScript, href/src completos, ReadableStream y el aviso de promesas sin capturar.

### 2026-10-20 — Tarea 37a3 (el JavaScript de pre.opentimetrack.com, de 31 s a 6,7 s, y Next.js montando la página)
- Medido: un solo script en línea (`self.__next_f.push([1,"..."])`, los datos de React) tardaba 25 s; el
  perfil de Dash no veía nada (todo dentro de QuickJS). Probados y descartados: el TextEncoder del preludio (0,4 s),
  el malloc de libnix (un asignador por tallas, mal medido: no llevaba la cuenta de memoria de QuickJS y el GC no
  pasaba; se quitó) y el GC (8 MB de margen: igual).
- Perfil nuevo dentro de QuickJS (`-DJS_PERFIL`, docs/quickjs_amiga.md, cambio 4): muestras desde una interrupción
  VBlank que miran la función de arriba de la pila. Salió: el 79 % en el Promise de core-js. core-js da por roto el
  Promise de QuickJS en un navegador sin `PromiseRejectionEvent` y pone el suyo, en JavaScript. Con
  PromiseRejectionEvent en el preludio: ese script, de 25 s a 0,5-0,9 s; los scripts, de 31 s a 6,7 s.
- Con React ya trabajando salieron, uno tras otro: un querySelector de 104 caracteres "no válido" (la caché de
  longitudes de Dash y los textos de C: D61, encargada a "dash"; parcheado con `_jsdom_soltar`), `instanceof
  HTMLIFrameElement` verdadero para todo (todas las interfaces eran el mismo constructor: ahora cada una con
  Symbol.hasInstance por tipo y etiqueta, y el mismo prototipo), `Window` y `EventTarget`, `classList` que no se
  podía recorrer (Lenis: Array.from), y `attachShadow` (el anunciador de rutas de Next.js; una raíz de sombra
  mínima que no se pinta). console.log/error escriben ya la pila de los errores.
- Resultado: sin errores de JavaScript; la página queda como la monta React (una ficha, la "huella" calculada) y
  GSAP, React y Lenis siguen cambiándola. Pero cada cambio rehace la maqueta entera: 6,2 s por fotograma. Apuntada
  37a5. Tareas de la sesión dashweb-f7 apuntadas como 40.
- Test nuevo test_jsdom_interfaces. Base: 59/59 (902 s). D61 hecha por "dash" (8f04c61) mientras tanto: el
  parche `_jsdom_soltar` se queda (no estorba).

### 2026-10-20 — Tarea 37a4 (el JavaScript con sus caracteres; punycode)
- lib/texto.dash: `utf8_a_js` (y `texto_decodificar_js`): como utf8_a_latin1, pero lo que no cabe en Latin-1 sale
  como escape \uXXXX (par de ellos fuera del plano básico). Antes "тест" llegaba a QuickJS como "????" y unas
  comillas “ ” dentro de una cadena de JavaScript salían como " (latin1_de) y rompían el script.
- Los scripts traídos (recursos.dash, jsdom._jsdom_traer) pasan por ahí. Una página HTML en UTF-8 (o sin juego
  dicho) va a Hubbub en sus bytes tal cual (`dom_desde_html5_utf8`, `_h5_analizar(texto, utf8)`): el DOM sale en
  Latin-1 como siempre y el texto de los <script>, con utf8_a_js.
- URL: punycode en el nombre de servidor (igual que Node en 7 casos); el chequeo de core-js entero pasa ya con el
  URL de dashweb (antes ponía el suyo).
- Coste de D61 (la caché de longitudes ya no apunta textos de C): recorrer un texto de C de 64 o más con str_code
  es cuadrático; pasar a Latin-1 el script de 26 KB que da Hubbub tardaba 7,5 s (antes 0,08). lib/html5.dash
  devuelve ya `_dash_str_dup` en _h5_texto y _h5_atr_valor: 82 ms. Avisada la sesión dash: lo documentó en el
  manual de Dash (1a8e0cc, "Textos de C largos").
- Test nuevo test_js_utf8. Base: 60/60 (936 s); freemem.space 21,3 s (igual).

### 2026-10-20 — Tarea 37a5 (la maqueta de pre.opentimetrack.com, de 6,7 a 2,0 s); PR #3
- `_ancho_flotante` (el ancho según el contenido: flex, grid, tablas y flotantes lo piden 2-3 veces por elemento y
  cada medida maqueta todo lo de dentro, que mide a sus hijos: crecía exponencialmente con el anidamiento) recuerda
  sus tres últimas medidas por nodo dentro de una maqueta (`_maqueta_pase`; campos af_* de Nodo; clave: el ancho y
  `_alto_definido`). Maqueta: de 6,7 s a 2,36 s; rehacerla por un cambio del JavaScript: de 6,2 s a 1,65 s.
- `_borde` sin montar "border-" + lado + ... en cada llamada y `_px` sin medir la letra si el valor no usa em, ch,
  ex ni calc() (`_sin_letra`): estilo_px pasaba de 884.000 llamadas en una carga con 11 maquetas. Maqueta 2,04 s;
  rehacerla por un cambio, 1,38 s.
- freemem.space igual (21,7 s, la misma captura). Base: 60/60 (937 s).
- La sesión dashweb-f7 subió dev hasta 807292c y la fusionó en main (PR #3, merge 4f56d0b), por encargo del usuario.

### 2026-10-20 — Tarea 37b (la geometría de la maqueta en el JavaScript)
- lib/maqueta.dash: al acabar cada bloque (no al medir: `_midiendo` en _ancho_flotante) apunta su caja de borde y
  uno de sus dibujos (`CajaNodo`); al acabar la maqueta (`_cajas_finales`) la caja se mueve lo que se movió ese
  dibujo (flex, alineación, transform mueven los dibujos ya puestos) y va a los campos caja_* del Nodo; lo que va en
  línea (a, span...) toma la unión de sus dibujos. El documento lleva el número de la maqueta (caja_pase): una caja
  vale si es de la última (`jsdom_caja_valida`).
- lib/jsdom.dash: `__dashweb_caja(n)` y `__dashweb_vista()`, `jsdom_vista(js, ancho, alto, desde, total)` (por motor;
  src/dashweb.dash lo llama al pintar). offsetWidth/offsetHeight dan la caja (antes 100x16 fijos).
- Preludio: getBoundingClientRect y getClientRects (restando el desplazamiento), offsetTop/Left/Parent
  (position), clientWidth/Height y scrollWidth/Height (de la vista en documentElement), scrollTop de la raíz,
  innerWidth/innerHeight, scrollY/pageYOffset, document.scrollingElement, DOMRect.
- Test nuevo test_jsdom_geometria (margen+relleno+borde, flex-end, span, offsetParent relativo, display none,
  desplazamiento). pre.opentimetrack.com carga igual (9,6 s, sin errores). Base: 61/61 (983 s); freemem.space 20,9 s.

### 2026-10-20 — Tarea 37c (el desplazamiento y el JavaScript)
- Preludio: scrollTo/scroll/scrollBy de window, scrollIntoView (start, center, end, nearest), scrollTo/scrollBy y
  scrollTop de la raíz dejan la petición en `__dashweb_desplazar` (recortada a la página) y scrollY ya la ve;
  `__dashweb_desplazado` lanza scroll en document (sube a window).
- lib/jsdom.dash: `jsdom_desplazamiento(js)` (la petición, -1 si ninguna) y `jsdom_desplazado(js)`.
- src/dashweb.dash: tras los temporizadores (y los clics) se aplica la petición (`desplazamiento_del_js`); al
  moverse la vista (la barra, la rueda, las teclas, la petición) `aviso_scroll` y, en el siguiente tic (programar:
  30 ms), `avisar_desplazamiento`: la vista al JavaScript y el evento, uno por tic.
- pre.opentimetrack.com bajando con la barra espaciadora (`--acciones`): cuatro eventos scroll, cada uno en
  ~1,4 s, y GSAP responde cambiando estilos (5, 4, 1, 3 cambios...); cada cambio rehace la maqueta (1,3 s: la 37d).
  Faltan los elementos que GSAP deja fijos al bajar (grandes huecos). Capturas enviadas.
- test_jsdom_geometria con scrollTo, scrollBy y los eventos. Base: 61/61 (990 s); freemem.space 21,8 s.

### 2026-10-20 — Tarea 37d (cambios del JavaScript sin rehacer la maqueta)
- Lo invisible (opacity: 0, visibility: hidden) ya no pierde sus dibujos al maquetar: se quedan velados (el pintor
  se los salta) y tiene su caja, como en CSS. test_maqueta_cajas y test_animacion, al día con eso.
- lib/estilo.dash: con `estilo_apuntar`, `_estilo_propio` apunta en `estilo_cambios` cada elemento cuyo estilo
  calculado cambió al rehacerlo (con el de antes; `pseudo` si cambió su ::before/::after).
- lib/documento.dash (`documento_al_dia`): si todos los toques son de atributos que actúan por el estilo (class,
  style, id, title, role, tabindex, data-*, aria-*) o textos cambiados, y lo que cambió en el estilo es solo
  transform/translate (desplazamientos; un scale entre 0,9 y 1,1 cuenta como 1: GSAP los pone a cada fotograma),
  opacity, visibility, transition, will-change, cursor o pointer-events, se aplica sobre los dibujos ya puestos en
  una pasada (cada dibujo suma los desplazamientos de los suyos, campos lig_* de Nodo; velado según maqueta_escondido)
  y sus cajas para el JavaScript se mueven. Un texto que cambia sin cambiar de forma (mismas palabras y largos: un
  reloj, la "huella" que la página baraja) se cambia en sus dibujos; si es un único dibujo en un bloque y su ancho
  cambia hasta 8 px, se recoloca según text-align. Si algo no cuadra, la maqueta entera como antes.
- pre.opentimetrack.com bajando: de ~30 maquetas de 1,3-1,4 s a 5; 28 cambios aplicados en 0-200 ms; el evento
  scroll, de 1,4 s a 12-220 ms. Lenis pone y quita clases en <html> al desplazar (ningún estilo cambia: ya no
  maqueta).
- El usuario lo probó: no ve animaciones (las CSS no corren: lib/animacion.dash no está conectado) y youtube.com sale
  como esqueletos grises (tarea 38). Apuntada 37d2 (animaciones CSS de verdad) delante de la 37e.
- Test nuevo test_documento_ligero. Base: 62/62 tras ajustar los dos tests; freemem.space 21,2 s.

### 2026-10-20 — Tarea 37d2 (las animaciones de CSS conectadas a dashweb)
- lib/documento.dash: tras cada maqueta (`_documento_vistas`) recoge las animaciones de la página
  (`animaciones_pagina`; el reloj, `anim_t0`, empieza con la primera maqueta y sigue); `documento_animar` pinta un
  fotograma (`animar`: translate y opacity < 0,5) y `documento_animado`. El camino sin maqueta de la 37d mueve también
  la base (bx, by) de los dibujos animados.
- src/dashweb.dash: `animar_ventana` en cada tic, un fotograma como mucho cada 66 ms y se repinta; programar pide el
  tic mientras haya alguna viva (o recién maquetada). Al cambiar de página, desde cero.
- Medido: trainalong.fit pinta un fotograma cada ~85 ms (24 ms cada uno) con 2 animaciones vivas, pero no cambia
  ningún píxel: sus animaciones son stroke-dashoffset dentro de un SVG (la curva), scale dentro del SVG (los
  círculos), box-shadow (el punto que late) y un translateX que queda fuera de la vista. pre.opentimetrack.com tiene
  4 al cargar y ninguna tras la hidratación de React (en Chrome tampoco quedan casi; lo que se mueve es GSAP).
  Apuntadas 37d3 (scale, box-shadow, colores, clip-path; repintar solo lo animado) y 37d4 (SVG animado:
  guiones en nanosvg y volver a rasterizar).
- Base: 62/62 (1028 s); freemem.space 21,7 s.

### 2026-10-20 — Tareas 37d3 y 37d4 (más propiedades en los fotogramas; SVG animado)
- 37d3: `animar` (lib/animacion.dash) escala alrededor del centro de la caja (cajas e imágenes de tamaño; el texto
  solo de sitio, velado por debajo de 0,3), recolorea (color, background-color) y rehace la sombra (box-shadow:
  `maqueta_sombra`, con la caja del elemento guardada en el dibujo de la sombra: Dibujo.sombra, cx, cy, cw, ch y
  su base bcx, bcy; `_mover` la mueve con él). Una sombra que el estado final de su animación deja transparente se
  crea igual, velada. Lo de antes de animarse (bw, bh, bcolor, bespaciado) vuelve al acabar. El mezclador junta un
  0 sin unidad con 10px (`_ceros_px`, fuera de paréntesis: el alfa 0 de un rgba() se queda). El pintor mezcla las
  elipses semitransparentes (`_elipse_mezcla`, fila a fila). trainalong.fit: el punto de "En construcción" late
  (box-shadow de 0 a 10 px desvaneciéndose).
- 37d4: los <svg> con animaciones dentro (`SvgAnimado` en lib/documento.dash) se reescriben y rasterizan otra vez
  en cada fotograma (`imagenes_svg_rehacer`) con los valores del instante en `Nodo.svg_sobre` (propiedades, o "@r"
  para un atributo: el scale de un <circle>, en su r). El SVG lleva ya stroke-dasharray y stroke-dashoffset, y
  pathLength con su caja (_svg_nombre). nanosvg (third_party): pathLength (los guiones relativos a él, escalados
  por la longitud de verdad) y sin fmodf de -lm en los guiones. lib/estilo.dash guarda lo que hay debajo del estado
  final de una animación en "~propiedad": el origen de una animación sin fotograma 0 % (la curva iba de 0 a 0).
  Primer fotograma antes de pintar (si no, la curva entera un momento).
- trainalong.fit: la curva se dibuja al cargar, a saltos (~4 fotogramas en 1,5 s: rasterizar su SVG de 1100x1100
  cuesta ~0,5 s en la máquina rtg; mejorable rasterizando solo la zona del trazo). Capturas enviadas.
- Tests: test_animacion (scale, color, box-shadow) y test_svg_guiones (nuevo: guiones y pathLength en el emulador).
  Base: 63/63 (1035 s); freemem.space 22,3 s.

### 2026-10-20 — Tarea 37e (IntersectionObserver de verdad)
- Preludio: IntersectionObserver con threshold (lista), rootMargin (px y %) y root; cada elemento observado guarda
  el umbral que ha pasado y se avisa al cruzar uno (y siempre la primera vez, como los navegadores); entradas con
  isIntersecting, intersectionRatio, boundingClientRect, intersectionRect y rootBounds; takeRecords, unobserve,
  disconnect. `__dashweb_intersecciones(todo)`.
- lib/jsdom.dash: `jsdom_intersecciones(js, todo)`. src/dashweb.dash: `intersecciones(w, todo)` (con la vista de
  ahora) tras una maqueta nueva (en el tic), al desplazar, y tras los temporizadores si hubo observe nuevos.
- pre.opentimetrack.com: los avisos llegan y Next.js empieza a pedir por adelantado los enlaces que se ven, con un
  fetch sobre XMLHttpRequest que no hay (apuntada 37e2). Las zonas que GSAP deja fijas siguen vacías (37f/37h).
- test_jsdom_geometria con IntersectionObserver. Base: 63/63 (1052 s); freemem.space 22,5 s.

### 2026-10-20 — Tarea 37e2 (fetch y XMLHttpRequest); medidas de flex guardadas
- lib/http.dash: `http_empezar_metodo(direccion, metodo, cuerpo, tipo, extra, espera_ms)`: cualquier método con
  cuerpo y cabeceras de más (`Carga.extra`).
- lib/jsdom.dash: la cola de peticiones del JavaScript (`jsdom_pedir`, `jsdom_peticiones_avanzar`, `_pendientes`,
  `_cancelar`; quita las cabeceras prohibidas, 20 s sin llegar nada = error) y `_jsdom_responder` (texto UTF-8 y
  ArrayBuffer). src/dashweb.dash las avanza en el tic (cada 50 ms mientras haya). documento_liberar las cancela.
- Preludio: XMLHttpRequest (readyState, onload/onerror/onabort/ontimeout/onreadystatechange, responseType text,
  json, arraybuffer y blob, getResponseHeader, abort), fetch sobre él (Request, Response con text/json/arrayBuffer/
  blob/clone/body, Headers, AbortController/AbortSignal), Blob, File y FormData.
- lib/js.dash: las promesas rechazadas sin manejar se dicen al final de los trabajos pendientes (antes salían las
  que se manejaban un momento después).
- pre.opentimetrack.com: los prefetch de Next.js (`?_rsc=`) llegan (307 y luego 200, 0,3 s en el servidor), pero
  la respuesta se lee tarde: dashweb pasa hasta 25 s rehaciendo la maqueta tras los cambios del JavaScript.
- lib/maqueta.dash: al medir (`_midiendo`), lo que se maqueta dentro de una caja flex se hacía una vez por cada
  medida de cada caja de fuera (con 20 niveles, cientos de veces). Ahora cada nodo guarda lo que dio con la misma
  clave en la misma maqueta (anchos, alto definido, estado del maquetador, el tamaño forzado por flex) y lo repite
  con dos dibujos que lo resumen (lo que abarca, y lo que cuenta para un ancho con la letra de su último texto).
  La memoria de `_ancho_flotante` pasa de tres anchos a una lista. pre.opentimetrack.com: la maqueta tras los 201
  cambios de 25,5 a 13,7 s; las de 2-3 cambios, de 15 a 6,5-8 s. Sigue siendo mucho: apuntada 37e3.
- test_js_fetch: fetch POST con cabeceras y JSON (y una ñ), XHR con sus sucesos, abort, Response/Headers/Blob
  sueltos, error de red (tests/servers/http.py `/eco_js`). Sin probar en test: arrayBuffer, blob, redirecciones.
- Batería: 64/64 (1164 s, con la de Dash a la vez); freemem.space 21,5 s.

### 2026-10-20 — Tarea 37e3 (los cambios que se repiten, sin maqueta)
- Con TRAZA, lib/documento.dash dice por qué unos cambios del JavaScript necesitan la maqueta entera
  (`_lig_no`: "maqueta entera por view-transition-name: (nada) -> _t_0_ en div."). En pre.opentimetrack.com, tras el
  montaje, eran las transiciones de React (`view-transition-name` puesto y quitado cada pocos segundos) y un
  `<script>` que entra.
- Ruta ligera (37d): `view-transition-name` y `view-transition-class` no mueven nada; un elemento que entra (y sus
  vecinos) no mueve nada si no tiene caja (display: none él o uno de fuera: `_documento_sin_caja`).
- lib/estilo.dash `_estilo_solo`: si en el estilo propio solo cambia lo que no llega a los de dentro
  (`_estilo_no_baja`: view-transition-*, transform, translate, scale, rotate, opacity, will-change, transition*,
  cursor, z-index), no se rehace todo lo suyo (un "inherit" explícito de esas no se mira).
- pre.opentimetrack.com tras el montaje: cada cambio de las transiciones, de 7,4 s (maqueta entera) a 12 ms. Queda
  la maqueta del montaje (13,8 s, una vez) y la de tres toques SALE al cargar: apuntada 37e4.
- Tests: test_documento_ligero (view-transition-name, un script y un div que entran), test_estilo_partes
  (transform en el padre no rehace al hijo; color sí). Batería 64/64 (1170 s); freemem.space 22,5 s.

### 2026-10-20 — trainalong.fit en CoffinOS: la mancha blanca y las rayas (encargada D62)
- El usuario lo prueba en CoffinOS: junto a "En construcción" sale una mancha blanca, la curva gris no sale y el
  punto no late. Visto en la máquina rtg (MUI 3.8 y 5): el punto sí late; la mancha y las rayas también salen, y
  ya salían en bf2292b (37e).
- La mancha es el círculo `punto-acompana` del SVG de fondo (opacity .35; en Chrome, un círculo gris translúcido
  detrás de la etiqueta). nanosvg da bien el alfa (~145 donde se solapa con la curva, ~89 en el resto), pero
  `image_draw` pinta con umbral de 128: lo translúcido sale opaco o no sale. Antes de 37d4 el círculo estaba en
  scale(0) y no se veía.
- Las rayas de la curva verde: el SVG mide 1100 de alto, se rasteriza a IMAGEN_MAX_ALTO (1024) y `image_scale` lo
  amplía: la máscara (BitMapScale) pierde una fila cada ~14.
- Las dos cosas son de Dash: encargada D62 a la sesión "dash". Que el punto no lata en CoffinOS: pendiente de una
  traza del usuario.

### 2026-10-20 — Tarea 37e4 (la maqueta y el estilo del montaje, más baratos); D62 en Dash
- lib/maqueta.dash: `_caja_leida(n, contenedor)`: márgenes, bordes y rellenos en px se leen del estilo una vez por
  maqueta y contenedor (cada elemento se maqueta ~6 veces al medir las cajas flex). La clave de la caché de medidas
  (37e2) son siete números y no un texto: el tamaño que fuerza `_flex_maquetar` solo cuenta para su elemento
  (`_forzado`).
- lib/dom.dash: `DOM_TOQUES_MAX` de 200 a 1000: el montaje de pre.opentimetrack.com hace 235 cambios y con 201 se
  rehacía el estilo entero (3,6 s); por partes, 1,7 s.
- pre.opentimetrack.com, el montaje: de 13,8 s a 10,2 s (estilo 1,7, maqueta ~8,5). Apuntada 37e5.
- D62 hecha por la sesión dash (31fd909, main 9d3bb56): en RTG de 15 a 32 bits las imágenes con alfa se mezclan;
  `image_scale` escala máscara y alfa a mano. trainalong.fit en la máquina rtg: la curva y el círculo grises,
  translúcidos detrás de "En construcción" como en Chrome; las rayas de la curva ya no salen (con D62; no las
  reproduje con un programa suelto).
- Batería 64/64 (1166 s, con el Dash de D62); freemem.space 20,9 s.

### 2026-10-20 — Tarea 37e5 (lo que sale sin ocupar sitio, sin maqueta)
- lib/dom.dash: `Toque.quitado` (el nodo que salió, `dom_apuntar_salida` desde jsdom_quitar) y `Nodo.lig_fuera`.
- lib/documento.dash: en la ruta ligera, un TOQUE_SALE vale si lo que salió no ocupaba sitio (display: none,
  position: absolute o fixed) o su padre no tiene caja; y un estilo que pasa a display: none en uno absoluto o fijo
  también. Sus dibujos (y los de dentro) se quitan de la página (`_documento_quitar_dibujos`).
- pre.opentimetrack.com: ya no hay maquetas enteras por SALE; las que quedan son de elementos visibles que entran
  (el montaje, 10,3 s: apuntada 37e6). freemem.space: el botón fijo "go-to-top" que se esconde, sin maqueta.
- test_documento_ligero: sale un absoluto, un fijo pasa a none (sin maqueta y sin sus dibujos), sale uno normal
  (con maqueta). Batería 64/64 (1168 s); freemem.space 20,9 s.

### 2026-10-20 — Tarea 37f (propiedades lógicas, atajos con var() en la cascada, botones con CSS)
- Comparando la portada de pre.opentimetrack.com con Chrome: la cabecera, la tarjeta y los botones sin relleno.
- lib/estilo.dash: las propiedades lógicas (Tailwind 4: px-* es padding-inline, py-* padding-block, mx-* margin-inline;
  inset-inline, -start/-end), en horizontal de izquierda a derecha (`_logica_lados`), como atajos (también con var()).
- lib/estilo.dash `_calcular`: un atajo con var() se partía al final y "lo suelto ganaba" siempre: el `padding: 0`
  del `*` de Tailwind (especificidad 0) le ganaba al `padding-inline: calc(var(--spacing) * 5)` de una clase. Ahora
  cada parte compite en la cascada con la propiedad suelta (en empate, la suelta, como antes). Valía también para
  margin, border y background con var().
- lib/maqueta.dash `_boton_propio`: un <button> con fondo o borde de la página (el preflight de Tailwind:
  background-color #0000, border 0 solid) o appearance: none lo dibuja su CSS, como los navegadores ("Menú" como
  texto, "Pedir demo" con su caja).
- pre.opentimetrack.com: la cabecera, los botones y la tarjeta con su relleno; queda la tarjeta girada, su sombra y
  la altura de la portada (apuntada 37f2) y las fuentes (37g).
- Tests: test_estilo (lógicas), test_estilo_vars (cascada de un atajo con var()), test_maqueta_boton (nuevo). Un
  test de formularios se quedó una vez sin tiempo (618 s) y pasó al repetirlo (48 s): sin causa conocida.
- Batería 65/65 (1183 s); freemem.space 21,4 s. Apuntadas por el usuario: 37f3 (el ratón) y la tarea 41 (baterías
  de estándares: Acid2, WPT, css3test/html5test/Acid3, WPT entero como wpt.fyi), antes de youtube.com.

### 2026-10-20 — Tarea 37f2 (orden de lo posicionado, sombras difuminadas, svh)
- La pila de tarjetas de la portada de pre.opentimetrack.com (página de prueba aparte): las traseras (absolutas)
  se pintaban encima de la delantera (relativa, detrás en el árbol), y las sombras no se veían.
- lib/maqueta.dash: lo posicionado se pinta después de lo que no lo está y en el orden del árbol (CSS 2.1, apéndice
  E): `Nodo.orden` (`_numerar` al empezar la maqueta, con ::before y ::after), `Dibujo.pos` (el orden del posicionado
  que lo puso), `_por_capas` ordena por (capa, pos) con una mezcla estable (`_por_clave`).
- box-shadow con difuminado: `Dibujo.difuso`; lib/pintor.dash `_sombra_difusa` la pinta en 2-6 capas translúcidas
  de la caja ampliada a la reducida en medio difuminado (antes, un rectángulo nítido más claro: con extensión
  negativa quedaba entero debajo de la caja).
- lib/estilo.dash: svh, lvh, dvh (y sus -vw) como vh y vw; la portada (min-h-svh) ya tiene el alto de la ventana.
- Sin hacer: los giros de cajas con contenido (la tarjeta, rotate -1.2deg; solo se giran barras).
- Tests: test_maqueta_capas (sin z-index: estática, absoluta, relativa), test_estilo (svh, dvw). test_maqueta_cajas,
  _css y _transform: los mismos dibujos, con lo posicionado al final (el orden nuevo). Batería: 61/65 y los 4 que
  cambiaban de orden, arreglados y pasados aparte (maqueta 10/10, estilo 7/7); freemem.space 21,3 s.

### 2026-10-20 — Tarea 37f3, primera parte (:hover y los sucesos del ratón, sin la ventana)
- lib/css.dash: @media (hover: hover), (any-hover), (pointer: fine), (any-pointer) verdaderas (el Amiga tiene
  ratón); la sintaxis de rango de Media Queries 4 ("width >= 48rem", "400px < width <= 700px").
- lib/estilo.dash: :hover se cumple con `Nodo.raton`; entra en el índice y es un rasgo (":hover") para rehacer
  solo lo que lo nombra (el elemento y, con `.caja:hover .dentro`, los de dentro).
- lib/documento.dash `documento_raton(d, x, y, y_vista)`: el elemento de debajo (sin ::before/::after) y los de
  fuera se marcan, los que se dejan se desmarcan, con un toque ":hover" (también por la ruta ligera de 37d); y
  `jsdom_raton` lanza out/leave, over/enter y move (pointer* y mouse*, con clientX/Y, pageX/Y, movementX/Y)
  como los navegadores (preludio: `__dashweb_raton`). documento_al_dia rehace el estilo con `raton_toques`
  aunque el JavaScript no tocara nada (también en páginas sin scripts).
- Falta conectarlo a la ventana: Dash no avisa de que el ratón se mueve sobre el lienzo (encargada D63).
- Tests: test_estilo (media del ratón y de rango), test_documento_raton (nuevo).

### 2026-10-21 — Tarea 37f3 (el ratón, conectado a la ventana); D63 en Dash
- D63 hecha por la sesión dash (3980c80, main 55abbf4): `mui_canvas_on_move`, `mui_canvas_pointer_x/_y/_inside`.
- src/dashweb.dash: cada ventana pide `mui_canvas_on_move(pagina, ID_RATON + k)`; `raton(w)` lee dónde está el
  puntero (o que salió), llama a `documento_raton`, rehace si hace falta y corre los temporizadores.
- lib/estilo.dash: `Hojas.con_hover` (algún selector nombra :hover). Con solo `invalida` no bastaba: un `.caja:hover`
  de una parte no deja rastro ahí (invalida es para lo de dentro) y el :hover no se apuntaba.
- tools/amiga/clicar.dash: la acción "v X Y" lleva el puntero sin pulsar. tests/pages/raton.html: una caja con
  :hover, la posición desde mousemove, mouseleave y @media (hover: hover).
- Visto en la máquina rtg con MUI 5 y con MUI 3.8 (sys32rtg38): la caja roja con el ratón encima, gris al salir;
  "ratón en 52,68"; "hay ratón". Sin probar: con un ratón de verdad y en CoffinOS; pre.opentimetrack.com con el
  ratón (la pila que lo sigue).
- Batería 66/66 (1236 s); freemem.space 21,4 s.

### 2026-10-21 — Tarea 37g (WOFF2) y 40a (--fpu en todo lo que se reparte y se mide)
- third_party/brotli: el descompresor de google/brotli 1.1.0 (MIT; c/common, c/dec y las cabeceras), en libimg.a
  (tools/build_img.sh; brotli/decode.h en build/img-lib/brotli).
- lib/fuente_web.dash `_fw_de_woff2`: WOFF 2.0 a TrueType: el directorio (las 63 etiquetas conocidas, UIntBase128),
  Brotli de una vez, glyf/loca transformadas rehechas (los siete flujos, los tripletes de 5.2, 255UInt16, la caja
  explícita o calculada, los compuestos tal cual con sus instrucciones), hmtx transformada (los lsb del xMin de cada
  glifo), el directorio por etiqueta, indexToLocFormat en head. Sin colecciones (ttcf). lib/css.dash: los src
  woff2 valen. tf_BoldSmear crece con el tamaño (la negrita del Amiga de un titular de 64 px).
- Comprobado en el PC (el mismo C con AllocVec simulado y stb_truetype): VeraMono.woff2 de woff2_compress da los
  mismos glifos y métricas que el TTF (32-255); las tres fuentes de pre.opentimetrack.com (Archivo y Doto, variables,
  e Inter) se convierten y se leen. En el A1200 emulado, convertirlas cuesta 2-7 s.
- Pero en dashweb no salían: fuente_web daba 0 aunque la conversión iba bien. tools/medir_visor.py (y
  tools/paquete.sh, y los dashweb dados al usuario) compilaban sin --fpu, y libimg va con -m68881: el float de
  stbtt_ScaleForMappingEmToPixels llegaba en fp0 y se leía de d0 (el alto salía < 1). Es la 40a: ahora
  tools/paquete.sh y tools/medir_visor.py compilan con --fpu (su A1200 lleva una 68882, como los tests). Las fuentes
  web nunca habían salido en el navegador de verdad (sí en los tests, que van con --fpu); la v0.2.0-alfa también
  va sin --fpu: lo que cruce floats con libimg/libqjs/libvideo puede estar mal en ella.
- pre.opentimetrack.com: el titular en Archivo grueso, el reloj con los dígitos de puntos de Doto, como Chrome.
- lib/estilo.dash `_calcular`: las --x de un elemento se ponen todas antes de resolver sus var() (--font-reloj:
  var(--font-doto) con las dos en <html>, en cualquier orden).
- Tests: test_fuente_web (WOFF2: medidas y la misma letra pixel a pixel que el TTF; src woff2), test_estilo_vars
  (var() entre --x del mismo elemento).
- Batería 66/66 (1245 s); freemem.space 23,5 s (antes 21,4: ahora con --fpu y sus fuentes web de verdad; sin
  medir por separado).

### 2026-10-21 — Tarea 37h, primera parte (position: fixed y sticky)
- Bajando por pre.opentimetrack.com con espacios: tras la portada todo salía azul oscuro y vacío, y la cabecera se
  iba. En Chrome: la cabecera fija y la sección "historia" con sus escenas (el móvil, el portátil) pegadas arriba
  mientras se baja (historia-escenario: position: sticky; top: 0, en una sección de 3276 px).
- lib/maqueta.dash: `Dibujo.fijo` (lo de un position: fixed va con la ventana: el pintor no le resta el
  desplazamiento) y `Dibujo.pega` (`Pegajoso`: lo de un sticky con top se mueve lo que lo empuja el desplazamiento,
  hasta el final del contenido de su padre; dentro de otro sticky, los dos: `maqueta_pega_dy`); `_pegajosos` con
  las cajas de la maqueta. `maqueta_nodo_en_vista(p, x, y, desde)` para el clic y el ratón (con lo fijo y lo
  pegajoso). `Nodo.caja_fija`: getBoundingClientRect de lo fijo no resta el desplazamiento.
- pre.opentimetrack.com: la cabecera fija (oscura en las secciones oscuras, como en Chrome) y la historia se ve y
  cambia al bajar (08 02 "Lucía llega y ficha", 15 40, 09 12 con el portátil), con su línea de tiempo abajo. Falta:
  la pantalla del móvil vacía, el móvil a la izquierda (en Chrome, centrado), getBoundingClientRect de lo pegajoso
  (sin el desplazamiento del sticky).
- Test: test_maqueta_fijo (nuevo: fixed y sticky pintados y bajo el ratón). Batería 67/67 (1256 s); freemem.space
  23,7 s.

### 2026-10-21 — Tarea 37h, segunda parte (el móvil y el portátil de la historia)
- El móvil de la historia salía vacío y a la izquierda. Con su HTML (sacado de Chrome) y la hoja de la página en una
  prueba aparte, cuatro fallos:
  - aspect-ratio no daba un alto definido a los de dentro (el h-full del móvil, una columna flex con flex-1, salía
    de 40 px); y con border-box la proporción es de la caja con su relleno (280 de ancho: 591, no 571).
  - el atajo inset no existía (Tailwind: inset-0): los absolutos con inset: 0 medían su contenido.
  - place-items, place-content y place-self no se repartían en align-* y justify-*.
  - al medir (_ancho_flotante_medir y la caché de 37e2), lo que desborda un overflow: hidden contaba entero: la
    pantalla del portátil hacía mínimo de 10.021 px una columna de grid.
- pre.opentimetrack.com: el móvil y el portátil, centrados y con su contenido ("Hola, Lucía", el contador que corre,
  "Mi jornada", "Por decidir"), como en Chrome.
- Test: test_maqueta_inset (nuevo: inset, absoluto en un flex-1, aspect-ratio con border-box y height: 100%,
  place-items: center, overflow que no ensancha). Batería 68/68 (1268 s); freemem.space 22,9 s.

### 2026-10-21 — Tarea 37h, tercera parte (scripts que mete el JavaScript; SVG con width en %, sus <text>, rgba)
- Más abajo en pre.opentimetrack.com, las zonas del esquema de "Ficha desde donde ya trabaja tu gente" y de la tabla
  de "Listo para la Inspección" salían vacías: en el HTML solo hay un hueco (min-height: 52rem); Next.js monta el
  componente al llegar, bajando trozos de JavaScript con <script src> que mete en <head>. dashweb no ejecutaba
  ningún <script> metido después de cargar.
- Preludio: appendChild, insertBefore y replaceChild (y lo que va por ellos: append, before...) miran los <script>
  que entran: en línea se ejecutan al momento; con src se bajan con XMLHttpRequest (la cola de 37e2), se ejecutan
  con document.currentScript = él y lanzan load o error. Solo JavaScript (type vacío o text/javascript; JSON,
  módulos y lo demás no). Los de la página, marcados al acabar de cargar (moverlos no los repite).
  lib/jsdom.dash `jsdom_pedir`: los rastreadores (url_rastreador) no se piden (error de red), como los <script> de
  la carga.
- Con los trozos, React se caía ("This page couldn't load"): asignaba defaultValue y defaultChecked de un <input>
  (solo tenían getter: en modo estricto, error). Con setter, y document.title también (Next.js lo pone al navegar).
- SVG: un <svg> con width en % (w-full) se maquetaba a 300 px: ahora el % del ancho de la línea y el alto por la
  proporción, y tras la maqueta se rasteriza otra vez a ese tamaño (`imagenes_svg_a_tamano`). Sus <text> (nanosvg
  no los pinta) salen como textos de la página encima, a la escala del viewBox (`_svg_textos`). Al escribir el SVG
  para nanosvg: los var() de los atributos se resuelven (`estilo_resolver_var`) y un fill/stroke con rgba(), hsl()
  o #rrggbbaa va en #rrggbb con su fill-/stroke-opacity.
- pre.opentimetrack.com: los componentes de abajo se montan (el esquema con sus rótulos, la tabla con sus campos de
  hora). Lo que falta, apuntado como 37h2.
- Tests: test_jsdom_scripts (nuevo: en línea, con src, currentScript, load, error, moverlo, JSON; document.title y
  defaultValue/defaultChecked), test_svg_texto (nuevo: width en %, <text>, rgba y var() en el SVG escrito).
  Batería 70/70 (1345 s); freemem.space 22,5 s.

### 2026-10-21 — Tarea 37h2, primera parte (crypto, la API de SVG que piden las librerías; D64 encargada)
- Preludio: crypto (getRandomValues, randomUUID, subtle.digest con SHA-256 y SHA-1 en JavaScript; comprobado con
  sha256sum/sha1sum en el PC y en el emulador; sin generador de verdad: no vale para claves).
- El "TypeError: not a function" de un trozo cargado al vuelo era el CSSPlugin de GSAP: getCTM() de lo que anima
  dentro de un <svg>. Preludio: ownerSVGElement, getBBox (de los atributos de rect/circle/ellipse/line, de los
  puntos de path/polygon o de la caja), getCTM/getScreenCTM, createSVGMatrix/createSVGPoint, DOMMatrix, getTotalLength
  (los tramos entre los puntos de d) y transform.baseVal (las funciones del atributo transform como matrices, con
  consolidate). Sin errores de JavaScript al bajar por pre.opentimetrack.com.
- El esquema de "Ficha desde donde..." no salía porque su imagen era la número 65: Dash solo deja 64 vivas
  (`_DASH_IMG_MAX`); encargada D64.
- Queda de la 37h2: el móvil que asoma (el fin de su sticky) y que cada cambio del JavaScript al bajar rehace la
  maqueta en 6-10 s (al bajar con espacios la página casi no avanza): 37e6.
- Test: test_js_crypto (nuevo: digest, randomUUID, getRandomValues; la API de SVG y transform.baseVal).
- D64 hecha por la sesión dash (1204998, main 5370bee: imágenes en una lista, sin tope; _dash_img en O(1) con una
  marca): el esquema de "Ficha desde donde..." sale como en Chrome. Batería 71/71 (1458 s; parte compilada antes de
  llegar D64); freemem.space 22,7 s.

### 2026-10-21 — Tarea 37h2, segunda parte (getBoundingClientRect de lo pegajoso)
- En pre.opentimetrack.com las secciones "escena" son sticky dentro de <main> (top negativo que pone GSAP: tarjetas
  que se apilan), y lo de dentro lo mueve GSAP al bajar según getBoundingClientRect, que no contaba lo que empuja
  el sticky: el esquema de "Ficha desde donde..." salía 500 px más arriba, encima de su título.
- lib/maqueta.dash `_pegajosos`: cada sticky guarda en su nodo (pg_pase, pg_y0, pg_top, pg_fin) dónde está, su top y
  lo más abajo que va. lib/jsdom.dash `__dashweb_caja` da además los del sticky más cercano hacia fuera, y
  getBoundingClientRect suma lo que lo empuja el desplazamiento.
- pre.opentimetrack.com: la sección "Ficha desde donde..." en orden (título, texto, esquema, la tabla "Fichajes").
- Visto de paso: un position: fixed sin dibujos (sin fondo ni contenido) da su caja en y 0 (CajaNodo se apunta antes
  de bajarlo a su top). Arreglado después (37e6): `_absoluto` baja también las cajas sin dibujo de referencia.
- Test: test_jsdom_geometria (sticky y lo de dentro con la página desplazada; fixed). Batería 71/71 (1487 s);
  freemem.space 24,2 s.

### 2026-10-21 — Tarea 37h2, tercera parte (menos maquetas enteras al bajar)
- Bajando por pre.opentimetrack.com, 13 maquetas enteras (6-10 s cada una); los motivos (la traza de 37e3): un
  atributo name de un <input>, un transform de un <g> de un SVG, un rotate de la pila de tarjetas.
- lib/documento.dash, ruta ligera: un atributo que no mueve nada (los que sí, `_documento_atributo_mueve`: src,
  width, value, type...) y que el CSS no nombra, sin maqueta; lo de dentro de un <svg> (toques y estilos) no se
  maqueta: su imagen se rasteriza otra vez (`_documento_svgs_tocados`, también por la maqueta entera: antes un
  cambio dentro de un SVG no se veía nunca); un rotate o una matriz con giro en algo con hijos no cuenta (dashweb solo
  gira una barra suelta).
- Ahora las maquetas enteras al bajar son de cosas que mueven de verdad (textos que cambian de largo, elementos que
  entran); el coste de cada una es la 37e6.
- Test: test_documento_ligero (name, dentro de un <svg>, rotate en una caja con hijos; el rotate de #a, que tiene
  texto, ya no pide maqueta). Batería 71/71 (1488 s); freemem.space 24,1 s.

### 2026-10-21 — Tarea 37e6, primera parte (dos cachés)
- Perfil bajando por pre.opentimetrack.com (150 s): _val 2 millones de llamadas (8 %), estilo_px, _borde 627.000,
  _palabras y _calcular (el estilo), _flex_maquetar 65 % del total; fuente_web_para un 3 % en 45 llamadas.
- lib/maqueta.dash `_caja_leida`: casi nunca acertaba (la clave llevaba el ancho del contenedor, que al medir las
  cajas flex cambia en cada llamada): ahora solo cuenta si algún margen o relleno va en % (`Nodo.cl_pct`). _borde
  de 627.000 a 384.000 llamadas.
- lib/fuente_web.dash: la fuente leída y sacada del WOFF/WOFF2 se guarda (las 8 últimas, por fichero) para los demás
  tamaños; se suelta al salir (atexit: AllocVec no se libera solo) y al registrar otra con el mismo nombre de fichero
  (otra página). Al registrar se olvidan también las ya hechas de ese fichero (antes, otra página con
  T:dashweb_fuente0 recibía la fuente de la anterior). Lo que pesa de fuente_web_para es rasterizar 225 letras para
  cada tamaño (la página usa tamaños fluidos: muchos); sigue en un 2,6 %.
- Lo que queda: _val (2,4 millones: las consultas de estilo de cada bloque maquetado) y las ~6 maquetas por elemento
  de las medidas flex. Las maquetas al bajar siguen en 6-12 s.
- Batería 71/71 (1488 s); freemem.space 23,5 s. Encargada D65 (d.get(clave, defecto): _val en una búsqueda).

### 2026-10-21 — Tarea 37e6, segunda parte (D65; D66 propuesta)
- D65 hecha por la sesión dash (a19ece3, main bea3a16): d.get(clave, defecto) en una búsqueda.
- lib/maqueta.dash `_val` y `_px`, lib/documento.dash `_val_estilo`: con get. Guardar el valor en una variable lo
  copia (lo vi en build/dashweb.c: _dash_str_set_copy y _dash_str_free en cada llamada): _val sin variable (dos
  búsquedas, ninguna copia de más). _val del 9,5 al 9 % del perfil bajando; las maquetas al bajar, igual (8-12 s).
- Propuesta a la sesión dash la D66 (no copiar un préstamo en una variable que solo se lee; devolverlo sin
  tmpcopy).
- Lo que más pesa sigue siendo cuántas veces se maqueta cada elemento al medir las cajas flex y el estilo (_calcular,
  _palabras) de lo que cambia.
- Batería 71/71 (1492 s; con la D66 a medio hacer en el worktree de Dash durante parte de ella); freemem.space 23,4 s.

### 2026-10-21 — Tarea 37e6, tercera parte (las palabras de cada texto, guardadas)
- El `_palabras` del perfil era el de lib/maqueta.dash (cortar el texto en palabras y medirlas), que se llama igual
  que el de lib/estilo.dash: renombrado `_palabras_texto` para verlo aparte (9,1 % al bajar por
  pre.opentimetrack.com).
- Cada nodo de texto guarda sus palabras, si había blanco delante de cada una y sus anchos, con la clave de su letra
  (fuente, estilo, text-transform, letter-spacing): al maquetarlo otra vez (las medidas flex lo hacen ~6 veces) no
  se recorre el texto ni se mide con la fuente. Del 9,1 al 7,8 %; las maquetas al bajar siguen en 6-13 s.
- Batería: 71/71; freemem.space entera en 22.989 ms.

### 2026-10-21 — Memoria de dashweb (pregunta del usuario) y D66
- El ejecutable: 3.104.676 de código, 235.984 de datos y 232.880 de bss (3,4 MB al cargarse).
- dashweb escribe con TRAZA la memoria libre al empezar, y en la línea "entera en" la libre al final y la del
  JavaScript. Máquina rtg (3.2, 128 MB): freemem.space gasta entre 28 y 36 MB según la vuelta, de ellos solo 1,6 MB
  el JavaScript. Falta saber en qué se van los otros ~27 MB (¿imágenes descodificadas, bitmaps de la ventana,
  fuentes?): en un A1200 con 8 MB de Fast no cabe.
- Con D66 (802471e) las maquetas al bajar por pre.opentimetrack.com: 1516 3018 12126 5175 6987 9683 6238 10969
  6122 8199 9110 10348 6670 9328 7449 ms; sin cambio claro frente a la medida anterior.

### 2026-10-21 — En qué se va la memoria (pregunta del usuario)
- lib/traza.dash: cada línea de la traza lleva la memoria libre ("[1234 98000K] ...").
- freemem.space en la máquina rtg: al empezar 134.346 KB libres; abrir MUI, la red y AmiSSL ~5,7 MB; los scripts
  1,8 MB; el estilo 8,4 MB (bloques pequeños de Dash, que se reciclan pero no vuelven al sistema); las fuentes web
  ~80 KB cada una (medido aparte con un test suelto, no guardado); las imágenes el resto: el pico al decodificarlas
  deja 70.674 KB libres (~64 MB gastados) y al final 95.716 KB (~38,6 MB gastados).
- Las 10 imágenes (miniaturas y los fondos grandes del carrusel) a tamaño original son 30 MB en RGBA. Apuntado como
  40h. Sin batería: solo cambia el texto de la traza.


### 2026-10-21 — Tarea 37e6, cuarta parte (lo medido se guarda de una maqueta a otra)
- Perfil al bajar por pre.opentimetrack.com con D66: `_ancho_flotante_medir` (medir el ancho de flex, grid y
  flotantes maquetando lo de dentro) es el 55 % del tiempo; lo medido solo se recordaba dentro de una maqueta.
- Ahora vale para una época: lib/dom.dash `dom_tocar(n)` marca n y los de fuera (`sub_cambio` con `dom_reloj`), y lo
  medido en un nodo (`medidas`, `af_lista`) vale si nada cambió dentro desde que se midió. Se marcan: los toques del
  JavaScript, cada elemento cuyo estilo calculado cambia al rehacer el estilo de lo cambiado (`estilo_marcar`), un
  texto cambiado por el JS (no deja toque: sin marcarlo, la hora del móvil de Ficha se partía en dos líneas con el
  ancho del texto de antes) y los atributos que pone una imagen al llegar. Cada maqueta empieza época salvo
  la de documento_al_dia con estilo de lo cambiado (`maqueta_conservar`); estilo entero, imágenes, fuentes y cambio
  de ancho la empiezan.
- Maquetas al bajar: 1281 2798 11882 7007 5749 1810 8857 10768 1696 1728 2701 1858 2798 2859 5360 2308 6137 1846
  1698 ms (antes 6-12 s casi todas). Comprobado con captura tras 8 espacios con 20 s entre ellos: igual que sin el
  cambio salvo la hora del reloj.
- Pendiente visto: un texto cambiado por el JS sin otro toque no pasa por la ruta ligera ni por las partes (estilo
  entero y maqueta entera, como antes).
- tests/test_maqueta_epoca.dash: tras un texto cambiado sin toque, una clase que agranda la letra y un hijo que
  entra, la página es la misma que la del mismo HTML maquetada de nuevo (sin marcar el texto, falla "reloj").
  Batería: 71/71 + el nuevo; freemem.space entera en 22.688 ms.

### 2026-10-21 — Tarea 37e6, quinta parte (sin estilo entero por cambios que no tocan la página)
- Dos maquetas al bajar eran "0 cambios: estilo (entero)" (7 y 9 s): el JS cambiaba algo sin dejar toque. Un texto
  cambiado por el JS (nodeValue/data, el reloj de React) apunta ahora TOQUE_CONTENIDO en su elemento (si no cambia
  de forma, ni maqueta: _documento_texto_igual); y si no queda nada apuntado (atributo con el valor que ya tenía,
  nodos fuera del documento) documento_al_dia no hace nada.
- Otra era "estilo entero: :hover en html" (10,7 s): el :hover de <html> ya no rehace el estilo (nadie usa
  html:hover; está bajo el ratón mientras el ratón esté en la ventana).
- Al bajar: 1285 2807 11870 5668 1752 1664 1629 1675 2681 1792 2881 2745 5065 2281 6106 1865 1683 ms; ningún
  estilo entero. Captura tras 8 espacios igual que sin 37e6 (4-5) salvo los segundos del reloj.
- test_maqueta_epoca: un cambio sin efecto no rehace nada.
- La batería se pasaba de tiempo: los tests con la misma configuración van en una sesión de emulador con 600 s y
  test_maqueta_epoca (152 s: cuatro documentos con JS) dejaba a los 17 de detrás en TIMEOUT. El test compara ahora
  con páginas sin JS (58 s) y tests/run.py da a cada sesión 600 s más 20 por test. Batería: 72/72.

### 2026-10-21 — "Acerca de..." con la versión (usuario)
- El usuario quería ver qué dashweb tiene en CoffinOS: la ventana "Acerca de..." (menú Proyecto, Amiga+?) dice
  "dashweb 0.3.0-dev" (DASHWEB_VERSION en src/dashweb.dash) y la fecha y hora en que se compiló. Comprobado en el
  emulador con MUI 3.8 (sys32rtg38) abriéndola desde el menú. Copiado a Traspaso (10:51).

### 2026-10-21 — Tarea 37e6, sexta parte (pintar: lo que pesa ahora)
- Perfil al bajar con 37e6 (4-5): la maqueta ya es el 18 %; pintar el 29,5 % (2293 pintadas de toda la vista, la
  mayoría fotogramas de las animaciones del JS): `_mezcla_recortada` (fondos semitransparentes) 12 %, `_tramo`
  (cajas redondeadas fila a fila, 945.660 llamadas) 9 %, `maqueta_pega_dy` 1,6 %.
- lib/pintor.dash `_redondo_pintar`: solo recorre las filas que se ven y pinta los dos lados del borde del medio de
  una vez. Poco: de 40,2 a 39,4 ms por pintada; las filas de las esquinas (píldoras rounded-full: todo esquina)
  siguen una a una. Captura igual salvo el reloj; test_maqueta_capas mira también el lado derecho del borde.
- Lo que daría más: repintar solo lo que cambia (la ruta ligera sabe qué dibujos movió) en vez de toda la vista
  en cada fotograma: apuntado como 37e7.
- Batería: 72/72.

### 2026-10-21 — Tarea 37e7 (repintar solo lo que cambia; D67)
- D67 (sesión dash, 0afa10a): `mui_canvas_update_area(lienzo, x, y, w, h)` pinta en el búfer solo esa zona (región de
  recorte) y copia ese rectángulo a la ventana.
- lib/documento.dash: la ruta ligera y `documento_animar` (animaciones de CSS y <svg> animados) apuntan la zona que
  cambian (`d.zona`, `zx0..zy1` en coordenadas de la vista): la unión de los dibujos tocados antes y después, con su
  sombra difuminada y 2 px; lo fijo y lo de un sticky donde se ve (`d.desde`, `maqueta_pega_dy`); lo de fuera de la
  vista no cuenta (`d.alto_vista`). src/dashweb.dash `repintar_cambiado`: si hay zona, `mui_canvas_update_area`;
  `pinta_en` con `pintor_zona` pinta su fondo y lo que la toca, recortado (lib/pintor.dash: lo que solo se pinta
  entero, como el texto, se mira contra lo visible y lo recorta la región).
- Al bajar por pre.opentimetrack.com (270 s): antes 2284 pintadas enteras, 90,6 s; ahora 39 enteras (47 ms) y 2242
  zonas (15 ms; casi todas 229x248 y 354x248, el punto que late y la ficha), 35,8 s. La mayoría eran fotogramas de
  animaciones de CSS. Captura tras 8 espacios igual salvo el reloj.
- Las rutas de Dash pasan a ~/Projects/FreeMEMLang/.worktrees/dashweb (la sesión dash movió el worktree) y su rama
  dashweb está en origin/main (a756970: ./dash -q, cerrojo de build/, -Werror=implicit-function-declaration...).
- Batería con Dash a756970: 72/72; freemem.space entera en 22.990 ms.

### 2026-10-21 — "Inserte volumen data" y un <iframe> escrito en eldiario.es (usuario, CoffinOS)
- eldiario.es tiene decenas de `<img src="data:image/svg+xml,...">` (huecos de las imágenes perezosas): `_imagen_traer`
  pasaba lo que no es http por `url_fichero`, que lo dejaba igual, y "data:..." como ruta del Amiga es el volumen DATA:
  AmigaOS pedía insertarlo. lib/url.dash `url_fichero`: data:, about:, javascript:, blob:, mailto:... (y http/https)
  dan NIL: (se lee vacío). test_url lo mira. En el emulador, meneame.net no lo reproducía ni con ni sin el arreglo; la
  captura del usuario ya tenía eldiario.es en la barra.
- D68 encargada (dos_requesters para que ningún requester de DOS bloquee el navegador; base64_to_file para enseñar
  las imágenes y fuentes data:...;base64,). Las data: siguen sin verse hasta usarla.
- El `<noscript>` de Google Tag Manager salía como texto arriba de eldiario.es (su contenido es texto crudo con el
  JavaScript activo): en la hoja del navegador pasa a display: none, como pide el HTML con scripting. test_estilo.
- Sin batería entera (hay otra sesión dashweb en la misma carpeta): test_url y test_estilo* pasan.

### 2026-10-21 — "Acerca de..." con autor, licencia y web (usuario)
- src/navegador.dashui: © 2026 Francisco Antonio Tapias Bravo, Licencia MIT, github.com/FreeMEM/dashweb (lo del
  fichero LICENSE). Visto en el emulador con MUI 3.8 (el © sale bien). Copiado a Traspaso (14:03).
- (usuario) Créditos en "Acerca de...": hecho en Dash con MUI y AmiSSL; adaptados para AmigaOS QuickJS (Bellard y
  Gordon) y Hubbub con LibParserUtils (NetSurf); también stb, NanoSVG, Brotli, libwebp, TJpgDec, fdlibm y MintVID;
  licencias en el cajón Licencias. tools/paquete.sh no copiaba la licencia de Brotli (llegó con la 37g): añadida.

### 2026-10-21 — Batería con lo de la otra sesión
- Tras el reinicio hubo dos sesiones dashweb en esta carpeta; el usuario dejó el loop en esta. La otra subió
  9f520b1 (data:, about:... dan NIL:; <noscript> escondido), b4d3d3d y 09e799c ("Acerca de..." y licencia de Brotli
  en el paquete) con solo test_url y test_estilo*. Batería entera con todo ello: 72/72.
- D68 (dos_requesters, base64_to_file) la lleva ahora este loop: cuando esté en main, dos_requesters(false) al
  arrancar y las data: (base64 a T: con base64_to_file; las de %XX con file_write_text) para imágenes y fuentes.

### 2026-10-21 — Tarea 40e con D68 (direcciones data: en imágenes y fuentes)
- src/dashweb.dash: `dos_requesters(false)` al arrancar (una ruta que no existe, como "data:...", falla sin el
  requester "Inserte el volumen DATA").
- lib/imagenes.dash `imagen_data_a_fichero`: data:...;base64, con `base64_to_file` y data:..., con %XX deshechos y
  `file_write_text`; las <img>, fondos, carteles y @font-face con data: se escriben en su fichero de T: y entran en
  la cola ya llegados (solo les falta decodificarse). lib/url.dash: `url_es_data` y `url_deshacer` (públicas).
- tests/test_imagenes_data.dash. eldiario.es en la RTG: 4 imágenes data: (SVG vacíos de hueco) decodificadas.
- Fallo de Dash encontrado: base64_to_file con textos en variables los deja escapados (--memcheck: 2 strings por
  llamada; con literales, 0): arreglado por la sesión dash (D68b, d39d8d9).
- La traza de cada maqueta del JS cuenta bloques, medidas hechas y guardadas: un cambio pequeño maqueta la página
  entera (~2600 bloques, 1,4-1,7 s en pre.opentimetrack.com); el montaje de 12 s, 10.058 bloques y 4344 medidas.
- Batería con Dash d39d8d9: 73/73; freemem.space entera en 22.361 ms.

### 2026-10-21 — Tarea 37h: comparando con Chrome al bajar (botones, font-stretch, letter-spacing negativo)
- Capturas de dashweb a 1788, 3576, 5364, 7152 y 8576 px (3 a 15 espacios) contra Chrome a 954x615 (el mismo
  clientWidth, 939). dashweb va por delante: la portada mide menos. Causa: el titular (.titular-portada) usa la
  fuente variable Archivo con font-stretch: 125 %, peso 800 y letter-spacing -0,035em: en Chrome las letras son
  más anchas, cortan en más líneas y la sección crece (1146 px contra ~526); lo de debajo se descoloca.
- La línea de tiempo de la historia: <button><span class=block>Mié 14</span>08:02</button> salía en una línea; un
  <button> que dibuja la página va ahora como inline-block (lib/maqueta.dash `boton_caja`): fecha arriba, hora debajo.
- font-stretch (heredada): lib/fuente_web.dash `fuente_web_ancha` / `fuente_web_para_ancha` hacen la letra a ese %
  de anchura (escala x de stb_truetype: se acerca al eje wdth); lib/maqueta.dash `_estiramiento` y `_fuente_ancha`.
- letter-spacing negativo (hasta -font-size/4) ya no se queda en 0; el pintor pone las letras una a una con != 0.
- Tests: test_maqueta_boton (span de bloque en un botón), test_fuente_web (estirada 54 y apretada 30).
- Con ello, en pre.opentimetrack.com el titular corta en 3 líneas como en Chrome (antes 2) y la línea de tiempo pone
  la fecha encima de la hora; la portada sigue más baja: line-height no se aplica (40d) y la tarjeta de la derecha
  no se parte igual. Batería: 73/73; freemem.space entera en 23.157 ms.

### 2026-10-21 — Tarea 40d (line-height) y lo que falta para medir como Chrome
- lib/estilo.dash `estilo_alto_linea(v, em)`: número o calc() sin unidad x font-size, longitud o % en px, -1 con
  normal. lib/maqueta.dash: cada pieza de texto lleva su `lh` (calculado una vez por texto en `_palabras_texto`);
  `_poner_linea` con algún lh hace la línea como CSS 2.1 10.8 (media diferencia arriba y abajo, bases alineadas) y
  sin ninguno, como siempre (la pieza más alta y 1 px arriba y abajo). Test test_maqueta_alto_linea (40px, 2, calc
  de Tailwind, 150 %, normal). El titular de pre.opentimetrack.com (line-height 0.9) sale ya apretado como en Chrome.
- Encontrado al comparar: ESTILO_MEDIUM (font-size normal y 1rem) es 13 px desde la tarea 11 (que quepa en una
  pantalla de Amiga); en Chrome 16. Todo lo de rem sale un 19 % más pequeño (la entradilla: 15 px contra 18,4). Es
  decisión del usuario: preguntado.
- Batería: 74/74; freemem.space entera en 23.787 ms y se ve bien (captura).

### 2026-10-21 — Tarea 40c (un script que no acaba ya no cuelga el navegador)
- lib/js.dash: JS_SetInterruptHandler con `_js_interrumpir`: cada entrada al JavaScript (js_evaluar, los trabajos de
  promesas y _jsdom_llamar de lib/jsdom.dash: temporizadores y eventos) apunta la hora (DateStamp) y, pasados
  JS_SEGUNDOS (30; `js_tope` lo cambia), el script recibe "InternalError: interrupted". `js_cortado()` dice si se
  cortó alguno; src/dashweb.dash `tic` lo pone en la barra de estado. 30 s porque un A1200 de verdad ejecuta el JS
  unas 50 veces más despacio que la máquina RTG emulada.
- tests/test_js_tope.dash: un 1 + 2 no se corta; while (true) se corta a los 2 s (js_tope(2)) y el motor sigue.
- Batería: 75/75; freemem.space entera en 23.915 ms; pre.opentimetrack.com 90 s sin ningún corte.

### 2026-10-21 — Tarea 40b (las descargas van al fichero según llegan)
- lib/http.dash `http_volcar(carga)`: en una carga a fichero, cuando llegan las cabeceras de una respuesta 2xx sin
  chunked ni compresión, se leen, se abre el fichero y cada http_avanzar escribe lo recibido (`_carga_volcar`, con
  red_copiar de lo que ya hay, sin esperar a la red) en vez de juntar el cuerpo entero en la memoria de la conexión.
  Acaba con Content-Length o al cerrar; las redirecciones siguen volcando la respuesta final; chunked y comprimido,
  como siempre. Solo para las descargas del usuario (src/dashweb.dash `empezar_descarga`): los vídeos que se ven
  mientras bajan leen lo llegado del búfer (http_parcial) y las imágenes son pequeñas.
- tests/test_http_volcar.dash: a mitad de un goteo de 300 KB, lo volcado ya pasa de 64 KB y en la conexión quedan
  menos de 4 KB; el fichero sale entero; sin longitud, tras redirección y chunked, también.
- Batería: 76/76; freemem.space entera en 23.509 ms.

### 2026-10-21 — Tareas 40f y 40g (textos al día)
- 40f ya estaba hecha (la 37d2 llama a animar() desde documento_animar): marcada.
- 40g: docs/quickjs_amiga.md (el malloc con cabecera de 8 bytes), la cabecera de lib/maqueta.dash (line-height,
  flex, grid, position, lo medido guardado), lib/video.dash y lib/videos.dash (ya con sonido) y el README (las
  descargas al fichero, lo poco que ahorra reanudar TLS, line-height, WOFF2 y font-stretch, animaciones de CSS,
  fetch y XMLHttpRequest, crypto, el tope de 30 s, D1-D68, memoria y tiempos de hoy). Solo comentarios y textos:
  compilado dashweb para ver que nada se rompe.


### 2026-10-21 — Tarea 40h (la memoria de las imágenes)
- La traza dice al final cuánto ocupan las imágenes (`imagenes_kb`): en freemem.space 12.917 KB las cargadas y
  2.300 KB las copias escaladas que pide el pintor. Las de 820x480 se ven a 412x241 y la de 1376x768 a 453x442: el
  decodificador solo reduce por mitades sin bajar del tamaño pedido y luego se guardaba además la copia.
- lib/imagenes.dash `_imagen_a_su_vista`: al llegar, si se sabe dónde se ve (imagenes_vista de la última maqueta) y
  es mayor, se reduce a lo justo para cubrirlo con su proporción y se suelta la grande. freemem.space: imágenes
  4.251 KB y copias 0; la página gasta ~23 MB en vez de ~29. La captura, igual. El pico mientras se decodifican
  (~62 MB) no cambia: es de los decodificadores.
- Límite: si después se ve más grande (otra maqueta más ancha), se escala desde la reducida (más borrosa); el
  fichero sigue en T: por si hace falta decodificarla otra vez.
- Batería: 76/76.

### 2026-10-21 — Tarea 41a, primera parte (Acid2: hoja data: y bordes transparentes)
- Acid2 (http://acid2.acidtests.org/#top, abierta por la red; su referencia es una cara amarilla de 168x168) salía
  como un bloque rojo con la cara a trozos. No se copia al repo (no sé su licencia): tests/test_acid2.dash copia
  cada pieza que se arregla.
- La hoja <link rel="appendix stylesheet" href="data:text/css,..."> (quita el fondo rojo de .picture) no se leía:
  lib/estilo.dash `_estilo_cargar` lee las data: (con %XX o base64) y lib/recursos.dash no las pide por la red.
- border: 1em solid transparent se pintaba con el color del texto (rojo): css_color da -1 a transparent y a lo que
  no entiende. lib/maqueta.dash `_borde_lado`: alfa 0 no se pinta, alfa < 255 se mezcla, lo desconocido con color.
- Queda (mirando la captura): la barra roja de .eyes (los <object> con fallback, el fondo fixed, el orden de pintado
  del apéndice E), la nariz (:before/:after con bordes), la sonrisa (floats anidados, alturas negativas), la barbilla
  (line-height 4px en inline), la línea de la tabla (display: table en ul/li), el pelo (position: fixed con
  min/max-height) y la frente (overflow con width).
- Batería: 77/77.

### 2026-10-21 — font-size normal de 16 px (usuario)
- Comparando 13 y 16 px en freemem.space, meneame.net (fijan px: iguales) y pre.opentimetrack.com (rem: con 16 sale
  como en Chrome, hasta la tarjeta que parte la hora), el usuario eligió 16. lib/estilo.dash ESTILO_MEDIUM = 16.
- Tests que esperaban las medidas de 13 px puestos al día (test_estilo, test_maqueta, test_maqueta_css,
  test_animacion, test_jsdom_geometria): los nuevos valores cuadran con 16 (h1 2em 32 px, 0.8em 13 px...).
- Batería: 76/77 con solo test_maqueta pendiente de poner al día (sus 21 líneas, en tres pasadas); después las de maqueta 14/14. freemem.space entera en 23.623 ms.

### 2026-10-21 — Tarea 41a, segunda parte (ir a un #ancla: al borde de su caja)
- documento_y_de daba la y del primer dibujo del elemento (su texto): en Acid2 #top lleva padding-top 2em y todo
  salía 48 px más arriba que la referencia. Ahora da el borde de arriba de su caja (caja_y de la última maqueta;
  sin caja, como antes). Con eso "Hello World!" queda a 48 px y lo de arriba de la cara a 108, como la referencia.
- tests/test_acid2.dash: ancla a 100 con su texto debajo de los 40 px de relleno.
- Para comparar: la captura de dashweb y reference.png en (72, 108) lado a lado y ampliadas (guion en el
  scratchpad; Acid2 sigue sin copiarse al repo).
- Batería: 77/77.

### 2026-10-21 — $VER para el comando Version (usuario; hecho por la otra sesión dashweb, 56b0388)
- src/dashweb.dash: el @native texto_version lleva "$VER: dashweb 0.3.0-dev (21.10.2026)" (con
  __attribute__((used))). La fecha y la versión se cambian junto a DASHWEB_VERSION. Comprobado con strings en el
  ejecutable; en el Amiga sin probar. Copiado a Traspaso a las 21:17, compilado desde un HEAD limpio.

### 2026-10-21 — Tarea 41a, tercera parte (el parser de Acid2: sin unidad y ";" suelto)
- Cajas de cada pieza de Acid2 en dashweb (un test suelto, no guardado) contra las de Chrome (getBoundingClientRect
  relativo a .picture): lo que sale distinto, por orden: .parser (272x36 en vez de 96x12), la nariz (max-height 3em
  no se aplica: 60 de alto en vez de 48), la barbilla (sin el alto de línea del bloque: 4 en vez de 12), el
  blockquote y el address (el selector [class=second\ two] y el abs que envuelve un float), la frente (un hijo de
  12em se recorta a los 8em del padre), los ojos (#eyes-c baja bajo el float en vez de quedar detrás; .eyes no
  encoge), la sonrisa (floats anidados con width que no suben) y la tabla de ul/li (display: table en otros).
- lib/html5.dash guarda el modo de Hubbub: en quirks el documento lleva modo="quirks". lib/estilo.dash `_declarar`:
  fuera de quirks, una longitud sin unidad distinta de 0 en una propiedad de longitudes no cuenta (width: 200).
- lib/css.dash: un ";" entre reglas ya no se salta: va con el selector de la siguiente, que no vale y no cuenta
  (CSS Syntax 3), como en los navegadores. .parser sale ya de 96x12 como en Chrome.
- test_acid2: parser 2em/1em en estándar; en quirks width: 200 vale 200.
- Batería: 77/77.

### 2026-10-21 — Panel de progreso (usuario)
- El usuario quiere un artefacto que vaya señalando los progresos, las pruebas y lo que queda: "Progreso de
  dashweb" (https://claude.ai/artifact/6RpPSBd7iEVaXduBDX9QEA, del tipo Dashboard): tareas hechas, última batería,
  commits desde la v0.2.0-alfa, piezas de Acid2, el gráfico de las baterías, medidas antes y ahora, las pruebas de
  estándares, las tareas con filtro por estado y los commits.
- tools/panel_progreso.py saca los datos del plan, la bitácora y git; docs/panel/*.json, lo que no sale solo. Regla
  8b del loop: ponerlo al día tras cada commit.


### 2026-10-21 — El navegador se llama Tachyon (usuario)
- El usuario encontró un navegador "Dash Web" para iPhone/iPad y quiso otro nombre; tras buscar libres (Astrolabe,
  Valkyrie, Gaviero, DashNav... comprobados con búsquedas), eligió **Tachyon** (ningún programa de Amiga con ese
  nombre; fuera, solo proyectos pequeños sin relación).
- Cambiado lo que se ve: título de la ventana ("<página> - Tachyon"), "Acerca de Tachyon", $VER "Tachyon 0.3.0-dev",
  mui_app_begin("Tachyon", "TACHYON"), User-Agent "Tachyon/0.3 (AmigaOS)", la página de inicio, las direcciones
  internas tachyon:inicio, tachyon:marcadores y tachyon:cookies (abrir acepta también dashweb:...), los ficheros
  PROGDIR:Tachyon.marcadores, .prefs y .cookies (al arrancar, `ficheros_de_antes` renombra los dashweb.* si no hay
  nuevos), lo que escribe por la salida ("Tachyon: ... entera en"), el paquete (build/tachyon.lha con el cajón y el
  programa Tachyon, iconos Tachyon.info, LEEME e Instalar), el README y CLAUDE.md. Por dentro sigue dashweb (la
  carpeta, src/dashweb.dash, funciones y ganchos __dashweb_ del JavaScript, la rama dashweb de Dash).
- Con permiso del usuario: el repositorio de GitHub pasa a FreeMEM/tachyon (GitHub redirige el nombre viejo; origin,
  "Acerca de", el visor, el README y los documentos al día) y la carpeta a ~/Projects/tachyon (con un enlace
  ~/Projects/dashweb a ella para lo que aún la nombre). En Traspaso: el cajón Tachyon (con el paquete).
- Logo (elegido por el usuario tras muchas vueltas): una esfera azul con un anillo plano en perspectiva y dos cortes
  gruesos que siguen sus paralelos (la esfera queda incompleta y el ojo la completa; nada de líneas finas, para que
  aguante en iconos pequeños); letras Audiowide. `tools/logo_tachyon.py docs/logo` saca docs/logo/tachyon(_oscuro)
  .svg/.png (letras en trazos) y tachyon_marca(_oscuro) (cuadrada). El icono del Workbench (`ICONO_TACHYON` en
  tools/iconos_wb.py, 54x23 en 4 colores, píxel 1,35 veces más alto) lo saca `tools/logo_tachyon.py --icono`.
- Comprobado en el emulador con MUI 3.8: "Acerca de Tachyon" con "Tachyon 0.3.0-dev".
- Batería: 77/77 (1655 s; la primera, con la máquina cargada, dio 20 TIMEOUT en el grupo de red, que pasaron solos).

### 2026-10-21 — Tarea 41a, cuarta parte (la nariz de Acid2: max-height)
- max-height no se aplicaba a los bloques (solo a las imágenes): lib/maqueta.dash lo aplica tras height y
  aspect-ratio y antes de min-height, que gana (CSS 2.1 10.7); en % aún no (sin alto fijo del padre no cuentan).
- La nariz de Acid2 (float con height 60 %, min-height 80 % y max-height 3em; el padre sin alto) mide 168x48 como
  en Chrome (antes 168x60). tests/test_acid2.dash: "nariz: 168x48".
- Batería: 78/78 (1687 s, junto con las dos siguientes).

### 2026-10-22 — Letras finas que perdían trazos (usuario, visto por la sesión dash en CoffinOS)
- En freemem.space, con Lato 300 a 15-16 px, "Los" salía "_os" y faltaban palos en t, i, l: al pasar el glifo de
  stb_truetype a 1 bit (gris >= 112), un palo fino que cae entre dos píxeles al 50 % se quedaba sin ninguno. No era
  la FPU de Amiberry (lo sospeché primero: en FS-UAE, 68020 y 68040 con JIT, sale igual) ni el WOFF2 (comprobado en
  el PC contra fontTools).
- lib/fuente_web.dash `_fw_tinta`: además, el más oscuro de una pareja de vecinos (al lado, arriba o abajo) que
  entre los dos pasan de 150 sin que ninguno llegue a 112. Lato Light queda entera; las demás, igual o un poco más
  llenas.
- test_fuente_web: Lato Light (tests/pages/LatoLight.woff2, el subconjunto latino de Google Fonts, OFL en
  LatoLight.LICENSE) a 15 px, el palo de la L entero (con el umbral de antes da false).
- Batería: 78/78. Visto por el usuario en CoffinOS: las letras finas salen enteras.

### 2026-10-22 — El menú de freemem.space partido (usuario, visto por la sesión dash)
- El menú (<nav> flotante, <li> inline-block, <a> de bloque con padding 0 10px) salía con cada <li> en una
  columna estrecha y el texto partido ("INI / CIO"). Al medir el ancho de un flotante por lo dibujado solo
  contaba el texto: el relleno del <a> quedaba fuera y cada <li> salía 20 px más estrecho que su texto (la palabra
  se partía por el word-wrap: break-word de la página, que es correcto).
- lib/maqueta.dash `_sangrias`: al medir (_ancho_flotante_medir y lo guardado de _medida_de), cada dibujo cuenta
  con los márgenes, bordes y rellenos de sus cajas (las que no van en línea) hasta la caja medida;
  _medida_poner deja su resumen colgado del padre del medido para que se sigan sumando las de fuera.
- tests/test_maqueta_menu.dash: el menú en una línea de 50 px (728 de ancho) y un flotante con un <p> de margen 7,
  borde 5 y relleno 8: 140.
- Batería: 78/78. Visto por el usuario en CoffinOS: el menú casi en una línea (ARDUINO aún baja: sigue).


### 2026-10-22 — El menú de freemem.space, segunda parte (ARDUINO bajaba a otra línea)
- Con text-align: center (el del menú), un <li> inline-block va en la línea como una pieza; el salto de línea del
  HTML que le sigue se pegaba a esa pieza (texto " " y 8 px más). Al medir el <nav> salía bien (el espacio entre
  los <li> cuenta), pero al repartir la línea el último <li> llevaba su espacio pegado, no cabía y bajaba; la fila,
  centrada, empezaba en x 135. Copia local de freemem.space a 1390 px: ahora una línea desde el borde del <nav>.
- lib/maqueta.dash: tras un inline-block (como tras una imagen o un control) el blanco va delante de lo siguiente
  (m.blanco), y `_pieza_caja` toma el blanco de antes de maquetar la caja aparte (que lo ponía a 0).
- test_maqueta_menu: centrado y con saltos de línea entre los <li>: una línea, con 8 px entre cada dos.
- Queda: un espacio al final de una palabra cuenta al ver si cabe la última de la línea (en los navegadores
  cuelga); la línea con inline-blocks sale 2 px más alta que en Chrome.
- Batería: 66/78 con 12 TIMEOUT en cascada en el grupo de red (compilaba a la vez); repetidas por grupos, todas
  pasan (http_volcar, imagen 4/4, jquery, js_fetch, jsdom 6/6, recursos, red, video_cartel, youtube).

### 2026-10-22 — El blanco del final de una palabra cuelga (CSS Text 3, 4.1.3)
- Una palabra al final de un texto lleva su blanco pegado ("bbb "); al ver si cabía en la línea contaba también ese
  espacio y la palabra bajaba a la siguiente aunque sin él cupiera justa. En los navegadores ese blanco cuelga.
- lib/maqueta.dash `_cuelga`: en `_lineas`, una pieza de texto que acaba en blanco cabe si sin él cabe.
- tests/test_maqueta_cuelga.dash: en 56 px "aaa bbb" seguido de " <b>c</b>": "bbb" en la primera línea (antes,
  en la segunda).
- Batería: 79/79 (1688 s).


### 2026-10-22 — Tarea 41a, quinta parte (la barbilla de Acid2: el strut)
- CSS 2.1 10.8.1: cada línea empieza con una caja vacía de la letra y el line-height de su bloque, así que no es
  más baja que él. lib/maqueta.dash `_poner_linea` (la rama con line-height): si el bloque tiene line-height, su
  strut cuenta para la base y lo de abajo de la línea.
- La barbilla de Acid2 (texto de 2px/4px en un bloque con line-height 1em de 12 px) mide 12 como en Chrome (antes
  4). test_acid2: "barbilla: 12". Las 16 de maqueta pasan igual.
- Batería: 79/79 (1689 s).

### 2026-10-22 — Tarea 41a, sexta parte (la cuarta línea de Acid2: [class=second\ two])
- lib/css.dash `_css_sel_atributo`: el valor de un selector de atributo con escapes se desescapa (sin comillas,
  "second\ two" es "second two"); antes se comparaba con la barra y no casaba nada.
- Con eso la cuarta línea de la cara sale como en Chrome: el <address> flotante de 48x12 y el <blockquote> absoluto
  sin ancho encoge a él con sus bordes de 2em: 96x12 (el encogido ya iba). test_acid2: "cuarta: 48x12 | 96x12".
- Batería: 79/79 (1690 s).

### 2026-10-22 — Tarea 41a, séptima parte (la frente de Acid2: un hijo más ancho que su padre)
- Un width mayor que el sitio del contenedor se ignoraba siempre (a propósito: que una página de 1200 px quepa en
  la ventana del Amiga). lib/maqueta.dash `_bloque_de_ya`: ahora desborda por la derecha (CSS 2.1 10.3.3) si la
  caja sigue dentro de la ventana (estilo_vw); si no, se queda en lo que cabe, como antes.
- La frente de Acid2 (padre de 8em, hijo de 12em) sale como en Chrome: 96 y 144. test_acid2: "frente: 96 144 |
  ventana: 300" (un hijo de 600 px en una ventana de 400 sigue en 300).
- Batería: 79/79 (1691 s).

### 2026-10-22 — Tarea 41a, octava parte (tablas de CSS: la última línea de Acid2)
- Un elemento con display: table cuyos hijos no eran <tr>/<td> no maquetaba nada de dentro (Acid2: el <ul> con
  <li> de display table-cell, table y list-item; y cualquier página que haga tablas con <div>).
- lib/maqueta.dash `_filas` y `_celdas_de` (CSS 2.1 17.2.1): filas y celdas también por display (table-row,
  table-*-group, table-cell); lo que no es fila va a una fila anónima, y lo que no es celda a una celda anónima, una
  por tramo seguido (`_tramo_anonimo`: la caja de bloque de `_anonima`, sin cambiar el padre de lo de dentro).
- Una tabla de CSS (no <table>) sin width encoge a su contenido (`_bloque_de_ya`), como en Chrome.
- tests/test_maqueta_tabla_css.dash: la línea de Acid2 (ul 48x12, cuatro de 12x12), dos celdas de <div> en fila y
  dos <p> sueltos en la misma celda anónima, uno bajo el otro. test_maqueta_tabla igual.
- Batería: 80/80 (1707 s).

### 2026-10-22 — Tarea 41a, novena parte (la sonrisa de Acid2: anchos de flotantes anidados)
- La sonrisa: un absoluto sin ancho con un <span> flotante (display: inline, bordes de 1em a los lados) con un <em>
  flotante con un <strong> de width 6em que no pinta nada. Chrome: 120, 96 y 72; dashweb daba 25, 25 y 1.
- lib/maqueta.dash: al medir, un bloque con width (no %) deja un rectángulo vacío de su caja (cuenta como las cajas
  con width: su ancho llega aunque no pinte nada); `_sangrias` cuenta como bloque un flotante o un absoluto aunque
  diga display: inline (los bordes del <span> se perdían). Con eso x y anchos como en Chrome.
- Queda: en Chrome el margin-top del hijo se junta con el del padre (.smile, 5em, y su <div>, 0.25em: el colapso de
  márgenes entre padre e hijo, CSS 2.1 8.3.1); en dashweb no, y la sonrisa queda 3 px más abajo. Es general: va
  aparte.
- test_acid2: "sonrisa: 48 120 | 60 96 | 72 72". Las 17 de maqueta pasan igual.
- Batería: 80/80 (1711 s).

### 2026-10-22 — Tarea 41a: Acid2 en 10 de 11 piezas; lo que queda, a la 41a2
- Hechas (41a, partes 1 a 9): hoja data: y bordes transparentes, ir a #top, el parser, la nariz (max-height), la
  barbilla (el strut), la cuarta línea ([class=second\ two]), la frente (desbordar), la línea de la tabla (tablas de
  CSS y anónimas) y la sonrisa (anchos de flotantes anidados).
- Los ojos piden flotantes como en CSS: #eyes-c, un bloque detrás del flotante #eyes-b, debe ir encima de él (los
  bloques no se apartan de los flotantes; solo sus líneas). dashweb pone todo lo que no flota debajo de los
  flotantes, así que el texto tampoco rodea una imagen flotante. Es un cambio de fondo en la maqueta: tarea nueva
  41a2 en el plan, con el colapso de márgenes padre-hijo (los 3 px de la sonrisa).

### 2026-10-22 — Tarea 41a2, primera parte (el texto rodea los flotantes)
- Lo que seguía a un flotante iba siempre debajo de él. Ahora el texto del mismo bloque lo rodea (CSS 2.1 9.5): sus
  líneas van a su lado, más cortas, y debajo vuelven a todo el ancho; una palabra que no cabe al lado baja hasta
  donde acaba el flotante. Un bloque que sigue a un flotante aún va debajo (segunda parte).
- lib/maqueta.dash: `_lineas` toma el sitio de cada línea de `_hueco` (lo que dejan los flotantes de `_flot_linea`
  a esa altura); `_contenido` pone sus flotantes en `_flot_linea` mientras reparte sus líneas (`_lineas_flot`) y lo
  deja a nil para lo de dentro. Un flotante que llega tras texto va debajo de ese texto.
- tests/test_maqueta_rodea.dash: flotante a la izquierda (líneas de al lado en x >= 100 y dentro de los 200 px;
  debajo, a todo el ancho), a la derecha (acaban antes de x 100) y una palabra que no cabe al lado (baja).
- Batería: 81/81 (1728 s). es.wikipedia.org/wiki/Amiga_1200 sale igual antes y después de este cambio (el texto
  aplastado ya pasaba antes: tarea nueva 41a3); con las tablas de CSS (41a, octava parte) ya sale la ficha con la foto.

### 2026-10-22 — Tarea 41a3 (Wikipedia: el texto salía de 0 px)
- Vector 2022 pone en <html> --font-size-medium: var(--font-size-medium, 1rem) y .vector-body { font-size:
  var(--font-size-medium) }. Una --x que se nombra a sí misma es un ciclo (CSS Variables 1, 2.3): inválida. dashweb
  daba vueltas hasta el tope y dejaba el var() sin resolver: font-size 0 px y el artículo entero aplastado.
- lib/estilo.dash: `_var_cicla` (directo o por otras --x): la --x queda VAR_INVALIDA y quien la usa toma su respaldo;
  un var() que se queda sin valor ni respaldo no se aplica (font-size y lo heredado se quedan como el padre).
- lib/maqueta.dash `_con_mascara`: una caja con mask-image (url) no pinta su fondo (los iconos de Wikipedia son un
  fondo del color del texto recortado por un SVG; sin máscaras salían cuadrados negros al dejar de medir 0).
- es.wikipedia.org/wiki/Amiga_1200 en el emulador (RTG, MUI 3.8): el artículo se lee, con la ficha y su foto.
- test_estilo_vars: "ciclo: 20px 3px"; tests/test_maqueta_mascara.dash.
- Batería: 82/82 (1743 s).

### 2026-10-22 — Tarea 41a2, segunda parte (un bloque pasa por debajo de los flotantes)
- Un bloque normal detrás de un flotante ya no baja: va donde iría sin él (le pasa por debajo, CSS 2.1 9.5) y sus
  líneas lo rodean, también las de los bloques de dentro (`_flot_fuera`: _contenido se los pasa al bloque y el
  _contenido de este los toma; `_flotantes_juntos` junta los de fuera con los suyos). Su fondo se pinta debajo del
  flotante (`_flotantes_encima` deja los dibujos del flotante detrás de los del bloque; apéndice E).
- Van debajo, como antes: con clear (también de los flotantes de fuera), los que son un contexto aparte
  (`_pasa_por_debajo`: overflow, flex, grid, tabla, flow-root, imagen o vídeo) y tras un inline-block que va como
  flotante (Flotante.real).
- test_maqueta_rodea: un <p> con fondo detrás del flotante empieza arriba, con líneas al lado y su fondo antes que
  el flotante; con overflow: hidden o clear: both, debajo. Las 19 de maqueta pasan igual.
- Batería: 82/82 (1750 s).
- En el emulador (RTG, MUI 3.8): en es.wikipedia.org/wiki/Amiga_1200 el primer párrafo ya rodea la ficha (antes
  bajaba entero debajo); la ficha sale cortada igual que antes (aparte). freemem.space igual, y su menú desplegado
  con ARDUINO en su sitio. Capturas enviadas al usuario.

### 2026-10-22 — Publicada la v0.3.0-alfa (la primera como Tachyon)
- Usuario: "Sí sube". Versión 0.3.0-alfa en Acerca de y $VER (c509ccc), README con la descarga nueva. PR #4 de dev a
  main fusionado (a0298f3), etiqueta v0.3.0-alfa sobre él y pre-release
  https://github.com/FreeMEM/tachyon/releases/tag/v0.3.0-alfa con build/tachyon.lha (6,7 MB), hecho con
  tools/paquete.sh en un worktree limpio de a0298f3 (sin la segunda parte de 41a2, aún sin guardar) y Dash d39d8d9.
- Base: 82/82 (df361b3). Probado en la máquina rtg con MUI 3.8: freemem.space entera en 23,9 s, bien.
- Avisada la sesión dash (iba a crear ella la release): ya está hecha.

### 2026-10-22 — Tarea 41a2, tercera parte (márgenes de padre e hijo juntos)
- El margen de arriba de un bloque se junta con el de su primer hijo de bloque (CSS 2.1 8.3.1): queda el mayor de los
  positivos más el menor de los negativos, fuera del padre (su fondo empieza ahí), y el hijo ya no pone el suyo.
  lib/maqueta.dash: `_primer_hijo_colapsa` (el padre es un bloque normal sin borde ni relleno arriba, overflow
  visible, no flota, ni va fuera del flujo, ni es la raíz o una caja de flex o grid; delante del hijo solo blancos),
  `_margen_colapsado`, `_margen_absorbido` (en `_bloque_en`) y `_margen_arriba` (frente al hermano de antes cuenta el
  margen ya juntado). El de body se junta con el de su primer hijo, como en Chrome (body 8 + h1 21 daba 29; ahora 21).
- Pendiente: el de abajo (el último hijo con su padre sin alto) y los bloques vacíos que se atraviesan.
- tests/test_maqueta_margenes.dash (siete casos); test_maqueta: todo 4 px más arriba (body 4 con p 6 da 6).
- Acid2 en el navegador (RTG): la sonrisa sube los 3 px. Ojo: en el navegador de verdad Acid2 sale bastante peor que en
  las piezas de test_acid2 (con el código guardado, igual): "Hello World!" a la vista al ir a #top, un hueco grande
  entre la frente y la sonrisa y una barra roja a lo ancho. Apuntado en la 41a2.
- Batería: 82/83 (1775 s): test_jsdom_geometria esperaba el sticky con su <p> 16 px más abajo (sticky 10 26); su
  margen ahora va fuera del sticky y Chrome da "sticky 10 10" (comprobado): expectativa corregida, pasa.
- es.wikipedia.org/wiki/Amiga_1200 y freemem.space en el emulador (RTG, MUI 3.8): iguales que antes.

### 2026-10-22 — Tarea 41a2, cuarta parte (Acid2 entera: márgenes vacíos, clear y el ancho de .eyes)
- Medida Acid2 entera (tests/pages/acid2.html) contra Chrome a 944 px: lo que separaba la frente de la sonrisa eran
  márgenes que se juntan y dashweb sumaba.
- lib/maqueta.dash, márgenes (8.3.1) como conjuntos (`_acum_pos`/`_acum_neg`: el mayor positivo más el menor
  negativo): el de abajo del último hijo se junta con el de su padre (`_colapsa_abajo`, alto auto) y va fuera de él;
  un bloque vacío (`_vacio`: sin borde, relleno ni alto, solo vacíos dentro) junta sus dos márgenes con los de al lado
  (.empty de Acid2: 48, 75, 75 y -72 dan 3); un flotante en medio ya no corta la unión. `_contenido` lleva el borde
  de abajo del anterior (base) y lo que queda por juntar (pend_pos/pend_neg).
- clear: el borde de arriba no queda por encima del fondo de los flotantes, sin sumarle el margen (la holgura de
  9.5.2; la sonrisa en 204 como en Chrome, no en 264). Lo que no es clear y es un contexto aparte, como antes.
- Al medir un ancho, una línea alineada a la derecha va a la izquierda: #eyes-a (text-align: right) ensanchaba .eyes
  a 884 (Chrome 144). Con las centradas también, la ficha de Wikipedia (tabla flotante) salía del ancho entero: solo
  las de la derecha.
- Comprobado en páginas: freemem.space se quedaba en 253 px de alto. Su columna son dos flotantes y un clearfix
  (::after vacío con clear): lo tomaba por vacío y no bajaba, y el padre no abarcaba los flotantes. Uno que baja por
  clear ya no es vacío; y en `_vacio` los % (relleno, alto) se miran contra 10000, no contra 0 (un padding-bottom en
  % no es vacío). Caso nuevo en test_maqueta_margenes. Wikipedia y freemem.space, como antes.
- Batería: 84/84 (1860 s).
- tests/test_acid2_pagina.dash: doce cajas de la cara iguales que en Chrome. Falta ul (276 de ancho, Chrome 48: la
  celda anónima de .second-part sale de 240). test_maqueta: alto 276 (el margen de abajo del último p con el de body).
- Usuario: capturas de CoffinOS (Wikipedia, Google, Menéame, Xataka) con la compilación de las 00:50; puesta en
  Traspaso la v0.3.0-alfa publicada. Lo visto, a la tarea nueva 42.

### 2026-10-22 — Tarea 42f (amigaworld.net: su hoja y las tablas en modo quirks)
- La hoja va en `<style><!-- @import url(.../style.css); --></style>`: lib/css.dash no saltaba `<!--` ni `-->`
  (CDO y CDC de CSS 2.1 4.1.1) y el @import se perdía (body 12px, enlaces sin subrayar). `_css_bloque` y
  `css_importes` los saltan entre reglas. La declaración rota de esa hoja ("color;#000000; font-size: 12px;") ya no
  se llevaba la de detrás (comprobado).
- Los temas salían centrados: la columna es un `<td align=center>` y la tabla de los temas va dentro. En modo quirks
  una tabla no hereda font-size, font-weight, font-style, line-height, white-space ni text-align (HTML 15.3.1, regla
  del navegador `table { ...: initial }`): lib/estilo.dash `_estilo_propio` se las pone como del navegador a cada
  <table> (las de la página mandan).
- tests/test_css_cdo.dash y tests/test_estilo_quirks.dash. amigaworld.net en el emulador (RTG): letra de 12 px, temas
  a la izquierda con su icono, como Chrome. Queda: la columna de la derecha (Aminet más ancha que las de arriba; en
  Chrome todas igual de anchas).
- Batería: 86/86 (1881 s).

### 2026-10-22 — Tarea 42b (google.com: el icono de aplicaciones, nueve círculos enormes)
- El icono es un `<svg viewBox="0 0 24 24">` sin width ni height dentro de un `a.gb_C` de 40 px con 8 de relleno.
  Los navegadores le dan el ancho de su caja (24) y el alto en proporción (CSS 2.1 10.3.2); dashweb, 300x150 (los
  puntos, 12 veces más grandes).
- lib/maqueta.dash (`_piezas`, <svg>): sin ancho y con viewBox, con alto (CSS o atributo) el ancho en proporción y sin
  él el ancho de la línea; al medir una caja que encoge, como antes (300).
- tests/test_maqueta_svg_tam.dash (cinco casos). google.com en el emulador: los nueve puntos, pequeños. Queda: la
  barra de arriba (Gmail, Imágenes, el icono) no va a la derecha junto a "Iniciar sesión" como en Chrome.
- Batería: 87/87 (1886 s). freemem.space y Wikipedia en el emulador, como antes.

### 2026-10-22 — Tarea 42c (resultados de Google: el título y la dirección en una línea; el logo partido)
- Cada resultado es `<a><div relative><div padding-top:28px><h3>título</h3></div><div absolute top:0>dirección</div>
  </div></a>`: bloques dentro de un elemento en línea. dashweb los aplanaba en piezas de la línea (sin saltos ni
  absoluto): la dirección iba pegada tras el título. lib/maqueta.dash `_contenido`: un elemento en línea con bloques
  dentro se parte alrededor de ellos (CSS 2.1 9.2.1.1; `_en_linea_con_bloques`, `_aplanar`): sus hijos van como si
  fueran del bloque, con el enlace del <a> (`_enlace_bloque`, que pasa a los bloques de dentro) y su estilo para el
  texto suelto.
- El logo (seis inline-block en una caja absoluta que encoge) bajaba la "e": lleva position: relative; left: -1px y
  al medir el ancho contaba lo movido (1 px menos). Al medir (`_midiendo`), ni relative ni transform (no mueven a
  los demás).
- tests/test_maqueta_partido.dash: tres líneas en <a>x<div>y</div>z</a>, dirección arriba y título debajo con su
  enlace, el logo en una línea. Queda: "›" (U+203A) sale como "'" en las direcciones.
- Un flotante o un absoluto con display: inline no se parte (es un bloque): la sonrisa de Acid2 (span flotante con
  un strong de bloque dentro) se quedaba en 0x0.
- Batería: 88/88 (1901 s). freemem.space y Wikipedia en el emulador, como antes.

### 2026-10-22 — Tarea 42d y 42e, primer vistazo (Menéame y Xataka)
- 42d meneame.net: en el emulador (1024) salen las noticias; con traza a 1620 px (el ancho de CoffinOS) #newswrap
  tiene sus noticias de x 164 a 1144 y #sidebar flota a 1148: no se reproduce con el código de hoy (la captura del
  usuario era de la compilación de las 00:50). Puesta en Traspaso la compilación de hoy (acc833c) para que lo mire.
- 42e xataka.com: entera en 181 s en el emulador (un script se corta a los 30 s; ChunkLoadError del chunk 915). El
  aviso de cookies es de Didomi (sdk.privacy-center.org) con el muro de Webedia "Elige cómo acceder": sale dentro de
  la página, arriba, y no por encima como en Chrome. Las imágenes son <img> JPEG normales (i.blogs.es) y
  <picture> con <source media>; a los 150 s faltaban 52. Pendiente: por qué no cierra "Aceptar y Cerrar" (clic con
  --acciones tras la carga) y si las imágenes llegan.

### 2026-10-22 — Tarea 42e (xataka.com: las hojas que mete el JavaScript)
- En Chrome el aviso es de Didomi: `<style id=didomi-css>` de 91 KB que su JavaScript mete en el body tras la carga;
  con él, #didomi-popup es fijo por encima de todo y `.didomi-buttons { display: none !important }` esconde su
  "Aceptar y Cerrar" (se ven los botones del muro de Webedia). dashweb hacía las hojas una vez, tras los primeros
  scripts: un <style> que llegaba después no se aplicaba nunca (el aviso salía sin estilo, dentro de la página).
- lib/documento.dash `documento_al_dia`: si algún cambio toca un <style> o <link> (`_documento_toques_hojas`: entra,
  sale, cambia su texto, o TOQUE_TODO), mira `estilo_firma` (lib/estilo.dash: el largo del texto de cada <style> y la
  dirección de cada <link> de hoja); si cambió, las hojas otra vez (las de fuera ya traídas no se piden: `traidas`) y
  el estilo entero. tests/test_documento_hojas_js.dash (entra, cambia, sale; un cambio que no toca hojas no las rehace).
- xataka.com en el emulador (RTG): el aviso ya sale encima, con su fondo, dos columnas y los botones del muro (sus
  letreros, diminutos: pendiente). El clic en el botón verde llega a Didomi (setUserAgreeToAll) pero da "Error: Cycle
  detected" (Preact signals): probablemente porque antes un script suyo pasó de 30 s y se cortó (40c), y el corte de
  QuickJS no ejecuta los finally y deja una señal a medias. Pendiente: el corte sin estado roto, o más plazo.
- Batería: 89/89 (1984 s). Wikipedia rehace las hojas 5 veces (los estilos de MediaWiki que llegan por JavaScript; "18 idiomas" ya lleva su flecha), entera en 60 s como antes; freemem.space ninguna, 28,6 s.

### 2026-10-22 — Tarea 42e, segunda parte (el corte de los 30 s sin dejar el JavaScript roto)
- El "Cycle detected" de Didomi al pulsar: el corte de los 30 s (40c) había parado un script dentro del `get` de un
  computed de Preact signals, y QuickJS lo marca como imposible de coger: se salta los finally y el computed se queda
  marcado como "corriendo" para siempre. Cambio 5 de QuickJS (docs/quickjs_amiga.md): `JS_SetInterruptCatchable`;
  lib/js.dash corta primero con un "interrupted" que se puede coger (corren catch y finally) y, si el script sigue 5 s
  más, con uno que no. test_js_tope: el finally corre; uno que lo coge y sigue se corta del todo a los 7 s.
- Por qué pasa de 30 s: el cargador de Didomi elige su SDK "legacy" (dashweb no tiene noModule: no ejecuta
  type=module, así que es lo correcto) y ahí un computed junta los ~1044 socios con reduce y la extensión de objetos
  de Babel (cada paso copia todo lo de antes con defineProperty): cientos de miles de copias, más de 30 s en el 68k
  emulado (RTG). Con el tope en 300 s (de prueba, no guardado) xataka.com tarda 315 s en cargar y tras el clic el aviso
  ya no está (sin comprobar si llegó a verse antes del clic).
- Queda: que el clic cierre el aviso con el tope de 30 s (el cálculo se corta y Didomi se queda sin su lista); y si
  merece la pena un tope mayor, o acelerar QuickJS en defineProperty, o mirarlo en CoffinOS (que puede ser más rápido).

### 2026-10-22 — Tarea 42e, tercera parte (captura del usuario en CoffinOS: letra diminuta y el aviso corto)
- Usuario: xataka.com en CoffinOS (compilación de las 13:56) con el aviso encima, pero títulos, enlaces y letreros
  diminutos, y la página de abajo sin tapar desde la mitad.
- Letra diminuta: Didomi pone `#didomi-host a, #didomi-host p, #didomi-host span { font-size: inherit }`. lib/estilo.dash
  copiaba bien el del padre con inherit y luego, al calcular font-size, medía "inherit" como tamaño: 0 px. Ahora
  inherit y unset dejan el del padre e initial da medium. tests/test_estilo_hereda.dash.
- El aviso corto: su fondo es position: fixed con top: 0 y bottom: 0, del alto de la vista (estilo_vh), que dashweb
  solo ponía al maquetar por un ancho nuevo; con la ventana más alta que cuando se maquetó, el fijo se quedaba corto.
  src/dashweb.dash `pinta_en`: estilo_vh siempre el de la vista y, si el documento se maquetó con otro alto
  (Documento.vh), otra maqueta.
- Error mío: al parar una batería maté con `pkill -f fs-uae` emuladores de la sesión dash (sus test_meter_);
  avisada. Apuntado en la memoria: matar solo por PID con padre propio.
- Batería: 90/90 (2000 s). freemem.space y Wikipedia en el emulador, como antes. Compilación puesta en Traspaso.

### 2026-10-22 — Tarea 42e, cuarta parte (las imágenes de las tarjetas de Xataka)
- Las tarjetas: `.poster-figure a { position: relative; height: 0; padding-top: 75% }` y dentro `<picture>` con su
  `<img>` absoluto (`width/height: 100%`, top/left/right/bottom 0, object-fit: cover). dashweb no veía el absoluto
  (va dentro del <picture>, en línea): lo ponía como pieza de la línea, debajo de la caja de alto 0 y tapado por el
  overflow; y el height: 100 % de una imagen absoluta no contaba.
- lib/maqueta.dash: `_absolutos_de` (los absolutos de un bloque, también los de dentro de algo en línea suyo); `_piezas`
  salta lo absoluto o fijo; `_absoluto_imagen`: height en % del alto de su caja de referencia (con el relleno) y, sin
  height ni atributo, con top y bottom, lo de en medio. object-fit: cover ya lo hacía el pintor.
- tests/test_maqueta_absoluto_img.dash (la tarjeta: 0,0 344x258 como en Chrome; un absoluto dentro de un span).
- Batería: 91/91 (1983 s). xataka.com en el emulador: el aviso se lee entero (títulos, "Aceptar y leer GRATIS") y detrás asoman las fotos de las tarjetas; el euro sale "?" (Latin-1). freemem.space y Wikipedia, como antes.

### 2026-10-22 — Tarea 42, los caracteres (el euro de Xataka, la "›" de Google) y la 42a
- Lo que vuelve del JavaScript (lib/js.dash `_js_latin1`) cambiaba por "?" todo lo que no cabe en Latin-1, sin los
  sustitutos de lib/texto.dash: el precio del aviso de xataka.com salía "2?". `_js_parecido`: los mismos que
  `latin1_de` (euro "EUR", comillas rectas, "-", "...", "TM"...), nunca más largos que su UTF-8 (se escribe en el
  sitio). test_js_utf8: "vuelta".
- U+203A y U+2039 (› ‹, los separadores de las direcciones de los resultados de Google) pasan a » y « (antes "'"),
  en las dos tablas. test_texto.
- 42a (Wikipedia a 1650 px en CoffinOS, aplastada): era la compilación de las 00:50, sin la 41a3; a 1024 se ve bien
  desde la v0.3.0-alfa. A 1620 px sin comprobar: tools/traza.py no acaba en 10 minutos con el JavaScript de
  Wikipedia. Pendiente de que el usuario la mire en CoffinOS.
- Pendiente de decisión del usuario: el tope de los 30 s (con él, el botón del aviso de Xataka no lo cierra).
- Batería: 91/91 (1980 s).

### 2026-10-22 — Tarea 41a2, quinta parte (el ul de Acid2: celdas anónimas que contaban los márgenes del ul)
- El ul de Acid2 (display: table, margin 0 7em) medía 216 de ancho (Chrome 48): sus <li> que no son celdas van en una
  fila anónima y en celdas anónimas (17.2.1), pero su padre sigue siendo el ul; al medir una celda anónima,
  `_sangrias` subía desde el <li> buscando la celda (que no es su antepasado) y sumaba los márgenes del ul (84 + 84):
  la columna medía 180 y lo sobrante se repartía.
- lib/maqueta.dash `_ancho_flotante_medir`: si lo medido es una caja anónima (`_es_hijo`: no está entre los hijos de
  su padre), `_sangria_corte` es el primero de arriba que está de verdad en el árbol y `_sangrias` para ahí.
- test_acid2_pagina: ul 132,264 48x12, como Chrome; ya son trece cajas de la cara iguales.
- Batería: 91/91 (1977 s). Acid2 en el navegador (RTG): ya es la cara entera, solo con rojo junto a los ojos (el <object> con la imagen) y una raya roja bajo la barbilla. freemem.space y Wikipedia, como antes (una carga de Wikipedia salió sin su JavaScript, 19 s y 2 MB: fallo de red; repetida, 56 s y bien).

### 2026-10-22 — Tarea 41a2, sexta parte (los ojos de Acid2: <object> con imagen y el orden de pintado)
- <object>: lib/dom.dash `dom_objeto_imagen` (data:image/..., type image/... o una dirección .png/.jpg/.gif/.webp) y
  `dom_es_imagen`: se ve como un <img> de src su data (`dom_img_src`), sin lo de dentro; los demás enseñan lo de
  dentro. lib/imagenes.dash y lib/maqueta.dash preguntan `dom_es_imagen` donde preguntaban por "img". Los ojos de
  Acid2 son el tercer <object> de una cadena en la que los dos de fuera fallan (tipo desconocido, 404 en HTML).
  tests/test_maqueta_objeto.dash.
- La imagen salía tapada por el fondo rojo de #eyes-c (que va después en el árbol): CSS 2.1 apéndice E pinta primero
  los fondos y bordes de los bloques, luego los flotantes y luego lo de las líneas. Dibujo.cat (0, 1, 2), puesto por
  `_dibujo` según el contexto (`_cat_fondo` en los fondos y bordes de `_bloque_en`; `_cat_atomica` dentro de un
  flotante, 1, o de un inline-block o una caja flex/grid, 2: se pintan enteros); un reemplazado de bloque va con los
  fondos. `_por_capas` ordena por capa, pos y paso (sin z-index ni posicionados, en tres montones, O(n)).
- Tests con el orden de los dibujos (test_maqueta, _cajas, _css, _transform): las mismas líneas, en el orden nuevo
  (comprobado: mismo conjunto); test_maqueta_flex y _grid buscan el contenedor de cada caja por su padre.
- Con el orden nuevo, amigaworld.net perdía los iconos de los temas (flotantes en las celdas): el fondo de la fila
  (bgcolor del <tr>, que pinta `_tabla`) iba como contenido y los tapaba; ahora va con los fondos.
  tests/test_maqueta_pintado.dash (solapa, fila, inline-block). test_animacion: el mismo cambio de orden.
- Acid2 en el navegador: ya con los ojos (los círculos de la imagen) y la sonrisa curva. Queda: la trama del fondo de
  los ojos (dos fondos fixed desplazados 1 px que juntos dan amarillo) y algo de rojo.
- Batería: 93/93 (2009 s). freemem.space, Wikipedia, Xataka (ya "2EUR") y amigaworld.net (con sus iconos) en el emulador, bien.

### 2026-10-22 — Tarea 41a2, séptima parte (fondos fixed y el marco de las imágenes en la línea)
- El atajo background perdía "fixed" y los sitios en px ("fixed 1px 0" de los ojos de Acid2): lib/estilo.dash pone
  background-attachment y una longitud cuenta como sitio. tests/test_estilo_fondo.dash.
- lib/pintor.dash `_fondo_pintar`: con background-attachment: fixed los mosaicos van respecto a la esquina de la vista
  (`_pintor_vx/_vy`), y el primero se adelanta hasta justo antes de lo visible (desde la esquina, con mosaicos de 2x2,
  se llegaba al tope de 4000 antes de la caja). El cuadrado rojo fixed de la barbilla de Acid2 ya no se ve.
- Una imagen en la línea (<img> u <object> de imagen) con relleno, borde o fondo (`_img_marco`): la pieza los lleva
  alrededor; se pintan su fondo, su imagen de fondo (en el relleno) y sus bordes, y la imagen dentro. Sin nada de eso,
  como antes.
- Acid2 en el navegador: la fila de los ojos casi amarilla, con los ojos. Queda: un trozo con trama a la izquierda,
  algo de rojo a la derecha de los ojos y una raya roja abajo a la izquierda.
- Batería: 94/94 (2026 s). freemem.space y amigaworld.net, como antes; Wikipedia: la foto de la ficha ya con su borde gris de 1 px y fondo blanco (Chrome también: .mw-file-element).

### 2026-10-22 — Tarea 41a2, octava parte (el strut en las líneas sin texto)
- La raya roja bajo la cara de Acid2: .image-height-test (alto 10px, overflow: hidden, letra de 240 px) con una imagen
  roja de 64x64 en una celda: con el strut de la letra la imagen va sobre la línea base, muy abajo, y no se ve.
  dashweb solo ponía el strut con line-height; sin él, la imagen iba arriba de la línea.
- lib/maqueta.dash `_poner_linea`: una línea sin texto (imágenes, inline-block, controles) lleva también el strut de
  la letra del bloque (la medida de la fuente hasta 64 px; más grande, 0,9 del tamaño arriba y 0,25 abajo, sin abrir
  la fuente). Bajo una imagen sola queda lo que baja la letra, como en los navegadores.
- test_maqueta y test_maqueta_css: lo que va tras una línea solo con imagen, 2 px más abajo (lo que baja la topaz);
  comprobado que solo cambian esos números.
- Batería: 94/94 (2030 s). Acid2: ya sin la raya roja. freemem.space: las tarjetas 5 px más abajo (el hueco bajo una línea con solo una imagen, como en los navegadores); Wikipedia y amigaworld.net, como antes.

### 2026-10-22 — Tarea 42a (Wikipedia a 1650 px) y el límite de los scripts
- Con pantalla ancha (máquina nueva `rtgancha` de tools/medir_visor.py: uaegfx a 1680x1050, modo 0x50971100, que FS-UAE
  ofrece con fullscreen_width/height; sistema ~/.cache/dash-emu/sys32rtg38ancha) Wikipedia salía sin artículo: el índice
  a la derecha y la apariencia abajo. Dos causas: el atajo grid-template ("áreas" altos / columnas) no se partía
  (lib/estilo.dash `_grid_atajo`, también grid sin auto-flow) y los nombres de área se buscaban en minúsculas
  (columnStart, pageContent; lib/maqueta.dash `_grid_linea`). Ya en tres columnas como en Chrome.
- La barra de pestañas: una franja gris era la sombra "0 1px" de .vector-page-toolbar-container pintada debajo de su
  fondo transparente: lib/pintor.dash pinta las sombras de fuera solo alrededor de la caja (`_sombra_trozo`).
  "Leer" sobre "Discusión": al medir el botón ⋮, su menú absoluto con right: 0 llegaba al borde y la caja medía 697 en vez
  de 32: lib/maqueta.dash `_ancho_flotante_medir` no cuenta lo que va en un absoluto de dentro (`_bajo_absoluto`).
- test_maqueta_grid: el atajo con un área con mayúsculas.
- lib/js.dash: JS_SEGUNDOS de 30 a 120 (el usuario, para el aviso de cookies de Xataka).
- Comparado con Amelinium 1.4.0 (Aminet, 040_JS) en la misma máquina: tareas 42g y 42h nuevas (iconos como cuadrados,
  buscador de Wikipedia, » de amigaworld).
- Batería: 94/94 (2054 s); la anterior falló 51 por TIMEOUT con la máquina cargada (test_hola solo: 3 s, bien).

### 2026-10-22 — Página de inicio con el logo (usuario)
- src/dashweb.dash `dw_inicio`: el logo (docs/logo/tachyon.svg en PNG de 366x65 y 32 colores, 1,8 KB, como data: en
  LOGO_INICIO), el lema, un buscador (Google), seis accesos en tarjetas (marcadores, cookies, Aminet, AmigaWorld.net,
  Wikipedia, el GitHub de Tachyon) y la versión. El aviso del script cortado dice 120 s.
- Comprobada en el emulador ancho: bien. El campo del buscador no toma el width de la hoja (los controles van con su
  tamaño).

### 2026-10-23 — Tarea 42g, primera parte (iconos de máscara y fuentes de iconos)
- mask-image con url: antes solo se dejaba de pintar el fondo (el icono no salía). Ahora la imagen de la máscara se pide
  como un fondo con la clave "mascara:color:dirección" (lib/colores.dash `mascara_clave`, lib/imagenes.dash
  `_imagenes_pedir_mascara`), se tiñe del background-color al decodificarla (lib/imagen_dec.dash `_imgdec_tenir`,
  también en la otra tarea) y se pinta como un D_FONDO de estilo 1 en la caja del borde, con mask-size,
  mask-position y mask-repeat (lib/pintor.dash `_fondo_valor`). Wikipedia: ☰, ⋮ y el de idiomas.
- El recuadro que los rodeaba: el borde "transparent" de los botones quiet de Codex con border-radius se pintaba con el
  color del texto (el borde redondo no miraba la transparencia): lib/maqueta.dash `_borde_invisible`. Un control con
  opacity: 0 en la línea, velado.
- Xataka: sus fuentes de iconos ponen primero el EOT (format('embedded-opentype')) y se elegía ese; ya el TrueType
  (lib/css.dash `css_fuente_src`). Los iconos siguen como cuadraditos: el pintor solo dibuja los de Font Awesome que
  conoce (segunda parte).
- tests: test_maqueta_mascara (la máscara teñida y el borde redondo transparente), test_fuente_web (el EOT).
- Batería: 94/94 (2036 s); test_fuente_web y test_css otra vez después (el cambio de css.dash entró a mitad).

### 2026-10-23 — Tarea 42g, segunda parte (los iconos de las fuentes de iconos)
- Las fuentes de iconos no se bajaban y el pintor solo dibuja a mano unos iconos de Font Awesome (el resto, un
  cuadradito). Ahora se bajan todas menos Font Awesome (700 KB; sigue a mano), hasta 4 aparte de las 8 de letras
  (lib/imagenes.dash `imagenes_pedir_fuentes`), y un icono de una de ellas se pinta con su dibujo: una fuente de Amiga
  con solo la "A", que lleva ese carácter (lib/fuente_web.dash `fuente_web_icono`, `_fw_icono`; las demás letras
  vacías, sin rasterizar), y en la línea va como texto "A" con ella (lib/maqueta.dash, "::icono"). La búsqueda del
  fichero por familia, aparte (`_fuente_web_fichero`).
- Xataka: el menú, la lupa y la fila de webs del grupo con sus iconos. Queda: esa fila sale sobre la barra de
  patrocinadores, faltan las redes y las secciones, y un icono sobre la U de "NUEVO" (en 42g).
- test_fuente_web: el icono (la W de Vera Mono como "A"; la "B" vacía).
- Batería: 94/94 (2038 s). freemem.space (Font Awesome, a mano) y amigaworld.net, como antes.

### 2026-10-23 — Tarea 42h (el buscador de Wikipedia)
- Un <input> de texto con display block (o inline-block, o hijo de un flex) se maquetaba como una caja más, con el
  fondo y el borde de la página y sin control: no enseñaba su texto, ni su placeholder, ni lo que se escribía (el
  buscador de Wikipedia, y los de muchas webs). lib/maqueta.dash: lleva un D_CONTROL de estilo 1 en su caja de
  contenido (`_campo_de_texto`), que no cuenta al medir anchos (como un fondo); lib/pintor.dash
  `_campo_propio_pintar`: sin marco, el texto (o el placeholder en gris) centrado en su alto, del color del texto, y el
  cursor. El control de siempre (en la línea) también pinta el placeholder y empieza tras el padding-left.
- Las » de amigaworld.net: igual que Chrome (no es fallo). El botón "Buscar" de Wikipedia sigue vacío (lo averiguado,
  en 42h) y tools/traza.py no acaba con imágenes data: SVG en utf8 (42j).
- tests/test_maqueta_campo.dash (nuevo): el control de un campo de bloque, uno en la línea y que no ensancha al medir.
- Batería: 95/95 (2138 s). Wikipedia: "Buscar en Wikipedia" en gris tras la lupa. Google y amigaworld.net, como antes.

### 2026-10-23 — Tarea 42i (GitHub) y el icono del índice de Wikipedia
- GitHub: el avatar enorme y la columna izquierda de la mitad de la pantalla. --Layout-sidebar-width (con mayúsculas):
  lib/css.dash pasaba a minúsculas también los nombres de las propiedades propias, y var(--Layout-sidebar-width) no
  la encontraba (los nombres de --x distinguen mayúsculas). Ya como en Chrome: la columna de 296, el avatar, el
  nombre, Follow, la biografía, los logros y los fijados en dos columnas.
- Wikipedia: la flecha de "Información Técnica" del índice salía como un cuadrado negro desde 42g (1): todos sus iconos
  llevan una máscara de relleno (un PNG de 1x1 opaco) y la buena, el SVG, va en @supports (mask-image: none), que
  dashweb decía que no. Las propiedades de máscara, ya conocidas para @supports (CSS_CONOCIDAS).
- tests: test_estilo_vars (--x con mayúsculas), test_estilo_capas (@supports de máscaras).
- Batería: 95/95 (2139 s; también 95/95 solo con el primer cambio). GitHub, Wikipedia y freemem.space en el emulador.

### 2026-10-23 — Tarea 42i, segunda parte (las pestañas de GitHub)
- Cada pestaña (a.UnderlineNav-item, flex con un <svg>, su texto y un contador) medía unos 80 px de más y el contador
  "33" se partía en dos líneas. Buscado por mitades en una copia de la barra con sus reglas (en tests/pages, solo
  mientras tanto): la caja anónima que envuelve un reemplazado en un flex (`_anonima`) no tenía padre, y al medirla
  `_sangrias` subía desde el <svg> hasta la raíz sumando los rellenos de la pestaña y de la barra (p-responsive, 40 px
  por lado). Ya tiene padre (como las anónimas de las tablas): se corta en el contenedor.
- test_maqueta_flex: una imagen en un elemento flex dentro de un contenedor con relleno (48 de ancho; antes 144).
- Batería: 95/95 (2147 s). GitHub: las pestañas juntas, "Repositories 33" y "Stars 31", como en Chrome. freemem.space
  y Xataka, como antes.

### 2026-10-23 — Un flex con min-height centra en ese alto
- El texto del botón "Buscar" de Wikipedia (inline-flex, align-items: center, min-height: 32px) salía arriba: _flex
  solo repartía en el alto con height. lib/maqueta.dash: sin alto fijo y con un min-height mayor que lo que ocupa
  (en px, con box-sizing), el flex se rehace con ese alto (fuera lo dibujado la primera vez).
- test_maqueta_flex: una caja centrada en un flex con min-height de 40 (y=15).
- Batería: 95/95 (2136 s). Wikipedia: "Buscar" centrado; GitHub y freemem.space, como antes.

### 2026-10-23 — Tarea 42j (la traza con imágenes SVG)
- tools/traza.py compilaba tools/traza_maqueta.dash sin --fpu: nanosvg (floats) rasterizaba mal y una imagen
  data:image/svg+xml dejaba la traza colgada (no el navegador, que va con --fpu). Ya con --fpu: la página mínima
  con la lupa de Wikipedia, en 21 ms.
- Menéame mirada: bien de aspecto, entera a los 208 s y sin la primera línea de los títulos (42k).

### 2026-10-23 — Tarea 42k (los títulos de Menéame) y DIBUJOS=
- A cada título de noticia de meneame.net le faltaba la primera línea: va en una caja con overflow: hidden que empieza
  1 px por debajo de la línea (la letra, de 25 px, es más alta que la línea de 22) y el pintor solo pinta una línea de
  texto entera dentro de su recorte. lib/pintor.dash: una que se sale del recorte de un overflow hasta un cuarto de su
  alto se pinta igual (nunca fuera de la zona de la página).
- Encontrado con DIBUJOS=y0-y1, argumento nuevo de dashweb (tools/medir_visor.py --dibujos Y0-Y1): al acabar la
  página, sus dibujos entre esas alturas por la salida (tipo, caja, color, capa, velado, recorte, texto y elemento).
- El flex con min-height (178fe1c) dejaba sin pintar las opciones de "Apariencia" de Wikipedia (flex en columna):
  ahora solo se rehace en fila (el botón "Buscar", en fila, sigue centrado).
- Batería: 95/95 (2196 s). Menéame: los títulos enteros; Wikipedia: "Apariencia" entera y "Buscar" centrado; Xataka:
  ya con sus secciones (ANÁLISIS, CIENCIA...) y los iconos de las redes.

### 2026-10-23 — Los absolutos respecto al antepasado posicionado (42g)
- Un position: absolute se ponía siempre respecto a la caja de su padre, posicionado o no; en CSS (10.1) va respecto
  al antepasado posicionado más cercano (o con transform; si no hay, la raíz). xataka.com: la fila de favicons
  (aside absolute, top: 0, en un div estático dentro de .head-content-favs relative) salía bajo la cabecera.
- lib/maqueta.dash: si el bloque no es la caja de sus absolutos (`_caja_de_absolutos`), los apunta con su sitio
  estático (`_abs_pend`, x/y) y los pone el primer antepasado que lo sea, al acabar su maqueta (con pl/pt de su sitio
  estático para left/top auto). Al medir y en las maquetas de un momento que luego se mueven (_flex_maquetar: flex,
  grid y celdas; _pieza_caja), como antes (`_abs_temporal`). maquetar vacía lo apuntado al empezar.
- tests/test_maqueta_absoluto_caja.dash (nuevo): padre posicionado, abuelo posicionado, sitio estático y la raíz.
- Batería: 96/96 (2244 s). Xataka: la fila de favicons arriba y la noticia destacada con su foto, como en Chrome;
  freemem.space, GitHub y Wikipedia, como antes (la columna "Apariencia" salió vacía en una captura a los 150 s y
  entera en otras dos a los 150 y 290 s: un momento de la carga).

### 2026-10-23 — El texto de un flex absoluto cuenta al medirlo (42g)
- El "NUEVO" de xataka.com (a flex, absolute, right: 0, con un ::after de icono): su icono caía encima del texto. Al
  medir la caja anónima del texto, `_bajo_absoluto` subía desde el nodo del texto (el <a>, fuera de la caja anónima)
  y encontraba el <a> absoluto: el texto no contaba y el <a> medía solo lo demás. Se para también en el corte de
  `_sangrias` (el primer antepasado de verdad de una caja anónima), como la suma de sangrías.
- tests/test_maqueta_flex_absoluto.dash (nuevo): un flex absoluto a la derecha y a la izquierda.
- Batería: 97/97 (2298 s). Xataka: "NUEVO" y su icono a la derecha; la barra de Wikipedia, como antes.

### 2026-10-23 — Tarea 41b (el corredor de Web Platform Tests) y dos fallos que encontró
- tools/wpt.py: sirve un clon parcial de WPT (~/.cache/dashweb/wpt, fuera de git; cómo bajarlo, en su cabecera),
  apunta las pruebas con <link rel="match"> (sin reftest-wait) y lanza tools/wpt_reftest.dash en la máquina rtg:
  pinta la prueba en una ventana de 600x400, guarda sus píxeles con rtg_read_pixel, pinta la referencia y compara
  ("WPT PASS/FAIL ruta píxeles"). --guardar escribe docs/wpt/<carpeta>.txt. Sin JavaScript ni fuentes de la página.
- Las referencias en .xht llevan su CSS en <![CDATA[ ... ]]> (el analizador XML lo quita; dashweb lee XHTML como
  HTML) y perdían su primera regla: lib/css.dash salta <![CDATA[ y ]]> como <!-- y -->.
- Los márgenes que se juntan (41a2): un bloque que junta su margen de arriba con el de su hijo perdía el de abajo del
  anterior (16 px de menos tras un <p>): `_margen_arriba` usa el acumulador y se llamaba después de cargar en él lo
  pendiente; ya antes. test_maqueta_margenes: el caso i.
- normal-flow: de 0/10 a 12/30 (las 30 primeras de 492).
- Batería: 97/97 (2363 s). freemem.space, Wikipedia, amigaworld.net y GitHub, como antes (Wikipedia con la flecha del
  índice en cuadrado negro en esta captura: 42l).

### 2026-10-23 — Tarea 41b: XHTML en el corredor y el onload de <body>
- tools/wpt_reftest.dash: con el JavaScript de la página (scripts, DOMContentLoaded, load y los temporizadores de
  hasta medio segundo) y los .xht como los deja el analizador XML (dentro de <style> y <script>, sin CDATA y con
  &lt; &gt; &amp; &quot; &apos; puestos: los selectores con &gt; no valían).
- lib/jsdom_preludio.js: el atributo onload de <body> es el de window (HTML): <body onload="boom()"> no se llamaba en
  ninguna página. (Regenerado lib/jsdom_preludio.dash.)
- normal-flow: 29/100 -> 73/100 (docs/wpt/css_CSS2_normal-flow.txt). De las que fallan, block-replaced-height-002
  (30 px) es la altura de la letra del Amiga sobre la línea base (las imágenes en línea 2 px más abajo), no maqueta.
- Batería: 97/97 (2484 s).

### 2026-10-23 — Tarea 41b: el ancho de las tablas y las imágenes en línea
- El width de una tabla es el de su caja con los bordes y el relleno, como en los navegadores (una de 100 % con borde de
  1 px salía 2 px más ancha): lib/maqueta.dash, al poner el ancho y al medir (WPT block-formatting-contexts-001).
- El px de aire de arriba de una línea sin line-height es de la letra: si lo más alto es una imagen o un inline-block
  que pasa de ella, la línea empieza en su borde (`base_texto`; la imagen de 100 px quedaba 1 px baja: WPT
  block-replaced-height-002 y block-formatting-contexts-008).
- Tests: un px menos en test_imagenes (las filas que lee, también), test_maqueta, test_maqueta_css, test_maqueta_flex
  (z7) y test_maqueta_menu (los inline-block del menú en y 0, como en Chrome); comprobado que solo cambian esos números.
- normal-flow: 73 -> 76/100.
- Batería: 92/97 con los cinco de arriba; luego los 28 de maqueta y los de imágenes, bien.
- D69 (la red desde una tarea) hecha por la sesión dash en main (a133133, PR #21).

### 2026-10-23 — Tarea 42e: la red en una tarea aparte (D69)
- lib/red.dash: toda la red (buscar el nombre, conectar, TLS, enviar y recibir) va en una tarea de task_start que
  avanza aunque la maqueta o el JavaScript tarden segundos. El programa pide y lee por una tabla en C (`_rt`, 48
  sitios) detrás de un semáforo; la tarea despierta al programa con task_wake (src/dashweb.dash espera con
  `mui_wait_event_signals(task_signal())`). red_terminar() al salir; la tarea acaba sola tras red_ociosa_ms sin
  tráfico (60 s en el navegador), aunque guarde conexiones para reusar (si no, el programa no acababa: espera a sus
  tareas).
- Tres atascos encontrados por el camino: SSL_read con el socket listo se quedaba esperando (tras el saludo llegan
  los billetes de sesión de TLS 1.3 y luego espera la respuesta a una petición que aún no salió) y paraba todas las
  conexiones: lee con el socket sin bloqueo. Dash abre como mucho 16 a la vez: las demás esperan turno en vez de
  fallar. Y la conexión abierta enseguida puede esperar a su petición 10-35 s (el programa maquetaba) y el servidor
  la cierra: la tarea abre otra si no se mandó nada; si ya salió la petición, lib/http.dash reintenta un GET una vez.
- Medido en la RTG: cuatro descargas a la vez en 1,8 s; Menéame entera en 168 s (antes 208); Xataka 290 s con todos
  sus scripts (antes 272: ahí manda la maqueta, ~7 s por vuelta, no la red).
- Sigue sin arreglar (también con la red de antes): player.twitch.tv da "no se pudo descomprimir" y en Xataka falla
  un chunk de webpack (999 o 915) a los ~8 s de pedirlo.
- Batería: 97/97 (2345 s); luego las de red, recursos, imágenes y documento otra vez tras el reintento del GET.

### 2026-10-23 — Tarea 43: el cuelgue al arrancar en AmigaOS 4
- Un usuario de OS4 (Sam460ex, v0.3.0-alfa) mandó el registro de GrimReaper y la salida serie: DSI leyendo la
  dirección 0 en código de Petunia (el JIT de 68k). Las instrucciones PPC del fallo (li r3,0; lbz r10,0(r7);
  rlwimi r3,r10,...) son `clrl d0; moveb a1@+,d0` de strcmp con a1 = 0.
- En FS-UAE con la MMU del 68040 y MuForce (máquina rtgmmu de tools/medir_visor.py, sistema
  ~/.cache/dash-emu/sys32rtg38mmu con SegTracker de Enforcer y MuForce de NDK3.2 MuTools): 150 lecturas de la
  dirección 0 al arrancar, en strcmp desde `_palabras_texto` (lib/maqueta.dash): `nodo_texto.pal_clave == clave` con
  pal_clave nil (la primera vez que se mide ese texto). En un 68k clásico se lee la memoria baja y no pasa nada.
- Arreglado en los dos sitios: lib/maqueta.dash mira pal_anchos antes de comparar, y Dash D70 (la sesión dash, main
  028c67d) compara textos con `_dash_str_cmp`, que nunca lee la dirección 0 (nil va antes que todo texto).
- Con los dos, MuForce no da ninguna lectura prohibida del programa al arrancar ni con es.wikipedia.org/wiki/Amiga
  entera (con su JavaScript). Queda una de muigfx.library (BYTE READ de 0x2B) desde Dtpic.mui al abrir la ventana:
  es del MUI 5 de 68k (en OS4 se usa el MUI de OS4); sin mirar si se lo provoca Tachyon.


### 2026-10-23 — Publicada la v0.4.0-alfa
- Usuario: "Haz nuevo release". Versión 0.4.0-alfa en Acerca de y $VER (59d869b), README con la descarga nueva. PR #5
  de dev a main fusionado (1236181), etiqueta v0.4.0-alfa sobre él y pre-release
  https://github.com/FreeMEM/tachyon/releases/tag/v0.4.0-alfa con build/tachyon.lha (6,6 MB), hecho con
  tools/paquete.sh en un worktree limpio de 1236181 y Dash 028c67d (con D69 y D70).
- Base: 97/97 (2210 s, con la D70). Probado en la máquina rtg: freemem.space entera en 26,7 s, bien. Copiado a
  CoffinOS el Tachyon del paquete.

### 2026-10-23 — Tarea 44: Tachyon se actualiza desde sí mismo
- lib/actualizar.dash: la lista de versiones de GitHub (api.github.com/repos/FreeMEM/tachyon/releases?per_page=3,
  también las pre-release), la primera comparada por sus números con DASHWEB_VERSION; su Tachyon.gz se baja a T: y
  antes de cambiar nada se comprueba (CRC-32 y tamaño del gzip, con tabla; cabecera 0x3F3 y "$VER: Tachyon "); luego
  Tachyon.new, el de ahora a Tachyon.old y el nuevo en su sitio (si el segundo paso falla, vuelve el de antes).
  Dónde está el programa: GetProgramDir + el nombre (GetProgramName desde el Shell, el de la tarea desde el WB).
- src/dashweb.dash: al arrancar sin argumentos, como mucho una vez al día (versiones_visto en Tachyon.prefs;
  avisar_versiones=no lo apaga), y con "Buscar actualizaciones" del menú (y "No avisar de versiones nuevas"). Con una
  nueva, el botón Actualizar (src/navegador.dashui, escondido hasta entonces) en cada ventana y el aviso en la barra
  de estado; al pulsarlo se baja e instala, el botón pasa a Reiniciar, y al pulsarlo otra vez Tachyon se cierra
  (guarda las cookies) y abre el nuevo (SystemTags asíncrono, pila de 64 KB). VERSIONES=dirección (argumento) mira
  ahí y no en GitHub; tools/medir_visor.py --versiones lo pone con /act/releases de tests/servers/http.py.
- tools/paquete.sh deja también build/Tachyon.gz (gzip -9 -n del ejecutable); paquete/LEEME lo explica. El
  User-Agent pasa a Tachyon/0.4.
- Probado: test_actualizar (comparar versiones, la lista, bajar e instalar sobre otro en T:, y uno con el CRC mal
  que no cambia nada; memcheck limpio). En el emulador con --versiones: el botón sale con "Hay una versión nueva:
  9.9.0-alfa"; con un clic (tools/amiga/clicar) baja e instala (p0 nuevo, p0.old el de antes, "Instalada la
  9.9.0-alfa: pulsa Reiniciar"); con un Tachyon de verdad de 3,5 MB servido (ACT_EXE), instalado idéntico en ~30 s;
  y Reiniciar abre el nuevo (uno de mentira que deja una marca en el disco) tras salir el viejo con rc 0. Contra
  GitHub de verdad: la lista llega (200, 16 KB en 1,1 s) y la descarga de un fichero de una versión sigue la
  redirección y llega entera (tachyon.lha, 6.887.714 bytes). La v0.4.0 no lleva Tachyon.gz (no tiene esto).

### 2026-10-23 — Tarea 45: la interfaz (menús, iconos, led, historial, candado y estrella)
- Iconos nuevos: los de 16x14 en 4 colores (el usuario: "parece que los ha dibujado un niño") pasan a los SVG de
  Lucide (third_party/lucide, ISC; su licencia al paquete) pintados a 20x20 con rsvg-convert, suavizados sobre el gris
  de los botones y en hasta 32 colores, uno por función (azul navegar, rojo parar, verde actualizar, dorado el
  candado): tools/iconos.py. También iconos/logo.iff (docs/logo/tachyon.svg a 260x57) arriba en Acerca de.
- MUI 3.8 no cambia la imagen de un botón ya hecho (MUIA_Dtpic_Name solo al crearlo): por eso las flechas de atrás y
  adelante nunca se encendían. Ahora un botón por estado (atrás y atrás apagado, candado cerrado y abierto, estrella
  vacía y llena, actualizar y reiniciar) y se enseña uno u otro.
- src/navegador.dashui: cuatro menús (Proyecto, Navegar, Marcadores, Herramientas; con Ir a la dirección, Amiga-L:
  MUIA_Window_ActiveObject, y Cookies); fuera el punto de actividad de arriba y el panel del historial; en la barra de
  la dirección, el candado (HTTPS u HTTP; nada en tachyon:) y la estrella (un clic añade o quita el marcador); abajo,
  un led: verde que parpadea mientras algo llega (cada 300 ms), rojo si la página falló, gris parado.
- lib/marcadores.dash: el historial en Tachyon.historial (minuto, dirección y título; 300 como mucho; la misma página
  seguida, una vez) y la página tachyon:historial por días (Hoy, Ayer, la fecha) con la hora, el título y la dirección
  entera, y "Borrar el historial"; marcadores_tiene y marcadores_quitar, y en tachyon:marcadores un "quitar" en cada
  uno. Atrás y adelante, con una lista de cada ventana (pasos).
- La página de inicio: el buscador con flex salía estrecho y cortaba "Buscar" (45f, sin arreglar en la maqueta: puesto
  sin flex); el título de la ventana, "Tachyon" y no "Tachyon - Tachyon".
- Probado en el emulador (rtg, MUI 3.8) con capturas y clics (tools/amiga/clicar): freemem.space con el candado
  dorado; la estrella guarda el marcador y se llena; Navegar > Historial y Marcadores > Ver marcadores desde el menú;
  atrás encendido tras navegar; Acerca de con el logo; el icono verde con --versiones. En un A1200 de 640x256 (sys31,
  pocos colores) MUI ajusta los iconos a la paleta y se entienden. test_marcadores ampliado (quitar, el historial por
  días y la fecha). tools/medir_visor.py deja pasar --pagina tachyon:... tal cual.

### 2026-10-23 — Tarea 45h: el buscador por defecto (y los desplegables con display block)
- lib/buscadores.dash: DuckDuckGo en HTML (por defecto: sin JavaScript, sus resultados salen en ~6 s), Google, Bing,
  Brave, Wikipedia y Aminet; tachyon:buscadores para elegir (Herramientas > Buscador..., y una tarjeta en la página
  de inicio), guardado en Tachyon.prefs (buscador=). La barra de la dirección busca lo que no es una dirección (con
  espacios, o sin punto, dos puntos ni barra: es_busqueda); la página de inicio manda a tachyon:buscar?q=..., que va
  a los resultados del elegido (y cambia ese paso de atrás por ellos). test_buscadores.
- Mirados en el emulador (rtg): DuckDuckGo bien; Bing bien; Brave con resultados y la maqueta algo revuelta; Google
  enseña antes su aviso de cookies; Startpage, Mojeek y Ecosia piden demostrar que no se es un robot (fuera).
- Los desplegables de DuckDuckGo (.frm__select select { display: block; appearance: none }) salían como una lista
  con todas sus opciones: un <select> con display block se maquetaba como un bloque con sus <option> de texto. Ahora,
  como los campos de texto de 42h: una línea con la opción elegida en un control sin marco (lib/maqueta.dash,
  lib/pintor.dash _campo_propio_pintar).
- Batería de la 44 (31d49ae): 98/98 (2204 s).

### 2026-10-23 — Publicada la v0.5.0-alfa (la primera que se actualiza sola)
- Usuario: "sí, queremos la 0.5.0". Base: 99/99 (2212 s, 827c348). Versión 0.5.0-alfa en Acerca de, $VER y el
  User-Agent (982f60b); PR #6 de dev a main (fcf5c8d), etiqueta v0.5.0-alfa y pre-release
  https://github.com/FreeMEM/tachyon/releases/tag/v0.5.0-alfa con tachyon.lha (6,6 MB) y Tachyon.gz (1,7 MB: el
  ejecutable solo, para actualizarse), hechos con tools/paquete.sh en un worktree limpio y Dash 028c67d.
- Probado: el ejecutable del paquete en la máquina rtg (freemem.space entera en 26,7 s); Tachyon.gz descomprimido es
  el del paquete. Y la actualización de verdad: uno compilado como 0.4.9-alfa, abierto sin argumentos, vio la
  0.5.0 en GitHub, con un clic en el icono verde la bajó, la comprobó y la instaló (idéntica al publicado; la de
  antes como p0.old) y el icono pasó a reiniciar ("Instalada la 0.5.0-alfa: pulsa el icono verde").
- Copiado a CoffinOS el del paquete, con sus iconos, el LEEME y las licencias (la de Lucide, nueva).

### 2026-10-23 — Tarea 45f: un campo de texto con flex: 1 (el buscador de la página de inicio)
- Tres cosas, todas de controles de formulario dentro de un flex (lib/maqueta.dash):
  1. Un reemplazado va en una caja anónima (42i) y su flex-grow, flex-shrink, flex-basis, order y align-self se
     quedaban en él: la caja no crecía. Ahora pasan a la caja; y el control (input, select, textarea) llena el ancho
     que el flex le da (_forzado_w, menos sus márgenes).
  2. Un control usa su width de la página (en px, con relleno y borde si no es border-box): antes, siempre las 20
     letras de su size.
  3. Un botón de estilo propio (_boton_propio) ya no va en caja anónima: es él el elemento flex, con su relleno (en
     la caja se medía sin él y "Buscar" salía cortado).
  Y el alto de un campo o desplegable suma el relleno y el borde de arriba y abajo de la página, con el texto
  centrado (lib/pintor.dash): el campo, tan alto como su botón.
- La página de inicio vuelve a su buscador con flex (el campo a lo ancho, el botón entero), como en Chrome.
- test_maqueta_flex: z9 y z10 (un campo con flex: 1 y width: 400px y un botón propio llenan los 600: 516 + 84).
- Batería: 99/99 (2243 s).

### 2026-10-23 — Tarea 47: el gestor de descargas
- lib/descargas.dash: una lista para todo el navegador (antes, una por ventana y solo en la barra de estado): varias a
  la vez, según llegan al fichero (http_volcar), que siguen aunque se cambie de página o se cierre la ventana. La
  página tachyon:descargas con cada una (nombre, ruta, dirección; KB de cuántos, %, velocidad y lo que falta, una
  barra; hecha o por qué falló) y sus acciones (parar, reintentar, quitar de la lista, abrir el cajón en el Workbench:
  OpenWorkbenchObjectA de workbench.library 44). Las acabadas, paradas o fallidas, en Tachyon.descargas (50).
- src/dashweb.dash: el icono de descargas en la barra (Lucide "download") mientras alguna baja, con su ayuda ("2
  descargas: 45 %"), que abre la página; Herramientas > Descargas (Amiga-J); la página, al día cada segundo mientras
  bajan; "Descarga hecha: x" en la barra de estado; si la ventana no tenía página, abre tachyon:descargas. Dónde
  guardar: el selector de ASL con el nombre ya puesto y en el cajón de la última vez (RAM: la primera; preferencia
  cajon_descargas): Return y listo (el dialog_file de Dash no deja dar un nombre y Return sin él cancelaba). Se guarda
  la dirección pedida, no la de después de las redirecciones (la de GitHub caduca).
- Un cuelgue al arrancar por un nombre: el botón del .dashui se llamaba "descargas", como la lista global de
  lib/descargas.dash, y el programa leía el objeto MUI como la lista (MuForce: lecturas de 0x0F000000 y de campos
  nulos desde abrir). Renombrado a ver_descargas; contado a la sesión dash (debería avisar el compilador).
- Probado: test_descargas (dos a la vez, un 404, parar a medias y reintentar, quitar, la página, guardar y cargar).
  En el emulador, tachyon.lha de la v0.5.0 desde GitHub (con su redirección): el selector con el nombre, Return, y
  bajado entero (6.929.268 bytes) con la página de descargas abierta ("Hecha: 6,6 MB"). Sin ver: la barra de
  progreso en pantalla (bajó en menos de 15 s) y "abrir el cajón" (sin Workbench en el emulador).
- Batería: 100/100 (2221 s, Dash 9c1c1f6 con la D71).

### 2026-10-23 — Tarea 48, primera parte: tachyon.freemem.space y dash.freemem.space cargan
- Las dos (Next.js) enseñaban "This page couldn't load" (la pantalla de error de Next): React #418 (el texto del
  servidor no cuadra con el del cliente) y, al rehacer el elemento, `removeAttributeNode` no existía ("not a
  function") y React tiraba la página. lib/jsdom_preludio.js: getAttributeNode, removeAttributeNode y
  setAttributeNode (nodos {name, value}); y getContext da null (y toDataURL "data:,") hasta que haya Canvas 2D
  (48a): las estrellas lo llamaban sin mirar.
- Ya salen: tachyon.freemem.space (cabecera, título, texto y botones) y dash.freemem.space (muy cerca de Chrome);
  trasfondo.freemem.space ya salía bien. Faltan: los iconos del menú de arriba (cuadrados vacíos), el logo grande de
  tachyon.freemem.space (una caja vacía: una imagen que no llega) y las animaciones (Canvas 2D).
- Las 13 de js/jsdom pasan (590 s).

### 2026-10-24 — Publicada la v0.6.0-alfa (la primera actualización automática)
- Usuario: "publícala ya y la traducción para la 0.7.0". Base: 100/100 (4f791b3) y las 13 de js/jsdom con 48 (1).
  Versión 0.6.0-alfa (7d87ca4); PR #7 (706fb0c), etiqueta v0.6.0-alfa y pre-release
  https://github.com/FreeMEM/tachyon/releases/tag/v0.6.0-alfa con tachyon.lha (6,6 MB) y Tachyon.gz (1,7 MB), con
  tools/paquete.sh en un worktree limpio y Dash 9c1c1f6.
- Probado: freemem.space con el del paquete (27,6 s); y el ejecutable de la v0.5.0 publicada, tal cual, abierto sin
  argumentos en el emulador: vio la 0.6.0 en GitHub y con un clic la instaló (idéntica a la publicada).
- En CoffinOS se queda el de dev con versión 0.5.0 (de antes de subir el número): el usuario prueba allí la
  actualización con el icono verde.

### 2026-10-24 — Tarea 48a: Canvas 2D (las estrellas de tachyon.freemem.space)
- lib/lienzo.dash: cada <canvas> con getContext("2d") es un búfer RGB de 24 bits dibujado en C. Pensado para un 68k:
  - más de 90.000 píxeles, a media resolución (y el pintor lo vuelca al doble con gfx_rgb_draw_scaled: el camino
    rápido de 16 bits);
  - fillRect sin giro por filas: opaco copiando, translúcido con una tabla por transparencia;
  - líneas de hasta 1,5 px con DDA en coma fija y su mezcla; las gruesas, un polígono;
  - rellenos par-impar por líneas horizontales, con subcaminos;
  - arcos y curvas en tramos rectos;
  - colores con un lector propio de rgb()/rgba() (enteros, sin strtod) y una caché de 8;
  - lo transparente, con el color de lo que tiene detrás (clearRect lo pone);
  - matriz completa (setTransform, transform, scale, translate, rotate), save/restore.
- lib/jsdom.dash: la clase CanvasRenderingContext2D de QuickJS sobre eso (fillRect, clearRect, strokeRect,
  beginPath, moveTo, lineTo, closePath, rect, arc, ellipse, curvas, stroke, fill, las de la matriz; fillStyle,
  strokeStyle, lineWidth y globalAlpha); lib/jsdom_preludio.js: getContext('2d'), width y height del lienzo (otro
  búfer, como los navegadores), y lo que aún no dibuja (texto, imágenes, degradados, getImageData) sin romper.
- ResizeObserver de verdad (antes un objeto que no avisaba): tras cada maqueta, el tamaño de lo observado. Las
  estrellas miden así su lienzo; sin él salía de 104x31 y se veían como bloques gordos.
- Maqueta y pintor: D_LIENZO (en línea y con position absolute, por los caminos del vídeo); un z-index negativo en
  un absoluto (las estrellas: -1) va en la lista tras el fondo de su antepasado posicionado o con isolation, bajo lo
  demás suyo (CSS 2.1 apéndice E). src/dashweb.dash, tras cada vuelta del JavaScript: solo la zona de los lienzos
  que cambiaron se repinta, con lo que tengan encima.
- Medido en el emulador (rtg) con el código de las estrellas en una página local (tests/pages/estrellas.html): ~265
  ms por fotograma (antes del lector de colores, 309). El reparto: ~83 ms el JavaScript al hacer el texto del color
  (los decimales), ~90 las 3500 llamadas, ~46 sus cuentas, ~44 mover las 700 estrellas y el velo. Ver 48d.
- test_lienzo (fillRect opaco y translúcido, línea, círculo, setTransform, media resolución, width, null).
- src/dashweb.dash vacía la salida (Flush) en cada tic: si el navegador no acaba (una página a la que le falta una
  imagen), los errores del JavaScript ya no se pierden en el búfer de AmigaDOS.
- En tachyon.freemem.space aún no salen: ver 48c.
- Batería: 101/101 (2331 s).

### 2026-10-24 — Tarea 48c: React se quedaba en un bucle sin fin (attributes no era viva)
- Con una copia de tachyon.freemem.space servida en local y un script de diagnóstico dentro: los temporizadores se
  paraban a los ~4 s (el JavaScript, atascado) y el corte de 120 s caía en la función de React que, al rehacer un
  elemento tras el #418 (el texto del servidor no cuadra), hace `for (l = t.attributes; l.length;)
  t.removeAttributeNode(l[0])`. En los navegadores attributes es un NamedNodeMap vivo; el de lib/jsdom.dash era una
  copia: su length no bajaba nunca. Por eso no hidrataba, no corrían los efectos (las estrellas no pedían el lienzo)
  y no llegaban sus imágenes (el logo y los iconos del menú: cajas vacías). El #412 ("Connection closed") era de
  ese corte.
- lib/jsdom_preludio.js: attributes viva con un Proxy sobre la copia de C (length, índices, item, getNamedItem,
  setNamedItem, removeNamedItem, por nombre, y los métodos de lista que ya usa el preludio).
- tachyon.freemem.space entera en 28,4 s con las estrellas animadas detrás de la portada, el logo y los iconos;
  dash.freemem.space entera en 24,7 s con sus iconos. (La bola Boing de dash, más abajo: sin mirar aún.)
- Ojo para otras webs de React: lo mismo con cualquier lista que el DOM da viva (childNodes, children,
  getElementsBy*): si alguna se da como copia, el mismo bucle sin fin.

### 2026-10-24 — Tarea 48e: la bola Boing de dash.freemem.space
- La bola usa lo que ya hay del lienzo (fillRect, stroke, arc, fill, caminos de 4 lados), pero su caja salía de
  16 px de alto y vacía. Con su código tal cual en tests/pages/boing.html, dos fallos:
  - un <canvas> con display: block iba como un bloque vacío y no como pieza (lib/maqueta.dash: como un vídeo);
  - sus atributos width y height pasaban a CSS (lib/estilo.dash, _pistas_html). En HTML son el tamaño del lienzo,
    no el de su caja. La bola se mide (getBoundingClientRect, 16 de alto antes de la primera maqueta), lo pone en
    height y se quedaba así.
- Y el aspect-ratio de un canvas en línea sin alto (4/3 de su ancho): lib/maqueta.dash.
- Visto en el emulador (rtg): la bola rebota y gira sobre su rejilla morada, a 895x671, con su sombra translúcida.
  tests/test_maqueta_inset.dash: el canvas 4/3 y el que no lleva estilo.
- La sesión de las webs aligeró las dos animaciones (un camino y un stroke por color: de ~3500 llamadas a ~1400 en las
  estrellas, de 256 rellenos y trazos a 4 en la bola; las estrellas bajan de 700 a 120 si un fotograma pasa de
  25 ms). Con un camino de 64 cuadros, el relleno miraba los 256 lados en cada fila: ahora solo los subcaminos que
  cruzan la fila (lib/lienzo.dash). tests/pages/estrellas.html y boing.html, con su código nuevo. En el emulador
  (rtg, con JIT): estrellas ~20 fotogramas/s (antes ~4), bola ~11/s. Con 120 estrellas el cielo se ve casi vacío:
  se le propuso a la web un mínimo de 300 y un umbral de 40 ms.

### 2026-10-24 — Tarea 48g: trasfondo.freemem.space y las maquetas caras del JavaScript
- En el emulador salía bien arriba, pero sus capturas de pantalla (WebP con loading="lazy", tras la portada) se
  quedaban en cajas negras. Con una copia servida en local y la traza: aga-panel.webp llegaba a los 15 s y a los 45
  aún no estaba decodificada (sola, en una página mínima, en 1,5 s). El escritorio de mentira de la portada cambia
  cada segundo el texto de su panel ("CPU 2,1 %"): cada cambio era la maqueta entera, ~160 ms de estilo y ~730 de
  maqueta (500 bloques). Al proceso que decodifica (prioridad -1) no le quedaba tiempo.
- lib/documento.dash: si la última maqueta entera por el JavaScript pasó de 150 ms, la siguiente espera a que haya
  pasado el doble (los cambios se juntan; lo del ratón no espera). src/dashweb.dash lo activa
  (documento_aplazar) y despierta cuando toca aunque la página no tenga más temporizadores; las pruebas siguen
  con cada cambio al momento.
- Con eso aga-panel.webp se decodifica 4,6 s después de llegar, la página está entera a los 19,7 s y, bajándola
  entera (scrollBy desde la copia), todas sus imágenes salen. El panel se pone al día cada ~2 s en vez de cada 1.
- Pendiente (48h): maquetar otra vez solo esa caja.

### 2026-10-24 — Tarea 48h: maquetar sola una caja absoluta de tamaño fijo
- Una caja con position: absolute y width y height en px no mueve nada de fuera por lo que lleve dentro. Al
  maquetarla (_absoluto) se apunta en la página (Pagina.limites) con qué se maquetó (su contenedor y lo de
  alrededor: _cat_atomica, _alto_definido, la línea...) y su primer dibujo propio con dónde quedó; sus dibujos
  llevan la caja (Dibujo.lim).
- lib/documento.dash: si todo lo tocado por el JavaScript está dentro de una de ellas (no sus propios atributos;
  lo que React tocó y luego quitó no cuenta) y los estilos que cambian son de dentro, maqueta_rehacer la maqueta
  sola y pone lo que le hicieron los de fuera a la de antes (moverla, recortarla, su capa, velarla), sacado de dónde
  acabó aquel dibujo; si algo de fuera la transforma, anima, fija o pega, la maqueta entera como antes. Se repinta
  solo su zona.
- tests/test_documento_limite.dash: un texto que se alarga en una fila flex dentro de una caja con scale(0.5), en un
  marco relative con overflow: hidden y z-index, queda igual que con la maqueta entera (sitio, recorte, capa y su
  caja para el JavaScript); un cambio fuera o en el style de la caja, maqueta entera.
- trasfondo.freemem.space (copia local, emulador rtg): cada ciclo del panel, de ~870 ms a 500-640 (el escritorio
  tiene 320 de los 510 bloques de la página). Y la traza dice por qué no se maqueta sola cuando no.
- Visto: React #412 una vez en cinco cargas de la copia (sin hidratar); no se repitió.

### 2026-10-24 — Tarea 48i: min-width
- min-width solo se miraba en las cajas flex. Las columnas "entra" y "sale" del panel de trasfondo.freemem.space
  (em inline-block con min-width: 82px y text-align: right) salían pegadas.
- lib/maqueta.dash: un bloque no baja de su min-width (manda sobre width y max-width, CSS 2.1 10.4); al medir un
  flotante o un inline-block, tampoco; y al medir lo de dentro, el fondo de un elemento con min-width cuenta como el
  de uno con width (en una fila flex, las dos columnas saltaban de línea), solo hasta su min-width (al medir se
  estira a 4000), y sin fondo deja el rectángulo vacío que ya dejaba una caja con width.
- tests/test_maqueta_inset.dash: 82 y 82 en un bloque; 164 a la derecha (136) en la fila flex. En la copia de
  trasfondo, "entra" y "sale" y sus cifras, cada una a la derecha de su columna.
- Ojo, Dash: reusar en _ancho_flotante_medir el nombre de una variable que era un Nodo (medido) para un Int compiló
  sin aviso y daba anchos de basura (la prueba se colgaba); se cambió el nombre. Pendiente de contárselo a Dash
  (el mensaje a su sesión no llegó: va en otro modo de permisos).

### 2026-10-24 — Tarea 48b (trasfondo): un absoluto con width fijo más ancho que su contenedor
- El escritorio de la portada de trasfondo.freemem.space mide 960 (width) con scale(0.93) en un marco de 891 con
  overflow: hidden. _absoluto encogía a su contenedor todo absoluto más ancho: se maquetaba a 891 y luego se
  encogía (la barra "Workbench Screen" y el panel no llegaban a la derecha).
- lib/maqueta.dash: con width fijo se queda su ancho (CSS 2.1 10.3.7) si cabe en la ventana o si un overflow de
  fuera lo recorta (_recortado_fuera, hasta su antepasado posicionado); si no, como antes.
- tests/test_maqueta_inset.dash: 300 recortado por su marco; 600 en una ventana de 400, al contenedor (100).
  En la copia de trasfondo, la barra y el panel ya llegan al borde derecho, como en Chrome.

### 2026-10-24 — Tarea 48j: fondos de varias capas
- background con varias capas (separadas por comas) se leía como una: se juntaban sus palabras y salía el último
  degradado a tamaño completo (los botones de profundidad y de cierre de las barras del Workbench de trasfondo,
  tres linear-gradient de un color de 9x7, 8x6 y 10x8 px sobre gris, eran un cuadro negro o blanco).
- lib/estilo.dash: con varias capas, la declaración entera va en background-capas y lo de siempre se queda con
  la capa que lleva imagen (o la última; el color, de la última): las imágenes de fondo, como antes.
- lib/maqueta.dash (_fondo_capas): cada capa que es un linear-gradient, de la última a la primera, con su
  background-position y background-size en px (sin tamaño, toda la caja).
- Visto en la copia de trasfondo: los botones de la ventana del cajón ya son su dibujo.

### 2026-10-24 — Tarea 45g (1): catálogos de idiomas, la interfaz
- Con D71 de Dash (@catalog, tr, "tr" en el .dashui, tools/catalogo.py). src/dashweb.dash: @catalog
  "Tachyon.catalog" 1 "español"; los textos que se ven, con tr(número, "texto"); los que llevan algo dentro, con
  huecos (%1, %2) que pone hueco()/hueco2(), para no partir las frases. src/navegador.dashui: "tr" en cada menú,
  botón y ayuda (1-42). La barra de estado miraba si empezaba por "Imágenes": ahora, por el texto del catálogo.
- catalogos/: Tachyon.cd (98 textos, sacado del código), english.ct (traducido) y LEEME (cómo se pone al día y
  cómo se añade un idioma). tools/paquete.sh mete Catalogs/<idioma>/Tachyon.catalog en el cajón (el Installer
  copia el cajón entero). tools/medir_visor.py --catalogo english lo pone junto al programa mientras dura.
- Visto en el emulador (rtg, sin Locale: inglés): la página de inicio y la barra de estado en inglés ("Ready:
  4649 bytes in 267 ms"). Sin catálogo, como antes.
- Ojo: tools/catalogo.py también lee los tr( de los comentarios (un ejemplo en uno chocaba con el número 5).
- (2) Las páginas tachyon: de lib/ (buscadores, descargas, marcadores, historial, cookies; números 300-358) y los
  enlaces a Wikipedia (en inglés, en.wikipedia.org). hueco y hueco2 pasan a lib/idioma.dash. 143 textos, todos
  traducidos. Visto tachyon:buscadores en inglés en el emulador.
- (3) La actualización automática trae también los catálogos: lib/actualizar.dash recoge de la versión nueva sus
  Tachyon-<idioma>.catalog (actualizar_catalogo_idioma) y, tras instalar el programa, src/dashweb.dash los baja uno
  a uno a Catalogs/<idioma>/ de su cajón (como .new y, si es un IFF FORM, en lugar del de antes). tools/paquete.sh
  los deja en build/ para subirlos con la versión. tests/test_actualizar.dash: el idioma, adónde va (también en la
  raíz de un disco) y bajarlo y ponerlo.
- (4) Acerca de: sus créditos ("tr": 43 en el .dashui) y "compilado el %1 a las %2" (texto_version ya no lo pone en
  C: compilado_fecha y compilado_hora). 145 textos, todos traducidos. Sin ver en el emulador (la acción de menú
  de tools/amiga/clicar.dash no la abrió).
- (5) Los errores de lib/http.dash y lib/documento.dash (400-411, "tiempo agotado", "cuerpo cortado"...): salen tras
  "Error:" en la barra. Los de lib/red.dash no: parte corre en la tarea de la red y el catálogo se abre con el primer
  tr, mejor que lo abra la principal. 157 textos, todos traducidos.

### 2026-10-24 — Tarea 48b (dash): las barras y los subrayados
- dash.freemem.space entera contra Chrome (copia local bajada con scrollBy, capturas juntadas): casi igual. Dos
  cosas: las barras de "609 builtins" salían todas enteras y los enlaces del pie y los títulos de "Hecho con Dash"
  sin su subrayado naranja.
- Las barras son inline-size: 63%: lib/estilo.dash pasa inline-size, block-size y sus min- y max- a width y height
  (_logica_tamano; los márgenes y rellenos lógicos ya se pasaban).
- El subrayado era el estilo de la fuente del Amiga: del color del texto, de 1 px y nada con las fuentes web (los
  enlaces van en topaz, una fuente web). Ahora lo dibuja la maqueta (_subrayar: una línea por tramo, seguida bajo los
  espacios), con text-decoration-color (o el del atajo), text-decoration-thickness y text-underline-offset; el de un
  antepasado en línea vale para lo de dentro (un <a> con un <span>), con su color.
- tests/test_maqueta_subrayado.dash (nuevo) y test_maqueta_inset.dash (inline-size). Visto en la copia: las barras en
  su proporción y el pie con sus subrayados naranja. Queda distinto: la letra del código (LetterGothic, algo más
  pequeña que la monospace de Chrome con el mismo interlineado).

### 2026-10-24 — Tarea 46 (1): pestañas
- src/navegador.dashui: una fila bajo la barra de herramientas (escondida con una sola pestaña) con 8 botones
  escondidos, un hueco y un "+"; menú Proyecto: Nueva pestaña (Amiga-T) y Cerrar pestaña (Amiga-W). Dash no añade
  objetos MUI mientras corre: los botones se enseñan con el título de su página (cortado a 18; la de delante en
  negrita, \eb).
- src/dashweb.dash: Ventana sigue con los campos de la pestaña de delante (casi todo el código, igual) y una lista
  de Pestana con los de las de detrás; cambiar de pestaña (pestana_guardar / pestana_traer) los guarda y trae, y pone
  al día la dirección, el título, la barra de estado, los botones, la barra de desplazamiento y la página. Las de
  detrás, quietas: sin temporizadores ni carga (sigue al volver). Cerrar la última cierra la ventana; cerrar la
  ventana suelta las páginas de todas.
- Visto en el emulador (rtg): Amiga-T abre la de inicio en una segunda pestaña, la barra sale con "Buscador" y
  "Tachyon", un clic en la primera la trae entera (su dirección, su título, su página) y Amiga-W cierra la de
  delante y esconde la barra. Ojo: sin el hueco, al enseñar la fila MUI estrechaba la ventana (los botones tienen
  un ancho máximo).
- (2) Mayúsculas o Amiga con un clic en un enlace: en una pestaña nueva (modificadoras: PeekQualifier de
  input.device). Sin ver en el emulador: tools/amiga/clicar.dash tiene ahora "C X Y" (clic con Mayúsculas, pulsada
  un segundo), pero una tecla metida con IND_WRITEEVENT no cambia el estado que da PeekQualifier (sale 0; el
  dispositivo sí se abre). Con un teclado de verdad debería verse; si no, pedir a Dash el Qualifier del clic en el
  lienzo de MUI (mui_canvas_button solo dice si fue clic). El clic sin teclas, como siempre (visto).
- (3) Las de detrás sin sus imágenes decodificadas: lib/imagenes.dash guarda el pedido de cada una que llega de un
  fichero (Imagenes.hechas); imagenes_dormir suelta esas imágenes y sus copias escaladas (los ficheros de T:
  quedan) e imagenes_despertar las vuelve a poner en la cola, que las decodifica otra vez sin bajarlas (su <img> ya
  tiene su tamaño: la maqueta no cambia). src/dashweb.dash duerme la que pasa detrás y despierta la que vuelve.
- tests/test_imagenes_dormir.dash (nuevo). Visto en el emulador con tests/pages/imagenes.html y la de inicio:
  dormidas, de 12 KB de imágenes y 48 de copias a 0, y de 92 a 0; al volver, sus imágenes otra vez en su sitio.
- (4) Con poca memoria libre (menos de 4 MB; POCAMEMORIA=KB lo cambia, y tools/medir_visor.py --poca-memoria),
  las pestañas de detrás de todas las ventanas sueltan su página (descartar_pestanas, al acabar de cargar una y al
  abrir una nueva) y se quedan su dirección, su historial y su título; al traerla, se carga otra vez (arriba del
  todo). Visto en el emulador con POCAMEMORIA=999999: la de tests/pages/imagenes.html, descartada al abrir otra,
  con "Imágenes" en su botón, y entera otra vez al volver.

### 2026-10-24 — Tarea 49: la portada en azul del CoffinOS del usuario (la FPU en precisión simple)
- Reproducido con una copia de su CoffinOS (cp --reflink del disco a ~/.cache/tachyon-pruebas/, Amiberry en Xvfb
  :97 con su configuración y use_gui=no). Amiberry tiene un socket de control (/run/user/1000/amiberry.sock; las
  órdenes con tabuladores: SEND_KEY código estado, SEND_MOUSE dx dy botones): Amiga derecha+E abre "Ejecutar orden" y
  se teclea con el mapa de su teclado (":" es Mayúsculas+0x2A, "/" la del teclado numérico 0x5C, ">" Mayúsculas+0x30).
- Su salida: tras el #418 y un #519 de React (desajuste al hidratar), "101 cambios": React quitaba todo lo de <body>
  y no ponía nada; solo quedaba el fondo. Con una página que mide: 0.1 + 0.2 = 0.30000001192092896, 1/3 =
  0.3333333432674408 y Date.now() a saltos de 131072 ms: el JavaScript contaba con 24 bits. El FPCR de Tachyon era
  0x40 (precisión simple) ya al empezar Main; un programa de Dash mínimo, lanzado igual, tenía 0 (libnix
  ___fpucheck solo toca el redondeo). FS-UAE no emula la precisión del FPCR y por eso no salía aquí; un 68040 o
  68060 de verdad sí la respeta.
- src/dashweb.dash: fpu_precision_extendida() al empezar (FPCR, bits 6-7 a 0, si hay FPU). Visto en la copia:
  doble precisión, el reloj bien y tachyon.freemem.space entera con sus estrellas en 5 s.
- Pendiente: saber quién deja el FPCR en 0x40 antes de Main (algo del arranque de Tachyon que el programa mínimo no
  tiene) y si las tareas que crea Tachyon (red, imágenes) lo heredan.

### 2026-10-24 — Tarea 45g (6): inglés de serie, el castellano en su catálogo
- Decisión del usuario (por la sesión de las webs): "Inglés de serie y castellano en catálogo", como los programas
  del sistema. Volteado con un script: cada tr(N, "castellano") del código y cada texto con "tr" del .dashui, al
  inglés de catalogos/english.ct; @catalog "Tachyon.catalog" 1 (sin idioma: inglés); catalogos/español.ct con el
  castellano de antes (162 textos), english.ct fuera; catalogos/LEEME al día.
- Visto: en el emulador (sin Locale) la página de inicio y la barra en inglés; en la copia del CoffinOS del usuario
  (Locale en español) con Catalogs/español/Tachyon.catalog junto al programa, en castellano.

- Los tests que esperaban textos en castellano (test_buscadores, test_descargas, test_http, test_http_carga,
  test_marcadores), al inglés.

### 2026-10-24 — Tarea 45g (7): el catálogo que falta se baja solo, y ocho idiomas más
- El problema: la 0.5.0 y la 0.6.0 se actualizan solas pero no bajan catálogos (eso entró después), y con el inglés
  de serie quien actualizase desde el navegador se quedaba en inglés. Ahora Tachyon, al abrirlo sin argumentos y sin
  catálogo en el idioma de Locale (loc_PrefLanguages[0]; no si es english), baja el de su versión de GitHub
  (releases/download/v<versión>/Tachyon-<idioma>.catalog) a Catalogs/<idioma>/, lo abre ya (catalog_open: las
  páginas tachyon: y la barra en ese idioma; los menús, al abrirlo otra vez) y lo dice en la barra. Una vez por
  versión e idioma (preferencia catalogo_pedido; sin red se prueba otra vez, un 404 no). DESCARGAS=dirección lo
  pide de ahí, para probarlo.
- GitHub cambia los nombres de fichero con caracteres que no son ASCII: los catálogos se publican sin acentos
  (Tachyon-espanol.catalog; tools/paquete.sh) y el idioma de verdad se lee de dentro (su LANG). También para los de
  la actualización (lib/actualizar.dash: actualizar_catalogos, actualizar_catalogo_poner con el idioma de dentro,
  actualizar_catalogo_lang, actualizar_idioma_preferido, actualizar_ascii, actualizar_catalogo_url).
- Ocho idiomas más, traducidos de una vez (por revisar con quien los hable): deutsch, français, italiano, português,
  nederlands, svenska, dansk y norsk (catalogos/*.ct, 163 textos cada uno). Polaco y checo necesitan Latin-2: fuera.
- Visto: test_actualizar (el idioma de dentro, sin acentos, el de una versión y uno sin publicar: 404); en la copia
  del CoffinOS (Locale en español) sin Catalogs/: lo pidió, quedó en Catalogs/español y, abierto otra vez, todo en
  castellano y sin pedirlo más.
- Fallo mío: el socket del IPC de Amiberry (amiberry.sock) era del CoffinOS del usuario, abierto a las 12:02; unas
  teclas de la prueba le llegaron a él. El script de teclas busca ahora el socket por el PID de la copia.

### 2026-10-24 — Publicada la v0.7.0-alfa
- Batería 104/104 con todo (inglés de serie, catálogos, catálogo propio); MUI 3.8 (sys32rtg38) con freemem.space,
  entera en 27 s. PR #8 de dev a main; paquete en un worktree limpio de main; release con tachyon.lha, Tachyon.gz y
  los nueve Tachyon-<idioma>.catalog (GitHub no les cambió el nombre; Tachyon-espanol.catalog se baja: 200). El
  CoffinOS del usuario tiene la 0.6.0 de las 09:00, sin Catalogs: es la prueba de verdad de actualizar y del
  catálogo propio. Avisada la sesión de las webs.
- Pendiente: la página de un repositorio de GitHub (la columna de la derecha, demasiado ancha; el botón Code tapado
  por "About"): en las notas como fallo conocido. El vídeo de la 0.7.0 (RTG, en inglés y en castellano: actualizar,
  un vídeo de YouTube con sonido, una web de freemem.space; música: un mod con licencia libre o con permiso).

### 2026-10-24 — Tarea 50: la página de un repositorio de GitHub
- Captura del usuario (CoffinOS, github.com/FreeMEM/tachyon): la lista de ficheros estrecha, la columna "About"
  ocupando el resto y su título encima del botón Code. Reproducido con la página guardada (curl con el agente de
  Tachyon; sus 38 hojas, 4 MB, podadas a 0,7 MB con las reglas cuyas clases están en el HTML: tinycss2) servida en
  local, en la máquina RTG ancha con MUI 3.8. En los tests no: el 68020 de la batería no acaba con tanto CSS.
- CAJAS=texto (medir_visor --cajas): al acabar, la caja y el estilo de maqueta de los elementos con ese texto en su
  class. Así salió: el Pane sin width ni padding.
- Causa 1: las --x se guardan solo si alguna hoja las nombra en un var() (Hojas.vars_usadas), y GitHub nombra
  --pane-width-large y --spacing-normal solo en el style del Pane (--pane-width-size:var(--pane-width-large)): la
  regla del antepasado que las da se saltaba. Ahora estilo_aplicar suma las de los atributos style del árbol, y un
  cambio del JavaScript que trae una --x nueva en un style (o un elemento que entra con ella) rehace el estilo
  entero.
- Causa 2: los títulos (h2 { font-size: var(--h2-size, 24px) } en la capa primer-css-base y :where(.Heading):where(
  [data-variant=small]) { font: var(--text-title-shorthand-small, ...) } en primer-react, de después) salían a 24 px:
  el font-size de un atajo font con var() no se miraba nunca. Ahora va si le gana al suelto. Y "600 1rem / 1.5 ..."
  (la barra con espacios, como da la --x de Primer) ya no mete "/ 1.5" en la familia.
- Visto: test_estilo_vars_inline (la --x del style con @media en el antepasado, y con el JavaScript) y
  test_estilo_font_var (capas, respaldo, el suelto que gana y la barra); los dos fallan sin el arreglo. La página
  guardada: la columna a 320 px a la derecha, la lista de 952 y los títulos a 16 px, como Chrome. Quedan las barras
  grises de los commits (llegan por fetch; con la página guardada no hay de dónde) y la cabecera ("Platform").

### 2026-10-24 — Tarea 51: ir a otra página desde la página (location.replace, meta refresh)
- Captura del usuario: un resultado de html.duckduckgo.com lleva a duckduckgo.com/l/?uddg=..., que solo hace
  window.parent.location.replace(destino) (con una meta refresh dentro de <noscript>), y se quedaba en blanco.
  location.assign/replace apuntaban __dashweb_ir y nadie lo leía; location.href = y window.location = no hacían
  nada; y no había meta refresh.
- Ahora: __dashweb_navegar(url, sustituir) (lib/jsdom.dash) deja la dirección en los atributos "ir" e
  "ir_sustituir" del documento; location.href es un get/set, assign y href = y window.location = y
  document.location = van, replace y reload sustituyen; todo relativo a la página. dashweb (ir_pedido, en cada tic)
  lo abre: replace y el refresh en lugar de la página en el historial (atrás no vuelve a la de salto).
  documento_refresco: <meta http-equiv="refresh" content="N; url=...">, con comillas y URL= en mayúsculas; sin
  dirección, la misma página si N >= 1; la de dentro de un <noscript> no cuenta. programar() despierta a su hora.
- De paso: programar() no contaba el catálogo propio que se baja (45g 7): sin otra cosa en marcha podía quedarse
  parado hasta el siguiente evento.
- Batería 107/107 (con la 50). Visto: test_navegar_js; la /l/ de DuckDuckGo de la captura en la máquina RTG ancha: pasa a
  https://github.com/FreeMEM/dash y lo carga.
- Pendiente: navigator.language sigue 'es-ES' fijo; debería seguir al idioma de Locale.

### 2026-10-24 — Publicada la v0.7.1-alfa
- Con la 50 y la 51 (los resultados de DuckDuckGo, el buscador de serie, no abrían). Batería 107/107; MUI 3.8
  (sys32rtg38) con la /l/ de DuckDuckGo: salta a github.com/FreeMEM/dash. PR #9; paquete en un worktree limpio de
  main; release con tachyon.lha, Tachyon.gz y los nueve catálogos (11 ficheros).

### 2026-10-24 — Tarea 52: el idioma de Locale para las webs
- navigator.language era 'es-ES' fijo (y languages ['es-ES', 'es', 'en']) y las peticiones no llevaban
  Accept-Language: cada web elegía el idioma a su manera, y en inglés de serie (45g) el JavaScript seguía diciendo
  español.
- Ahora, al arrancar, el primer idioma de Locale pasa a su código de web (actualizar_idioma_web: los nombres de
  AmigaOS sin acentos, "español" es-ES, "français" fr-FR, "norsk" nb-NO; uno que no se conoce, en-US) y de ahí a
  http_idiomas (Accept-Language como Chrome: "es-ES,es;q=0.9,en;q=0.8") y a jsdom_idioma (navigator.language, y
  languages con la base y "en"). De paso, navigator.userAgent decía "dashweb/0.1": ahora "Tachyon/0.7".
- Batería: 108/108. Visto: test_idioma (los códigos, la cabecera que llega al servidor de pruebas, /eco_idioma, con y sin, y
  navigator en la página con dos idiomas). En el emulador la Locale es inglés: en-US. Sin ver una web real en
  castellano.

- Panel: la sesión de trasfondo lo puso al día a mano (áreas, estándares, medidas: docs/panel/, revisados con la
  bitácora); tools/panel_progreso.py cuenta ya las subtareas con solo su letra ("[x] f." de la 45: 45f). Marcadas
  la 45 a-e; la 45, la 45g y la 46, en curso (lo que les falta, en cada una).

### 2026-10-24 — Tarea 45g (8): los errores de la red y de la actualización, también en el catálogo
- Quedaban fuera del catálogo: los errores de lib/red.dash (corre en la tarea de la red, que no debe abrirlo), los
  de la red del runtime de Dash (net_error: en castellano, "conexión rechazada", "no se encuentra el servidor"...),
  los de instalar una versión (C de lib/actualizar.dash) y el título de la página de error ("No se pudo cargar",
  fijo en lib/documento.dash). Con el inglés de serie salían mezclados.
- Ahora lib/red.dash da sus errores en inglés y lib/http.dash, en la tarea principal, pasa los de la conexión por
  _http_error_red (los de red.dash y los de Dash, a tr(420-441); uno que no conoce, tal cual) al ponerlos en la
  respuesta. La instalación da un número (_actualizar_instalar) y actualizar_instalar lo pasa a tr(450-461). El
  título, tr(412). 35 textos nuevos (198), traducidos en los nueve catálogos.
- Batería: 108/108. Visto: test_http, test_http_carga ("connection refused"), test_actualizar ("the download arrived damaged
  (CRC)"), test_red; en la copia del CoffinOS (Locale en español) con el catálogo: "No se pudo cargar la página" y
  "conexión rechazada". (En FS-UAE el catálogo no se abre: su Locale no tiene idioma; la captura con
  medir_visor --catalogo engañaba, porque el título estaba fijo en castellano.)
- La 45 queda hecha.

### 2026-10-24 — Tarea 46 (5): la pestaña descartada vuelve a su sitio
- Al traer una pestaña descartada por poca memoria se cargaba otra vez arriba del todo. Ahora Ventana.desde_volver
  guarda dónde estaba: ajustar_barra la pone en cuanto la página es así de alta, y si no llega, al acabar de
  cargar (sin imágenes pendientes) lo más cerca posible. Un desplazamiento de quien mira, otra dirección o cambiar
  de pestaña antes lo anulan (al cambiar, se guarda como su sitio). Al traerla, la barra a cero: su aviso no
  parece un desplazamiento de quien mira.
- Visto en la máquina RTG con MUI 3.8 y POCAMEMORIA=999999 (tests/pages/larga.html, nueva: 300 párrafos): tres
  páginas abajo, Amiga-T, clic en su botón: se carga otra vez y queda en el párrafo 50. Sin batería: el cambio es
  solo de src/dashweb.dash, que ninguna prueba compila.

### 2026-10-24 — Tarea 48d (1): los números a texto con Ryu
- Number a texto (String(x), x + "", toString(), en base 10) iba por js_dtoa de QuickJS: prueba con enteros largos
  si P cifras devuelven el número. Una búsqueda binaria de P salió peor (quitando los ceros del final, casi
  siempre acierta en dos pruebas): lo caro son las multiplicaciones de enteros largos, no cuántas.
- Ahora, en base 10, Ryu (third_party/ryu, de Ulf Adams, Apache 2.0 o Boost; commit 4c0618b0e44f): el decimal más
  corto sin enteros largos. d2d.c (de dashweb) da a js_dtoa la mantisa y el exponente; el formato sigue siendo el
  de QuickJS. Un cambio en ryu/d2s.c: las cifras sobrantes se quitan de ocho en ocho y con 32 bits cuando caben (un
  decimal corto como 2.22 quitaba 14 de una en una con divisiones de 64 bits, y salía más lento que antes).
  tools/build_qjs.sh lo compila (26 KB); tests/run.py rehace libqjs.a si cambia; su licencia, al paquete y a
  "Acerca de".
- De paso, más correcto: QuickJS daba a veces 17 cifras donde bastaban menos (-6.0908212571249994e+287 en vez de
  -6.090821257125e+287; 21.833 de 5,5 millones al azar, todos con exponentes grandes). Ahora como Chrome.
- Visto en el PC: igual que String() de Node en 2,4 millones de números (al azar, decimales cortos, colores,
  diminutos, enormes), con el camino de 32 bits de Ryu, el del 68k. En la máquina RTG, 6000 números (restado el
  bucle, ~80 ms): decimales largos ~220 -> ~170 ms, cortos (i * 0.37) ~287 -> ~195 ms.
- Batería: 108/108.

### 2026-10-24 — Tarea 42a: Wikipedia, la cabecera en una fila
- es.wikipedia.org/wiki/Commodore_Amiga_1200 en la máquina RTG ancha con MUI 3.8, contra Chrome al mismo ancho: el
  artículo ya no sale aplastado ni con las pestañas pisadas (arreglado por el camino). Lo que se veía distinto: el
  buscador bajaba a otra fila bajo el logo y "Crear una cuenta" se partía en dos líneas.
- Causa 1: la cabecera es un flex con flex-wrap y su parte derecha (flex-grow 1) se mide por su contenido
  (_ancho_flotante a 4000); dentro, el buscador también tiene flex-grow y crecía hasta los 4000, así que la parte
  derecha medía todo y bajaba de línea. Ahora, al medir el max-content (_midiendo_max), un flex en fila sin width
  no reparte el sitio sobrante: cada uno con lo suyo, y uno con flex-basis (flex: 1) con su contenido.
- Causa 2: una lista flex dentro de otro flex, con márgenes en sus elementos: el total cabía justo, entraba por el
  camino de encoger y el mínimo automático de "Donaciones", medido a 1 de ancho, daba 3 más que su ancho a lo ancho;
  "Crear una cuenta" encogía 6 para hacerle sitio y se partía. El mínimo automático ya no pasa de su base cuando
  esta es la de su contenido.
- Visto: test_maqueta_flex con dos casos nuevos (fallan sin el arreglo); las 29 de maqueta; Wikipedia: la cabecera
  como en Chrome.
- Batería: 108/108.


### 2026-10-24 — Publicada la v0.7.2-alfa
- Con la 52 (el idioma de Locale para las webs), la 45g (8) (los errores en el catálogo), la 46 (5) (la pestaña
  descartada vuelve a su sitio), la 48d (1) (los números a texto con Ryu) y la 42a (la cabecera de Wikipedia).
  Batería 108/108; Wikipedia con MUI 3.8 (sys32rtg38ancha). PR #10; paquete en un worktree limpio de main; release
  con tachyon.lha, Tachyon.gz y los nueve catálogos (11 ficheros); las descargas responden (200).
- tools/paquete.sh no hacía build/video-lib/libvideo.a en un worktree limpio (sí las de QuickJS e imágenes): ahora sí.
- Un usuario en MorphOS: funciona, pero avisa de un acceso a los chips custom. Es la única lectura que queda en el
  ejecutable: $DFF006 (la posición del haz) en la semilla de AmiSSL del runtime de Dash (compiler/codegen.py).
  Pedido a la sesión "dash" (por el usuario, a mano) que la quite.

### 2026-10-25 — Tarea 38a, 38b: YouTube, lo primero (scripts de 10 MB, MutationObserver, NodeFilter)
- La portada en la máquina RTG ancha: en blanco a los 190 s. Tres errores: performance.timing.responseStart (no
  había timing), NodeFilter (el polyfill de componentes web recorre el árbol con TreeWalker) y el script principal
  (desktop_polymer, 10,8 MB sin comprimir: YouTube no lo da en gzip) con "SyntaxError: unexpected end of comment".
- Ese error tenía tres causas, una tras otra:
  1. red_leer juntaba el cuerpo trozo a trozo (r = r + trozo) y la conversión de UTF-8 de lib/texto.dash también:
     Dash reservaba el doble al crecer y, pasados 8 MB (un texto llega a 16 MB), no podía y perdía lo añadido sin
     avisar: QuickJS recibía el principio del script hasta su única ö (~5 KB). Arreglado en Dash por la sesión "dash"
     (06127d8 en la rama dashweb: si el doble no cabe, lo justo) y red_leer junta todo en el búfer y hace un texto.
  2. Sin memoria al analizarlo: QuickJS necesita ~60 MB para un script así y el tope del JavaScript era 48 MB fijo.
     Ahora dos tercios de la memoria libre al crear el motor (entre 48 y 256 MB). Y aun así faltaba: el búfer de la
     tarea de red y el de la conexión (16 MB cada uno, en una conexión que sigue abierta) se quedaban reservados.
     Ahora se sueltan al vaciarse si pasan de 1 MB, y la tarea, si no le cabe lo recibido, crece en vez de tirarlo
     (antes, sin memoria, se perdían datos sin avisar). Antes de evaluarlo: de 78 a 96 MB libres.
  3. Cortado a los 120 s (analizarlo son ~47 s en la RTG emulada y luego monta la aplicación): un script de más de
     1 MB tiene 20 s más por MB (el de YouTube, ~320 s).
- Nuevo en el preludio: performance.timing y la entrada de navegación; NodeFilter, createTreeWalker y
  createNodeIterator; MutationObserver de verdad (antes no avisaba nunca): se envuelven los métodos de C que cambian
  el árbol (appendChild, insertBefore, removeChild, replaceChild, setAttribute, removeAttribute, innerHTML,
  textContent, data, nodeValue, id, className); se entrega en una microtarea, una vez por cambio y observador.
- Después, uno tras otro (cada carga de la portada son ~10 min en la RTG emulada; lo que se pudo, en una página
  local con el polyfill de YouTube):
  - MessageChannel y MessagePort (cada puerto entrega al otro en un temporizador a 0).
  - Todos los elementos comparten aquí un prototipo con lo de cada etiqueta (async de <script>, host de <a>, src,
    value...): Polymer hace S.prototype.async = function... y ShadyDOM this.host = ... en su ShadowRoot. Ahora un
    setter (o una de solo leer) del prototipo de los nodos, sobre algo que no es un nodo de verdad
    (__dashweb_es_nodo, nativo), deja una propiedad normal; y host y las demás partes de la dirección, en un nodo que
    no es <a> ni <area>, se guardan en él.
  - <template>: su content es un fragmento con sus hijos (también tras un innerHTML, que lo sustituye; y al
    clonarlo); document.importNode y adoptNode.
  - La pila: 1 MB en el navegador (src/dashweb.dash; antes 256 KB, 192 para QuickJS): Polymer pinta sus plantillas en
    recursión y se desbordaba. QuickJS usa la pila que tenga la tarea, menos 64 KB. Y una sola capa de envoltorio
    por propiedad.
  - Range básico (límites, borrar, sacar y clonar en un mismo contenedor, insertNode, createContextualFragment).
  - El documento con su prototipo (Document.prototype): createElement y los demás eran propiedades suyas y tapaban
    el parche del polyfill (que da los elementos propios ya mejorados: iron-overlay-backdrop sin prepare()).
    createHTMLDocument hereda de él (jQuery se rompía).
- La batería salió 37/109: casi todo TIMEOUT en los lotes sin servidor. No era un cuelgue: el preludio pasó de 90 a
  111 KB y crear un documento con JavaScript es, en el 68020 de las pruebas, sobre todo analizarlo (5 documentos:
  167 s antes, 207 después); los lotes se pasaban de su tiempo. Ahora el preludio se compila una vez y su bytecode se
  guarda (js_evaluar_guardado: JS_WriteObject y JS_ReadObject), en memoria y en T:tachyon_preludio.bc (con el largo
  y una suma del texto: si cambia, otra vez); los demás motores y los programas que vengan lo leen. 5 documentos:
  77 s el primer programa (compila), 42 s los siguientes (cuatro veces más rápido que antes). El texto del preludio
  (2272 líneas juntadas) también se hace una vez. Va bien a todas las páginas y a cada vez que se abre Tachyon.
  Probado y descartado: compilar el bytecode en el PC (tools/preludio.py) y meterlo en el ejecutable: el 68k lo leía
  mal y QuickJS abortaba (también en 32 bits; y con JS_READ_OBJ_ROM_DATA, en un big-endian QuickJS da la vuelta a
  los bytes en el mismo bytecode). Queda de aquello third_party/quickjs/amiga/assert.h: un assert de QuickJS dice
  cuál falló (antes, solo "abort").
  De paso, el envoltorio de los setters del prototipo, sin recorrerlo entero al arrancar: los de def() y los de C
  (_JSDOM_ESTE_PONER) lo hacen ellos.
- Cómo queda (2026-10-25, máquina RTG ancha, 10 min): la portada llega a "entera" a los 620 s, sin errores del
  polyfill. Quedan: style de un envoltorio de ShadyDOM (ShadyDOM.wrap da un objeto sin style; alguna detección de
  YouTube toma otro camino aquí), "not a function" en playerApi y attached (el reproductor), y sobre todo la memoria:
  46 MB de JavaScript y 8 MB libres al final; luego "out of memory". Aún sin captura de la portada pintada.
- De paso (45g 8): red_copiar decía "can't send" al no poder escribir el fichero; ahora "can't write" (tr 442).
- Dash: también la semilla de AmiSSL sin leer $DFF006 (cda58c1; el aviso de MorphOS).
- En la página de verdad aún faltaba memoria (79 MB libres y el mayor bloque de 62 al evaluarlo). Más ahorros: un
  script de más de 1 MB se analiza sin guardar su código fuente para toString() (QuickJS copia el texto de cada
  función, también el de las de dentro: en el PC, de 80 a 64 MB para analizarlo; y sin memoria QuickJS da errores
  de sintaxis falsos, como el "unexpected end of comment"); un script todo ASCII va a QuickJS sin copiarlo a UTF-8,
  y los de fuera llegan en ASCII (utf8_a_js_ascii: también lo de Latin-1 como \uXXXX; los de dentro de la página
  no, que una plantilla en un <script> se lee como texto).
- El polyfill de componentes: faltaban CDATASection y ProcessingInstruction (y DocumentType, Attr), y copia
  addEventListener de EventTarget.prototype para buscarlo luego en window y en cada nodo: ahora la cadena de
  prototipos es la de un navegador (window -> Window.prototype -> EventTarget.prototype; los nodos ->
  EventTarget.prototype).
- La batería siguió 37/109 tres veces más, igual. La causa de verdad, con capturas y un programa que mide la
  memoria entre prueba y prueba: en la A1200 de pruebas (8 MB), el código de una prueba con documento es un solo
  trozo de 3,9 MB, y tras unas pocas pruebas el mayor bloque libre ya era menor: "not enough memory", el guion de
  arranque se para ahí y todo el lote sale TIMEOUT. Partían la memoria:
  0. Lo principal, en Dash: cada programa dejaba abiertas mathieeedoubbas, mathieeedoubtrans, mathieeesingtrans...
     (las abre libnix para fmod, acos...), que ya no se podían descargar y quedaban en medio. La limpieza de Dash
     ponía IntuitionBase a NULL, y __exitlibraries de libnix para en el primer 0 de su lista. Arreglado por la sesión
     "dash" (1a7144e en la rama dashweb). Ya pasaba antes de esta tarea (test_acid2 dejaba 25 KB así).
  1. build/qjs-lib/libqjs.a estaba compilada de un estado viejo (de los experimentos con el bytecode; run.py no la
     rehízo porque las fuentes no eran más nuevas): cada programa con JavaScript dejaba 46 KB sin soltar en medio de
     la memoria (con la de la versión anterior, o rehecha con tools/build_qjs.sh lib, nada). Rehecha.
  2. T:tachyon_preludio.bc: el fichero de RAM: también se queda en medio. Ahora se guarda solo si el mayor bloque
     libre pasa de 32 MB; leerlo, siempre. En la A1200 de pruebas no se guarda (dentro de cada programa el bytecode
     sigue en memoria).
  Por el camino, la pila de 1 MB pasó de lib/js.dash a solo el navegador. test_recursos: js_simple.js llega con la í
  como í (38 bytes).
- Batería: 109/109 (2905 s, Dash 1a7144e).
- Visto: test_jsdom_mutaciones (nueva); las de js, jsdom, dom, documento, react, idioma y navegar_js.


### 2026-10-25 — Publicada la v0.7.3-alfa
- Con la 38a y 38b (YouTube: scripts de 10 MB, MutationObserver, TreeWalker, Range, <template>, la caché del
  preludio). Batería 109/109 (Dash 1a7144e: las bibliotecas de matemáticas se cierran al salir); Wikipedia con MUI
  3.8 (sys32rtg38ancha). PR #12; paquete en un worktree limpio de main; release con tachyon.lha, Tachyon.gz y los
  nueve catálogos (11 ficheros); las descargas responden (200).
- El ejecutable publicado lleva el arreglo de Dash 1a7144e, que de momento solo está en la rama dashweb local (la
  sesión "dash" lo lleva a main con su PR #57).
- El loop se para aquí (lo pidió el usuario). Lo siguiente: 38c (YouTube pintada) y después la 53.

### 2026-10-25 — Tarea 54: enviar un informe de depuración
- Menú Proyecto, "Send debug report..." (tr 47): abre tachyon:informe, una página propia (como tachyon:cookies) que
  dice qué es, lleva el botón "Send the report" y enseña entero lo que se va a mandar. Nada sale sin el botón.
- El informe (lib/informe.dash): la versión de Tachyon; exec, Workbench (version.library), CPU y FPU, MUI, la
  tarjeta gráfica (Picasso96 o CyberGraphX), bsdsocket.library, AmiSSL; la memoria (chip, fast, mayor bloque); el
  idioma; la última página; y el registro.
- El registro (lib/js.dash): una cola circular de 32 KB en C con lo que el programa dice de las páginas: console.log
  y los errores de JavaScript (todo pasa por _js_poner), los avisos de jsdom (registro_decir) y lo que anota el
  navegador con registro_anotar: cada página que se abre, la que acaba (tiempo y memoria), los errores de carga y el
  script cortado. Las direcciones van sin lo que sigue a "?" ni a "#", y sin usuario y contraseña
  (informe_sin_parametros). Ni cookies ni lo escrito en formularios.
- El botón va a tachyon:informe?enviar=1, que manda por POST (abrir_post) el campo informe a
  https://tachyon.freemem.space/informe; la respuesta es una página con el código (seis letras y cifras sin 0/O ni
  1/I) y el enlace a las issues, en castellano o en inglés según Accept-Language.
- El receptor, en el servidor de las webs (CT 108, FreeMEM/webs-freemem 87ae063):
  herramientas/servidor/tachyon_informes.py, solo biblioteca de Python, servicio tachyon-informes con DynamicUser;
  guarda /var/lib/tachyon-informes/<día>/<código>.txt sin la IP. nginx (desplegar.py, INFORMES) le pasa /informe
  con 512 KB como mucho y 6 por minuto por IP; el receptor, 500 al día y 500 MB de disco libres. Leer uno:
  ssh webs cat /var/lib/tachyon-informes/*/<código>.txt.
- Textos 47 y 471-475 en los nueve catálogos.
- Visto: test_informe (nueva: direcciones, registro con console.log y anotaciones, la vuelta de la cola, el informe y
  la página); en la máquina RTG ancha con MUI 3.8, tachyon:informe y tachyon:informe?enviar=1: el servidor contestó
  con su código y el informe llegó (borrado después, como los de prueba desde el PC).

- Batería: 110/110 (2926 s).

### 2026-10-25 — Publicada la v0.7.4-alfa
- Con la 54 (enviar un informe de depuración). Batería 110/110; el envío, probado desde la máquina RTG ancha con
  MUI 3.8. PR #13; paquete en un worktree limpio de main; release con tachyon.lha, Tachyon.gz y los nueve catálogos
  (11 ficheros); las descargas responden (200). El receptor ya estaba en marcha en el servidor de las webs.

### 2026-10-26 — Tarea 38c (parte): YouTube, dónde se va el tiempo; el loop se para (uso semanal 93 %)
- Base: 110/110 (2973 s, Dash 1a7144e).
- La portada en la máquina RTG ancha (MUI 3.8), dos veces sin --memcheck: blanca a los 6 min y luego nada más (ni
  salida ni capturas: el emulador deja de responder) hacia los 400 s de la carga. Con --memcheck no se colgó: 0
  errores, "entera" a los 229 s. YouTube no da siempre lo mismo: el script principal entero (10,8 MB) o partido
  (base de 1,2 MB y "late,app" de 9,6 MB, que llega después). Apuntado como 38c2.
- Con --perfil: el 46 % del tiempo es _css_bloque leyendo la hoja de 3,8 MB ("estilo hecho" 200 s después de los
  scripts). Medido aparte (tests/bench/css_grande.dash, 68040 con JIT): 184 s, 18 623 reglas. La causa, en Dash: la
  caché de largos de 8 huecos va por turno; cada cuerpo de regla de 64 bytes o más entra, a las 8 reglas sale la hoja
  y el corte siguiente hace strlen de 3,8 MB. Con una copia de Dash que echa el texto más corto: 10,1 s. Encargado a
  la sesión "dash" como D71; queda en cola (no empieza nada nuevo con el uso por encima del 90 %).
- ShadyDOM: la página pone ShadyDOM={force:true,preferPerformance:true,noPatch:true}, así que Chrome también usa
  el envoltorio sin style: el fallo de style viene de otro camino del código de YouTube (38c3).
- El loop se para aquí: uso semanal al 93 % (regla 1). Lo siguiente: compilar con D71 cuando llegue, 38c2 y 38c3.

### 2026-10-27 — Tarea 38c1 y 38c2: YouTube sin cuelgue (D71, hojas usadas otra vez, reserva para el sistema)
- El usuario mandó seguir aunque el uso semanal pasaba del 90 % (2026-10-26).
- D71 en Dash (9142671 en la rama dashweb, de la sesión "dash"): leer la hoja de YouTube, de 184 a 9,96 s
  (tests/bench/css_grande.dash).
- El cuelgue (38c2), con tools/amiga/latido.dash (nuevo, medir_visor --latido S): un programa en segundo plano que
  cada S segundos dice la memoria libre, el mayor bloque y, de la pila guardada de Tachyon, las direcciones que caen
  en su código (con m68k-amigaos-nm del ejecutable, y para las static de Dash el .o del mismo .c). El Amiga seguía
  vivo; Tachyon, en _css_buscar, se comía de 17 MB libres a 700 KB en 10 s y ahí se quedaba (ni capturas: shot
  necesita 5 MB seguidos a 1680x1050). La causa: cuando el JavaScript mete un <style>, documento.dash rehacía las
  hojas leyendo otra vez todas, también la de 3,8 MB, con las de antes aún vivas: 29 MB más.
  - Ahora (lib/estilo.dash, estilo_hojas_otra_vez) cada Hojas guarda las hojas leídas por su dirección (y los
    <style> de 8 KB o más por su texto) y al rehacerlas usa las mismas: se renumera el orden de sus reglas para su
    nuevo puesto y sus url() ya son completas. Las que tienen @layer se leen otra vez (el puesto de sus capas se
    apunta al leer). test_documento_hojas_js: la misma hoja, con otra metida delante y detrás.
  - Y el JavaScript deja al sistema una reserva (lib/js.dash, funciones de memoria propias para QuickJS): 1/16 de la
    memoria, de 512 KB a 6 MB; pasada, "out of memory" en el script. test_js: sin tope, un script que pide sin parar
    deja más de 400 KB libres (sin la reserva falla: "reserva: true false").
- El error de un script que mete el JavaScript decía solo la pila (en QuickJS no lleva el mensaje): ahora el mensaje
  y la pila.
- medir_visor --memoria MB: la memoria de las máquinas 68040 (para poder capturar YouTube, con 256).
- Cómo queda (máquina RTG ancha, MUI 3.8): con el script entero, "entera" a los 275-317 s; con 128 MB, el
  JavaScript llega a su "out of memory" y quedan 6 MB; con 256 MB, 143 MB libres al final. Con el partido, 45 s.
  Sale la barra de arriba (logo, buscador, menús) bajo un velo gris, y la rejilla en su esqueleto (captura enviada
  al usuario). Siguen los "not a function" de playerApi (this.getRoot().getPlayer().getPlayerPromise(), 38c3).
- Batería: 110/110 (3078 s, Dash 9142671).

### 2026-10-27 — Tarea 38c5 (parte): el diálogo de cookies de YouTube, con sus textos y botones
- Dos commits. El primero (903c39f): el diálogo se pintaba debajo de su fondo.
  - YouTube define style en el prototipo de sus componentes con solo un setter; el preludio envuelve
    Object.defineProperty para que ese accesor guarde el getter del de Node.
  - removeProperty se llamaba suelta (sin this).
  - getComputedStyle da los valores iniciales de CSS (top auto, position static, z-index auto...) en vez de "":
    iron-fit-behavior miraba top !== 'auto' para colocar el diálogo.
  - CAJAS= vuelca también top, left, z-index, opacity y el style.
- El segundo: los textos salían "zClosurez" (el saneador de polymer-resin mira si una propiedad está en un elemento
  limpio de su etiqueta y, si parece nativa y no la conoce, cambia el valor).
  - Un prototipo por etiqueta (PT[tag] = Object.create(N), y HTML*Element.prototype el de su etiqueta): name, href,
    src, text, type, value... solo en las etiquetas que los tienen; data solo en los textos y comentarios.
    _jsdom_objeto (lib/jsdom.dash) le pone a cada nodo el de su etiqueta.
  - Medir obliga a maquetar (como un navegador): el JavaScript que pide offsetWidth o getBoundingClientRect con
    cambios pendientes maqueta en ese momento (documento_maquetar_por_js, por un gancho en C de jsdom); como mucho
    una vez cada dos veces lo que tardó la anterior. iron-fit centraba el diálogo con su tamaño a 0.
  - Tests: test_jsdom_interfaces (las etiquetas, los prototipos, data) y test_documento_medir_js (nuevo).
- Cómo queda: a los 190 s el primer pintado; en la captura de los 350 s, la página de cookies entera ("Before you
  continue to YouTube", Reject all / Accept all / More options; captura enviada al usuario).
- Pulsar "Reject all" (clicar en medir_visor --acciones) no hace nada: con una traza temporal del clic, cae en
  tp-yt-iron-overlay-backdrop (fixed, capa 2201) porque el diálogo tiene capa 0. Apuntado en c5.
- Batería: 111/111 (3278 s).

### 2026-10-27 — Tarea 38c7 (parte): YouTube compila su script en la mitad (find_var con un índice en QuickJS)
- El usuario pidió primero la velocidad y luego el botón ("Velocidad y luego botón").
- Dónde se va el tiempo (máquina RTG ancha, 256 MB): con --perfil, el 69 % es JavaScript (48 % ejecutando los scripts
  de la página, 20 % sus temporizadores); estilo y maqueta, poco cada uno. Separando compilar de ejecutar
  (js_evaluar compila con JS_EVAL_FLAG_COMPILE_ONLY y luego JS_EvalFunction; js_ms_compilar da lo que tardó; con
  TRAZA, una línea por script de 1 s o más): el principal de YouTube, 10,8 MB, 149 s, de ellos 138 s compilar.
- tests/bench/js_grande.dash (nuevo): compila un fichero dentro de una función que no se llama. Con el script de
  YouTube: 145 s. Descartados: el malloc de libnix (bloques de 1 MB en vez de 16 KB, 141 s; uno que nunca libera,
  140 s) y la línea y columna de cada función (JS_STRIP_DEBUG, 138 s).
- En el PC (QuickJS compilado con gprof): 1,03 s, y el 56 % en find_var, que busca cada variable mirando todas las
  de su función; el script mete miles en una sola. Ahora, con 32 o más, la función lleva una tabla hash
  (third_party/quickjs, cambio 6 de docs/quickjs_amiga.md). En el PC, 0,49 s y el mismo bytecode (la misma suma);
  en el emulador, 66 s.
- La carga entera de YouTube: scripts de 158 a 77 s, primer pintado de 190 a 108 s, "entera" de 300 a 221 s.
- Batería: 111/111 (3230 s).

### 2026-10-27 — Tarea 38c7 (parte): el estilo por partes también con :has() en las hojas
- Tras los scripts, cada cambio del JavaScript rehacía el estilo entero de YouTube (1,7-8 s) porque su hoja tiene 29
  selectores con :has() (estilo_aplicar_partes se rendía con uno): 18 veces en una carga, 83 s de estilo y maqueta.
- Ahora (lib/estilo.dash, HasAncla): por cada :has() se apunta la clave del elemento que lo lleva, si está en la
  última parte del selector, lo que nombra dentro (clases, ids, atributos, etiquetas, :hover; y lo de su última parte
  aparte), si usa + o ~ y si es ":has(> x)". Un cambio rehace además los de arriba que pueden llevar ese :has() (con
  + o ~, también sus hermanos de antes; con "> x", solo el padre), y solo si toca algo que nombra: un atributo, lo que
  nombra en cualquier parte; lo que entra o sale, lo de la última parte. El elemento solo si el :has() está en la
  última parte (y todo lo suyo si su estilo cambia); si no, todo lo suyo.
- lib/jsdom.dash: un TOQUE_CONTENIDO lleva "#texto" cuando no salió ningún elemento (textContent o innerHTML en uno
  que solo tenía texto, un texto que entra): ningún :has() puede cambiar por él.
- test_estilo_has_partes (nuevo): una clase dentro, un hijo directo, un hermano, un :has() en medio del selector, uno
  que sale, una clase que nadie nombra, solo texto y un innerHTML; cada vez, lo mismo que rehaciendo todo.
  test_estilo_partes: con :has() ya se puede.
- YouTube: de 18 estilos enteros a 4 (2 por :has(): un aria-hidden y un contenido con elementos; 2 por hojas nuevas);
  estilo y maqueta tras los cambios, de 83 a 47 s. "Entera" sigue hacia los 225 s: entre los scripts y "entera", 90 s
  son los temporizadores de YouTube, 40 s estilo y maqueta y 16 s el estilo de la primera vez.
- Batería: 112/112 (3330 s).

### 2026-10-27 — Tarea 38c5: "Reject all" en YouTube (getComputedStyle y medidas al momento)
- Con una traza temporal del clic: caía en el fondo del diálogo porque el diálogo no tenía position: fixed (su
  z-index no contaba). iron-fit-behavior decide si ya está colocado con getComputedStyle (top/left !== 'auto') y lo
  guarda (_fitInfo): había quitado el top: 0px que puso antes y preguntó enseguida; getComputedStyle mira primero el
  atributo style y luego lo calculado, que era el de antes ("0px").
  - Ahora (lib/jsdom.dash, lib/estilo.dash estilo_calcular_uno): si el elemento o uno de arriba tiene cambios sin
    estilo aún, su estilo se calcula al momento (del de más arriba con cambios hasta él) y no se guarda: el paso de
    después ve igual qué cambió. lib/documento.dash le da a jsdom las hojas de cada documento (jsdom_poner_hojas).
    test_documento_estilo_js (nuevo).
- Ya con position: fixed, salía arriba a la izquierda, fuera de la pantalla: iron-fit lo pone en top 0 y left 0, mide
  y lo centra con lo medido, y la maqueta al pedir una medida solo se hacía si el elemento no estaba en la anterior.
  Ahora también si él o uno de arriba tiene cambios, sin esperar, hasta 4 seguidas (el gancho de jsdom pasa el
  elemento). test_documento_medir_js: uno que cambia de ancho.
- En el emulador (máquina RTG ancha): el diálogo centrado encima de la portada, como en Chrome; "Reject all" lo
  cierra, YouTube pide upgrade_visitor_cookie?eom=1 y carga otra vez la portada: "Your YouTube History is off"
  (como sin cuenta y sin historial). Capturas enviadas al usuario. Compilación puesta en Traspaso (con los
  catálogos de hoy; la anterior, Tachyon.24oct).
- Batería: 113/113 (3376 s).

### 2026-10-27 — Tarea 38c7 (parte): menos estilos enteros en YouTube y :has() de varias partes
- Tras el botón, el estilo seguía pesando más que la maqueta (64 s frente a 20 s en una carga con clic). Dos causas
  que se quitan:
  - Un atributo que nombra una parte de un :has() que no es la última (el aria-hidden del :has() universal de
    YouTube, ":has(>[role=dialog]:not([aria-hidden=true]) .ytwChannelBlocksViewModelHost) [dialog]") subía hasta
    <html>: ahora solo si debajo del elemento hay alguno de la última parte (_has_sujeto_dentro).
  - Un :hover en <body> con selectores de hermanos y :hover rehacía su padre, <html> (todo): ahora solo <body>.
- Y el motor de selectores evaluaba mal un :has() de varias partes (":has(> [role=dialog] .x)" pedía que el hijo
  fuera el .x): ahora como ":scope > [role=dialog] .x" sobre los de debajo (o, con + y ~, los hermanos de después y lo
  suyo); :scope nuevo (el elemento del :has(); fuera de uno, la raíz). test_selectores4 y test_estilo_has_partes.
- YouTube con clic: estilo tras los cambios de 64 a 49 s; quedan 2 enteros por hojas nuevas y 1 por un contenido con
  elementos. Una vez, el POST de upgrade_visitor_cookie (al pulsar Reject all) no tuvo respuesta y YouTube enseñó su
  capa de error; en la anterior respondió en 16 s (la red del emulador con tres a la vez; se mira si se repite).
- Batería: 113/113 (3429 s).

