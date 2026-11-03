#!/bin/sh
# Dash 2.0 (tarea D11j de Dash): el C de Tachyon que era @c y @native en lib/js, lienzo, jsdom, html5 y documento
# (src_c/tachyon.c, sacado con tools/a_modulo.py) a build/pegamento-lib/libpegamento.a, que lib/js.dash enlaza con
# @link. Antes, build/dash_tipos.h con dashc --cabecera: los structs de Dash tal como los coloca dashc, la API del
# runtime (dl_*) y las funciones @export de los .dash que llama este C. Para 68020 + FPU, como libqjs y libimg.
#
#   tools/build_pegamento.sh            (DASH: la carpeta de Dash, por defecto ~/Projects/FreeMEMLang)
#   DASH_LINEA=gcc tools/build_pegamento.sh
#
# Tarea 58: Tachyon también se compila por el camino de C (./dash --gcc). Ahí un Bool ocupa 2 bytes, así que el C va
# con su cabecera (./dash --gcc --cabecera) y es otra librería. Las dos van a build/pegamento-lib (la ruta del @link
# de lib/js.dash, html5.dash y lienzo.dash); build/pegamento-lib/linea dice para cuál está hecha (dashc o gcc).
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
DASH=${DASH:-$HOME/Projects/FreeMEMLang}
GCC=${GCC:-/opt/amiga/bin/m68k-amigaos-gcc}
LINEA=${DASH_LINEA:-dashc}
B=$R/build/pegamento-lib
mkdir -p "$B"
rm -f "$B/linea"
if [ "$LINEA" = gcc ]; then
    (cd "$R" && python3 "$DASH/dash" --gcc --fpu --cabecera "$R/build/dash_tipos.h" "$R/src/dashweb.dash" > /dev/null)
    rm -f "$R/build/dashweb.cabecera.c"
else
    "$DASH/dashc/dashc" --cabecera "$R/build/dash_tipos.h" "$R/src/dashweb.dash"
fi
H=$R/third_party/hubbub
CF="-noixemul -O2 -fno-branch-count-reg -fomit-frame-pointer -fbbb=abcfhilmnpz0 -fno-delete-null-pointer-checks -m68020 -m68881
    -ffunction-sections -fdata-sections -I$R/build -I$R/third_party/quickjs -I$R/third_party/quickjs/amiga
    -I$H/libhubbub/include -I$H/libparserutils/include"
$GCC $CF -c "$R/src_c/tachyon.c" -o "$B/tachyon.o"
rm -f "$B/libpegamento.a"
${AR:-/opt/amiga/bin/m68k-amigaos-ar} rcs "$B/libpegamento.a" "$B/tachyon.o"
echo "$LINEA" > "$B/linea"
