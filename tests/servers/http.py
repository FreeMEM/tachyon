#!/usr/bin/env python3
"""Test HTTP server for test_http: one route per case (length, chunked, close, UTF-8,
redirects, loop, 404). Usage: http.py PORT [tls|tls-lento]  (tls: HTTPS with a certificate
for 127.0.0.1 signed by the test CA of Dash's tools/emu_sys_amissl.sh; tls-lento: the same, waiting 4 s (or
$TLS_LENTO_S) before the handshake)"""
import socketserver
import sys

PORT = int(sys.argv[1])
CAFE = "café".encode("utf-8")
LARGO = ("".join(f"linea {i} de dashweb\n" for i in range(3000)) + "café").encode("utf-8")
BINARIO = bytes(i * 7 % 256 for i in range(20000))     # every byte value, 0 included


def reply(status, headers, body=b"", raw=None):
    head = f"HTTP/1.1 {status}\r\n" + "".join(f"{k}: {v}\r\n" for k, v in headers) + "\r\n"
    return head.encode("latin-1") + (raw if raw is not None else body)


ROUTES = {
    "/hola": reply("200 OK", [("Content-Type", "text/plain"), ("Content-Length", "4")], b"hola"),
    "/chunked": reply("200 OK", [("Content-Type", "text/html; charset=UTF-8"), ("Transfer-Encoding", "chunked")],
                      raw=b"3\r\nuno\r\n3\r\ndos\r\nA\r\ntres-cuatr\r\n0\r\nX-Fin: si\r\n\r\n"),
    "/utf8": reply("200 OK", [("Content-Type", 'text/html; charset="utf-8"'), ("Content-Length", str(len(CAFE)))], CAFE),
    "/redir": reply("302 Found", [("Location", "/hola"), ("Content-Length", "0")]),
    "/redir2": reply("301 Moved", [("Location", f"http://127.0.0.1:{PORT}/redir"), ("Content-Length", "0")]),
    "/bucle": reply("302 Found", [("Location", "/bucle"), ("Content-Length", "0")]),
    "/estilo.css": reply("200 OK", [("Content-Type", "text/css"), ("Content-Length", "37")],
                         b'@import "imp.css"; p { color: teal }\n'),
    "/imp.css": reply("200 OK", [("Content-Type", "text/css"), ("Content-Length", "20")], b"em { color: olive }\n"),
    "/binario": reply("200 OK", [("Content-Type", "application/octet-stream"),
                                 ("Content-Length", str(len(BINARIO)))], BINARIO),
    "/binario_chunked": reply("200 OK", [("Content-Type", "application/octet-stream"),
                                         ("Transfer-Encoding", "chunked")],
                              raw=b"".join(b"%X\r\n" % len(BINARIO[i:i + 3000]) + BINARIO[i:i + 3000] + b"\r\n"
                                           for i in range(0, len(BINARIO), 3000)) + b"0\r\n\r\n"),
    "/no": reply("404 Not Found", [("Content-Type", "text/plain"), ("Content-Length", "2"),
                                   ("Set-Cookie", "a=1"), ("Set-Cookie", "b=2")], b"no"),
}


