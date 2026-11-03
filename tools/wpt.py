#!/usr/bin/env python3
"""Las pruebas de pintado (reftests) de Web Platform Tests de una carpeta, en el emulador (tarea 41b).

    tools/wpt.py css/CSS2/normal-flow [máximo] [--desde N]

WPT va en ~/.cache/dashweb/wpt (fuera de git; bajarlo con un clon parcial:
    git clone --depth 1 --filter=blob:none --sparse https://github.com/web-platform-tests/wpt.git ~/.cache/dashweb/wpt
    git -C ~/.cache/dashweb/wpt sparse-checkout set css/CSS2/normal-flow css/support css/CSS2/support fonts
). Se sirve por HTTP, se apuntan las pruebas con <link rel="match"> (las que esperan a JavaScript, reftest-wait,
fuera) y tools/wpt_reftest.dash las pinta en la máquina rtg y compara sus píxeles con los de la referencia. Escribe
cada resultado y el total; con --guardar, también docs/wpt/<carpeta>.txt (pasan / total y las que fallan).
"""
import argparse
import http.server
import os
import re
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DASH = Path(os.environ.get("DASH", Path.home() / "Projects" / "FreeMEMLang"))
WPT = Path(os.environ.get("WPT", Path.home() / ".cache" / "dashweb" / "wpt"))
PUERTO = 40880
sys.path.insert(0, str(DASH / "tools"))
sys.path.insert(0, str(ROOT / "tools"))
from emu_run import run_programs          # noqa: E402
from medir_visor import MAQUINAS          # noqa: E402

MATCH = re.compile(r'<link[^>]+rel=["\']?match["\']?[^>]*>', re.I)
HREF = re.compile(r'href=["\']([^"\']+)["\']', re.I)


def pares(carpeta):
    r = []
    for f in sorted((WPT / carpeta).iterdir()):
        if f.suffix not in (".html", ".htm", ".xht", ".xhtml") or "-ref" in f.stem or f.stem.endswith("ref"):
            continue
        try:
            t = f.read_text(errors="replace")
        except OSError:
            continue
        if "reftest-wait" in t:
            continue
        m = MATCH.search(t)
        if not m:
            continue
        h = HREF.search(m.group(0))
        if not h:
            continue
        ref = (f.parent / h.group(1)).resolve()
        if not ref.is_file():
            continue
        r.append((str(f.relative_to(WPT)), str(ref.relative_to(WPT.resolve()))))
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("carpeta")
    ap.add_argument("maximo", nargs="?", type=int, default=50)
    ap.add_argument("--desde", type=int, default=0)
    ap.add_argument("--guardar", action="store_true")
    a = ap.parse_args()
    todos = pares(a.carpeta)
    lote = todos[a.desde:a.desde + a.maximo]
    print(f"{len(todos)} pruebas en {a.carpeta}; estas: {len(lote)}", flush=True)
    (WPT / "dashweb-lista.txt").write_text("".join(f"{p} {r}\n" for p, r in lote))

    class Silencio(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *x, **k):
            super().__init__(*x, directory=str(WPT), **k)

        def log_message(self, *x):
            pass

        def guess_type(self, path):
            # (los .xht como HTML: dashweb los lee igual)
            return "text/html" if str(path).endswith((".xht", ".xhtml")) else super().guess_type(path)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PUERTO), Silencio)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    exe = Path("/tmp") / f"wpt_reftest_{os.getpid()}"
    try:
        r = subprocess.run([str(DASH / "dash"), "--fpu", str(ROOT / "tools" / "wpt_reftest.dash"), "-o", str(exe)],
                           cwd=DASH, capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(r.stdout + r.stderr)
        out = run_programs([str(exe)], timeout=60 + 25 * len(lote), kickstart=os.environ.get("DASH_KICKSTART_32"),
                           extra_config="bsdsocket_library = 1\n" + MAQUINAS["rtg"],
                           system=os.path.expanduser("~/.cache/dash-emu/sys32rtg38"),
                           args=[f"http://127.0.0.1:{PUERTO}/ dashweb-lista.txt"])[0]
    finally:
        srv.shutdown()
        if exe.exists():
            exe.unlink()
    lineas = [l for l in (out.output or "").splitlines() if l.startswith("WPT ")]
    print("\n".join(lineas))
    if a.guardar:
        dest = ROOT / "docs" / "wpt" / (a.carpeta.replace("/", "_") + ".txt")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text("\n".join(lineas) + "\n")
        print("guardado en", dest)


if __name__ == "__main__":
    main()
