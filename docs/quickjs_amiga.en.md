# QuickJS on AmigaOS 3.x

*English | [Castellano](quickjs_amiga.md)*

Measured on 2026-10-15 in FS-UAE (A1200, Kickstart 3.1, 8 MB of Fast RAM). First tests from an earlier
research session; the scripts are now in `tools/`.

## Why QuickJS

| Engine | JavaScript | License | For us |
|---|---|---|---|
| QuickJS (Bellard) | ES2023+ (its website says ES2025) | MIT | The one we chose. Works on big-endian. |
| quickjs-ng | ES2023+ | MIT | Alternative; its big-endian support was removed once and then restored. |
| XS (Moddable) | almost the whole standard | LGPL3 | Plan B: very little RAM, big-endian option. |
| Duktape | ES5.1 | MIT | The one in NetSurf 68k. Stalled since 2022. Falls short. |
| V8, SpiderMonkey, JSC | everything | various | No 68k version, and huge. |

## Changes for AmigaOS

In `third_party/quickjs/quickjs.c` (second commit of the repo, to see the diff):

1. `malloc_usable_size`: libnix doesn't have it. Each block is preceded by an 8-byte header holding its size
   (`amiga_malloc`, `amiga_free`, `amiga_realloc`), so `malloc_size`, and with it `JS_SetMemoryLimit`, count the
   real memory (returning 0, like the old Emscripten branch did, counted nothing).
