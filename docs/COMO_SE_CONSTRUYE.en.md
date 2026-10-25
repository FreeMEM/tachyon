# How dashweb was built

*English | [Castellano](COMO_SE_CONSTRUYE.md)*

A guide to making other Amiga applications with Dash and MUI, using dashweb as the example.

It does not teach Dash or C. That is what the Dash manual is for (`docs/MANUAL_REFERENCIA.md` and
`docs/CHULETA_LENGUAJE.md` in the Dash repo). This explains how the pieces fit together: the tool, the MUI window,
the event loop, external C, testing in the emulator, the package and the way of working.

To learn how to connect the pieces (window, events, timer, network, signals, another process, files) with a
program that grows step by step, start with the [tutorial](TUTORIAL.en.md).

Dash paths (`compiler/`, `tools/`, `editor/`...) belong to the Dash repo. dashweb paths (`src/`, `lib/`,
`tests/`...), to this one.

## 1. The pieces

```
 your program (.dash) ─┐
 your windows (.dashui)┤──► ./dash ──► C ──► m68k-amigaos-gcc ──► Amiga executable
 your modules (lib/)  ─┘    (Python)        (+ Dash runtime,          (Hunk format)
                                             MUI SDK, your .a)
                                                        │
                                                        ▼
                                headless FS-UAE (tools/emu_run.py): output and screenshots
```

- **Dash** is a compiler written in Python. It translates the program to C and calls bebbo's cross-compiler
  (`m68k-amigaos-gcc`, in `/opt/amiga`). The result is an ordinary AmigaOS executable.
- **The Dash runtime** goes inside the executable. It brings the builtins: strings, lists, files, network (`net_`),
  TLS (`tls_`), graphics (`gfx_`), MUI (`mui_`), processes (`task_`)...
- **MUI** is not reimplemented. The `mui_` builtins call the Amiga's `muimaster.library`. Compiling needs the MUI 5
  SDK, which cannot go into git because of its licence: `tools/get_mui_sdk.sh` downloads it into `~/.cache`.
- **FS-UAE** runs the programs without opening a window and collects what they write. That way everything is tested
  from Linux.

## 2. Setting up the machine

Everything is in Dash's `docs/INSTALACION.md`. In short:

1. Python 3.10 or later and `lark`.
2. The cross-compiler in `/opt/amiga` (built once; it takes a while).
3. FS-UAE and a Kickstart 3.1 ROM of your own. Without a ROM the AROS one is used and the results are not valid.
4. The Workbench files for the emulator, taken from an Amiberry or WinUAE hard disk
   (`tools/emu_sys_from_hdf.sh`).
5. MUI: `tools/get_mui_sdk.sh` (SDK for compiling) and `tools/emu_sys_mui.sh` (a system with MUI for the
   emulator).
6. If there is secure networking: `tools/get_amissl.sh` and `tools/emu_sys_amissl.sh`.

The variables used by Dash, the tests and the plugin:

```bash
export DASH_KICKSTART="/ruta/a/kick31_a1200.rom"
export DASH_EMU_SYS=~/.cache/dash-emu/sys31             # Workbench 3.1
export DASH_EMU_SYS_MUI=~/.cache/dash-emu/sys31mui      # the same with MUI
export DASH_EMU_SYS_SSL=~/.cache/dash-emu/sys31ssl      # with AmiSSL
```

dashweb also uses a system with MUI, AmiSSL and fonts (`sys31muisslweb`, made with `tools/emu_sys_fuentes.sh`).
For your application, the one that has whatever it uses is enough.

## 3. How the repo is organised

| Folder | What is in it |
|---|---|
| `src/` | The programs: `dashweb.dash` (the MUI browser), `navegador.dashui` (its windows), `visor.dash` (no MUI). |
| `lib/` | Reusable modules, each with its test: network, URL, HTTP, HTML, CSS, layout, images, JS... |
| `tests/` | `test_*.dash` (one per module), test pages and local servers in Python. |
| `tools/` | Building the C libraries, measuring, comparing with Chrome, making the icons and the package. |
| `third_party/` | Other people's C: QuickJS, Hubbub, image decoders, MintVID. Each with its licence. |
| `iconos/`, `paquete/` | The toolbar icons and what goes into the `.lha` (LEEME, Installer script). |
| `docs/` | Plan and log (`DASHWEB_LOOP.md`), architecture, changes to QuickJS and this guide. |

