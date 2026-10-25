# Tutorial: un programa para el Amiga con Dash, paso a paso

*[English](TUTORIAL.en.md) | Castellano*

Este tutorial enseña cómo se conectan las piezas de un programa de Amiga hecho con Dash: la ventana, los eventos,
el temporizador, la red, las señales, otro proceso y los ficheros. No enseña el lenguaje.

Se hace un programa pequeño, el **Bajador**, que crece en cinco pasos:

1. Un programa de Shell.
2. Una ventana MUI que responde a los botones.
3. Baja un fichero de un servidor sin que la ventana se congele, y se puede parar.
4. La red despierta al programa, en vez de preguntar cada poco.
5. Cuenta las palabras en otro proceso y recuerda el servidor de una vez para otra.

![El Bajador del paso 5 en el emulador](img/tutorial_bajador.png)

Los ficheros están en `docs/tutorial/`. Cada paso es un programa completo. Todos se han compilado y ejecutado en
FS-UAE (A1200, Workbench 3.1, MUI 5) contra un servidor local.

La guía [COMO_SE_CONSTRUYE.md](COMO_SE_CONSTRUYE.md) cuenta lo demás: el plugin de VS Code, el C de fuera, el
paquete y cómo está hecho dashweb.

## 0. El mapa

Un programa de Amiga no da vueltas preguntando si ha pasado algo. **Duerme** hasta que algo lo despierta, hace lo
que toca y vuelve a dormir. Todo el programa gira alrededor de una sola espera:

```
 el usuario (botón, menú, Intro) ── MUI ─────────────► el número de evento del objeto (1, 2, 9...)
 el reloj ──────────────── mui_timer(ms, ID) ────────► ID, una vez
 la red ────────────────── net_signal() ─────────┐
 otro proceso al acabar ── task_signal() ────────┴───► 0   (mui_signals() dice cuál)
                                    │
                 ev = mui_wait_event_signals(máscara)      ← el programa duerme aquí
                                    │
                    según ev: hacer avanzar lo que esté en marcha
                                    │
                    cambiar la ventana: mui_set_text, mui_list_add, mui_set_enabled...
```

| Quién despierta | Cómo se pide | Qué devuelve la espera | Qué se hace |
|---|---|---|---|
| El usuario | En el `.dashui`: `"event"`, `"ack"`, `"change"`; o `mui_on_press(obj, n)` | `n` | Lo que pida el botón |
| Cerrar la ventana o `--autoclose` | Sin hacer nada | `-1` | Salir del bucle |
| El reloj | `mui_timer(ms, ID)`, una vez cada vez que se llama | `ID` | Avanzar lo que esté en marcha |
| La red | Pasar `net_signal()` a la espera | `0` | Avanzar las conexiones |
| Otro proceso | Pasar `task_signal()` a la espera | `0` | Recoger su resultado |

Cuatro reglas salen de ahí:

- **Nunca esperar dentro de un evento.** Nada de `net_connect` (espera a conectar), `time_delay` ni bucles que
  esperan a la red. Mientras el programa espera ahí, la ventana no se redibuja ni responde.
- **El trabajo largo va a trozos.** Algo que "empieza", "avanza" sin esperar cada vez que lo despiertan, y se puede
  "cancelar".
- **El cálculo pesado va a otro proceso**, y ese proceso solo ejecuta C.
- **La ventana solo se toca desde el programa principal.**

## Antes de empezar

Hace falta Dash con su compilador cruzado, FS-UAE, una ROM 3.1 y un sistema con MUI para el emulador (guía,
apartado 2). Las órdenes se lanzan desde la carpeta de Dash:

```bash
export DASH_KICKSTART="/ruta/a/kick31_a1200.rom"
export DASH_EMU_SYS=~/.cache/dash-emu/sys31mui        # Workbench 3.1 con MUI
cd ~/Projects/FreeMEMLang/.worktrees/dashweb                      # la carpeta de Dash
TUT=~/Projects/tachyon/docs/tutorial
```

