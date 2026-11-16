#!/usr/bin/env python3
"""Tachyon (comm/www) y Trasfondo (util/moni) en Aminet: build/aminet/<Nombre>.lha y <Nombre>.readme, y con --subir,
por FTP anónimo a main.aminet.net /new (el formulario web de Aminet estaba en mantenimiento, 2026-11-16).

    tools/aminet.py tachyon --novedades notas_en.txt            # prepara y comprueba, sin subir
    tools/aminet.py tachyon --novedades notas_en.txt --subir    # y lo sube (solo con el visto bueno del usuario)
    tools/aminet.py trasfondo --lha trasfondo-2.9.5.lha --version 2.9.5 --novedades notas_en.txt

Reglas de Aminet (wiki.aminet.net/Uploading_instructions y The_Readme_file): el .readme y el archivo con el mismo
nombre (30 caracteres como máximo con la extensión); el mismo nombre que la vez anterior sustituye a la versión vieja;
Short: la primera línea, 40 caracteres como máximo, sin versión ni plataforma; Uploader: un correo legible; líneas de
78 caracteres como máximo y solo LF. Y como mucho una subida por semana: Tachyon saca versión casi a diario, así que
en Aminet va la última de la semana. --novedades: lo nuevo de esta versión, en inglés (texto suelto; se ajusta a 78).
El paquete de Tachyon es build/tachyon.lha de tools/paquete.sh; el de Trasfondo, el .lha de su release de GitHub
(--lha), tal cual los dos.
"""
import argparse
import ftplib
import re
import shutil
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUBIDOR = "aminet@freemem.space (FreeMEM)"   # (el usuario, 2026-11-16: un buzón propio para Aminet)
SERVIDOR = "main.aminet.net"

