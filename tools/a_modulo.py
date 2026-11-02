#!/usr/bin/env python3
"""Dash 2.0 (tarea D11j de Dash): saca el C de módulos de Tachyon (@header, @c y @native) a src_c/tachyon.c, uno
tras otro como iban en el C de ./dash (un solo fichero: el de jsdom usa lo static de js), y deja en cada .dash las
firmas (@extern) de lo que era @native. Se usa una vez; después el .c se mantiene a mano y tools/build_pegamento.sh
lo compila en build/pegamento-lib/libpegamento.a.

    python3 tools/a_modulo.py lib/js.dash lib/jsdom.dash ...    # en el orden en que se importan

El C ve los structs de Dash y las funciones @export por build/dash_tipos.h (dashc --cabecera), con los nombres
del C de ./dash (_dash_str_dup, DashArray_get...) como macros."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CTYPE = {"Int": "LONG", "Bool": "LONG", "String": "STRPTR", "Func": "APTR"}
PRELUDIO = """/* src_c/tachyon.c: el C de {modulos} (antes @c y @native; Dash 2.0 no compila C en los
   programas). Lo compila tools/build_pegamento.sh; los .dash lo llaman con @extern. */
#include <exec/types.h>
#include <exec/memory.h>
#include <exec/execbase.h>
#include <dos/dos.h>
#include <proto/exec.h>
#include <proto/dos.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include "dash_tipos.h"
"""


def ctipo(t):
    t = (t or "").strip()
    if not t:
        return "void"
    if t in CTYPE:
        return CTYPE[t]
    if re.fullmatch(r"[A-Z]\w*", t):
        return f"struct _Dash_{t} *"     # un struct de Dash: su puntero (dash_tipos.h)
    sys.exit(f"a_modulo: tipo sin traducir a C: {t}")


def main():
    fuentes = [ROOT / f for f in sys.argv[1:]]
    c = [PRELUDIO.format(modulos=", ".join(f"lib/{f.name}" for f in fuentes))]
    total = 0
    for fuente in fuentes:
        total += sacar(fuente, c)
    salida = ROOT / "src_c" / "tachyon.c"
    salida.parent.mkdir(exist_ok=True)
    salida.write_text("".join(c), encoding="utf-8")
    print(f"{salida.relative_to(ROOT)}: {total} funciones de {len(fuentes)} módulos")


def sacar(fuente, c):
    modulo = fuente.stem
    texto = fuente.read_text(encoding="utf-8")
    externs = []
    c.append(f"\n/* ==== lib/{fuente.name} ==== */\n")

    # @header "..." (una línea)
    def header(m):
        c.append(m.group(1).encode().decode("unicode_escape") + "\n")
        return ""
    texto = re.sub(r'^@header "((?:[^"\\]|\\.)*)"\n', header, texto, flags=re.M)

    # @c ... end
    def bloque(m):
        c.append(m.group(1) + "\n")
        return ""
    texto = re.sub(r'^@c\n"""\n(.*?)\n"""\nend\n', bloque, texto, flags=re.M | re.S)

    # @native func f(a: T, ...) -> R ... end
    def nativa(m):
        nombre, params, ret, cuerpo = m.group(1), m.group(2), m.group(3), m.group(4)
        ps = []
        for p in [x for x in params.split(",") if x.strip()]:
            n, t = [y.strip() for y in p.split(":")]
            ps.append(f"{ctipo(t)} {n}")
        c.append(f"{ctipo(ret)} {nombre}({', '.join(ps) or 'void'})\n{{\n{cuerpo}\n}}\n")
        firma = f'@extern("{modulo}") func {nombre}({params})' + (f" -> {ret.strip()}" if ret else "")
        externs.append(firma)
        return firma + "\n"
    texto = re.sub(r'^@native(?:\(borrow\))? func (\w+)\(([^)]*)\)(?: -> (\w+))?\n"""\n(.*?)\n"""\nend\n', nativa,
                   texto, flags=re.M | re.S)
    if "@native" in texto or re.search(r"^@c$|^@header", texto, re.M):
        sys.exit(f"a_modulo: queda C sin sacar en {fuente}")
    fuente.write_text(texto, encoding="utf-8")
    return len(externs)


if __name__ == "__main__":
    main()