Para los pasos con red, un servidor en el PC que sirve `docs/tutorial/web/`:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory $TUT/web
```

FS-UAE da al Amiga la red del PC (`--set bsdsocket_library=1`). Para el Amiga emulado, `127.0.0.1` es el PC.

## Paso 1: un programa de Shell

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

`emu_run.py` compila, arranca el Amiga sin ventana, ejecuta el programa y enseña lo que escribe. Así se prueba
todo lo que no es interfaz.

Para el Amiga de verdad: `./dash $TUT/paso1_hola.dash -o hola` deja el ejecutable.

## Paso 2: una ventana que responde

La ventana se dibuja en VS Code con el editor visual, o se escribe a mano: `bajador.dashui`. Tiene dos campos de
texto con nombre (`servidor`, `ruta`), dos botones (`bajar`, `parar`), una lista (`lineas`), un texto de estado
(`estado`) y un menú con "Salir". Lo que importa del fichero:

```json
{ "type": "string", "name": "servidor", "text": "127.0.0.1:8000", "max": 200, "ack": 1 },
{ "type": "button", "name": "bajar", "label": "_Bajar", "event": 1 },
{ "type": "button", "name": "parar", "label": "_Parar", "event": 2, "disabled": true },
{ "label": "Salir", "key": "Q", "event": 9 }
```

- `"name"`: el objeto será un campo del struct que genera el compilador (`v.servidor`, `v.bajar`...).
- `"event"`: pulsar el botón despierta al programa con ese número. `"ack"` es lo mismo con Intro en un campo de
  texto: Intro en "Servidor" hace lo mismo que "Bajar".
- `"size": [50, 60]` en la ventana: abre al 50 % del ancho y el 60 % del alto de la pantalla. Sin eso, MUI la
  abre al mínimo y los campos de texto quedan diminutos.

`paso2_ventana.dash`:

```ruby
import "bajador.dashui"

# Los números de evento del .dashui
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
            mui_press(v.bajar)      # como si se pulsara: para probar sin ratón
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

Cómo se conecta:

- `import "bajador.dashui"` genera el `struct Principal` y la función `Principal_create()`. Crea la ventana, pero
  no la abre.
- Los números de evento están en dos sitios: el `.dashui` y las constantes. Hay que mantenerlos iguales a mano.
- `mui_wait_event()` duerme hasta el siguiente evento.
- `mui_press` lanza el evento de un botón sin ratón. Así se prueban las ventanas en el emulador.

```bash
python3 tools/emu_run.py --autoclose 8 --screenshot 6 paso2.png $TUT/paso2_ventana.dash
```

`--autoclose 8` cierra el programa a los 8 segundos. `--screenshot 6 paso2.png` hace una foto de la pantalla
a los 6.

## Paso 3: trabajo largo sin congelar la ventana

### La forma que no vale

```ruby
if ev == ID_BAJAR
    s = net_connect(host, 8000, 10000)       # espera hasta 10 s a conectar
    net_send(s, "GET /hola.txt HTTP/1.0\r\n\r\n")
    trozo = net_recv(s, 4096, 10000)         # espera a que lleguen datos
    ...
end
```

Funciona, pero mientras espera no vuelve a `mui_wait_event`. La ventana no se redibuja, el botón "Parar" no hace
nada y el menú no se abre. Con un servidor lento, el programa parece colgado.

### La forma buena: empezar, avanzar, cancelar

El trabajo largo va en un módulo que no sabe nada de ventanas: `lib/descarga.dash`. Guarda en qué punto está
(un struct) y nunca espera:

