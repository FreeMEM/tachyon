#!/bin/sh
# Dash 2.0 (tarea D11j de Dash): el C de Tachyon que era @c y @native en lib/js, lienzo, jsdom, html5 y documento
# (src_c/tachyon.c, sacado con tools/a_modulo.py) a build/pegamento-lib/libpegamento.a, que lib/js.dash enlaza con
# @link. Antes, build/dash_tipos.h con dashc --cabecera: los structs de Dash tal como los coloca dashc, la API del
# runtime (dl_*) y las funciones @export de los .dash que llama este C. Para 68020 + FPU, como libqjs y libimg.
#
#   DASH=~/Projects/FreeMEMLang/.worktrees/dashc tools/build_pegamento.sh
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
DASH=${DASH:-$HOME/Projects/FreeMEMLang/.worktrees/dashc}
GCC=${GCC:-/opt/amiga/bin/m68k-amigaos-gcc}
B=$R/build/pegamento-lib
mkdir -p "$B"
"$DASH/dashc/dashc" --cabecera "$R/build/dash_tipos.h" "$R/src/dashweb.dash"
H=$R/third_party/hubbub
CF="-noixemul -O2 -fomit-frame-pointer -fbbb=abcfhilmnpz0 -fno-delete-null-pointer-checks -m68020 -m68881
    -ffunction-sections -fdata-sections -I$R/build -I$R/third_party/quickjs -I$R/third_party/quickjs/amiga
    -I$H/libhubbub/include -I$H/libparserutils/include"
$GCC $CF -c "$R/src_c/tachyon.c" -o "$B/tachyon.o"
rm -f "$B/libpegamento.a"
${AR:-/opt/amiga/bin/m68k-amigaos-ar} rcs "$B/libpegamento.a" "$B/tachyon.o"