Modules are imported with a path relative to the importing file: `import "../lib/documento.dash"`.
A module pulls in its own; `src/dashweb.dash` imports only four things.

A MUI program needs no more structure than this: a `.dash` with `Main`, a `.dashui` with the windows and whatever
modules you want to split out.

## 4. The MUI interface

### 4.1 The model

The rules of the `mui_` builtins (details in Dash's `docs/MUI_DISEÑO.md`):

- **Every MUI object is a number** (a "handle"). It is stored in a variable or a field.
- **The tree is built with a stack.** `mui_vgroup_begin()` opens a group; every object created goes into the open
  group; `mui_group_end()` closes it. `mui_window_begin()`/`mui_window_end()` do the same with the window.
- **Events are program numbers.** `mui_on_press(boton, 4)` makes `mui_wait_event()` return 4 when it is pressed.
  `-1` is "quit".
- **MUI owns the objects.** They are not freed one by one: `mui_app_end()` frees everything on exit.
- **The drawing area** (`mui_canvas`) is a MUI class from the runtime. It calls a function of yours to paint with
  the `gfx_` builtins.

With that you can build any window by hand. But in dashweb the window is not written by hand: it is drawn.

### 4.2 The window is drawn: the `.dashui`

`src/navegador.dashui` is a JSON file with the browser's windows (the main one and "About"). It is edited with the
VS Code plugin (section 5) or by hand. The program imports it as if it were a module:

```ruby
import "navegador.dashui"
```

The compiler reads it and generates Dash code (`compiler/dashui.py`). For each window it creates:

- a `struct` named after the window, with a field for each object that has a `"name"`, plus `window`;
- a `<Ventana>_create()` function that builds the window and returns that struct.

```ruby
v = Navegador_create()          # creates the window and its objects (without opening it)
mui_set_text(v.estado, "Listo") # each named object is a field
mui_window_open(v.window)
```

What the `.dashui` can say about each object:

- `"event"` (button), `"ack"` (Return in a text field), `"change"` (the value changes), `"double"` (double-click
  in a list): the event number. The compiler adds the corresponding `mui_on_*`.
- `"weight"` (how space is shared), `"hidden"` (starts hidden), `"disabled"`, `"help"` (help bubble).
- On the window: `"menus"` (with key and event per item), `"close"` (event of the close gadget) and `"size"`
  (initial size as a % of the screen).

The full table of types is in Dash's `docs/MUI_EDITOR.md`.

**Why this way:** the `.dashui` is the single source. There is no generated code to keep around or to fall out of
sync. Whatever the editor does not understand, it keeps as it is.

### 4.3 The program

The skeleton of `src/dashweb.dash`, cut down:

```ruby
import "navegador.dashui"

@workbench_output "NIL:"     # when started from the icon, what it writes does not open a console

# the event numbers from the .dashui, repeated as constants
const ID_IR = 4
const ID_SCROLL = 5
const ID_SALIR = 9
# and the ones only the program uses
const ID_TIC = 11

Main
    if mui_app_begin("dashweb", "DASHWEB") == 0
        Print "dashweb necesita MUI (3.8 o 5) y un 68020"
    else
        v = Navegador_create()
        mui_canvas_on_draw(v.pagina, pinta)
        mui_canvas_on_input(v.pagina, ID_PAGINA)
        mui_window_open(v.window)
        while true
            ev = mui_wait_event()
            if ev == -1 or ev == ID_SALIR
                break
            end
            if ev == ID_IR
                navegar(mui_get_text(v.url))
            end
            ...
        end
        mui_app_end()
    end
end
```

`mui_app_begin` returns 0 if there is no MUI or the CPU is a 68000. The program decides what to say.

Event numbers live in two places: the `.dashui` and the constants. That is the only thing that has to be kept in
sync by hand. It is best to keep them together at the top of the program, with a comment.

### 4.4 Several identical windows

dashweb opens up to four windows with the same design. They all send the same event numbers. The solution:

- A `struct Ventana` of its own holds the generated struct (`v: Navegador`) and that window's state (the page,
  the load in progress, the history...). They go in a global list.