```ruby
struct Descarga
    sock: Int = -1          # el socket
    host: String = ""
    ruta: String = ""
    fase: Int = 0           # DESCARGA_CONECTANDO, _RECIBIENDO, _HECHA o _FALLO
    texto: String = ""
    error: String = ""
end

func descarga_empezar(host: String, puerto: Int, ruta: String) -> Descarga
    ...
    d.sock = net_connect_start(host, puerto, 10000)    # vuelve en seguida
    ...
end

func descarga_avanzar(d: Descarga) -> Bool             # true cuando ha acabado
    if d.fase == DESCARGA_CONECTANDO
        r = net_connect_poll(d.sock)                    # 0 todavía no, 1 conectado, -1 fallo
        if r == 0
            return false
        end
        ...
        net_send(d.sock, "GET #{d.ruta} HTTP/1.0\r\nHost: #{d.host}\r\n\r\n")
        d.fase = DESCARGA_RECIBIENDO
    end
    if d.fase == DESCARGA_RECIBIENDO
        trozo = net_recv(d.sock, 4096, 0)               # 0 ms: solo lo que ya haya llegado
        while trozo != nil and trozo != ""
            d.texto = d.texto + trozo
            trozo = net_recv(d.sock, 4096, 0)
        end
        if trozo != nil
            return false                                # "" = nada más por ahora
        end
        net_close(d.sock)                               # nil = el servidor cerró: está todo
        ...
    end
    return true
end
```

`descarga_cancelar(d)` cierra el socket. `descarga_cuerpo(d)` quita las cabeceras.

La clave: `net_connect_start` y `net_recv(..., 0)` nunca esperan. Si no hay nada, vuelven y el programa duerme
hasta la siguiente vez.

### Quién la hace avanzar: el temporizador

`paso3_sin_congelar.dash`, el bucle:

```ruby
const ID_TIC = 10            # solo del programa: no está en el .dashui

var d: Descarga = nil        # la descarga en curso, o nil
while true
    ev = mui_wait_event()
    if ev == -1 or ev == ID_SALIR
        break
    end
    if ev == ID_BAJAR and d == nil
        d = empezar(v)
        mui_timer(50, ID_TIC)           # dentro de 50 ms, ID_TIC
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
            mui_timer(50, ID_TIC)       # el temporizador da una vez: se vuelve a armar
        end
    end
end
```

`empezar(v)` lee los campos, llama a `descarga_empezar`, apaga "Bajar" y enciende "Parar". `acabar(v, d)` pone las
líneas en la lista y deja los botones como estaban.

Cómo se conecta:

- El estado de lo que está en marcha vive **fuera** del bucle (`d`). Cada vuelta del bucle es corta.
- `mui_timer` despierta una sola vez. Mientras haya trabajo, se vuelve a armar; cuando acaba, no, y el programa
  duerme del todo.
- "Parar" funciona porque entre tic y tic el programa vuelve a `mui_wait_event`.
- La ventana se toca en `empezar` y `acabar`, no en el módulo. El módulo se puede probar sin ventana.

## Paso 4: que la red despierte al programa

El temporizador del paso 3 pregunta cada 50 ms. Cada paso de red (conectar, cada trozo) espera hasta 50 ms de
más, y el programa despierta 20 veces por segundo aunque no llegue nada.

Es mejor que la red avise. `net_signal()` da una **señal** de AmigaOS que los sockets mandan en cada suceso:
conectado, llegan datos, se cierra, error. `mui_wait_event_signals(señal)` duerme hasta un evento de MUI **o**
esa señal; con la señal devuelve 0.

`paso4_senales.dash` saca la espera a una función:

```ruby
# Espera el siguiente evento. Con una descarga en marcha, también la red lo despierta (ev = 0);
# si la pila no sabe avisar (net_signal() = 0, como en FS-UAE), un tic cada 50 ms.
func esperar(con_red: Bool) -> Int
    if not con_red
        mui_timer(0, ID_TIC)                # nada en marcha: sin temporizador, el programa duerme
        return mui_wait_event()
    end
    senal = net_signal()                    # antes de cada espera: vacía la cola de sucesos
    if senal == 0
        mui_timer(50, ID_TIC)
        return mui_wait_event()
    end
    mui_timer(1000, ID_TIC)                 # lento: los límites de tiempo solo se miran al avanzar
    return mui_wait_event_signals(senal)
end
```

