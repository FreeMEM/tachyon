# Tutorial: an Amiga program with Dash, step by step

*English | [Castellano](TUTORIAL.md)*

This tutorial shows how the pieces of an Amiga program written in Dash fit together: the window, events,
the timer, the network, signals, another process and files. It does not teach the language.

We build a small program, the **Bajador**, which grows in five steps:

1. A Shell program.
2. An MUI window that responds to its buttons.
3. It downloads a file from a server without freezing the window, and it can be stopped.
4. The network wakes the program up, instead of the program polling every so often.
5. It counts the words in another process and remembers the server from one run to the next.

![The step 5 Bajador in the emulator](img/tutorial_bajador.png)

The files are in `docs/tutorial/`. Each step is a complete program. All of them have been compiled and run in
FS-UAE (A1200, Workbench 3.1, MUI 5) against a local server.

The guide [COMO_SE_CONSTRUYE.en.md](COMO_SE_CONSTRUYE.en.md) covers the rest: the VS Code plugin, external C,
packaging and how dashweb is built.

## 0. The map

An Amiga program doesn't spin in a loop asking whether something has happened. It **sleeps** until something wakes
it up, does what it has to do and goes back to sleep. The whole program revolves around a single wait:

```
 the user (button, menu, Return) ── MUI ─────────────► the object's event number (1, 2, 9...)
 the clock ─────────────── mui_timer(ms, ID) ────────► ID, once
 the network ───────────── net_signal() ─────────┐
 another process ends ──── task_signal() ────────┴───► 0   (mui_signals() says which)
                                    │
                 ev = mui_wait_event_signals(mask)         ← the program sleeps here
                                    │
                    depending on ev: advance whatever is in progress
                                    │
                    update the window: mui_set_text, mui_list_add, mui_set_enabled...
```

| Who wakes it | How it is requested | What the wait returns | What to do |
|---|---|---|---|
| The user | In the `.dashui`: `"event"`, `"ack"`, `"change"`; or `mui_on_press(obj, n)` | `n` | Whatever the button is for |
| Closing the window or `--autoclose` | Nothing to do | `-1` | Leave the loop |
| The clock | `mui_timer(ms, ID)`, once per call | `ID` | Advance whatever is in progress |
| The network | Pass `net_signal()` to the wait | `0` | Advance the connections |
| Another process | Pass `task_signal()` to the wait | `0` | Collect its result |

Four rules follow from this:

- **Never wait inside an event.** No `net_connect` (it waits to connect), no `time_delay`, no loops that
  wait for the network. While the program is waiting there, the window doesn't redraw or respond.
- **Long work is done in pieces.** Something that "starts", "advances" without waiting each time it is woken up,
  and can be "cancelled".
- **Heavy computation goes to another process**, and that process only runs C.
- **The window is only touched from the main program.**

## Before you start

You need Dash with its cross-compiler, FS-UAE, a 3.1 ROM and a system with MUI for the emulator (guide,
section 2). Commands are run from the Dash directory:

```bash
export DASH_KICKSTART="/ruta/a/kick31_a1200.rom"
export DASH_EMU_SYS=~/.cache/dash-emu/sys31mui        # Workbench 3.1 with MUI
cd ~/Projects/FreeMEMLang/.worktrees/dashweb                      # the Dash directory
TUT=~/Projects/tachyon/docs/tutorial
```

For the networking steps, a server on the PC that serves `docs/tutorial/web/`:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory $TUT/web
```

FS-UAE gives the Amiga the PC's network (`--set bsdsocket_library=1`). For the emulated Amiga, `127.0.0.1` is the PC.

## Step 1: a Shell program

`paso1_hola.dash`:

```ruby
Main
    if arg_count() == 0
        Print "Hola. Prueba: paso1_hola Amiga"
    else
        Print "Hola, " + arg(0)
    end
