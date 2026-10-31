#!/bin/sh
# El paquete de Tachyon (antes dashweb) para el Amiga: build/tachyon.lha con el navegador (MUI) y sus iconos, los
# iconos de Workbench (tools/iconos_wb.py), el guion del Installer (paquete/Instalar),
# paquete/LEEME y las licencias de Tachyon y de lo que lleva dentro (LHA comprimido con -lh5-: tools/lha.py; sin
# comprimir, IBrowse cortaba la descarga de 6,9 MB hacia los 3,3 MB; el visor, solo para pruebas, no va); y
# build/Tachyon.gz, el ejecutable solo con gzip, que va también en cada versión publicada: con él se actualiza Tachyon
# desde sí mismo (lib/actualizar.dash, tarea 44; no sabe abrir .lha). Necesita el toolchain y Dash (DASH, por
# defecto ~/Projects/FreeMEMLang/.worktrees/dashweb) y el SDK de MUI de Dash; `lha` (Lhasa) para comprobarlo.
#
#   tools/paquete.sh
set -e
R=$(cd "$(dirname "$0")/.." && pwd)
DASH=${DASH:-$HOME/Projects/FreeMEMLang/.worktrees/dashweb}
B=$R/build/paquete
rm -rf "$B"
mkdir -p "$B/Tachyon/Licencias"
[ -f "$R/build/qjs-lib/libqjs.a" ] || DASH=$DASH "$R/tools/build_qjs.sh" lib
[ -f "$R/build/img-lib/libimg.a" ] || "$R/tools/build_img.sh"
[ -f "$R/build/video-lib/libvideo.a" ] || DASH=$DASH "$R/tools/build_video.sh"
cd "$DASH"
# con --fpu, como libqjs, libimg y libvideo (-m68881): mezclar las dos formas rompe los números con decimales que
# cruzan entre ellas (sin él, las fuentes web no salían: la escala de stb_truetype llegaba en fp0; tarea 40a)
PYTHONPATH=$DASH ./dash --fpu "$R/src/dashweb.dash" -o "$B/Tachyon/Tachyon"
python3 "$R/tools/iconos.py" >/dev/null
cp -r "$R/iconos" "$B/Tachyon/iconos"   # la barra de herramientas (PROGDIR:iconos/)
# los catálogos de idiomas (PROGDIR:Catalogs/<idioma>/Tachyon.catalog; tarea 45g): uno por catalogos/*.ct
(cd "$B/Tachyon" && for ct in "$R"/catalogos/*.ct; do python3 "$DASH/tools/catalogo.py" catalog "$ct" >/dev/null; done)
# el LEEME y el guion del Installer en Latin-1 (MultiView y el Installer no leen UTF-8)
iconv -f UTF-8 -t LATIN1 "$R/paquete/LEEME" > "$B/Tachyon/LEEME"
iconv -f UTF-8 -t LATIN1 "$R/paquete/Instalar" > "$B/Tachyon/Instalar"
# los iconos de Workbench: el del cajón (junto a él) y los de dentro
python3 "$R/tools/iconos_wb.py" "$B"
cp "$R/LICENSE" "$B/Tachyon/Licencias/Tachyon"
cp "$R/third_party/quickjs/LICENSE" "$B/Tachyon/Licencias/QuickJS"
cp "$R/third_party/fdlibm/README.md" "$B/Tachyon/Licencias/fdlibm"
cp "$R/third_party/hubbub/libhubbub/COPYING" "$B/Tachyon/Licencias/Hubbub"
cp "$R/third_party/hubbub/libparserutils/COPYING" "$B/Tachyon/Licencias/LibParserUtils"
cp "$R/third_party/libwebp/COPYING" "$B/Tachyon/Licencias/libwebp"
cp "$R/third_party/nanosvg/LICENSE.txt" "$B/Tachyon/Licencias/nanosvg"
cp "$R/third_party/mintvid/LICENSE" "$B/Tachyon/Licencias/MintVID"
cp "$R/third_party/brotli/LICENSE" "$B/Tachyon/Licencias/Brotli"
cp "$R/third_party/lucide/LICENSE" "$B/Tachyon/Licencias/Lucide"   # los iconos de la barra
cp "$R/third_party/ryu/LICENSE-Boost" "$B/Tachyon/Licencias/Ryu"   # el texto de los números (Apache 2.0 o Boost: Boost)
head -25 "$R/third_party/tjpgd/tjpgd.c" > "$B/Tachyon/Licencias/TJpgDec"
printf '%s\n' "stb_image y stb_truetype (https://github.com/nothings/stb), de Sean Barrett: dominio público" \
    "(o MIT, a elegir; ver la cabecera de third_party/stb/*.h en el código de Tachyon)." > "$B/Tachyon/Licencias/stb"
cd "$B"
rm -f "$R/build/tachyon.lha"
python3 "$R/tools/lha.py" "$R/build/tachyon.lha" Tachyon Tachyon.info   # Lhasa only extracts
ls -l "$R/build/tachyon.lha"
lha -l "$R/build/tachyon.lha" | tail -12
lha -t "$R/build/tachyon.lha" >/dev/null   # (el CRC de cada fichero: que lh5 descomprime bien)
gzip -9 -n -c "$B/Tachyon/Tachyon" > "$R/build/Tachyon.gz"
ls -l "$R/build/Tachyon.gz"
# y los catálogos sueltos, para la actualización automática (lib/actualizar.dash: Tachyon-<idioma>.catalog), con el
# idioma sin acentos ("espanol"), que GitHub los cambia: el de verdad va dentro del catálogo
rm -f "$R"/build/Tachyon-*.catalog
for c in "$B"/Tachyon/Catalogs/*/Tachyon.catalog; do
    a=$(python3 -c 'import sys, unicodedata; print(unicodedata.normalize("NFKD", sys.argv[1]).encode("ascii", "ignore").decode())' "$(basename "$(dirname "$c")")")
    [ -f "$c" ] && cp "$c" "$R/build/Tachyon-$a.catalog"
done
ls -l "$R"/build/Tachyon-*.catalog 2>/dev/null