- To know which window an event comes from, check which one is active: `mui_window_active(w.v.window)`.
- The close gadget cannot work that way (the window being closed may not be the active one). It is registered in
  the program with a different number per window: `mui_on_close(v.window, ID_CERRADA + k)`.

### 4.5 The drawing area

The page is painted in a `canvas` from the `.dashui`:

- `mui_canvas_on_draw(canvas, funcion)`: MUI calls it when something needs painting, with `(x, y, ancho, alto)`.
  Only the `gfx_` builtins are used inside.
- The function does not know which canvas it comes from. With several windows there is one function per window
  (`pinta0` to `pinta3`) that calls the shared one with the number.
- `mui_canvas_buffered(canvas, true)`: it is painted off-screen and arrives all at once. You do not see it redraw.
- `mui_canvas_redraw(canvas)` requests a repaint. `mui_canvas_update` repaints without clearing (video).
- `mui_canvas_on_input(canvas, ID)`: clicks, wheel and keys. Then you read `mui_canvas_mouse_x/y`,
  `mui_canvas_button`, `mui_canvas_wheel`, `mui_canvas_key` (key code) and `mui_canvas_char` (the character).
- Scrolling is handled by the program: a `scrollbar` alongside, `mui_set_range(barra, total, visible)`, and painting
  starts from the line it says. It is simpler and faster than a MUI virtual group.
- There is no "size changed" event. The draw function detects it when it sees a different width. Whatever must not
  be done inside drawing (touching other objects) is left for later with `mui_timer(1, ID_RANGO)`.

### 4.6 Not freezing the window

A browser downloads many things at once. If it waits for the network, the window stops. dashweb solves this without
threads:

- **Everything slow has the shape "start / advance / cancel".** `http_empezar` returns a `Carga`;
  `http_avanzar(c)` does what it can without waiting and says whether it has finished. The same goes for the page
  (`documento_avanzar`), its sheets and scripts, the images and YouTube.
- **A single timer for everything.** `mui_timer(ms, ID_TIC)` fires once. When `ID_TIC` arrives, the loop advances
  each window and arms it again with the shortest wait needed: 50 ms if something is arriving, or the page's next
  `setTimeout`, or the next video frame. If there is nothing, it is not armed: the program sleeps.
- **The really heavy work goes in another process.** Images are decoded with `task_start_with` in a separate
  process. The main one asks on each tick whether it has finished (`task_done`) and collects the result
  (`task_result`). That process is C only, with no Dash objects: it receives a block of memory with the file name
  and returns the pixels. If the process cannot be created, decoding happens in the main one.

This pattern works for any application that talks to the network or does long jobs.

Today dashweb polls the network every 50 ms while something is arriving. Since Dash D60 the network can wake the
program up: `mui_wait_event_signals(net_signal())`. dashweb will use it in task 39 of the plan. The
[tutorial](TUTORIAL.en.md), step 4, shows how, falling back to the tick when the TCP/IP stack cannot signal (FS-UAE).

### 4.7 Lessons learned with MUI

- **Hide rather than disable.** MUI covers disabled buttons with a pattern that looks bad with icons.
  "Reload" and "Stop" are two buttons in the same place; one or the other is shown (`mui_set_visible`). Back and
  forward change icon (`mui_set_text` with another file) instead of being disabled.
- **Long texts widen the window.** The status text is cut to 48 characters.
- **4-colour ILBM icons.** The toolbar ones (`iconos/*.iff`) are drawn by `tools/iconos.py` with the four Workbench
  colours: they look right on any screen and any 3.1 can read them. They are loaded from `PROGDIR:iconos/`.
- **Test with MUI 3.8 as well as MUI 5.** Some systems (CoffinOS) ship 3.8. Almost everything works the same; full
  screen leaves a border of a few pixels.
- **A full-screen window** is created in code, not in the `.dashui` (`mui_window_fullscreen`).

## 5. The VS Code plugin

It is in the Dash repo, `editor/vscode/` (extension `dash-mui-editor`). It provides:

- Syntax colouring for `.dash` files (and for the C in `@native` blocks).
- **Dash: Compilar**: compiles the open `.dash` into `bin/` next to it.
- **Dash: Ejecutar en emulador**: runs it in FS-UAE; the output appears in a VS Code terminal.
- **Dash: Nuevo fichero de ventanas MUI**: a `.dashui` with an empty window.
- **The visual window editor** for `.dashui` files: object palette on the left, the window's tree in the middle
  (drag to add and move; Del deletes), properties and menus on the right, and an approximate preview below. One tab
  per window at the top.