end
```

```bash
python3 tools/emu_run.py $TUT/paso1_hola.dash
```

`emu_run.py` compiles the program, boots the Amiga without a window, runs it and shows what it prints. That's how you
test everything that isn't the interface.

For a real Amiga: `./dash $TUT/paso1_hola.dash -o hola` produces the executable.

## Step 2: a window that responds

The window is drawn in VS Code with the visual editor, or written by hand: `bajador.dashui`. It has two named text
fields (`servidor`, `ruta`), two buttons (`bajar`, `parar`), a list (`lineas`), a status text
(`estado`) and a menu with "Salir". What matters in the file:

```json
{ "type": "string", "name": "servidor", "text": "127.0.0.1:8000", "max": 200, "ack": 1 },
{ "type": "button", "name": "bajar", "label": "_Bajar", "event": 1 },
{ "type": "button", "name": "parar", "label": "_Parar", "event": 2, "disabled": true },
{ "label": "Salir", "key": "Q", "event": 9 }
```

- `"name"`: the object becomes a field of the struct the compiler generates (`v.servidor`, `v.bajar`...).
- `"event"`: pressing the button wakes the program up with that number. `"ack"` does the same with Return in a text
  field: Return in "Servidor" does the same as "Bajar".
- `"size": [50, 60]` on the window: it opens at 50% of the screen width and 60% of its height. Without it, MUI
  opens it at its minimum size and the text fields end up tiny.

`paso2_ventana.dash`:

```ruby
import "bajador.dashui"

# The event numbers from the .dashui
const ID_BAJAR = 1
const ID_PARAR = 2
const ID_SALIR = 9

Main
    if mui_app_begin("Bajador", "BAJADOR") == 0
        Print "Bajador necesita MUI y un 68020"
    else
        v = Principal_create()
        mui_window_open(v.window)
        if arg(0) == "AUTO"
            mui_press(v.bajar)      # as if it had been clicked: for testing without a mouse
        end
        while true
            ev = mui_wait_event()
            if ev == -1 or ev == ID_SALIR
                break
            end
            if ev == ID_BAJAR
                pedido = mui_get_text(v.servidor) + mui_get_text(v.ruta)
                mui_list_add(v.lineas, "Has pedido " + pedido)
                mui_set_text(v.estado, "Pulsado Bajar")
            end
        end
        mui_app_end()
    end
end
```

How it fits together:

- `import "bajador.dashui"` generates `struct Principal` and the function `Principal_create()`. It creates the window, but
  doesn't open it.
- The event numbers live in two places: the `.dashui` and the constants. They have to be kept in sync by hand.
- `mui_wait_event()` sleeps until the next event.
- `mui_press` fires a button's event without a mouse. That's how windows are tested in the emulator.

```bash
python3 tools/emu_run.py --autoclose 8 --screenshot 6 paso2.png $TUT/paso2_ventana.dash
```

`--autoclose 8` closes the program after 8 seconds. `--screenshot 6 paso2.png` takes a screenshot
after 6.

## Step 3: long work without freezing the window

### The way that doesn't work

```ruby
if ev == ID_BAJAR
    s = net_connect(host, 8000, 10000)       # waits up to 10 s to connect
    net_send(s, "GET /hola.txt HTTP/1.0\r\n\r\n")
    trozo = net_recv(s, 4096, 10000)         # waits for data to arrive
    ...
end
```

It works, but while it waits it doesn't get back to `mui_wait_event`. The window doesn't redraw, the "Parar" button does
nothing and the menu doesn't open. With a slow server, the program looks hung.

### The right way: start, advance, cancel

The long work goes in a module that knows nothing about windows: `lib/descarga.dash`. It keeps track of where it is
(a struct) and never waits:

```ruby
struct Descarga
    sock: Int = -1          # the socket
    host: String = ""
    ruta: String = ""
    fase: Int = 0           # DESCARGA_CONECTANDO, _RECIBIENDO, _HECHA or _FALLO
    texto: String = ""
    error: String = ""
end

func descarga_empezar(host: String, puerto: Int, ruta: String) -> Descarga
    ...
    d.sock = net_connect_start(host, puerto, 10000)    # returns straight away
    ...
