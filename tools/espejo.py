#!/usr/bin/env python3
"""Un espejo local de una web para medir Tachyon con páginas reales sin red (tarea 76; el usuario, 2026-11-17: "que
Tachyon sea absurdamente más rápido que Amelinium"). Sirve por HTTP en 127.0.0.1:PUERTO lo de ORIGEN como si fuera
él: la primera vez que se pide una dirección la trae el PC (una vez) y la guarda en ~/.cache/dashweb/espejo/<sitio>/;
después la da siempre de ahí, también sin red. Lo de otros servidores que nombra la página (imágenes de
upload.wikimedia.org...) va por /__o/<servidor>/..., y las direcciones absolutas del texto (HTML, CSS, JS, JSON) se
cambian a esa forma. Con --sin-red, lo que no está guardado da 404 (para medir siempre lo mismo).

    tools/espejo.py https://es.wikipedia.org 40990            # sirve y guarda lo que falte
    tools/espejo.py https://es.wikipedia.org 40990 --sin-red  # solo lo guardado

En el emulador, Tachyon abre http://10.0.2.2:40990/wiki/Commodore_Amiga (o 127.0.0.1 con la red de FS-UAE). No es
para pruebas automáticas contra webs de otros: la copia se trae una vez y luego se mide contra ella.
"""
import argparse
import gzip
import hashlib
import http.server
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

AGENTE = "Mozilla/5.0 (AmigaOS; m68k) Tachyon/0.7"   # (el de navigator.userAgent: lo que pide la página depende de él)
TEXTO = ("text/", "application/javascript", "application/x-javascript", "application/json", "image/svg+xml",
         "application/xml")


def clave(servidor: str, ruta: str) -> str:
    return hashlib.sha256((servidor + " " + ruta).encode()).hexdigest()[:32]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("origen", help="https://servidor (lo que se sirve en la raíz)")
    ap.add_argument("puerto", type=int)
    ap.add_argument("--sin-red", action="store_true", help="solo lo guardado; lo demás, 404")
    a = ap.parse_args()
    o = urllib.parse.urlsplit(a.origen)
    principal = o.netloc
    esquema = o.scheme
    dir_ = Path.home() / ".cache" / "dashweb" / "espejo" / principal
    dir_.mkdir(parents=True, exist_ok=True)
    base_local = f"http://127.0.0.1:{a.puerto}"

    def reescribir(t: str) -> str:
        # https://principal/x -> /x; https://otro/x y //otro/x -> /__o/otro/x (también con \/ de JSON)
        t = re.sub(r"https?:(\\?/\\?/)" + re.escape(principal) + r"(?=[/\\\"' )?#]|$)", "", t)

        def otro(m):
            barra = m.group(1)
            sep = "\\/" if "\\" in barra else "/"
            return sep + "__o" + sep + m.group(2)
        t = re.sub(r"(?:https?:)?(\\?/\\?/)([a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,})(?=[/\\\"' )?#])", otro, t)
        return t

    def traer(servidor: str, ruta: str):
        f = dir_ / clave(servidor, ruta)
        if f.exists():
            m = json.loads((dir_ / (f.name + ".json")).read_text())
            return m["estado"], m["tipo"], f.read_bytes()
        if a.sin_red:
            return 404, "text/plain", b"no guardado"
        url = f"{esquema}://{servidor}{ruta}"
        pet = urllib.request.Request(url, headers={"User-Agent": AGENTE, "Accept-Encoding": "gzip"})
        try:
            with urllib.request.urlopen(pet, timeout=30) as r:
                estado, tipo, cuerpo = r.status, r.headers.get("Content-Type", ""), r.read()
                if r.headers.get("Content-Encoding") == "gzip":
                    cuerpo = gzip.decompress(cuerpo)
        except urllib.error.HTTPError as e:
            estado, tipo, cuerpo = e.code, e.headers.get("Content-Type", ""), e.read()
        except Exception as e:  # noqa: BLE001
            return 502, "text/plain", str(e).encode()
        if any(tipo.startswith(x) for x in TEXTO):
            cod = "utf-8"
            m = re.search(r"charset=([\w-]+)", tipo)
            if m:
                cod = m.group(1)
            try:
                cuerpo = reescribir(cuerpo.decode(cod)).encode(cod)
            except (UnicodeDecodeError, LookupError):
                pass
        f.write_bytes(cuerpo)
        (dir_ / (f.name + ".json")).write_text(json.dumps({"url": url, "estado": estado, "tipo": tipo}))
        print(f"guardado {estado} {url[:120]}", flush=True)
        return estado, tipo, cuerpo

    class H(http.server.BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_GET(self):
            ruta = self.path
            servidor = principal
            if ruta.startswith("/__o/"):
                resto = ruta[5:]
                servidor, _, ruta = resto.partition("/")
                ruta = "/" + ruta
            estado, tipo, cuerpo = traer(servidor, ruta)
            self.send_response(estado)
            self.send_header("Content-Type", tipo or "application/octet-stream")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(cuerpo)

        def log_message(self, *x):
            pass

    print(f"espejo de {a.origen} en {base_local} (copia en {dir_})", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", a.puerto), H).serve_forever()


if __name__ == "__main__":
    sys.exit(main())