PERFILES = {
    "tachyon": {
        "nombre": "Tachyon",
        "cabecera": [
            ("Short", "Modern web browser with JavaScript"),
            ("Author", "FreeMEM"),
            ("Uploader", SUBIDOR),
            ("Type", "comm/www"),
            ("Version", None),            # (la de src/dashweb.dash, o --version)
            ("Requires", "68020+FPU, MUI 3.8 or 5, AmiSSL 5, TCP/IP stack"),
            ("Architecture", "m68k-amigaos >= 3.0.0"),
            ("Distribution", "Aminet"),
            ("Kurz", "Moderner Webbrowser mit JavaScript"),
        ],
        "descripcion": """\
Tachyon is a web browser for the classic Amiga (AmigaOS 3.x), written in Dash
(https://github.com/FreeMEM/dash) with an MUI interface (MUI 3.8 or 5). It
opens today's web: HTML5, modern CSS (Flexbox, Grid, transforms, animations,
web fonts), JavaScript (QuickJS, ES2023) and HTTPS with AmiSSL 5, which
verifies certificates. It scores 100/100 on Acid3.

Features: tabs, bookmarks, history with search, downloads, cookies, reader
mode, an ARexx port, YouTube videos inside the page, opening archives with
the system's tools, nine languages (catalogs) and one-click updates from
within the browser.

It is an alpha: some pages are slow or do not look right yet. Project ->
Send debug report... sends what Tachyon noted down (you see it all first).

Requirements:
- AmigaOS 3.2 (or 3.5/3.9) for images: they are shown with
  picture.datatype V43. On 3.0 or 3.1 pages work, without images.
- A 68020 or better WITH an FPU, or a 68040/68060. Best: a fast
  accelerator, PiStorm (Emu68) or emulation with JIT, and a graphics card.
- MUI 3.8 or 5, AmiSSL 5 for HTTPS, and a TCP/IP stack (bsdsocket.library).
- Fast RAM: simple pages fit in a few MB; today's pages with JavaScript
  need tens of MB.

Installation: unpack the archive and run "Instalar" with the Installer, or
copy the Tachyon drawer anywhere. The documentation in the archive (LEEME)
is in Spanish; the program speaks your language through its catalogs.

Source code (MIT licence), issues and every release:
https://github.com/FreeMEM/tachyon
Website: https://tachyon.freemem.space

Tachyon includes QuickJS (MIT), fdlibm (Sun), Hubbub and LibParserUtils from
NetSurf (MIT), libwebp (BSD), nanosvg (zlib), stb_image and stb_truetype
(public domain), TJpgDec (ChaN), MintVID (MIT), Brotli (MIT), Ryu (Apache
2.0/Boost) and Lucide icons (ISC). Their licences are in Licencias/.
"""
    },
    "trasfondo": {
        "nombre": "Trasfondo",
        "cabecera": [
            ("Short", "Resource monitor on the WB backdrop"),
            ("Author", "FreeMEM"),
            ("Uploader", SUBIDOR),
            ("Type", "util/moni"),
            ("Version", None),
            ("Requires", "Workbench running, any 68k"),
            ("Architecture", "m68k-amigaos >= 3.0.0"),
            ("Distribution", "Aminet"),
            ("Kurz", "Systemmonitor auf dem WB-Hintergrund"),
        ],
        "descripcion": """\
Trasfondo is a resource monitor for the Workbench (AmigaOS 3.x), written in
Dash (https://github.com/FreeMEM/dash): a graphical "top" painted on the
backdrop itself, behind the icons and the windows.

In the top right corner of the desktop it shows the date and time, CPU usage
and its history, the Raspberry Pi temperature on a PiStorm (Emu68), free
Chip and Fast memory, the six tasks using the most CPU, the mounted disks,
and the network traffic (and WiFi signal) with any TCP/IP stack.

It also brings optional pieces, each one a separate program:
- TrasfondoBarra: a bar with the time, date, weather, CPU and memory, with a
  panel (clock, calendar, weather, notifications) and quick settings.
- Notifications: the Avisa command and an ARexx port (TRASFONDO).
- Screenshots to PNG with a key.
- TrasfondoDock: a dock with the open programs and the ones you pin.
- TrasfondoVentanas: snapping, maximizing and tiling windows, Alt+Tab,
  without patching the system.
- TrasfondoArchivos: a file manager.
- TrasfondoPrefs: the preferences for all of them.

It speaks English out of the box and Spanish with its catalog.

Requirements:
- AmigaOS 3.0 or later (Kickstart 39), with the Workbench running.
- Any 68k: 68000 code, no FPU needed.
- Native chipset (OCS, ECS, AGA) or a graphics card (CyberGraphX or
  Picasso96).
- About 820 KB on disk; the backdrop takes 136 KB of memory.

Installation: unpack the archive and double-click "Instalar" (the
installer). It asks where to put the Trasfondo drawer and which pieces start
with the Workbench. It also updates itself with one click.

Source code (MIT licence), issues and every release:
https://github.com/FreeMEM/trasfondo
Website: https://trasfondo.freemem.space
""",
    },
}


def version() -> str:
    t = (ROOT / "src" / "dashweb.dash").read_text(encoding="utf-8")
    m = re.search(r'const DASHWEB_VERSION = "([^"]+)"', t)
    if not m:
        sys.exit("no encuentro DASHWEB_VERSION en src/dashweb.dash")
    return m.group(1)


def ajustar(texto: str) -> str:
    """Cada párrafo, a 78 columnas (las líneas que empiezan por "- " siguen con sangría)."""
    salida = []
    for parrafo in texto.strip().split("\n\n"):
        lineas = parrafo.split("\n")
        if all(len(l) <= 78 for l in lineas):
            salida.append(parrafo)
            continue
        bloques, actual = [], []
        for l in lineas:
            if l.startswith("- ") and actual:
                bloques.append(" ".join(actual))
                actual = []
            actual.append(l.strip())
        bloques.append(" ".join(actual))
        trozos = []
        for b in bloques:
            sangria = "  " if b.startswith("- ") else ""
            trozos.append(textwrap.fill(b, 78, subsequent_indent=sangria, break_on_hyphens=False))
        salida.append("\n".join(trozos))
    return "\n\n".join(salida)