end

func descarga_avanzar(d: Descarga) -> Bool             # true when it has finished
    if d.fase == DESCARGA_CONECTANDO
        r = net_connect_poll(d.sock)                    # 0 not yet, 1 connected, -1 failed
        if r == 0
            return false
        end
        ...
        net_send(d.sock, "GET #{d.ruta} HTTP/1.0\r\nHost: #{d.host}\r\n\r\n")
        d.fase = DESCARGA_RECIBIENDO
    end
    if d.fase == DESCARGA_RECIBIENDO
        trozo = net_recv(d.sock, 4096, 0)               # 0 ms: only what has already arrived
        while trozo != nil and trozo != ""
            d.texto = d.texto + trozo
            trozo = net_recv(d.sock, 4096, 0)
        end
        if trozo != nil
            return false                                # "" = nothing more for now
        end
        net_close(d.sock)                               # nil = the server closed: we have it all
        ...
    end
    return true
end
```

`descarga_cancelar(d)` closes the socket. `descarga_cuerpo(d)` strips the headers.

The key: `net_connect_start` and `net_recv(..., 0)` never wait. If there is nothing, they return and the program sleeps
until the next time.

### What drives it forward: the timer

`paso3_sin_congelar.dash`, the loop:

```ruby
const ID_TIC = 10            # program-only: not in the .dashui

var d: Descarga = nil        # the download in progress, or nil
while true
    ev = mui_wait_event()
    if ev == -1 or ev == ID_SALIR
        break
    end
    if ev == ID_BAJAR and d == nil
        d = empezar(v)
        mui_timer(50, ID_TIC)           # ID_TIC in 50 ms
    elif ev == ID_PARAR and d != nil
        descarga_cancelar(d)
        acabar(v, d)
        d = nil
    elif ev == ID_TIC and d != nil
        if descarga_avanzar(d)
            acabar(v, d)
            d = nil
        else
            mui_set_text(v.estado, "Recibidos #{d.texto.length} bytes")
            mui_timer(50, ID_TIC)       # the timer fires once: re-arm it
        end
    end
end
```

`empezar(v)` reads the fields, calls `descarga_empezar`, disables "Bajar" and enables "Parar". `acabar(v, d)` puts the
lines in the list and puts the buttons back as they were.

How it fits together:

- The state of the work in progress lives **outside** the loop (`d`). Each pass through the loop is short.
- `mui_timer` wakes the program only once. While there is work, it is re-armed; when the work is done, it isn't, and the
  program sleeps soundly.
- "Parar" works because between ticks the program goes back to `mui_wait_event`.
- The window is touched in `empezar` and `acabar`, not in the module. The module can be tested without a window.

## Step 4: letting the network wake the program

The step 3 timer polls every 50 ms. Each network step (connecting, each chunk) waits up to 50 ms longer than it
needs to, and the program wakes up 20 times a second even when nothing arrives.

It's better for the network to say so. `net_signal()` gives an AmigaOS **signal** that the sockets send on every event:
connected, data arrived, closed, error. `mui_wait_event_signals(señal)` sleeps until an MUI event **or**
that signal; with the signal it returns 0.

`paso4_senales.dash` moves the wait into a function:

```ruby
# Waits for the next event. With a download in progress, the network wakes it up too (ev = 0);
# if the stack can't notify (net_signal() = 0, as in FS-UAE), a tick every 50 ms.
func esperar(con_red: Bool) -> Int
    if not con_red
        mui_timer(0, ID_TIC)                # nothing in progress: no timer, the program sleeps
        return mui_wait_event()
    end
    senal = net_signal()                    # before each wait: empties the event queue
    if senal == 0
        mui_timer(50, ID_TIC)
        return mui_wait_event()
    end
    mui_timer(1000, ID_TIC)                 # slow: timeouts are only checked when advancing
    return mui_wait_event_signals(senal)
