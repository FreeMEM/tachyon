# Cómo se ha construido dashweb

*[English](COMO_SE_CONSTRUYE.en.md) | Castellano*

Una guía para hacer otras aplicaciones para el Amiga con Dash y MUI, tomando dashweb como ejemplo.

No enseña Dash ni C. Para eso están el manual de Dash (`docs/MANUAL_REFERENCIA.md` y
`docs/CHULETA_LENGUAJE.md` en el repo de Dash). Aquí se cuenta cómo encajan las piezas: la herramienta, la
ventana MUI, el bucle de eventos, el C de fuera, las pruebas en el emulador, el paquete y la forma de trabajar.

Para aprender a conectar las piezas (ventana, eventos, temporizador, red, señales, otro proceso, ficheros) con un
programa que crece paso a paso, empieza por el [tutorial](TUTORIAL.md).

Las rutas de Dash (`compiler/`, `tools/`, `editor/`...) son del repo de Dash. Las de dashweb (`src/`, `lib/`,
`tests/`...), de este.

## 1. Las piezas

```
 tu programa (.dash) ─┐
 tus ventanas (.dashui)┤──► ./dash ──► C ──► m68k-amigaos-gcc ──► ejecutable del Amiga
 tus módulos (lib/)   ─┘    (Python)        (+ runtime de Dash,       (formato Hunk)
                                             SDK de MUI, tus .a)
                                                        │
                                                        ▼
                                FS-UAE sin ventana (tools/emu_run.py): salida y capturas
```

- **Dash** es un compilador escrito en Python. Traduce el programa a C y llama al compilador cruzado de bebbo
  (`m68k-amigaos-gcc`, en `/opt/amiga`). El resultado es un ejecutable normal de AmigaOS.
- **El runtime de Dash** va dentro del ejecutable. Trae los builtins: textos, listas, ficheros, red (`net_`),
  TLS (`tls_`), gráficos (`gfx_`), MUI (`mui_`), procesos (`task_`)...
- **MUI** no se reimplementa. Los builtins `mui_` llaman a `muimaster.library` del Amiga. Para compilar hace falta
  el SDK de MUI 5, que no se puede meter en git por su licencia: `tools/get_mui_sdk.sh` lo baja a `~/.cache`.
- **FS-UAE** ejecuta los programas sin abrir ventana y recoge lo que escriben. Así se prueba todo desde Linux.

## 2. Preparar el equipo

Todo está en `docs/INSTALACION.md` de Dash. En resumen:

1. Python 3.10 o más y `lark`.
2. El compilador cruzado en `/opt/amiga` (se compila una vez; tarda).
3. FS-UAE y una ROM de Kickstart 3.1 tuya. Sin ROM se usa la de AROS y los resultados no valen.
4. Los ficheros del Workbench para el emulador, sacados de un disco duro de Amiberry o WinUAE
   (`tools/emu_sys_from_hdf.sh`).
5. MUI: `tools/get_mui_sdk.sh` (SDK para compilar) y `tools/emu_sys_mui.sh` (un sistema con MUI para el
   emulador).
6. Si hay red segura: `tools/get_amissl.sh` y `tools/emu_sys_amissl.sh`.

Las variables que usan Dash, los tests y el plugin:

```bash
export DASH_KICKSTART="/ruta/a/kick31_a1200.rom"
export DASH_EMU_SYS=~/.cache/dash-emu/sys31             # Workbench 3.1
export DASH_EMU_SYS_MUI=~/.cache/dash-emu/sys31mui      # el mismo con MUI
export DASH_EMU_SYS_SSL=~/.cache/dash-emu/sys31ssl      # con AmiSSL
```

dashweb usa además un sistema con MUI, AmiSSL y fuentes (`sys31muisslweb`, hecho con `tools/emu_sys_fuentes.sh`).
Para tu aplicación basta con el que tenga lo que use.

## 3. Cómo está organizado el repo