Y el bucle trata igual la señal y el tic:

```ruby
ev = esperar(d != nil)
...
elif (ev == 0 or ev == ID_TIC) and d != nil
    # 0: llegó una señal de la red; ID_TIC: el temporizador
    if descarga_avanzar(d)
    ...
```

Tres detalles:

- **`net_signal()` antes de cada espera.** Cada llamada vacía la cola de sucesos de la pila TCP/IP.
- **Si da 0, la pila no sabe avisar** y se vuelve al tic de 50 ms. Pasa en FS-UAE: su `bsdsocket.library` no lo
  tiene. Amiberry, Roadshow y AmiTCP 4 sí. Un programa tiene que funcionar de las dos formas.
- **Aunque haya señal, un temporizador lento (1 s).** Si un servidor no contesta, no llega ningún suceso, y el
  límite de tiempo de `net_connect_start` solo se comprueba al llamar a `net_connect_poll`.

El módulo `lib/descarga.dash` no cambia: solo cambia quién lo despierta.

Comprobado en FS-UAE, donde se usa el tic. La forma con señal la probó la sesión de Dash en Amiberry, sin MUI. Este
programa no se ha probado con señal.

## Paso 5: otro proceso y recordar datos

### Un cálculo en otro proceso

Contar las palabras de un texto corto es rápido. Pero el patrón sirve para lo que tarda de verdad: decodificar una
imagen, comprimir, buscar. Si se hace en el programa principal, la ventana se para mientras dura.

`task_start(funcion, numero)` ejecuta una función en otro proceso de AmigaOS. Esa función **solo puede ser C**
(`@native`): los textos, listas y `Print` de Dash no están preparados para dos procesos a la vez.

```ruby
# Cuenta las palabras de un texto acabado en 0. Corre en otro proceso: solo C, nada de Dash dentro
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

El texto se le pasa en memoria propia, no como String de Dash:

```ruby
struct Cuenta
    tarea: Int = 0
    datos: Int = 0
end

func contar_empezar(texto: String) -> Cuenta
    c = Cuenta()
    c.datos = buffer_alloc(texto.length + 1)            # memoria que no es de Dash
    str_to_buffer(texto, c.datos, 0)
    buffer_set_byte(c.datos, texto.length, 0)
    c.tarea = task_start(contar_palabras, c.datos)      # 0 si no se pudo crear el proceso
    ...
end

# -1 mientras cuenta; al acabar, las palabras (y suelta el proceso y la memoria)
func contar_resultado(c: Cuenta) -> Int
    if not task_done(c.tarea)                           # no espera
        return -1
    end
    n = task_result(c.tarea)
    task_free(c.tarea)
    buffer_free(c.datos)
    ...
end
```

La espera añade la señal de las tareas, que llega cuando acaba su función:

```ruby
func esperar(con_red: Bool, contando: Bool) -> Int
    if contando
        mui_timer(0, ID_TIC)
        senal = task_signal()               # el otro proceso avisa al acabar
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

Y en el bucle, cuando acaba la descarga se empieza la cuenta, y en cada despertar se mira si acabó:

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

Cómo se conecta:

- Ida: un número. Aquí es la dirección de la memoria con el texto.
- Vuelta: otro número (`task_result`). Para devolver más, la función escribe en memoria que le pasaste.
- Quién libera: el programa principal, después de `task_done`. Nunca mientras el otro proceso la usa.
- Varias señales se juntan con `|` en una sola espera.

### Recordar datos entre usos

