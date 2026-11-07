#!/usr/bin/env python3
"""Las pruebas de JavaScript de Web Platform Tests (testharness.js) de una carpeta, en el emulador (tarea 41d).

    tools/wpt_js.py dom/nodes [máximo] [--desde N] [--guardar] [--maquina rtg]

WPT va en ~/.cache/dashweb/wpt (como tools/wpt.py; esta pide además resources/ y la carpeta: git -C
~/.cache/dashweb/wpt sparse-checkout add resources common dom/nodes). Se sirve por HTTP con un
resources/testharnessreport.js propio, que al acabar deja el resultado en __dashweb_wpt; tools/wpt_testharness.dash
carga cada página con su JavaScript y lo escribe. Solo las .html que cargan testharness.js (las .any.js y .window.js,
que wptserve envuelve en una página, no; las .sub.html, que necesitan sus sustituciones, tampoco).

Las .any.js y .window.js van en la página que les haría wptserve (x.any.html con testharness.js, sus META script= y
el .js; las de global= sin window, no).

Escribe cada fichero (subpruebas que pasan / total, y el estado del harness) y el total como wpt.fyi: subpruebas que
pasan / subpruebas. Con --guardar, docs/wpt/js_<carpeta>.txt con el resumen y las subpruebas que fallan.
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
PUERTO = 40881
sys.path.insert(0, str(DASH / "tools"))
sys.path.insert(0, str(ROOT / "tools"))
from emu_run import run_programs          # noqa: E402
from medir_visor import MAQUINAS          # noqa: E402

# (el informe: cada subprueba y el total del fichero, en __dashweb_wpt; sin la tabla de resultados en la página)
INFORME = r"""
setup({output: false});
add_completion_callback(function (tests, status) {
    var ruta = String(location.pathname).replace(/^\//, '');
    var est = ['PASS', 'FAIL', 'TIMEOUT', 'NOTRUN', 'PRECONDITION_FAILED'];
    var harness = ['OK', 'ERROR', 'TIMEOUT', 'PRECONDITION_FAILED'];
    var pasan = 0, l = [];
    function una(t) { return String(t === undefined || t === null ? '' : t).replace(/\s+/g, ' ').slice(0, 160); }
    tests.forEach(function (t) {
        if (t.status === 0) pasan++;
        l.push('WPT SUB ' + (est[t.status] || t.status) + ' ' + ruta + ' | ' + una(t.name) + (t.status ? ' | ' + una(t.message) : ''));
    });
    l.push('WPT FILE ' + ruta + ' ' + pasan + '/' + tests.length + ' ' + (harness[status.status] || status.status) +
           (status.status ? ' ' + una(status.message) : ''));
    window.__dashweb_wpt = l.join('\n');
});
"""


def pruebas(carpeta):
    r = []
    for f in sorted((WPT / carpeta).iterdir()):
        # las .any.js y .window.js, en la página que les haría wptserve (x.any.html, x.window.html; una por variante)
        if f.name.endswith((".any.js", ".window.js")) and ".sub." not in f.name:
            meta = _meta(f)
            globales = ",".join(meta.get("global", ["window"])) if f.name.endswith(".any.js") else "window"
            if "window" not in globales.split(",") and f.name.endswith(".any.js") and meta.get("global"):
                continue
            pagina = str(f.relative_to(WPT))[:-3] + ".html"
            for v in meta.get("variant", [""]):
                r.append(pagina + v)
            continue
        if f.suffix not in (".html", ".htm") or ".sub." in f.name or "-ref" in f.stem:
            continue
        try:
            t = f.read_text(errors="replace")
        except OSError:
            continue
        if "testharness.js" in t:
            r.append(str(f.relative_to(WPT)))
    return r


def _meta(f):
    """Las líneas // META: clave=valor del principio de un .any.js o .window.js"""
    m = {}
    for l in f.read_text(errors="replace").splitlines():
        x = re.match(r"\s*//\s*META:\s*(\w+)=(.*)$", l)
        if x:
            m.setdefault(x.group(1), []).append(x.group(2).strip())
        elif l.strip() and not l.strip().startswith("//"):
            break
    return m


def _envoltorio(ruta):
    """La página de un .any.js o .window.js (ruta: /url/x.any.html), como la hace wptserve; None si no es una"""
    if not ruta.endswith((".any.html", ".window.html")):
        return None
    js = WPT / (ruta.lstrip("/")[:-5] + ".js")
    if not js.is_file():
        return None
    meta = _meta(js)
    partes = ["<!doctype html>", "<meta charset=utf-8>", f"<title>{(meta.get('title') or [js.name])[0]}</title>",
              "<script>self.GLOBAL = {isWindow: function () { return true; }, isWorker: function () { return false; },"
              " isShadowRealm: function () { return false; }};</script>",
              '<script src="/resources/testharness.js"></script>', '<script src="/resources/testharnessreport.js"></script>']
    for sc in meta.get("script", []):
        partes.append(f'<script src="{sc}"></script>')
    partes.append('<div id=log></div>')
    partes.append(f'<script src="/{js.relative_to(WPT)}"></script>')
    return "\n".join(partes).encode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("carpeta")
    ap.add_argument("maximo", nargs="?", type=int, default=40)
    ap.add_argument("--desde", type=int, default=0)
    ap.add_argument("--guardar", action="store_true")
    ap.add_argument("--salida", action="store_true", help="también lo demás que escribe el emulador (para ver un cuelgue)")
    ap.add_argument("--maquina", default="rtg", choices=sorted(MAQUINAS))
    a = ap.parse_args()
    todas = pruebas(a.carpeta)
    lote = todas[a.desde:a.desde + a.maximo]
    print(f"{len(todas)} pruebas de testharness en {a.carpeta}; estas: {len(lote)}", flush=True)
    (WPT / "dashweb-lista-js.txt").write_text("".join(p + "\n" for p in lote))

    class Servidor(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *x, **k):
            super().__init__(*x, directory=str(WPT), **k)

        def log_message(self, *x):
            pass

        def do_GET(self):
            if self.path.split("?")[0] == "/resources/testharnessreport.js":
                cuerpo = INFORME.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript")
                self.send_header("Content-Length", str(len(cuerpo)))
                self.end_headers()
                self.wfile.write(cuerpo)
                return
            env = _envoltorio(self.path.split("?")[0])
            if env is not None:
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(env)))
                self.end_headers()
                self.wfile.write(env)
                return
            super().do_GET()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PUERTO), Servidor)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    exe = Path("/tmp") / f"wpt_testharness_{os.getpid()}"
    try:
        r = subprocess.run([str(DASH / "dash"), "--fpu", str(ROOT / "tools" / "wpt_testharness.dash"), "-o", str(exe)],
                           cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(r.stdout + r.stderr)
        out = run_programs([str(exe)], timeout=120 + 30 * len(lote), kickstart=os.environ.get("DASH_KICKSTART_32"),
                           extra_config="bsdsocket_library = 1\n" + MAQUINAS[a.maquina],
                           system=os.path.expanduser("~/.cache/dash-emu/sys32rtg38"),
                           args=[f"http://127.0.0.1:{PUERTO}/ dashweb-lista-js.txt"])[0]
    finally:
        srv.shutdown()
        if exe.exists():
            exe.unlink()
    if a.salida:
        print((out.output or "")[-4000:])
    lineas = [l for l in (out.output or "").replace("\r", "").splitlines() if l.startswith("WPT ")]
    ficheros = [l for l in lineas if l.startswith("WPT FILE ")]
    pasan = total = 0
    for l in ficheros:
        m = re.match(r"WPT FILE \S+ (\d+)/(\d+)", l)
        if m:
            pasan += int(m.group(1))
            total += int(m.group(2))
    hechos = len(ficheros)
    resumen = f"WPT TOTAL {a.carpeta}: {pasan}/{total} subpruebas en {hechos} de {len(lote)} ficheros"
    print("\n".join(ficheros))
    print(resumen)
    if not any(l == "WPT FIN" for l in lineas):
        print("aviso: no acabó (timeout del emulador o se colgó)")
    if a.guardar:
        dest = ROOT / "docs" / "wpt" / ("js_" + a.carpeta.replace("/", "_") + ".txt")
        dest.parent.mkdir(parents=True, exist_ok=True)
        fallan = [l for l in lineas if l.startswith("WPT SUB ") and not l.startswith("WPT SUB PASS ")]
        dest.write_text(resumen + "\n\n" + "\n".join(ficheros) + "\n\n" + "\n".join(fallan) + "\n")
        print("guardado en", dest)


if __name__ == "__main__":
    main()