end
```

And the loop treats the signal and the tick the same way:

```ruby
ev = esperar(d != nil)
...
elif (ev == 0 or ev == ID_TIC) and d != nil
    # 0: a network signal arrived; ID_TIC: the timer
    if descarga_avanzar(d)
    ...
```

Three details:

- **`net_signal()` before each wait.** Each call empties the TCP/IP stack's event queue.
- **If it returns 0, the stack can't notify** and you fall back to the 50 ms tick. This happens in FS-UAE: its `bsdsocket.library` doesn't
  support it. Amiberry, Roadshow and AmiTCP 4 do. A program has to work both ways.
- **Even with a signal, a slow timer (1 s).** If a server doesn't answer, no event arrives, and the
  `net_connect_start` timeout is only checked when `net_connect_poll` is called.

The `lib/descarga.dash` module doesn't change: only what wakes it up changes.

Checked in FS-UAE, where the tick is used. The signal approach was tested by the Dash session on Amiberry, without MUI. This
program has not been tested with a signal.

## Step 5: another process and remembering data

### A computation in another process

Counting the words in a short text is quick. But the pattern works for things that really take time: decoding an
image, compressing, searching. Done in the main program, it stalls the window for as long as it lasts.

`task_start(funcion, numero)` runs a function in another AmigaOS process. That function **can only be C**
(`@native`): Dash's strings, lists and `Print` aren't ready for two processes at once.

```ruby
# Counts the words in a 0-terminated text. Runs in another process: C only, no Dash inside
@native func contar_palabras(datos: Int) -> Int
"""
    const unsigned char *p = (const unsigned char *)datos;
    long n = 0;
    int dentro = 0;
    while (*p) {
        if (*p <= ' ') dentro = 0;
        else if (!dentro) { dentro = 1; n++; }
        p++;
    }
    return n;
"""
end
```

The text is passed to it in separately allocated memory, not as a Dash String:

```ruby
struct Cuenta
    tarea: Int = 0
    datos: Int = 0
end

func contar_empezar(texto: String) -> Cuenta
    c = Cuenta()
    c.datos = buffer_alloc(texto.length + 1)            # memory that doesn't belong to Dash
    str_to_buffer(texto, c.datos, 0)
    buffer_set_byte(c.datos, texto.length, 0)
    c.tarea = task_start(contar_palabras, c.datos)      # 0 if the process couldn't be created
    ...
end

# -1 while counting; when done, the word count (and it frees the process and the memory)
func contar_resultado(c: Cuenta) -> Int
    if not task_done(c.tarea)                           # doesn't wait
        return -1
    end
    n = task_result(c.tarea)
    task_free(c.tarea)
    buffer_free(c.datos)
    ...
end
```

The wait adds the tasks' signal, which arrives when their function finishes:

```ruby
func esperar(con_red: Bool, contando: Bool) -> Int
    if contando
        mui_timer(0, ID_TIC)
        senal = task_signal()               # the other process signals when it finishes
        if con_red
            senal = senal | net_signal()
        end
        if senal == 0
            mui_timer(50, ID_TIC)
        end
        return mui_wait_event_signals(senal)
    end
    ...
```

And in the loop, when the download finishes the count starts, and on every wake-up it checks whether the count is done:

```ruby
if descarga_avanzar(d)
    acabar(v, d)
    if d.fase == DESCARGA_HECHA
        c = contar_empezar(descarga_cuerpo(d))
        ...
    end
    d = nil
...
if (ev == 0 or ev == ID_TIC) and c != nil
    n = contar_resultado(c)
    if n >= 0
        mui_set_text(v.estado, mui_get_text(v.estado) + ", #{n} palabras")
        c = nil
    end
end
```

How it fits together:

- Going in: a number. Here it's the address of the memory holding the text.
- Coming back: another number (`task_result`). To return more, the function writes into memory you passed it.
- Who frees it: the main program, after `task_done`. Never while the other process is using it.
- Several signals are combined with `|` into a single wait.

### Remembering data between runs

```ruby
const FICHERO_PREFS = "PROGDIR:bajador.prefs"   # next to the program: server and path, one per line

