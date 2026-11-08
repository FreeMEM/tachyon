#!/usr/bin/env python3
"""lib/jsdom_preludio.js -> lib/jsdom_preludio.dash (una función Dash que da el texto del JS).

    python3 tools/preludio.py           # escribe lib/jsdom_preludio.dash
    python3 tools/preludio.py --check   # falla si no está al día (tests/run.py lo mira)

El JS se escribe como JS; Dash lo lleva como una cadena (sin comentarios ni sangría de línea)."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUENTE = ROOT / "lib" / "jsdom_preludio.js"
DESTINO = ROOT / "lib" / "jsdom_preludio.dash"


def cadena_dash(s: str) -> str:
    s = s.replace("\\", "\\\\").replace('"', '\\"').replace("#{", "#\" + \"{")
    return '"' + s + '\\n"'


def generar() -> str:
    lineas = []
    for l in FUENTE.read_text(encoding="utf-8").splitlines():
        l = l.strip()
        if not l or l.startswith("//"):
            continue
        # (solo ASCII, lo de fuera con \u: así el C lo compila sin pasarlo a UTF-8, sin otra copia de 230 KB en un A1200)
        if any(ord(c) > 127 for c in l):
            sys.exit(f"lib/jsdom_preludio.js: carácter que no es ASCII fuera de un comentario (escríbelo con \\u): {l[:80]}")
        lineas.append(l)
    cuerpo = "\n".join(f"    j = j + {cadena_dash(l)}" for l in lineas)
    return ("# Generado por tools/preludio.py desde lib/jsdom_preludio.js: no editar a mano.\n\n"
            "func jsdom_preludio_js() -> String\n    j = \"\"\n" + cuerpo + "\n    return j\nend\n")


def main():
    texto = generar()
    if "--check" in sys.argv:
        if not DESTINO.exists() or DESTINO.read_text(encoding="utf-8") != texto:
            sys.exit("lib/jsdom_preludio.dash no está al día: python3 tools/preludio.py")
        return
    DESTINO.write_text(texto, encoding="utf-8")
    print(f"{DESTINO.relative_to(ROOT)}: {texto.count(chr(10))} líneas")


if __name__ == "__main__":
    main()
