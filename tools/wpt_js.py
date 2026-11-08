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
setup({output: false, timeout_multiplier: 5});  // (el emulador es lento: como hace wptrunner con las plataformas lentas)
add_completion_callback(function (tests, status) {
    var ruta = String(location.pathname).replace(/^\//, '');
    var est = ['PASS', 'FAIL', 'TIMEOUT', 'NOTRUN', 'PRECONDITION_FAILED'];
    var harness = ['OK', 'ERROR', 'TIMEOUT', 'PRECONDITION_FAILED'];
    var pasan = 0, l = [];
    // (en una línea y sin caracteres de control: un nulo en el nombre de una subprueba cortaba el informe entero, que
    // pasa por textos de C; url-origin, a-element)
    function una(t) { return String(t === undefined || t === null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').slice(0, 160); }
    tests.forEach(function (t) {
        if (t.status === 0) pasan++;
        l.push('WPT SUB ' + (est[t.status] || t.status) + ' ' + ruta + ' | ' + una(t.name) + (t.status ? ' | ' + una(t.message) : ''));
    });
    l.push('WPT FILE ' + ruta + ' ' + pasan + '/' + tests.length + ' ' + (harness[status.status] || status.status) +
           (status.status ? ' ' + una(status.message) : ''));
    window.__dashweb_wpt = l.join('\n');
});
"""


def _manejador(camino, metodo="GET", cabeceras=None, cuerpo=b""):
    """Un .py de wptserve (def main(request, response)) de la copia de WPT, con lo que usan los de las carpetas pasadas:
    request.method, GET, POST, headers, body, url; response.headers.set/append, status, content y writer; y lo que
    devuelve main (texto, (cabeceras, cuerpo) o (estado, cabeceras, cuerpo)). None si no es uno."""
    import types
    import urllib.parse
    ruta, _, consulta = camino.partition("?")
    f = WPT / urllib.parse.unquote(ruta).lstrip("/")
    if f.suffix != ".py" or not f.is_file():
        return None
    def b(x):
        return x.encode("latin-1") if isinstance(x, str) else x
    def t(x):
        return x.decode("latin-1") if isinstance(x, bytes) else str(x)
    utiles = types.ModuleType("wptserve.utils")
    utiles.isomorphic_decode = lambda x: x.decode("latin-1") if isinstance(x, bytes) else x
    utiles.isomorphic_encode = lambda x: x.encode("latin-1") if isinstance(x, str) else x
    wptserve = types.ModuleType("wptserve")
    wptserve.utils = utiles
    sys.modules.setdefault("wptserve", wptserve)
    sys.modules.setdefault("wptserve.utils", utiles)

    class Tabla:
        def __init__(self, pares):
            self.d = {}
            for k, v in pares:
                self.d.setdefault(t(k).lower() if self.minus else t(k), []).append(b(v))
        minus = False
        def first(self, k, defecto=None):
            k = t(k).lower() if self.minus else t(k)
            return self.d[k][0] if k in self.d else defecto
        def get(self, k, defecto=None):
            return self.first(k, defecto)
        def get_list(self, k):
            return self.d.get(t(k).lower() if self.minus else t(k), [])
        def __contains__(self, k):
            return (t(k).lower() if self.minus else t(k)) in self.d
        def __getitem__(self, k):
            v = self.first(k)
            if v is None:
                raise KeyError(k)
            return v
        def keys(self):
            return [b(k) for k in self.d]
        def items(self):
            return [(b(k), v[0]) for k, v in self.d.items()]
        def __iter__(self):
            return iter(self.keys())

    class Cabeceras(Tabla):
        minus = True

    cab = Cabeceras(list((cabeceras or {}).items()))
    tipo = t(cab.first("content-type", b""))
    post = urllib.parse.parse_qsl(cuerpo.decode("latin-1"), keep_blank_values=True) if "urlencoded" in tipo else []

    class Respuesta(list):
        def set(self, k, v):
            k = t(k)
            self[:] = [(a, c) for a, c in self if a.lower() != k.lower()]
            self.append((k, t(v)))
        def append_header(self, k, v):
            self.append((t(k), t(v)))
        def get(self, k, defecto=None):
            for a, c in self:
                if a.lower() == t(k).lower():
                    return b(c)
            return defecto
        def __contains__(self, k):
            return any(a.lower() == t(k).lower() for a, c in self) if isinstance(k, (str, bytes)) else list.__contains__(self, k)

    salida = {"escrito": None}

    class Escritor:
        def __init__(self, r):
            self.r = r
            self.partes = []
        def write_status(self, code, message=None):
            self.r.status = code
        def write_header(self, k, v):
            self.r.headers.append((t(k), t(v)))
        def end_headers(self):
            pass
        def write_content(self, x):
            self.partes.append(b(x))
        def write(self, x):
            self.partes.append(b(x))
        def flush(self):
            pass

    u = urllib.parse.urlsplit("http://127.0.0.1:%d%s" % (PUERTO, camino))
    peticion = types.SimpleNamespace(method=metodo, GET=Tabla(urllib.parse.parse_qsl(consulta, keep_blank_values=True)),
                                     POST=Tabla(post), headers=cab, body=cuerpo, url=u.geturl(), url_parts=u,
                                     raw_headers=types.SimpleNamespace(raw_items=lambda: list((cabeceras or {}).items())),
                                     cookies={}, server=types.SimpleNamespace(stash=None))
    respuesta = types.SimpleNamespace(headers=Respuesta(), status=200, content=None)
    respuesta.writer = Escritor(respuesta)
    salida["escrito"] = respuesta.writer
    espacio = {"__name__": "wpt_manejador", "__file__": str(f)}
    try:
        exec(compile(f.read_text(encoding="utf-8"), str(f), "exec"), espacio)
        r = espacio["main"](peticion, respuesta)
    except Exception as e:
        return 500, [("Content-Type", "text/plain")], ("manejador: %s" % e).encode(), None
    estado, extra = respuesta.status, []
    if isinstance(r, tuple):
        if len(r) == 3:
            estado, extra, r = r
        else:
            extra, r = r
    for k, v in extra:
        respuesta.headers.append((t(k), t(v)))
    razon = None
    if isinstance(estado, tuple):
        estado, razon = estado[0], t(estado[1]) if len(estado) > 1 else None
    if r is None:
        r = respuesta.content if respuesta.content is not None else b"".join(respuesta.writer.partes)
    if isinstance(r, list):
        r = b"".join(b(x) for x in r)
    if not any(k.lower() == "content-type" for k, _ in respuesta.headers):
        respuesta.headers.append(("Content-Type", "text/html"))
    cuerpo_r = r.encode("utf-8") if isinstance(r, str) else (r or b"")
    return int(estado), list(respuesta.headers), cuerpo_r, razon


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

        def _metodo(self, metodo):
            n = int(self.headers.get("Content-Length") or 0)
            cuerpo = self.rfile.read(n) if n else b""
            py = _manejador(self.path, metodo, dict(self.headers.items()), cuerpo)
            if py is None:
                if metodo == "HEAD":
                    return super().do_HEAD()
                self.send_response(405)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            estado, cabeceras, salida, razon = py
            self.send_response(estado, razon)
            for k, v in cabeceras:
                self.send_header(k, v)
            if not any(k.lower() == "content-length" for k, _ in cabeceras):
                self.send_header("Content-Length", str(len(salida)))
            self.end_headers()
            if metodo != "HEAD":
                self.wfile.write(salida)

        def __getattr__(self, nombre):
            # (cualquier otro método, como los inventados de los tests de xhr: al manejador .py)
            if nombre.startswith("do_"):
                return lambda: self._metodo(nombre[3:])
            raise AttributeError(nombre)

        def do_POST(self):
            self._metodo("POST")

        def do_PUT(self):
            self._metodo("PUT")

        def do_DELETE(self):
            self._metodo("DELETE")

        def do_OPTIONS(self):
            self._metodo("OPTIONS")

        def do_HEAD(self):
            self._metodo("HEAD")

        def do_GET(self):
            if self.path.split("?")[0] == "/resources/testharnessreport.js":
                cuerpo = INFORME.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript")
                self.send_header("Content-Length", str(len(cuerpo)))
                self.end_headers()
                self.wfile.write(cuerpo)
                return
            py = _manejador(self.path, "GET", dict(self.headers.items()))
            if py is not None:
                estado, cabeceras, cuerpo, razon = py
                self.send_response(estado, razon)
                for k, v in cabeceras:
                    self.send_header(k, v)
                if not any(k.lower() == "content-length" for k, _ in cabeceras):
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
        out = run_programs([str(exe)], timeout=120 + 70 * len(lote), kickstart=os.environ.get("DASH_KICKSTART_32"),
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
