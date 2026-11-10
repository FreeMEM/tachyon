# Tachyon (antes dashweb) — guía para agentes

El navegador se llama **Tachyon** desde el 2026-10-21 (usuario). Lo que ve quien lo usa dice Tachyon (ventana,
Acerca de, $VER, User-Agent, paquete, LEEME, ficheros PROGDIR:Tachyon.*, direcciones tachyon:); el repositorio es
FreeMEM/tachyon y la carpeta ~/Projects/tachyon; por dentro (src/dashweb.dash, nombres de funciones, la rama dashweb de
Dash) sigue dashweb.

Navegador web ligero para AmigaOS 3.x escrito en Dash (`~/Projects/FreeMEMLang`, repo FreeMEM/dash), con
interfaz MUI 5, QuickJS (`third_party/quickjs`) y HTTPS (AmiSSL). Objetivo: PiStorm (Emu68) y emulación
(UAE con JIT); se compila para 68020 + FPU.

Plan, reglas y bitácora: `docs/DASHWEB_LOOP.md` (sesiones largas por tandas, rama local `dev`, sin push).

## Dash

dashweb existe para hacer crecer Dash: **lo que le falte a Dash se añade a Dash** (tareas `D<n>` del plan),
sin rodeos con `@native`. Desde la 0.8 (2026-11-02, usuario) Tachyon se compila con Dash 2.0: `./dash` de
`~/Projects/FreeMEMLang` (rama `main`, `$DASH` por defecto) genera el hunk del Amiga directamente (dashc), sin C. El
C que queda (QuickJS, DOM, lienzo, HTML5) está en `src_c/tachyon.c` (`libpegamento.a`, con `@extern`/`@export`).

Dash mantiene dos líneas y las dos siguen vivas: dashc (directo a hunk) y dash1, el compilador en Python que pasa por
C (`./dash --gcc`). **Un builtin nuevo va a las dos**, con su test en las dos. Aquí solo se usa para compilar: los
cambios de Dash los hacen sus sesiones (regla 3 del plan). Sintaxis de Dash en una página:
`~/Projects/FreeMEMLang/docs/SINTAXIS.md`.

## Comandos

```bash
export DASH_KICKSTART="/home/freemem/Descargas/Telegram Desktop/ks31a1200.rom"
export DASH_EMU_SYS=~/.cache/dash-emu/sys31
export DASH_EMU_SYS_SSL=~/.cache/dash-emu/sys31ssl   # sys31 + AmiSSL (FreeMEMLang/tools/emu_sys_amissl.sh): test_https
python3 tests/run.py            # compila tests/test_*.dash y los ejecuta en FS-UAE (A1200 + 68882)
python3 tests/run.py url -v     # solo los que contienen "url", con la salida de los que fallan
tools/build_qjs.sh 020fpu -m68020 -m68881   # QuickJS suelto
```

Directivas de los tests (`tests/run.py` las explica): `# expect-out:`, `# dash-flags:`, `# cflags:`,
`# emu-config:`, `# emu-needs:`. Los módulos se importan relativos al fichero (`import "../lib/x.dash"`).

## Estructura

- `src/`: el navegador. `lib/`: módulos reutilizables (red, URL, HTML, CSS...). `tests/`: tests y páginas.
- `third_party/quickjs`: QuickJS 2026-06-04 con tres cambios para AmigaOS (`docs/quickjs_amiga.md`).
- `tools/`: compilar QuickJS y ejecutarlo en el emulador.

## Reconocimiento a quien lo pide

Regla del usuario (2026-11-08). Cada arreglo o novedad que venga de una persona lleva su nombre. Vale para una petición, una idea, un aviso de fallo o una indicación. Es para reconocer su interés por el proyecto.

- En el mensaje del commit. Por ejemplo: "(idea de Ferrán García)" o "(lo contó David Martínez)".
- En las notas de la versión, el CHANGELOG y la documentación donde se describa el cambio.
- En la web del proyecto: sección "Gracias", datos en `~/Projects/webs-freemem/paquetes/retro/src/reconocimientos.ts`. Se añade al publicar la versión.
- Se usa el nombre con el que se presenta en el grupo. Nunca datos de contacto: ni teléfono, ni correo.
- Si no se sabe quién lo pidió, preguntar a la sesión "telegram" o al usuario.