```ruby
const FICHERO_PREFS = "PROGDIR:bajador.prefs"   # junto al programa: servidor y ruta, una por línea

func prefs_cargar(v: Principal)
    t = file_read_text(FICHERO_PREFS)           # nil si no existe
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

Se cargan antes de abrir la ventana y se guardan al pulsar "Bajar". `PROGDIR:` es la carpeta del programa. En el
Amiga lo habitual para preferencias es `ENVARC:` (se guardan) y `ENV:` (se usan); `PROGDIR:` es más sencillo y deja
todo en el cajón del programa, como hace dashweb.

## Probar

**El módulo, sin ventana.** `tests/test_descarga.dash` baja `hola.txt` del servidor local y escribe lo que debe
salir:

```ruby
# expect-out: 127.0.0.1|8000|ejemplo.org|80
# expect-out: fase 2
# expect-out: Hola desde el PC
import "../lib/descarga.dash"

Main
    ...
    d = descarga_empezar("127.0.0.1", 8000, "/hola.txt")
    while not descarga_avanzar(d)
        time_delay_ms(20)               # en un test sin ventana sí se puede esperar
    end
    Print "fase #{d.fase}"
    ...
end
```

```bash
python3 tools/emu_run.py --set bsdsocket_library=1 $TUT/tests/test_descarga.dash
```

Las líneas `# expect-out:` las comprueba el runner de tests de dashweb (`tests/run.py`) si copias su forma de
trabajar: un `test_*.dash` por módulo y una batería que los ejecuta todos en un arranque.

**La ventana, sin ratón.** Con `AUTO` como argumento, los pasos 2 a 5 pulsan "Bajar" solos (`mui_press`). Para el
emulador, que no pasa argumentos, se cambia esa condición por `true` en una copia:

```bash
sed 's/if arg(0) == "AUTO"/if true/' $TUT/paso5_tarea.dash > /tmp/p5.dash
cp $TUT/bajador.dashui /tmp/ && mkdir -p /tmp/lib && cp $TUT/lib/descarga.dash /tmp/lib/
python3 tools/emu_run.py --set bsdsocket_library=1 --autoclose 10 --screenshot 8 p5.png /tmp/p5.dash
```

Lo que escribe con `Print` sale en la terminal, y `p5.png` es la foto de la ventana.

**La memoria.** `./dash --memcheck` avisa de lo que queda vivo al salir. Con `--autoclose`, al cumplirse el tiempo
`mui_wait_event` devuelve -1 como si se cerrara la ventana: el programa sale del bucle y acaba normal. El paso 5 da
"vivos 0 objetos y 0 strings". Esto necesita Dash con el commit `ee42971` o posterior; con uno anterior el programa
acababa dentro de la espera y el memcheck marcaba 1 objeto vivo.

## Lo que no sale en el Bajador

- **Una ventana sin MUI.** Para un juego o una herramienta sencilla, `Window ... end` y `EventLoop` con `On Click`,
  `On Key`, `On Timer ms` y `On Close` (manual de Dash; `src/visor.dash` de dashweb es un ejemplo grande). Sirve
  en un 68000 y sin MUI.
- **Una zona de dibujo**, varias ventanas iguales, iconos en botones: guía, apartados 4.4 a 4.7.
- **Librerías de C** (`@link`, `@c`): guía, apartado 6.
- **El paquete para el Amiga** (`.lha`, iconos, Installer): guía, apartado 9.
- **HTTPS**: como la red, con `tls_connect_start` y `tls_connect_poll` después de conectar. Necesita AmiSSL 5.

## Resumen

1. Una sola espera en el bucle. Todo lo que despierta (usuario, reloj, red, otro proceso) llega por ella.
2. Cada evento se atiende rápido y se vuelve a esperar.
3. El trabajo largo es un struct con "empezar / avanzar / cancelar" que nunca espera, en un módulo sin ventanas y
   con su test.
4. Mientras hay trabajo: señales si las hay, un tic si no, y un temporizador lento por si nadie avisa.
5. El cálculo pesado, en C, en otro proceso, con memoria propia que libera el principal al acabar.
6. La ventana solo se toca desde el programa principal.