CONEXIONES = [0]     # connections served so far (for /conexion)


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        # several requests on one connection while the client asks for it (Connection: keep-alive)
        CONEXIONES[0] += 1
        self.conexion = CONEXIONES[0]
        self.peticiones = 0
        while self.una():
            pass

    def una(self):
        line = self.rfile.readline().decode("latin-1")
        if not line:
            return False
        self.peticiones += 1
        length = 0
        seguir = False
        self.acepta = ""
        self.galletas = ""
        self.prueba = ""
        self.tipo = ""
        self.idiomas = "-"
        while True:
            header = self.rfile.readline()
            if header in (b"\r\n", b"\n", b""):
                break
            if header.lower().startswith(b"content-length:"):
                length = int(header.split(b":", 1)[1])
            if header.lower().startswith(b"cookie:"):
                self.galletas = header.split(b":", 1)[1].strip().decode("latin-1")
            if header.lower().startswith(b"x-prueba:"):
                self.prueba = header.split(b":", 1)[1].strip().decode("latin-1")
            if header.lower().startswith(b"content-type:"):
                self.tipo = header.split(b":", 1)[1].strip().decode("latin-1")
            if header.lower().startswith(b"accept-language:"):
                self.idiomas = header.split(b":", 1)[1].strip().decode("latin-1")
            if header.lower().startswith(b"accept-encoding:"):
                self.acepta = header.split(b":", 1)[1].strip().decode("latin-1")
            if header.lower().replace(b" ", b"").startswith(b"connection:keep-alive"):
                seguir = True
        body = self.rfile.read(length) if length else b""
        path = line.split(" ")[1] if " " in line else "/"
        if path == "/conexion":     # which connection and which request on it: "c2 r3"
            data = f"c{self.conexion} r{self.peticiones}".encode()
            self.wfile.write(reply("200 OK", [("Content-Length", str(len(data)))], data))
            self.wfile.flush()
            return seguir
        if path == "/cerrar_tras":  # a length-delimited answer and then the server closes (an idle keep-alive)
            self.wfile.write(reply("200 OK", [("Content-Length", "2")], b"ok"))
            self.wfile.flush()
            return False
        self.responder(line, path, body)
        self.wfile.flush()
        return seguir and path != "/cerrar"     # (its body ends when the connection closes)

    def responder(self, line, path, body):
        if path == "/cerrar":       # no length: the body ends when the connection closes
            self.wfile.write(b"HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\n\r\n" + b"z" * 5000)
            return
        if path == "/lento":        # half the body, a pause, the other half: progress can be seen
            import time
            self.wfile.write(b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2000\r\n\r\n" + b"a" * 1000)
            self.wfile.flush()
            time.sleep(1.5)
            self.wfile.write(b"b" * 1000)
            return
        if path.startswith("/goteo/"):     # a file of tests/pages: 64 KB, a pause, the rest (a video that starts
            import os                      # playing while it downloads; GOTEO_S seconds, 3 by default)
            import time
            f = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pages", os.path.basename(path))
            if os.path.isfile(f):
                data = open(f, "rb").read()
                self.wfile.write(reply("200 OK", [("Content-Type", "video/mp4"), ("Content-Length", str(len(data)))],
                                       data[:65536]))
                self.wfile.flush()
                time.sleep(float(os.environ.get("GOTEO_S", "3")))
                self.wfile.write(data[65536:])
                return
        if path.startswith("/act/"):       # a pretend GitHub for the updater (lib/actualizar.dash): the releases
            import gzip, os                    # (v9.9.0-alfa first) and its Tachyon.gz, a tiny hunk file with a $VER;
            exe = b"\x00\x00\x03\xf3" + b"\x00" * 60 + b"$VER: Tachyon 9.9.0-alfa (1.1.2030)\x00" + b"x" * 200
            if os.environ.get("ACT_EXE"):          # (or a real one, to try Reiniciar)
                exe = open(os.environ["ACT_EXE"], "rb").read()
            if path in ("/act/releases", "/act/roto/releases"):     # roto: its Tachyon.gz comes with a bad CRC
                base = f"http://127.0.0.1:{PORT}" + ("/act/roto" if "roto" in path else "/act")
                data = ('[{"url":"x","tag_name":"v9.9.0-alfa","draft":false,"prerelease":true,"assets":['
                        '{"name":"tachyon.lha","browser_download_url":"' + base + '/tachyon.lha"},'
                        '{"name":"Tachyon.gz","browser_download_url":"' + base + '/Tachyon.gz"},'
                        '{"name":"Tachyon-espanol.catalog","browser_download_url":"' + base + '/Tachyon-espanol.catalog"}],"body":"a"},'
                        '{"url":"y","tag_name":"v0.4.0-alfa","assets":[]}]').encode()
                kind = "application/json; charset=utf-8"
            elif path.endswith("/Tachyon-espanol.catalog"):     # (a catalog: an IFF FORM CTLG with its LANG, as GitHub
                import struct                                  # names it: without accents; also /act/v<version>/...)
                lang = "español".encode("latin-1") + b"\0"
                body = b"CTLG" + b"LANG" + struct.pack(">I", len(lang)) + lang
                data, kind = b"FORM" + struct.pack(">I", len(body)) + body, "application/octet-stream"
            elif path.endswith(".catalog"):
                self.wfile.write(reply("404 Not Found", [("Content-Length", "0")], b""))
                return
            elif path in ("/act/Tachyon.gz", "/act/roto/Tachyon.gz"):
                data = bytearray(gzip.compress(exe, mtime=0))
                if "roto" in path:
                    data[-6] ^= 0x55
                data, kind = bytes(data), "application/octet-stream"
            else:
                data, kind = b"", "text/plain"
            self.wfile.write(reply("200 OK", [("Content-Type", kind), ("Content-Length", str(len(data)))], data))
            return
        if path.startswith("/pages/"):     # files of tests/pages
            import os
            f = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pages", os.path.basename(path))
            if os.path.isfile(f):
                data = open(f, "rb").read()
                kinds = {".css": "text/css", ".png": "image/png", ".gif": "image/gif", ".iff": "image/x-ilbm",
                         ".jpg": "image/jpeg", ".txt": "text/plain", ".ttf": "font/ttf"}
                kind = kinds.get(os.path.splitext(f)[1], "text/html; charset=utf-8")
                self.wfile.write(reply("200 OK", [("Content-Type", kind), ("Content-Length", str(len(data)))], data))
                return
        if path.startswith("/woff/"):      # the .ttf of tests/pages as WOFF 1.0, made now (not kept in the repo)
            import os
            f = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pages",
                             os.path.splitext(os.path.basename(path))[0] + ".ttf")
            if os.path.isfile(f):
                data = woff(open(f, "rb").read())
                self.wfile.write(reply("200 OK", [("Content-Type", "font/woff"), ("Content-Length", str(len(data)))], data))
                return
        if path == "/eco_idioma":   # the Accept-Language it sent ("-" without one)
            data = self.idiomas.encode("latin-1")
            self.wfile.write(reply("200 OK", [("Content-Length", str(len(data)))], data))
            return
        if path.split("?")[0] == "/eco":   # what the client sent, to check the request (and a POST's body)
            data = line.encode("latin-1") + body
            self.wfile.write(reply("200 OK", [("Content-Length", str(len(data)))], data))
            return
        if path.startswith("/comprimido/"):     # LARGO compressed as asked (gzip, gzip_chunked, deflate,
            import gzip                         # deflate_crudo) if the request accepts gzip; if not, as is
            import zlib
            modo = path.split("/")[2]
            data, cabeceras = LARGO, [("Content-Type", "text/plain; charset=utf-8")]
            if modo == "gzip_grande":           # 600 KB que comprimidos ocupan mucho menos de su cuarta parte
                data = b"linea de dashweb\n" * 36000 + "café".encode("utf-8")
            if "gzip" in self.acepta:
                if modo.startswith("gzip"):
                    data = gzip.compress(data, mtime=0)
                    data = data[:3] + bytes([data[3] | 8]) + data[4:10] + b"largo.txt\0" + data[10:]   # with FNAME
                    cabeceras.append(("Content-Encoding", "gzip"))
                elif modo == "deflate":
                    data = zlib.compress(LARGO)
                    cabeceras.append(("Content-Encoding", "deflate"))
                else:
                    o = zlib.compressobj(wbits=-15)
                    data = o.compress(LARGO) + o.flush()
                    cabeceras.append(("Content-Encoding", "deflate"))
            if modo == "gzip_chunked":
                cabeceras.append(("Transfer-Encoding", "chunked"))
                raw = b"".join(b"%X\r\n" % len(data[i:i + 700]) + data[i:i + 700] + b"\r\n"
                               for i in range(0, len(data), 700)) + b"0\r\n\r\n"
                self.wfile.write(reply("200 OK", cabeceras, raw=raw))
            else:
                self.wfile.write(reply("200 OK", cabeceras + [("Content-Length", str(len(data)))], data))
            return
        if path == "/galletas/dar":     # cookies: one for the session, one that lasts, one for another path, a
            cab = [("Content-Length", "2"),  # Secure one (not over http) and a redirect that sets one more
                   ("Set-Cookie", "sesion=abc; Path=/"),
                   ("Set-Cookie", "dura=1; Path=/; Expires=Wed, 21 Oct 2099 07:28:00 GMT; HttpOnly"),
                   ("Set-Cookie", "otra=2; Path=/otra"),
                   ("Set-Cookie", "segura=3; Path=/; Secure")]
            self.wfile.write(reply("200 OK", cab, b"ok"))
            return
        if path == "/galletas/borrar":  # Max-Age=0 removes one
            self.wfile.write(reply("200 OK", [("Content-Length", "2"), ("Set-Cookie", "sesion=; Max-Age=0; Path=/")], b"ok"))
            return
        if path == "/galletas/salto":   # a redirect that sets a cookie on the way
            self.wfile.write(reply("302 Found", [("Location", "/galletas/ver"), ("Content-Length", "0"),
                                                 ("Set-Cookie", "salto=si; Path=/")]))
            return
        if path.startswith("/galletas/ver") or path.startswith("/otra"):     # the Cookie header the client sent
            data = self.galletas.encode("latin-1")
            self.wfile.write(reply("200 OK", [("Content-Length", str(len(data)))], data))
            return
        if path == "/eco_js":       # what the JavaScript sent (XMLHttpRequest, fetch), as JSON (with a non-ASCII letter)
            import json
            data = json.dumps({"metodo": line.split(" ")[0], "prueba": self.prueba, "tipo": self.tipo,
                               "cuerpo": body.decode("utf-8", "replace"), "letra": "ñ"}, ensure_ascii=False).encode("utf-8")
            self.wfile.write(reply("200 OK", [("Content-Type", "application/json; charset=utf-8"),
                                              ("X-Respuesta", "si"), ("Content-Length", str(len(data)))], data))
            return
        if path == "/acepta":       # the Accept-Encoding the client sent
            data = self.acepta.encode("latin-1")
            self.wfile.write(reply("200 OK", [("Content-Length", str(len(data)))], data))
            return
        if path == "/tras_post" and line.startswith("POST"):   # 303 to a GET, as after a form
            self.wfile.write(reply("303 See Other", [("Location", "/eco?visto=1"), ("Content-Length", "0")]))
            return
        self.wfile.write(ROUTES.get(path, ROUTES["/no"]))


