# QuickJS en AmigaOS 3.x

*[English](quickjs_amiga.en.md) | Castellano*

Medido el 2026-10-15 en FS-UAE (A1200, Kickstart 3.1, 8 MB de Fast). Primeras pruebas de una sesión de
investigación previa; los scripts están ahora en `tools/`.

## Por qué QuickJS

| Motor | JavaScript | Licencia | Para nosotros |
|---|---|---|---|
| QuickJS (Bellard) | ES2023+ (su web dice ES2025) | MIT | El elegido. Funciona en big-endian. |
| quickjs-ng | ES2023+ | MIT | Alternativa; su soporte big-endian se quitó una vez y se repuso. |
| XS (Moddable) | casi todo el estándar | LGPL3 | Plan B: muy poca RAM, opción big-endian. |
| Duktape | ES5.1 | MIT | El de NetSurf 68k. Parado desde 2022. Se queda corto. |
| V8, SpiderMonkey, JSC | todo | varias | Sin versión para 68k y enormes. |

## Cambios para AmigaOS

En `third_party/quickjs/quickjs.c` (segundo commit del repo, para ver el diff):

1. `malloc_usable_size`: libnix no lo tiene. Cada bloque lleva delante una cabecera de 8 bytes con su tamaño
   (`amiga_malloc`, `amiga_free`, `amiga_realloc`), así que `malloc_size` y con él `JS_SetMemoryLimit` cuentan la
   memoria de verdad (devolver 0, como la rama de Emscripten de antes, no contaba nada).
2. `tm_gmtoff`: libnix no lo tiene; se usa el camino de Windows (`gmtime`/`localtime`).
3. Sin `CONFIG_ATOMICS`: `Atomics` necesita hilos.
4. Perfil por muestras, solo si se compila con `-DJS_PERFIL` (tarea 37a3): `JS_PerfilMuestra(rt)` apunta la
   función de arriba de la pila (de bytecode o nativa) y las de debajo; lib/js.dash la llama 50 veces por segundo
   desde una interrupción VBlank, y `JS_PerfilVolcar(ctx, n)` escribe las que más pesan (propio y total,
   fichero:línea:columna del principio de la función). Uso:
   `tools/build_qjs.sh lib -DJS_PERFIL` y `DASH_CFLAGS=-DJS_PERFIL tools/medir_visor.py ...` (dashweb lo escribe
   al acabar los scripts de la página); luego `tools/build_qjs.sh lib` para volver a la normal. Sin la macro, el
   código ni se compila.

5. `JS_SetInterruptCatchable(rt, 1)` (tarea 42e): el "interrupted" siguiente del manejador de interrupción se puede
   coger, así que corren los catch y los finally del script cortado (sin el cambio, QuickJS lo marca como imposible
   de coger y se salta los finally: la librería de señales de Preact en xataka.com se quedaba con un computed a
   medias y luego cada clic daba "Cycle detected"). lib/js.dash lo usa en el primer corte de los 30 s; si el script
   sigue 5 s más, el corte ya no se puede coger.

`third_party/quickjs/amiga/fenv.h` está vacío: el de libnix no compila y QuickJS no usa nada de él.
`third_party/quickjs/amiga/qjsamiga.c` es un lanzador de pruebas: ejecuta los `.js` dados y mide tiempo
(EClock de `timer.device`) y memoria. Pide 256 KB de pila.

## Problemas encontrados

- Las matemáticas de doble precisión de la ROM (`mathieeedoubbas`, las que usa `-lm` de libnix) dan
  resultados erróneos: `0.1 + 0.2` salía `0.3`, y el `sort` y el JSON salían distintos. Con el `fp-bit` de
  GCC (el de `runtime/softfloat` de Dash) o con FPU salen bien. `Math.sin` y `Math.pow` aún fallan en el
  último dígito: haría falta una libm en C (fdlibm, la de V8).
- `build_qjs.sh` usa las opciones de GCC de Dash: el optimizador de bebbo con sus pasadas `e` y `r` dio
  código erróneo en Dash.

## Tamaño y velocidad

Ejecutable: unos 820-860 KB. El motor recién creado usa 160 KB de RAM; unos 290 KB tras los benchmarks.

A1200 (68020 a 14 MHz, velocidad real), en milisegundos:

| Prueba | 68000 + fp-bit | 68020 + FPU 68882 | PC (referencia) |
|---|---|---|---|
| Crear el motor | 331 | 320 | – |
| `fib(20)` | 4.286 | 3.876 | 0,4 |
| Bucle de enteros 100k | 10.644 | 9.516 | 0,9 |
| Decimales 20k | 12.421 | 2.753 | 0,2 |
| `Math.sin` 5k | 9.644 | 1.447 | 0,2 |
| 5.000 objetos | 7.724 | 7.187 | 0,6 |
| Ordenar 5.000 números | 20.809 | 16.026 | 1,2 |
| JSON de 11 KB (×6) | 9.099 | 7.543 | 0,6 |
| Map de 5.000 claves | 11.505 | 10.317 | 0,8 |
| Compilar 57 KB de JS | 22.859 | 21.157 | 2,0 |

Con modelos de A1200 con tarjeta Blizzard (en segundos): compilar jQuery 29,2 (020/14), 17,8 (030/50),
8,9 (040/40 y 060/50). El 040 y el 060 dan exactamente lo mismo: FS-UAE no simula bien su velocidad, así
que para 040/060 hace falta medir en hardware real (o PiStorm).

## Como librería (tarea 15)

`tools/build_qjs.sh lib` deja `build/qjs-lib/libqjs.a` (QuickJS, fdlibm de `third_party/fdlibm` y el fp-bit
de Dash) y `quickjs.h` al lado. `lib/js.dash` lo enlaza con `@link` y pide 256 KB de pila con `@stack`.
`Math.*` da ya los dígitos de fdlibm en un PC (`Math.exp(1)` = 2.7182818284590455, como fdlibm; V8 da
2.718281828459045). Ejecutable mínimo con el motor: 889 KB. Crear el motor: 429 ms en el A1200, 7 ms en el
objetivo (68040 + JIT); `fib(20)`: 5,95 s y 59 ms.

Al terminar un programa Dash que usaba QuickJS se colgaba: Dash dejaba `DOSBase` (la variable de libnix) a
NULL y la limpieza de stdio de libnix la usaba después (arreglado en Dash, D25).

## Siguiente

- Memoria del motor en los pools de exec (como Dash) en vez del `malloc` de libnix.
- Variante con FPU de `libqjs.a` para los programas compilados con `--fpu`.
- `fib(20)` tarda más enlazado en Dash (5,95 s) que en el lanzador de pruebas (4,3 s): mirar por qué.
- Por qué cada instrucción del intérprete cuesta ~125 ciclos en el 020 (valores de 64 bits, caché de 256 bytes).