| Carpeta | Qué hay |
|---|---|
| `src/` | Los programas: `dashweb.dash` (el navegador MUI), `navegador.dashui` (sus ventanas), `visor.dash` (sin MUI). |
| `lib/` | Módulos reutilizables, cada uno con su test: red, URL, HTTP, HTML, CSS, maquetación, imágenes, JS... |
| `tests/` | `test_*.dash` (uno por módulo), páginas de prueba y servidores locales en Python. |
| `tools/` | Compilar las librerías de C, medir, comparar con Chrome, hacer los iconos y el paquete. |
| `third_party/` | El C de otros: QuickJS, Hubbub, decodificadores de imagen, MintVID. Cada uno con su licencia. |
| `iconos/`, `paquete/` | Los iconos de la barra y lo que va en el `.lha` (LEEME, guion del Installer). |
| `docs/` | Plan y bitácora (`DASHWEB_LOOP.md`), arquitectura, cambios a QuickJS y esta guía. |

Los módulos se importan con una ruta relativa al fichero que importa: `import "../lib/documento.dash"`.
Un módulo arrastra los suyos; `src/dashweb.dash` solo importa cuatro cosas.

Un programa con MUI no necesita más estructura que esta: un `.dash` con `Main`, un `.dashui` con las ventanas y
los módulos que quieras separar.

## 4. La interfaz con MUI

### 4.1 El modelo

Las reglas de los builtins `mui_` (detalle en `docs/MUI_DISEÑO.md` de Dash):

- **Cada objeto MUI es un número** (un "handle"). Se guarda en una variable o en un campo.
- **El árbol se monta con una pila.** `mui_vgroup_begin()` abre un grupo; cada objeto que se crea entra en el
  grupo abierto; `mui_group_end()` lo cierra. `mui_window_begin()`/`mui_window_end()` hacen lo mismo con la
  ventana.
- **Los eventos son números del programa.** `mui_on_press(boton, 4)` hace que `mui_wait_event()` devuelva 4
  cuando se pulsa. `-1` es "salir".
- **MUI es dueño de los objetos.** No se liberan uno a uno: `mui_app_end()` lo libera todo al salir.
- **La zona de dibujo** (`mui_canvas`) es una clase MUI del runtime. Llama a una función tuya para pintar con
  los builtins `gfx_`.

Con eso se puede hacer cualquier ventana a mano. Pero en dashweb la ventana no se escribe a mano: se dibuja.

### 4.2 La ventana se dibuja: el `.dashui`

`src/navegador.dashui` es un JSON con las ventanas del navegador (la principal y "Acerca de"). Se edita con el
plugin de VS Code (apartado 5) o a mano. El programa lo importa como si fuera un módulo:

```ruby
import "navegador.dashui"
```

El compilador lo lee y genera código Dash (`compiler/dashui.py`). Por cada ventana crea:

- un `struct` con el nombre de la ventana y un campo por cada objeto que tenga `"name"`, más `window`;
- una función `<Ventana>_create()` que monta la ventana y devuelve ese struct.

```ruby
v = Navegador_create()          # crea la ventana y sus objetos (sin abrirla)
mui_set_text(v.estado, "Listo") # cada objeto con nombre es un campo
mui_window_open(v.window)
```

Lo que el `.dashui` puede decir de cada objeto:

- `"event"` (botón), `"ack"` (Intro en un campo de texto), `"change"` (cambia el valor), `"double"` (doble
  clic en una lista): el número de evento. El compilador pone los `mui_on_*` correspondientes.
- `"weight"` (reparto del espacio), `"hidden"` (empieza oculto), `"disabled"`, `"help"` (globo de ayuda).
- En la ventana: `"menus"` (con tecla y evento por opción), `"close"` (evento del botón de cerrar) y `"size"`
  (tamaño inicial en % de la pantalla).

La tabla completa de tipos está en `docs/MUI_EDITOR.md` de Dash.

**Por qué así:** el `.dashui` es la única fuente. No hay código generado que guardar ni que se desincronice. Lo que el
editor no entiende lo conserva tal cual.

### 4.3 El programa

El esqueleto de `src/dashweb.dash`, reducido:

```ruby
import "navegador.dashui"

@workbench_output "NIL:"     # al abrirlo desde el icono, lo que escribe no abre una consola

# los números de evento del .dashui, repetidos como constantes
const ID_IR = 4
const ID_SCROLL = 5
const ID_SALIR = 9
# y los que solo usa el programa
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

`mui_app_begin` devuelve 0 si no hay MUI o la CPU es un 68000. El programa decide qué decir.

Los números de evento viven en dos sitios: el `.dashui` y las constantes. Es lo único que hay que mantener a mano.
Conviene dejarlos juntos al principio del programa, con un comentario.

### 4.4 Varias ventanas iguales

dashweb abre hasta cuatro ventanas del mismo diseño. Todas mandan los mismos números de evento. La solución:

- Un `struct Ventana` propio guarda el struct generado (`v: Navegador`) y el estado de esa ventana (la página,
  la carga en curso, el historial...). Van en una lista global.
- Para saber de qué ventana viene un evento se mira cuál está activa: `mui_window_active(w.v.window)`.
- El botón de cerrar no puede ir así (la ventana que se cierra puede no estar activa). Se registra en el
  programa con un número distinto por ventana: `mui_on_close(v.window, ID_CERRADA + k)`.

### 4.5 La zona de dibujo

La página se pinta en un `canvas` del `.dashui`:

- `mui_canvas_on_draw(canvas, funcion)`: MUI la llama cuando hay que pintar, con `(x, y, ancho, alto)`.
  Dentro solo se usan los `gfx_`.
- La función no sabe de qué canvas viene. Con varias ventanas hay una función por ventana (`pinta0` a `pinta3`)
  que llama a la común con el número.
- `mui_canvas_buffered(canvas, true)`: se pinta aparte y llega de una vez. No se ve redibujarse.
- `mui_canvas_redraw(canvas)` pide repintar. `mui_canvas_update` repinta sin borrar (el vídeo).
- `mui_canvas_on_input(canvas, ID)`: clics, rueda y teclas. Después se leen `mui_canvas_mouse_x/y`,
  `mui_canvas_button`, `mui_canvas_wheel`, `mui_canvas_key` (código de tecla) y `mui_canvas_char` (el carácter).
- El desplazamiento lo lleva el programa: una `scrollbar` al lado, `mui_set_range(barra, total, visible)` y se
  pinta desde la línea que diga. Es más simple y más rápido que un grupo virtual de MUI.
- No hay evento de "cambió el tamaño". Lo detecta la función de dibujo al ver otro ancho. Lo que no debe hacerse
  dentro del dibujo (tocar otros objetos) se deja para después con `mui_timer(1, ID_RANGO)`.

### 4.6 No congelar la ventana

Un navegador baja muchas cosas a la vez. Si espera a la red, la ventana se para. dashweb lo resuelve sin hilos:

- **Todo lo lento tiene forma de "empezar / avanzar / cancelar".** `http_empezar` devuelve una `Carga`;
  `http_avanzar(c)` hace lo que pueda sin esperar y dice si acabó. Igual con la página (`documento_avanzar`),
  sus hojas y scripts, las imágenes y YouTube.
- **Un solo temporizador para todo.** `mui_timer(ms, ID_TIC)` dispara una vez. Al llegar `ID_TIC`, el bucle hace
  avanzar cada ventana y vuelve a armarlo con la espera más corta que haga falta: 50 ms si algo está llegando, o
  el siguiente `setTimeout` de la página, o el siguiente cuadro del vídeo. Si no hay nada, no se arma: el
  programa duerme.
- **Lo pesado de verdad va en otro proceso.** Las imágenes se decodifican con `task_start_with` en un proceso
  aparte. El principal pregunta en cada tic si acabó (`task_done`) y recoge el resultado (`task_result`). Ese
  proceso es solo C, sin objetos Dash: recibe un bloque de memoria con el nombre del fichero y devuelve los
  píxeles. Si no se puede crear el proceso, se decodifica en el principal.

Este patrón sirve para cualquier aplicación que hable con la red o haga trabajos largos.

Hoy dashweb pregunta a la red cada 50 ms mientras algo llega. Desde Dash D60 la red puede despertar al programa:
`mui_wait_event_signals(net_signal())`. dashweb lo usará en la tarea 39 del plan. El [tutorial](TUTORIAL.md), paso 4,
enseña cómo, con la vuelta al tic cuando la pila TCP/IP no sabe avisar (FS-UAE).

### 4.7 Lo aprendido con MUI

- **Mejor ocultar que deshabilitar.** MUI tapa los botones deshabilitados con una trama que se ve mal con iconos.
  "Recargar" y "Parar" son dos botones en el mismo sitio; se ve uno u otro (`mui_set_visible`). Atrás y adelante
  cambian de icono (`mui_set_text` con otro fichero) en vez de deshabilitarse.
- **Los textos largos ensanchan la ventana.** El texto de estado se recorta a 48 caracteres.
- **Iconos de 4 colores en ILBM.** Los de la barra (`iconos/*.iff`) los dibuja `tools/iconos.py` con los cuatro
  colores del Workbench: salen bien en cualquier pantalla y los lee cualquier 3.1. Se cargan desde
  `PROGDIR:iconos/`.
- **Probar con MUI 3.8 además de MUI 5.** Hay sistemas (CoffinOS) que llevan 3.8. Casi todo va igual; la pantalla
  completa deja un marco de unos píxeles.
- **Una ventana a pantalla completa** se crea en código, no en el `.dashui` (`mui_window_fullscreen`).

## 5. El plugin de VS Code

Está en el repo de Dash, `editor/vscode/` (extensión `dash-mui-editor`). Da:

- Colores para los `.dash` (y para el C de los bloques `@native`).
- **Dash: Compilar**: compila el `.dash` abierto a `bin/` junto a él.
- **Dash: Ejecutar en emulador**: lo ejecuta en FS-UAE; la salida sale en un terminal de VS Code.
- **Dash: Nuevo fichero de ventanas MUI**: un `.dashui` con una ventana vacía.
- **El editor visual de ventanas** para los `.dashui`: paleta de objetos a la izquierda, árbol de la ventana en
  el centro (se arrastra para añadir y mover; Supr borra), propiedades y menús a la derecha, y una vista
  aproximada debajo. Pestañas por ventana arriba.
- **Ver en Amiga**: una foto de la ventana abierta en un Amiga emulado con MUI (apartado 5.4).

![El editor visual con la ventana de dashweb](img/vscode_dashui.png)

![La misma ventana en "Ver en Amiga"](img/ver_en_amiga.png)

### 5.1 Instalarlo

Necesita Node.js (solo para empaquetarlo).

```bash
cd ~/Projects/FreeMEMLang/.worktrees/dashweb/editor/vscode     # o el editor/vscode de tu copia de Dash
npm install          # herramientas de desarrollo, en node_modules/ de esa carpeta
npm test             # gramática, modelo, vista y comandos, sin VS Code
npm run package      # deja dash-mui-editor-0.1.0.vsix
code --install-extension dash-mui-editor-0.1.0.vsix --force
```

`--force` sustituye una versión anterior. En VS Code también vale "Extensions → ... → Install from VSIX".

### 5.2 Configurarlo

En los ajustes de usuario (`settings.json`):

```json
{
    "dash.path": "/home/tu_usuario/Projects/FreeMEMLang/.worktrees/dashweb",
    "dash.emulator.kickstart": "/ruta/a/kick31_a1200.rom",
    "dash.emulator.system": "/home/tu_usuario/.cache/dash-emu/sys31muisslweb",
    "dash.emulator.muiSystem": "/home/tu_usuario/.cache/dash-emu/sys31mui"
}
```

- `dash.path` es la carpeta de Dash (la que tiene `./dash`). Si el proyecto está dentro del repo de Dash, se
  encuentra sola. dashweb está fuera, así que hay que ponerla.
- `dash.emulator.system` es el sistema de "Ejecutar en emulador". Para dashweb tiene que llevar MUI (y AmiSSL si
  se quiere HTTPS). Para un programa sin MUI basta `sys31`.
- `dash.emulator.muiSystem` es el de "Ver en Amiga": cualquiera con MUI.
- Sin `kickstart` se usa la variable `DASH_KICKSTART` o la ROM de AROS.

### 5.3 Usarlo con dashweb

1. Abre la carpeta de dashweb en VS Code.
2. **Confía en la carpeta** cuando VS Code lo pregunte. En "modo restringido" VS Code desactiva las extensiones
   que ejecutan cosas, y esta compila y lanza el emulador: el `.dashui` se abriría como texto. Si ya se abrió
   en modo restringido: barra azul de abajo → "Restricted Mode" → "Trust".
3. Abre `src/navegador.dashui`. Sale el editor visual. Si sale como texto (una pestaña que ya estaba abierta),
   ciérrala y ábrela otra vez, o "Reopen Editor With... → Editor de ventanas MUI".
4. Cambia lo que quieras. Se guarda con Ctrl+S como cualquier fichero; deshacer funciona.
5. **Ver en Amiga** (arriba a la derecha) para verla de verdad.
6. Para el programa entero: abre `src/dashweb.dash` y "Dash: Compilar" o el botón ▷ de arriba ("Ejecutar en
   emulador").

### 5.4 Qué hace "Ver en Amiga"

Enseña cómo queda la ventana de verdad, con MUI, y no el dibujo aproximado del editor. Al pulsarlo, el plugin:

1. Escribe un programa mínimo en Dash que solo abre esa ventana del `.dashui`. Usa lo que hay en el editor, aunque
   no esté guardado.
2. Lo compila para el Amiga.
3. Arranca un Amiga emulado en FS-UAE, sin ventana, con el sistema de `dash.emulator.muiSystem` (Workbench y
   MUI).
4. Espera unos 15 segundos a que arranque y salga la ventana.
5. Hace una foto de la pantalla del Amiga y la pone en el editor, debajo de la vista aproximada.

Sirve para comprobar lo que el dibujo aproximado no sabe: cómo reparte MUI el espacio, las fuentes y los bordes
reales, los tamaños.

Lo que no hace:

- No es interactivo: es una foto, no se puede pulsar nada.
- No ejecuta el programa, solo abre la ventana. Por eso, con dashweb, los iconos de la barra salen vacíos (el
  programa mínimo corre en otra carpeta y no encuentra `PROGDIR:iconos/`) y la zona de la página sale gris (nadie
  la pinta).
- Para el programa entero está "Dash: Ejecutar en emulador". Tampoco abre ventana: lo que escribe el programa
  sale en un terminal de VS Code.

Tarda unos 30 segundos y mientras tanto el botón no cambia. El único aviso es una línea gris pequeña debajo de la
vista, y la foto sale también ahí: con una ventana grande hay que bajar para verla. Parece que no hace nada, pero
está trabajando.

### 5.5 Lo que hay que saber

- La vista aproximada no reparte el espacio igual que MUI. Muestra los objetos ocultos (`hidden`) y los botones
  con imagen como el nombre del fichero. Para lo real, "Ver en Amiga".
- "Dash: Compilar" usa las opciones por defecto de `./dash`. Para el paquete de verdad, `tools/paquete.sh`
  (apartado 9).
- No hay copiar y pegar de objetos ni selección múltiple.

## 6. C de fuera

La regla de dashweb: **lo que le falta a Dash se añade a Dash.** El C se queda para lo que ya es C: las
librerías de otros (QuickJS, Hubbub, los decodificadores) y el pegamento con ellas.

Cómo se mete C en un programa Dash (manual de Dash, apartado de `@native`):

- `@native func nombre(...) """código C"""`: una función escrita en C. Con `@native(borrow)` los argumentos no se
  copian.
- `@c """..."""`: C suelto a nivel de fichero (tipos, funciones auxiliares).
- `@header "#include <...>"`: cabeceras.
- `@link "../build/qjs-lib/libqjs.a"`: enlaza una librería ya compilada.

Las librerías se compilan aparte con scripts propios (`tools/build_qjs.sh`, `tools/build_img.sh`,
`tools/build_video.sh`) y quedan en `build/`. Así `./dash` no recompila QuickJS cada vez.

Dónde hay C en dashweb: `lib/js.dash` (QuickJS), `lib/jsdom.dash` (el DOM para JavaScript), `lib/html5.dash`
(Hubbub), `lib/imagen_dec.dash` (imágenes), `lib/fuente_web.dash` (fuentes TTF), `lib/http.dash` (gzip),
`lib/video.dash` (MintVID). Y una función en `src/dashweb.dash` para mover ventanas (`MoveWindow`).

Los cambios que necesitó QuickJS para AmigaOS están en `docs/quickjs_amiga.md`.

## 7. Memoria y datos

- **Una página = un `Documento`**, dueño de todo lo suyo: bytes, DOM, hojas de estilo, cajas, imágenes, contexto
  JavaScript. Al cambiar de página se libera entero.
- **Dash cuenta referencias.** Un ciclo no se libera hasta salir. Por eso los enlaces hacia arriba (el `padre` de
  un nodo) son `weak`.
- `--memcheck` en los tests: al salir no debe quedar nada vivo.
- **Lo que el usuario guarda va en `PROGDIR:`**, junto al programa: `dashweb.marcadores`, `dashweb.prefs`
  (`clave=valor`) y `dashweb.cookies`. Ficheros de texto sencillos (`file_read_text`, `file_write_text`).
- **Las fuentes del Amiga son Latin-1.** Todo texto que se pinta se pasa a Latin-1. Lo que va en el paquete para
  leer en el Amiga (`LEEME`, el guion del Installer) también.

## 8. Probar en el emulador

- `python3 tests/run.py` compila cada `tests/test_*.dash` y los ejecuta todos en un solo arranque de FS-UAE
  (A1200 con 68882). `python3 tests/run.py url -v` ejecuta solo los que contienen "url".
- Cada test dice lo que debe escribir con líneas `# expect-out:`. Otras directivas: `# dash-flags:`,
  `# emu-config:` (por ejemplo `cpu = 68030`), `# emu-needs:` (una librería que tiene que estar) y
  `# emu-server:` (un servidor Python local que se arranca para ese test).
- **La red se prueba con servidores locales** (`tests/servers/`). FS-UAE da al Amiga la red del PC. Nada de
  pruebas automáticas contra webs de terceros.
- **La interfaz se prueba con capturas.** `tools/emu_run.py --autoclose 20 --screenshot 15 captura.png programa.dash`
  deja una imagen de la pantalla del Amiga. `tools/medir_visor.py --programa src/dashweb.dash --pagina ...
  --captura x.png` hace lo mismo con el navegador y mide los tiempos.
- Sin ratón en el emulador: los tests de MUI usan `mui_press`, `mui_set_value` y `--autoclose`, que hace que
  `mui_wait_event` devuelva -1.
- Para medir "como el objetivo" (PiStorm): FS-UAE con 68040, JIT y velocidad máxima. Para ver qué es lento,
  `./dash --profile`.

## 9. El paquete para el Amiga

`tools/paquete.sh` deja `build/dashweb.lha`:

1. Compila las librerías de C si faltan y luego `src/dashweb.dash` (el visor no va en el paquete: es para pruebas).
2. Copia `iconos/` (la barra de herramientas, que se carga de `PROGDIR:iconos/`).
3. Pasa `LEEME` y el guion del Installer a Latin-1.
4. Hace los iconos del Workbench (`tools/iconos_wb.py`): el del cajón y los de dentro.
5. Copia las licencias de todo lo que va dentro.
6. Lo empaqueta en LHA comprimido con `-lh5-`, como LhA (`tools/lha.py`; Lhasa en Linux solo descomprime).

Detalles que importan en el Amiga:

- `@workbench_output "NIL:"`: abierto desde el icono, el programa no abre una ventana de consola.
- La pila: los módulos que la necesitan grande la piden (`@stack 262144` en `lib/js.dash`).
- MUI 5 y MUI 3.8 piden 68020 o mejor. dashweb además se compila para FPU (`--fpu`).

### 9.1 La red en el Amiga

dashweb usa la red a través de `bsdsocket.library`, la forma estándar de AmigaOS desde AmiTCP. Todas las pilas
TCP/IP la traen: Roadshow, AmiTCP, Genesis o Miami. dashweb solo habla con esa librería: no depende del hardware
ni de qué pila haya debajo.

**En el emulador no hay que configurar nada.** FS-UAE la imita: con la opción `bsdsocket_library = 1` (la ponen los
tests y `tools/medir_visor.py`), el Amiga emulado tiene una `bsdsocket.library` que pasa cada llamada a la red de
Linux. No hay pila dentro del Amiga. WinUAE y Amiberry tienen la misma opción ("bsdsocket.library emulation").

**En un Amiga real hacen falta tres cosas:**

1. Hardware de red con su driver SANA-II: una tarjeta Zorro, una PCMCIA en el A1200, o el puerto serie como último
   recurso.
2. Una pila TCP/IP instalada y configurada. Roadshow es la más usada hoy.
3. AmiSSL 5 para HTTPS.

**Con PiStorm** el driver de red puede venir de la propia Raspberry Pi. Emu68 tiene drivers SANA-II para la red
de la Pi: `genet.device` para el Ethernet de la Pi 4 o CM4 y `wifipi.device` para el WiFi. Sobre ese driver se pone
Roadshow y ya hay red. Sin comprobar: qué driver vale depende del modelo de PiStorm y de Pi; mira la documentación
de Emu68 de tu versión.

**Sin probar:** dashweb solo ha corrido con la `bsdsocket.library` imitada de FS-UAE, nunca con una pila real.
Debería ir igual, porque la librería es la misma, pero no está verificado.

## 10. La forma de trabajar

dashweb se ha hecho casi entero con Claude Code en bucle (`/loop`), con estas reglas (`docs/DASHWEB_LOOP.md`):

- **Un plan con tareas numeradas** y una **bitácora**. Cada vuelta hace una tarea, la prueba, la apunta y hace
  commit. Si es grande, se parte.
- **Fases.** Fase A sin MUI (red, HTML, CSS, maquetación, pintar en una ventana normal: `src/visor.dash`). Fase B
  con la interfaz MUI. Así el motor se pudo probar antes de que Dash tuviera MUI.
- **Cada módulo con su test**, que se prueba solo, sin los demás: texto de entrada, salida esperada.
- **Lo que falta a Dash se añade a Dash** como tarea `D<n>` (van por D59): textos rápidos, listas y
  diccionarios con tipo, red, TLS, fuentes, imágenes, `@link`... Se hace en un worktree aparte de Dash (rama
  `dashweb`) y lo hace otra sesión ("dash"), para no pisarse. Cada aplicación grande hace crecer el lenguaje.
- **Nada que funcionaba puede romperse.** La batería entera antes y después de cada tarea.
- **Capturas** cada vez que cambia lo que se ve.

## 11. Receta: una aplicación nueva

1. Carpeta con `src/`, `lib/` y `tests/`. Copia `tests/run.py` de dashweb (busca Dash en `$DASH`).
2. En VS Code: "Dash: Nuevo fichero de ventanas MUI" → `src/miapp.dashui`. Monta la ventana. Pon nombre a los
   objetos que vayas a tocar y un número de evento a lo que se pulsa o cambia.
3. "Ver en Amiga" hasta que la ventana esté como quieres.
4. `src/miapp.dash`:

   ```ruby
   import "miapp.dashui"

   @workbench_output "NIL:"

   const ID_ACEPTAR = 1      # los mismos números que en el .dashui
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

5. La lógica que no es interfaz, en `lib/`, con su test en `tests/`. Así se prueba sin ventanas.
6. "Ejecutar en emulador" para verla funcionar.
7. Si algo es lento o largo: forma "empezar / avanzar" y un `mui_timer` (apartado 4.6).
8. Si hace falta una librería de C: compílala aparte a un `.a` y enlázala con `@link` (apartado 6). Si lo que
   falta es del lenguaje, añádelo a Dash.
9. El paquete: copia `tools/paquete.sh` y quédate con lo que uses.