def readme(perfil: dict, ver: str, novedades: str) -> str:
    cab = []
    for clave, valor in perfil["cabecera"]:
        cab.append(f"{clave + ':':<14}{ver if valor is None else valor}")
    cuerpo = perfil["descripcion"]
    if novedades.strip():
        titulo = f"What's new in {ver}"
        cuerpo += "\n" + titulo + "\n" + "-" * len(titulo) + "\n" + ajustar(novedades) + "\n"
    return "\n".join(cab) + "\n\n" + cuerpo


def comprobar(perfil: dict, texto: str, lha: Path):
    NOMBRE = perfil["nombre"]
    errores = []
    lineas = texto.split("\n")
    if not lineas[0].startswith("Short:"):
        errores.append("la primera línea no es Short:")
    corto = lineas[0][len("Short:"):].strip()
    if len(corto) > 40:
        errores.append(f"Short: tiene {len(corto)} caracteres (máximo 40)")
    if re.search(r"\d+\.\d+", corto):
        errores.append("Short: no puede llevar la versión")
    for i, l in enumerate(lineas, 1):
        if len(l) > 78:
            errores.append(f"línea {i} con {len(l)} caracteres (máximo 78): {l[:40]}...")
    if "\r" in texto:
        errores.append("lleva CR (solo LF)")
    try:
        texto.encode("latin-1")
    except UnicodeEncodeError as e:
        errores.append(f"un carácter que no es Latin-1: {e.object[e.start:e.end]!r}")
    for f in (NOMBRE + ".lha", NOMBRE + ".readme"):
        if len(f) > 30:
            errores.append(f"{f}: más de 30 caracteres")
    for clave in ("Short", "Uploader", "Type", "Architecture"):
        if not any(l.startswith(clave + ":") for l in lineas[:len(perfil["cabecera"])]):
            errores.append(f"falta {clave}:")
    if not lha.is_file():
        errores.append(f"no está {lha} (tools/paquete.sh)")
    return errores


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("programa", choices=sorted(PERFILES))
    ap.add_argument("--lha", help="el paquete (Tachyon: build/tachyon.lha de tools/paquete.sh)")
    ap.add_argument("--version", help="la versión (Tachyon: la de src/dashweb.dash)")
    ap.add_argument("--novedades", help="fichero con lo nuevo de esta versión, en inglés")
    ap.add_argument("--subir", action="store_true", help="subirlo a Aminet (solo con el visto bueno del usuario)")
    a = ap.parse_args()
    perfil = PERFILES[a.programa]
    NOMBRE = perfil["nombre"]
    if a.programa == "tachyon":
        ver = a.version or version()
        lha = Path(a.lha) if a.lha else ROOT / "build" / "tachyon.lha"
    else:
        if not a.lha or not a.version:
            sys.exit("trasfondo: --lha (el de su release) y --version")
        ver, lha = a.version, Path(a.lha)
    nov = Path(a.novedades).read_text(encoding="utf-8") if a.novedades else ""
    texto = readme(perfil, ver, nov)
    errores = comprobar(perfil, texto, lha)
    if errores:
        sys.exit("No vale para Aminet:\n  " + "\n  ".join(errores))
    dest = ROOT / "build" / "aminet"
    dest.mkdir(parents=True, exist_ok=True)
    (dest / (NOMBRE + ".readme")).write_bytes(texto.encode("latin-1"))
    shutil.copyfile(lha, dest / (NOMBRE + ".lha"))
    print(f"{dest}/{NOMBRE}.lha ({(dest / (NOMBRE + '.lha')).stat().st_size} bytes) y {NOMBRE}.readme, versión {ver}")
    if not a.subir:
        print("(sin subir: --subir, con el visto bueno del usuario)")
        return
    with ftplib.FTP(SERVIDOR, timeout=120) as ftp:
        ftp.login("anonymous", SUBIDOR.split()[0])
        ftp.cwd("new")
        # (primero el archivo y después el .readme, que es lo que Aminet procesa junto a él)
        for f in (NOMBRE + ".lha", NOMBRE + ".readme"):
            with open(dest / f, "rb") as h:
                print(ftp.storbinary(f"STOR {f}", h), f)
    tipo = dict(perfil["cabecera"])["Type"]
    print(f"subido a ftp://{SERVIDOR}/new: Aminet lo pone en {tipo} tras revisarlo")


if __name__ == "__main__":
    main()