def woff(ttf: bytes) -> bytes:
    """A TrueType font as WOFF 1.0: the same tables, each one with zlib if that makes it smaller"""
    import struct, zlib
    flavor, n = struct.unpack(">IH", ttf[:6])
    tablas = []
    for i in range(n):
        tag, suma, off, largo = struct.unpack(">4sIII", ttf[12 + 16 * i:28 + 16 * i])
        tablas.append((tag, suma, ttf[off:off + largo]))
    pad = lambda b: b + b"\0" * (-len(b) % 4)
    total = 12 + 16 * n + sum(len(pad(t[2])) for t in tablas)
    cuerpo, directorio = b"", b""
    inicio = 44 + 20 * n
    for tag, suma, datos in tablas:
        z = zlib.compress(datos)
        guardado = z if len(z) < len(datos) else datos
        directorio += struct.pack(">4sIIII", tag, inicio + len(cuerpo), len(guardado), len(datos), suma)
        cuerpo += pad(guardado)
    largo = inicio + len(cuerpo)
    return struct.pack(">4sIIHHIHHIIIII", b"wOFF", flavor, largo, n, 0, total, 1, 0, 0, 0, 0, 0, 0) + directorio + cuerpo


def tls_context():
    import os
    import ssl
    import subprocess
    import tempfile
    from pathlib import Path
    ca = Path(os.path.expanduser("~/.cache/dash-amissl/testca"))
    tmp = Path(tempfile.mkdtemp(prefix="dashweb_tls_"))
    subprocess.run(["openssl", "req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=localhost",
                    "-keyout", tmp / "srv.key", "-out", tmp / "srv.csr"], check=True, capture_output=True)
    (tmp / "ext.cnf").write_text("subjectAltName=DNS:localhost,IP:127.0.0.1\n")
    subprocess.run(["openssl", "x509", "-req", "-in", tmp / "srv.csr", "-CA", ca / "ca.pem", "-CAkey", ca / "ca.key",
                    "-CAcreateserial", "-CAserial", tmp / "ca.srl", "-days", "2", "-extfile", tmp / "ext.cnf",
                    "-out", tmp / "srv.pem"], check=True, capture_output=True)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(tmp / "srv.pem", tmp / "srv.key")
    return context


class TLSServer(socketserver.ThreadingTCPServer):
    # the handshake goes in the connection's thread: with "tls-lento" it waits TLS_LENTO seconds first
    def get_request(self):
        sock, addr = super().get_request()
        return CONTEXT.wrap_socket(sock, server_side=True, do_handshake_on_connect=False), addr

    def handle_error(self, request, client_address):
        pass


class TLSHandler(Handler):
    def setup(self):
        if TLS_LENTO:
            time.sleep(TLS_LENTO)
        self.request.do_handshake()
        super().setup()


socketserver.ThreadingTCPServer.allow_reuse_address = True
if len(sys.argv) > 2 and sys.argv[2] in ("tls", "tls-lento"):
    import time
    import os
    TLS_LENTO = float(os.environ.get("TLS_LENTO_S", "4")) if sys.argv[2] == "tls-lento" else 0
    CONTEXT = tls_context()
    TLSServer(("127.0.0.1", PORT), TLSHandler).serve_forever()
else:
    socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler).serve_forever()
