#!/bin/bash
# Código m68k sin sistema bajo el JIT de Emu68 de verdad (la variante para Raspberry Pi sin PiStorm), arrancado en
# QEMU como una Raspberry Pi 3B (tarea 75: así se encontró el fallo de Emu68 1.1.0-beta.1 con muls.l y lsr.l que
# colgaba Tachyon al crear el contexto de QuickJS; lo contaron David Martínez y BordanBordan).
#
#   tools/emu68/probar.sh caso_mul [VERSIÓN]   # el caso mínimo: "caso_mul: 00000006" bien, "e4437d66" con el fallo
#   tools/emu68/probar.sh qjs [VERSIÓN]        # QuickJS de build/qjs-lib/libqjs.a creando el contexto
#   EMU68_OPCIONES="ICNT=1" tools/emu68/probar.sh qjs     # con opciones de Emu68 (su cmdline.txt)
#
# VERSIÓN: una release de github.com/michalsc/Emu68 (por omisión v1.1.0-beta.1), bajada a ~/.cache/emu68. Emu68 carga
# el ejecutable HUNK que se le da como initramfs y lo arranca en modo supervisor, sin AmigaOS: el programa escribe por
# la UART PL011, que el m68k ve en 0xf2201000, y QEMU la saca por la salida. El C usa la libc del runtime de Dash
# (como Tachyon): $DASH/dashc/runtime. Sin salida en el tiempo dado: se colgó.
set -e
R=$(cd "$(dirname "$0")/../.." && pwd)
DASH=${DASH:-$HOME/Projects/FreeMEMLang}
QUE=${1:?caso_mul o qjs}
VER=${2:-v1.1.0-beta.1}
GCC=${GCC:-/opt/amiga/bin/m68k-amigaos-gcc}
E=$HOME/.cache/emu68/$VER
if [ ! -f "$E/Emu68.img" ]; then
  mkdir -p "$E"
  curl -sSfL -o "$E/Emu68-raspi.zip" "https://github.com/michalsc/Emu68/releases/download/$VER/Emu68-raspi.zip"
  (cd "$E" && unzip -qo Emu68-raspi.zip && { [ ! -f Emu68.img.gz ] || gunzip -f Emu68.img.gz; })
fi
B=$(mktemp -d)
trap 'rm -rf "$B"' EXIT
T=$R/tools/emu68
F="-noixemul -O2 -m68020 -m68881 -fno-branch-count-reg -fomit-frame-pointer -fwrapv"
case "$QUE" in
  caso_mul)
    $GCC -m68020 -nostdlib -nostartfiles "$T/caso_mul.s" -o "$B/prog"
    MARCA="caso_mul" ;;
  qjs)
    L=$R/build/qjs-lib
    RT=$DASH/dashc/runtime
    # (de rt_compat.c, solo lo de texto: strchr, strrchr, vsnprintf y snprintf; lo demás pide AmigaOS)
    { echo '#include <stdarg.h>'; echo '#include <stddef.h>'; echo '#include <string.h>'
      sed -n '/^\/\* ---- texto ---- \*\//,/^\/\* ---- memoria/p' "$RT/rt_compat.c"; } > "$B/texto.c"
    $GCC $F -I"$L" -w -c "$T/qjs_e68.c" -o "$B/qjs_e68.o"
    $GCC $F -w -c "$T/cabos.c" -o "$B/cabos.o"
    $GCC $F -fno-builtin -w -c "$B/texto.c" -o "$B/texto.o"
    $GCC $F -fno-builtin -w -c "$RT/rt_libc.c" -o "$B/rt_libc.o"
    $GCC -m68000 -c "$RT/rt_asm.s" -o "$B/rt_asm.o"
    $GCC $F -c "$T/entrada.s" -o "$B/entrada.o"
    $GCC $F -c "$T/vectores.s" -o "$B/vectores.o"
    $GCC $F -nostdlib -nostartfiles "$B/entrada.o" "$B/qjs_e68.o" "$B/vectores.o" "$B/cabos.o" "$B/rt_libc.o" \
        "$B/texto.o" "$B/rt_asm.o" "$L/libqjs.a" -lgcc -o "$B/prog"
    MARCA="qjs-e68" ;;
  *) echo "caso_mul o qjs" >&2; exit 2 ;;
esac
timeout "${EMU68_SEGUNDOS:-200}" qemu-system-aarch64 -M raspi3b -kernel "$E/Emu68.img" -dtb "$E/bcm2710-rpi-3-b.dtb" \
    -initrd "$B/prog" -append "${EMU68_OPCIONES:-}" -serial stdio -display none 2>&1 | grep -a "$MARCA" || true