func prefs_cargar(v: Principal)
    t = file_read_text(FICHERO_PREFS)           # nil if it doesn't exist
    if t != nil
        partes = str_split(t, "\n")
        if partes.length >= 2
            mui_set_text(v.servidor, partes[0])
            mui_set_text(v.ruta, partes[1])
        end
    end
end

func prefs_guardar(v: Principal)
    file_write_text(FICHERO_PREFS, mui_get_text(v.servidor) + "\n" + mui_get_text(v.ruta) + "\n")
end
```

They are loaded before the window opens and saved when "Bajar" is pressed. `PROGDIR:` is the program's directory. On the
Amiga the usual place for preferences is `ENVARC:` (saved) and `ENV:` (in use); `PROGDIR:` is simpler and keeps
everything in the program's drawer, as dashweb does.

## Testing

**The module, without a window.** `tests/test_descarga.dash` downloads `hola.txt` from the local server and prints what
should come out:

```ruby
# expect-out: 127.0.0.1|8000|ejemplo.org|80
# expect-out: fase 2
# expect-out: Hola desde el PC
import "../lib/descarga.dash"

Main
    ...
    d = descarga_empezar("127.0.0.1", 8000, "/hola.txt")
    while not descarga_avanzar(d)
        time_delay_ms(20)               # in a test without a window, waiting is fine
    end
    Print "fase #{d.fase}"
    ...
end
```

```bash
python3 tools/emu_run.py --set bsdsocket_library=1 $TUT/tests/test_descarga.dash
```

The `# expect-out:` lines are checked by dashweb's test runner (`tests/run.py`) if you copy its way of
working: one `test_*.dash` per module and a suite that runs them all in a single boot.

**The window, without a mouse.** With `AUTO` as the argument, steps 2 to 5 press "Bajar" on their own (`mui_press`). For the
emulator, which doesn't pass arguments, that condition is changed to `true` in a copy:

```bash
sed 's/if arg(0) == "AUTO"/if true/' $TUT/paso5_tarea.dash > /tmp/p5.dash
cp $TUT/bajador.dashui /tmp/ && mkdir -p /tmp/lib && cp $TUT/lib/descarga.dash /tmp/lib/
python3 tools/emu_run.py --set bsdsocket_library=1 --autoclose 10 --screenshot 8 p5.png /tmp/p5.dash
```

Whatever it prints with `Print` shows up in the terminal, and `p5.png` is the screenshot of the window.

**Memory.** `./dash --memcheck` reports whatever is still alive on exit. With `--autoclose`, when the time runs out
`mui_wait_event` returns -1 as if the window had been closed: the program leaves the loop and ends normally. Step 5 gives
"vivos 0 objetos y 0 strings". This needs Dash at commit `ee42971` or later; with an earlier one the program
ended inside the wait and memcheck reported 1 live object.

## What the Bajador doesn't cover

- **A window without MUI.** For a game or a simple tool, `Window ... end` and `EventLoop` with `On Click`,
  `On Key`, `On Timer ms` and `On Close` (Dash manual; dashweb's `src/visor.dash` is a large example). It works
  on a 68000 and without MUI.
- **A drawing area**, several identical windows, icons on buttons: guide, sections 4.4 to 4.7.
- **C libraries** (`@link`, `@c`): guide, section 6.
- **The Amiga package** (`.lha`, icons, Installer): guide, section 9.
- **HTTPS**: like the network, with `tls_connect_start` and `tls_connect_poll` after connecting. It needs AmiSSL 5.

## Summary

1. A single wait in the loop. Everything that wakes the program (user, clock, network, another process) arrives through it.
2. Each event is handled quickly and the program goes back to waiting.
3. Long work is a struct with "start / advance / cancel" that never waits, in a module with no windows and
   with its own test.
4. While there is work: signals if available, a tick if not, and a slow timer in case nobody notifies.
5. Heavy computation goes in C, in another process, with separately allocated memory that the main program frees when it's done.
6. The window is only touched from the main program.