- **Ver en Amiga**: a snapshot of the window opened on an emulated Amiga with MUI (section 5.4).

![The visual editor with the dashweb window](img/vscode_dashui.png)

![The same window in "Ver en Amiga"](img/ver_en_amiga.png)

### 5.1 Installing it

It needs Node.js (only to package it).

```bash
cd ~/Projects/FreeMEMLang/.worktrees/dashweb/editor/vscode     # or the editor/vscode of your copy of Dash
npm install          # development tools, in node_modules/ of that folder
npm test             # grammar, model, view and commands, without VS Code
npm run package      # produces dash-mui-editor-0.1.0.vsix
code --install-extension dash-mui-editor-0.1.0.vsix --force
```

`--force` replaces an earlier version. In VS Code, "Extensions → ... → Install from VSIX" also works.

### 5.2 Configuring it

In the user settings (`settings.json`):

```json
{
    "dash.path": "/home/tu_usuario/Projects/FreeMEMLang/.worktrees/dashweb",
    "dash.emulator.kickstart": "/ruta/a/kick31_a1200.rom",
    "dash.emulator.system": "/home/tu_usuario/.cache/dash-emu/sys31muisslweb",
    "dash.emulator.muiSystem": "/home/tu_usuario/.cache/dash-emu/sys31mui"
}
```

- `dash.path` is the Dash folder (the one with `./dash`). If the project is inside the Dash repo, it is found
  automatically. dashweb is outside, so it has to be set.
- `dash.emulator.system` is the system for "Ejecutar en emulador". For dashweb it must have MUI (and AmiSSL if
  HTTPS is wanted). For a program without MUI, `sys31` is enough.
- `dash.emulator.muiSystem` is the one for "Ver en Amiga": any with MUI.
- Without `kickstart`, the `DASH_KICKSTART` variable or the AROS ROM is used.

### 5.3 Using it with dashweb

1. Open the dashweb folder in VS Code.
2. **Trust the folder** when VS Code asks. In "restricted mode" VS Code disables extensions that run things, and
   this one compiles and launches the emulator: the `.dashui` would open as text. If it was already opened in
   restricted mode: blue bar at the bottom → "Restricted Mode" → "Trust".
3. Open `src/navegador.dashui`. The visual editor appears. If it appears as text (a tab that was already open),
   close it and open it again, or "Reopen Editor With... → Editor de ventanas MUI".