2. `tm_gmtoff`: libnix doesn't have it; the Windows path (`gmtime`/`localtime`) is used.
3. No `CONFIG_ATOMICS`: `Atomics` needs threads.
4. Sampling profiler, only when built with `-DJS_PERFIL` (task 37a3): `JS_PerfilMuestra(rt)` records the
   function at the top of the stack (bytecode or native) and the ones below it; lib/js.dash calls it 50 times per
   second from a VBlank interrupt, and `JS_PerfilVolcar(ctx, n)` writes out the heaviest ones (self and total,
   file:line:column of the start of the function). Usage:
   `tools/build_qjs.sh lib -DJS_PERFIL` and `DASH_CFLAGS=-DJS_PERFIL tools/medir_visor.py ...` (dashweb writes it
   out when the page's scripts finish); then `tools/build_qjs.sh lib` to go back to the normal build. Without the
   macro, the code isn't even compiled.

5. `JS_SetInterruptCatchable(rt, 1)` (task 42e): the next "interrupted" from the interrupt handler can be
   caught, so the catch and finally blocks of the interrupted script run (without this change, QuickJS marks it as
   uncatchable and skips the finally blocks: Preact's signals library on xataka.com was left with a half-updated
   computed, and from then on every click gave "Cycle detected"). lib/js.dash uses it for the first cut-off at 30 s;
   if the script keeps running for 5 more seconds, the cut-off can no longer be caught.
6. `find_var` with an index by name (task 38c7): it looked for each variable among all those of its function, and
   resolving a name looks for it in its function and in all those around it. A minified script puts thousands of
   variables in one function: YouTube's main one (10.8 MB) took 138 s to compile in the emulated 68040, 56 % of it in
   `find_var` (gprof on the PC). With 32 variables or more, the function gets a hash table (`vars_htab`, open
   addressing; no variable is ever removed, so those with one name are all in the run that starts at its hash).
   Compiling it: 66 s (on the PC, from 1.03 to 0.49 s); the bytecode comes out identical. Measured with
   `tests/bench/js_grande.dash`.
7. `isnan`, `isinf` and `isfinite` from the double's bits (`amiga/math.h`, task 38c3): FS-UAE's emulated FPU
   compares infinities wrongly (`fcmp` of Infinity with Infinity gives "unordered": `inf == inf` is false and
   `isnan(inf)` true, also with `__builtin_isnan`; GCC emits a correct `fcmp` and `fseq`). QuickJS took Infinity as 0
   when making it an integer (`JS_ToInt32Sat`): `[].flat(Infinity)` failed (YouTube's player was left without its
   methods), and so did `slice(0, Infinity)`, `substring`, `at`, `fill`, `charAt`, `copyWithin` and
   `isNaN(Infinity)`. Direct comparisons (`Infinity === Infinity`) are still up to the FPU: false in the emulator.

`third_party/quickjs/amiga/fenv.h` is empty: libnix's one doesn't compile and QuickJS uses nothing from it.
`third_party/quickjs/amiga/qjsamiga.c` is a test launcher: it runs the given `.js` files and measures time
(EClock from `timer.device`) and memory. It asks for 256 KB of stack.

## Problems found

- The ROM's double-precision maths libraries (`mathieeedoubbas`, the ones libnix's `-lm` uses) give
  wrong results: `0.1 + 0.2` came out as `0.3`, and `sort` and JSON gave different output. With GCC's
  `fp-bit` (the one in Dash's `runtime/softfloat`) or with an FPU they come out right. `Math.sin` and `Math.pow` are
  still off in the last digit: a libm written in C would be needed (fdlibm, the one V8 uses).
- `build_qjs.sh` uses Dash's GCC options: bebbo's optimizer with its `e` and `r` passes produced
  wrong code in Dash.

## Size and speed

Executable: about 820-860 KB. A freshly created engine uses 160 KB of RAM; about 290 KB after the benchmarks.

A1200 (68020 at 14 MHz, real speed), in milliseconds:

| Test | 68000 + fp-bit | 68020 + 68882 FPU | PC (reference) |
|---|---|---|---|
| Create the engine | 331 | 320 | – |
| `fib(20)` | 4,286 | 3,876 | 0.4 |
| 100k integer loop | 10,644 | 9,516 | 0.9 |
| 20k decimal numbers | 12,421 | 2,753 | 0.2 |
| `Math.sin` 5k | 9,644 | 1,447 | 0.2 |
| 5,000 objects | 7,724 | 7,187 | 0.6 |
| Sort 5,000 numbers | 20,809 | 16,026 | 1.2 |
| 11 KB JSON (×6) | 9,099 | 7,543 | 0.6 |
| Map with 5,000 keys | 11,505 | 10,317 | 0.8 |
| Compile 57 KB of JS | 22,859 | 21,157 | 2.0 |

With A1200 models fitted with a Blizzard card (in seconds): compiling jQuery 29.2 (020/14), 17.8 (030/50),
8.9 (040/40 and 060/50). The 040 and the 060 give exactly the same result: FS-UAE doesn't emulate their speed
accurately, so the 040/060 have to be measured on real hardware (or a PiStorm).

## As a library (task 15)

`tools/build_qjs.sh lib` produces `build/qjs-lib/libqjs.a` (QuickJS, fdlibm from `third_party/fdlibm` and Dash's
fp-bit) with `quickjs.h` next to it. `lib/js.dash` links it with `@link` and asks for 256 KB of stack with `@stack`.
`Math.*` now gives fdlibm's digits on a PC (`Math.exp(1)` = 2.7182818284590455, like fdlibm; V8 gives
2.718281828459045). Minimal executable with the engine: 889 KB. Creating the engine: 429 ms on the A1200, 7 ms on the
target (68040 + JIT); `fib(20)`: 5.95 s and 59 ms.

When a Dash program that used QuickJS exited, it hung: Dash left `DOSBase` (libnix's variable) set to
NULL and libnix's stdio cleanup used it afterwards (fixed in Dash, D25).

## Next

- Engine memory in exec pools (as Dash does) instead of libnix's `malloc`.
- An FPU variant of `libqjs.a` for programs built with `--fpu`.
- `fib(20)` takes longer when linked into Dash (5.95 s) than in the test launcher (4.3 s): find out why.
- Why each interpreter instruction costs ~125 cycles on the 020 (64-bit values, 256-byte cache).