4. Change whatever you like. It is saved with Ctrl+S like any file; undo works.
5. **Ver en Amiga** (top right) to see it for real.
6. For the whole program: open `src/dashweb.dash` and "Dash: Compilar" or the ▷ button at the top ("Ejecutar en
   emulador").

### 5.4 What "Ver en Amiga" does

It shows how the window really looks, with MUI, rather than the editor's approximate drawing. When you press it,
the plugin:

1. Writes a minimal Dash program that only opens that window from the `.dashui`. It uses what is in the editor, even
   if it has not been saved.
2. Compiles it for the Amiga.
3. Boots an emulated Amiga in FS-UAE, without a window, with the system from `dash.emulator.muiSystem` (Workbench
   and MUI).
4. Waits about 15 seconds for it to boot and for the window to appear.
5. Takes a snapshot of the Amiga screen and puts it in the editor, below the approximate preview.

It is useful for checking what the approximate drawing cannot know: how MUI shares out the space, the real fonts
and borders, the sizes.

What it does not do:

- It is not interactive: it is a snapshot, nothing can be clicked.
- It does not run the program, it only opens the window. That is why, with dashweb, the toolbar icons come out empty
  (the minimal program runs in another folder and does not find `PROGDIR:iconos/`) and the page area comes out grey
  (nobody paints it).
- For the whole program there is "Dash: Ejecutar en emulador". It does not open a window either: what the program
  writes appears in a VS Code terminal.

It takes about 30 seconds and meanwhile the button does not change. The only sign is a small grey line below the
preview, and the snapshot appears there too: with a large window you have to scroll down to see it. It looks as if
nothing is happening, but it is working.

### 5.5 Things to know

- The approximate preview does not share out space the way MUI does. It shows hidden objects (`hidden`) and shows
  image buttons as the file name. For the real thing, "Ver en Amiga".
- "Dash: Compilar" uses the default options of `./dash`. For the real package, `tools/paquete.sh`
  (section 9).
- There is no copy and paste of objects and no multiple selection.

## 6. External C

dashweb's rule: **whatever Dash is missing gets added to Dash.** C is kept for what is already C: other people's
libraries (QuickJS, Hubbub, the decoders) and the glue to them.

How C goes into a Dash program (Dash manual, `@native` section):

- `@native func nombre(...) """código C"""`: a function written in C. With `@native(borrow)` the arguments are not
  copied.
- `@c """..."""`: loose C at file level (types, helper functions).
- `@header "#include <...>"`: headers.
- `@link "../build/qjs-lib/libqjs.a"`: links an already compiled library.

The libraries are compiled separately with their own scripts (`tools/build_qjs.sh`, `tools/build_img.sh`,
`tools/build_video.sh`) and end up in `build/`. That way `./dash` does not recompile QuickJS every time.

Where there is C in dashweb: `lib/js.dash` (QuickJS), `lib/jsdom.dash` (the DOM for JavaScript), `lib/html5.dash`
(Hubbub), `lib/imagen_dec.dash` (images), `lib/fuente_web.dash` (TTF fonts), `lib/http.dash` (gzip),
`lib/video.dash` (MintVID). And one function in `src/dashweb.dash` to move windows (`MoveWindow`).

The changes QuickJS needed for AmigaOS are in `docs/quickjs_amiga.md`.

## 7. Memory and data

- **One page = one `Documento`**, which owns everything that belongs to it: bytes, DOM, style sheets, boxes,
  images, JavaScript context. When changing page it is freed entirely.
- **Dash uses reference counting.** A cycle is not freed until exit. That is why upward links (a node's `padre`) are
  `weak`.
- `--memcheck` in the tests: nothing must be left alive on exit.
- **What the user saves goes in `PROGDIR:`**, next to the program: `dashweb.marcadores`, `dashweb.prefs`
  (`clave=valor`) and `dashweb.cookies`. Simple text files (`file_read_text`, `file_write_text`).
- **Amiga fonts are Latin-1.** All text that gets painted is converted to Latin-1. So is whatever goes in the
  package to be read on the Amiga (`LEEME`, the Installer script).

## 8. Testing in the emulator

- `python3 tests/run.py` compiles each `tests/test_*.dash` and runs them all in a single FS-UAE boot
  (A1200 with 68882). `python3 tests/run.py url -v` runs only those containing "url".
- Each test states what it must write with `# expect-out:` lines. Other directives: `# dash-flags:`,
  `# emu-config:` (for example `cpu = 68030`), `# emu-needs:` (a library that must be present) and
  `# emu-server:` (a local Python server started for that test).
- **The network is tested with local servers** (`tests/servers/`). FS-UAE gives the Amiga the PC's network. No
  automated tests against third-party websites.
- **The interface is tested with screenshots.** `tools/emu_run.py --autoclose 20 --screenshot 15 captura.png programa.dash`
  leaves an image of the Amiga screen. `tools/medir_visor.py --programa src/dashweb.dash --pagina ...
  --captura x.png` does the same with the browser and measures the timings.
- No mouse in the emulator: the MUI tests use `mui_press`, `mui_set_value` and `--autoclose`, which makes
  `mui_wait_event` return -1.
- To measure "like the target" (PiStorm): FS-UAE with a 68040, JIT and maximum speed. To see what is slow,
  `./dash --profile`.

## 9. The package for the Amiga

`tools/paquete.sh` produces `build/dashweb.lha`:

1. Compiles the C libraries if they are missing, and then `src/dashweb.dash` and `src/visor.dash`.
2. Copies `iconos/` (the toolbar, which is loaded from `PROGDIR:iconos/`).
3. Converts `LEEME` and the Installer script to Latin-1.
4. Makes the Workbench icons (`tools/iconos_wb.py`): the drawer's and the ones inside.
5. Copies the licences of everything that goes inside.
6. Packs it into an uncompressed LHA (`tools/lha_lh0.py`; Lhasa on Linux only decompresses).

Details that matter on the Amiga:

- `@workbench_output "NIL:"`: when started from the icon, the program does not open a console window.
- The stack: the modules that need a large one ask for it (`@stack 262144` in `lib/js.dash`).
- MUI 5 and MUI 3.8 require a 68020 or better. dashweb is also compiled for FPU (`--fpu`).

### 9.1 The network on the Amiga

dashweb uses the network through `bsdsocket.library`, the standard AmigaOS way since AmiTCP. Every TCP/IP stack
provides it: Roadshow, AmiTCP, Genesis or Miami. dashweb only talks to that library: it does not depend on the
hardware or on which stack is underneath.

**In the emulator there is nothing to configure.** FS-UAE emulates it: with the option `bsdsocket_library = 1` (set by
the tests and `tools/medir_visor.py`), the emulated Amiga has a `bsdsocket.library` that passes every call on to the
Linux network. There is no stack inside the Amiga. WinUAE and Amiberry have the same option ("bsdsocket.library
emulation").

**On a real Amiga three things are needed:**

1. Network hardware with its SANA-II driver: a Zorro card, a PCMCIA card on the A1200, or the serial port as a last
   resort.
2. A TCP/IP stack installed and configured. Roadshow is the most widely used today.
3. AmiSSL 5 for HTTPS.

**With PiStorm** the network driver can come from the Raspberry Pi itself. Emu68 has SANA-II drivers for the Pi's
network: `genet.device` for the Ethernet on the Pi 4 or CM4 and `wifipi.device` for WiFi. Roadshow goes on top of
that driver and the network is there. Not checked: which driver works depends on the PiStorm and Pi model; see the
Emu68 documentation for your version.

**Untested:** dashweb has only run with FS-UAE's emulated `bsdsocket.library`, never with a real stack. It should
work the same, because the library is the same, but this has not been verified.

## 10. The way of working

dashweb has been made almost entirely with Claude Code in a loop (`/loop`), with these rules
(`docs/DASHWEB_LOOP.md`):

- **A plan with numbered tasks** and a **log**. Each round does one task, tests it, records it and commits. If it is
  big, it is split.
- **Phases.** Phase A without MUI (network, HTML, CSS, layout, painting in an ordinary window: `src/visor.dash`).
  Phase B with the MUI interface. That way the engine could be tested before Dash had MUI.
- **Each module with its test**, which tests it on its own, without the others: input text, expected output.
- **Whatever Dash is missing gets added to Dash** as a `D<n>` task (they are up to D59): fast strings, typed lists
  and dictionaries, network, TLS, fonts, images, `@link`... It is done in a separate Dash worktree (branch
  `dashweb`) by another session ("dash"), so they do not step on each other. Every large application makes the
  language grow.
- **Nothing that worked may break.** The whole suite before and after every task.
- **Screenshots** every time what you see changes.

## 11. Recipe: a new application

1. A folder with `src/`, `lib/` and `tests/`. Copy dashweb's `tests/run.py` (it looks for Dash in `$DASH`).
2. In VS Code: "Dash: Nuevo fichero de ventanas MUI" → `src/miapp.dashui`. Build the window. Give a name to the
   objects you will touch and an event number to whatever gets pressed or changed.
3. "Ver en Amiga" until the window looks the way you want.
4. `src/miapp.dash`:

   ```ruby
   import "miapp.dashui"

   @workbench_output "NIL:"

   const ID_ACEPTAR = 1      # the same numbers as in the .dashui
   const ID_SALIR = 9

   Main
       if mui_app_begin("MiApp", "MIAPP") == 0
           Print "MiApp necesita MUI y un 68020"
       else
           v = Principal_create()
           mui_window_open(v.window)
           while true
               ev = mui_wait_event()
               if ev == -1 or ev == ID_SALIR
                   break
               end
               if ev == ID_ACEPTAR
                   mui_set_text(v.estado, "Hola, " + mui_get_text(v.nombre))
               end
           end
           mui_app_end()
       end
   end
   ```

5. The logic that is not interface goes in `lib/`, with its test in `tests/`. That way it is tested without windows.
6. "Ejecutar en emulador" to see it working.
7. If something is slow or long: the "start / advance" shape and a `mui_timer` (section 4.6).
8. If a C library is needed: compile it separately into a `.a` and link it with `@link` (section 6). If what is
   missing belongs to the language, add it to Dash.
9. The package: copy `tools/paquete.sh` and keep what you use.
