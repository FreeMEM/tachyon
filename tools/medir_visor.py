#!/usr/bin/env python3
"""Measure src/visor.dash in FS-UAE: serves tests/pages/ by HTTP (tests/servers/http.py), opens
a page in the visor and prints the times it reports (load, html, style, layout, paint).

    tools/medir_visor.py                       # tests/pages/prueba.html on the stock A1200
    tools/medir_visor.py --maquina objetivo    # 68040 + JIT at full speed (PiStorm-like)
    tools/medir_visor.py --pagina otra.html --captura visor.png
    tools/medir_visor.py --sistema ~/.cache/dash-emu/sys31web     # with fonts (tools/emu_sys_fuentes.sh)

Needs $DASH_KICKSTART and $DASH_EMU_SYS, like tests/run.py; Dash is $DASH (default the worktree).
"""
import argparse
import atexit
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DASH = Path(os.environ.get("DASH", Path.home() / "Projects" / "FreeMEMLang" / ".worktrees" / "dashweb"))
PORT = 40861
MAQUINAS = {
    "a1200": "fpu = 68882\n",    # (dashweb va con --fpu, como en tools/paquete.sh y los tests)
    # como una PiStorm: 68040 rápido y 128 MB (las páginas de hoy con su JavaScript no caben en 8 MB)
    "objetivo": "cpu = 68040\nfpu = 68040\njit_compiler = 1\nuae_cpu_speed = max\nzorro_iii_memory = 131072\n",
    # la misma con tarjeta gráfica (RTG, uaegfx de FS-UAE y Picasso96): AmigaOS 3.2 a 1024x768 en 16 bits
    # ($DASH_KICKSTART_32; sistema ~/.cache/dash-emu/sys32rtg, ver tools/emu_sys_rtg.sh)
    "rtg": "cpu = 68040\nfpu = 68040\njit_compiler = 1\nuae_cpu_speed = max\nzorro_iii_memory = 131072\n"
           "graphics_card = uaegfx\n",
    # la misma con la MMU del 68040 (sin JIT: FS-UAE no la emula con él), para MuForce: avisa de cada lectura o
    # escritura fuera de la memoria (la dirección 0: un 68k clásico la lee sin ruido y AmigaOS 4 se cuelga; tarea
    # 43). Sistema: ~/.cache/dash-emu/sys32rtg38mmu (sys32rtg38 con C/MuForce, Libs/disassembler.library de MuTools
    # y "Run >NIL: C:MuForce FILE=DH0:muforce.txt" en S/Startup-Extra); los avisos, en muforce.txt con --guardar
    "rtgmmu": "cpu = 68040\nfpu = 68040\nuae_mmu_model = 68040\nzorro_iii_memory = 131072\n"
              "graphics_card = uaegfx\n",
    # la misma con la pantalla ancha de 1680x1050 (FS-UAE añade a uaegfx la resolución de pantalla completa);
    # sistema: una copia de sys32rtg38 con el modo 0x50971100 (1680x1050 de 16 bits) en
    # Prefs/Env-Archive/Sys/ScreenMode.prefs, como hace tools/emu_sys_rtg.sh con el de 1024x768
    "rtgancha": "cpu = 68040\nfpu = 68040\njit_compiler = 1\nuae_cpu_speed = max\nzorro_iii_memory = 131072\n"
                "graphics_card = uaegfx\ngraphics_card_memory = 16384\n"
                "fullscreen_width = 1680\nfullscreen_height = 1050\n",
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--pagina", default="prueba.html", help="file of tests/pages/ (or /route of tests/servers/http.py, or a whole address); several, with commas")
    ap.add_argument("--maquina", choices=sorted(MAQUINAS), default="a1200")
    ap.add_argument("--captura", metavar="FILE.png", help="screen picture after the first paint (several, with commas: a.png,b.png)")
    ap.add_argument("--fases", action="store_true", help="run tests/bench/fases.dash instead (no window)")
    ap.add_argument("--programa", default="src/visor.dash", help="the program to run (e.g. src/dashweb.dash, "
                    "with --sistema ~/.cache/dash-emu/sys31muiweb)")
    ap.add_argument("--sistema", metavar="DIR", help="emulated system (default $DASH_EMU_SYS; with fonts: "
                    "tools/emu_sys_fuentes.sh)")
    ap.add_argument("--acciones", metavar="'TÍTULO e 100 c X Y ...'",
                    help="tools/amiga/clicar.dash in the background: clicks and keys in that window")
    ap.add_argument("--memoria", type=int, metavar="MB", help="Zorro III memory of the 68040 machines (default 128): "
                    "YouTube's portada needs more than 128 MB to leave room for a screen picture of 1680x1050")
    ap.add_argument("--latido", type=int, metavar="S", help="tools/amiga/latido.dash in the background: every S s the free "
                    "memory and the state and saved stack of the window's task (bgN.txt with --guardar; to find hangs)")
    ap.add_argument("--local", action="store_true",
                    help="the page from the emulated disk, without network: FS-UAE's bsdsocket.library makes the "
                         "emulated CPU many times slower (measure the A1200 like this)")
    ap.add_argument("--memcheck", action="store_true", help="build with ./dash --memcheck (memory errors to the output)")
    ap.add_argument("--gc-siempre", action="store_true", help="dashweb GCSIEMPRE: QuickJS's cycle collector after every script and call")
    ap.add_argument("--poca-memoria", metavar="KB", help="dashweb POCAMEMORIA=KB: below that free memory the tabs behind are discarded")
    ap.add_argument("--cajas", metavar="TEXTO", help="dashweb CAJAS=TEXTO: when the page is whole, the boxes and layout style of the elements with TEXTO in their class (or that tag name)")
    ap.add_argument("--cajas-en", metavar="MS", help="dashweb CAJASEN=MS: with --cajas, also once MS ms after the page started (for a page that never gets whole)")
    ap.add_argument("--dibujos", metavar="Y0-Y1", help="dashweb DIBUJOS=Y0-Y1: when the page is whole, its drawings between those heights")
    ap.add_argument("--versiones", action="store_true", help="dashweb VERSIONES=: the list of versions from tests/servers/http.py "
                    "(/act/releases: a 9.9.0-alfa with a pretend Tachyon.gz) instead of GitHub (task 44)")
    ap.add_argument("--catalogo", metavar="IDIOMA", help="Catalogs/IDIOMA/Tachyon.catalog (de catalogos/IDIOMA.ct, tools/catalogo.py) "
                    "junto al programa mientras dura (tarea 45g): la interfaz en ese idioma si el sistema lo pide")
    ap.add_argument("--traza", action="store_true", help="dashweb TRAZA: the timeline of the load (lib/traza.dash)")
    ap.add_argument("--perfil", action="store_true", help="build with ./dash --profile (the table goes to the output)")
    ap.add_argument("--guardar", metavar="DIR", help="keep the emulated disk there (outputs: out0.txt, bg0.txt)")
    ap.add_argument("--segundos", type=int, default=40, help="the visor closes itself after this")
    ap.add_argument("--host", default="127.0.0.1", help="the server name in the addresses (e.g. x.lento with --dns-lento)")
    ap.add_argument("--dns-lento", type=int, metavar="MS", help="names ending in .lento take MS ms to look up "
                    "(tools/lento/dns_lento.c in FS-UAE with LD_PRELOAD) and give 127.0.0.1")
    ap.add_argument("--tls-lento", action="store_true", help="HTTPS whose server waits 4 s before the handshake "
                    "(needs a system with AmiSSL, e.g. ~/.cache/dash-emu/sys31muisslweb)")
    ap.add_argument("--tls", action="store_true", help="HTTPS (the test CA's certificate is for localhost and 127.0.0.1)")
    ap.add_argument("--captura-en", metavar="S", help="take --captura S seconds after boot (default: "
                    "5 s before the end)")
    args = ap.parse_args()

    sys.path.insert(0, str(DASH / "tools"))
    from emu_run import run_programs
    # emu_run compiles .dash (clicar.dash) with "python3 -m compiler.main": Dash's compiler
    os.environ["PYTHONPATH"] = str(DASH) + os.pathsep + os.environ.get("PYTHONPATH", "")

    # los iconos de la barra (tools/iconos.py) junto al programa: el sistema emulado es la raíz de DH0:,
    # que es PROGDIR:
    iconos = ROOT / "iconos"
    if args.maquina == "rtg" and not args.sistema:
        args.sistema = os.path.expanduser("~/.cache/dash-emu/sys32rtg")
    sistema = args.sistema or os.environ.get("DASH_EMU_SYS")
    if iconos.is_dir() and sistema:
        shutil.copytree(iconos, Path(sistema) / "iconos", dirs_exist_ok=True)
    catalogo = None
    if args.catalogo and sistema:
        destino = Path(sistema) / "Catalogs" / args.catalogo
        destino.mkdir(parents=True, exist_ok=True)
        subprocess.run([sys.executable, str(DASH / "tools" / "catalogo.py"), "catalog", str(ROOT / "catalogos" / (args.catalogo + ".ct"))],
                       cwd=str(Path(sistema)), check=True, capture_output=True)
        catalogo = destino / "Tachyon.catalog"
        atexit.register(lambda: catalogo.unlink(missing_ok=True))   # (las demás pruebas, en el idioma de siempre)

    with tempfile.TemporaryDirectory(prefix="visor_") as tmp:
        exe = Path(tmp) / "visor"
        env = dict(os.environ, DASH_TEST_AUTOCLOSE=str(args.segundos))
        if args.perfil:
            env["DASH_PROFILE"] = "1"
        r = subprocess.run([str(DASH / "dash"), "--fpu"] + (["--memcheck"] if args.memcheck else []) + [str(ROOT / ("tests/bench/fases.dash" if args.fases else args.programa)), "-o", str(exe)],
                           cwd=DASH, env=env, capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit("compile failed:\n" + r.stdout + r.stderr)
        size = exe.stat().st_size
        modo = ["tls-lento"] if args.tls_lento else ["tls"] if args.tls else []
        server = subprocess.Popen([sys.executable, str(ROOT / "tests" / "servers" / "http.py"), str(PORT)] + modo,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(3 if modo else 1)
        if args.dns_lento:
            shim = Path(tmp) / "dns_lento.so"
            subprocess.run(["gcc", "-shared", "-fPIC", "-O2", "-o", str(shim),
                            str(ROOT / "tools" / "lento" / "dns_lento.c"), "-ldl"], check=True)
            os.environ["LD_PRELOAD"] = str(shim)          # FS-UAE inherits it
            os.environ["DNS_LENTO_MS"] = str(args.dns_lento)
        try:
            # --captura a.png,b.png --captura-en 100,200: varias fotos en la misma ejecución
            shot = None
            if args.captura:
                ficheros = args.captura.split(",")
                tiempos = (args.captura_en or str(args.segundos - 5)).split(",")
                shot = [(float(tiempos[min(i, len(tiempos) - 1)]), f) for i, f in enumerate(ficheros)]
            esquema = "https" if modo else "http"
            programs = [str(exe)]
            prog_args = [" ".join(p if "://" in p or p.startswith("tachyon:") else f"{esquema}://{args.host}:{PORT}{p}" if p.startswith("/")
                                  else f"{esquema}://{args.host}:{PORT}/pages/{p}" for p in args.pagina.split(","))]
            if args.traza:
                prog_args[0] += " TRAZA"
            if args.dibujos:
                prog_args[0] += " DIBUJOS=" + args.dibujos
            if args.cajas:
                prog_args[0] += " CAJAS=" + args.cajas
            if args.cajas_en:
                prog_args[0] += " CAJASEN=" + args.cajas_en
            if args.poca_memoria:
                prog_args[0] += " POCAMEMORIA=" + args.poca_memoria
            if args.gc_siempre:
                prog_args[0] += " GCSIEMPRE"
            if args.versiones:
                prog_args[0] += f" VERSIONES=http://{args.host}:{PORT}/act/releases"
            red = "bsdsocket_library = 1\n"
            if args.local:
                # the page goes to the disk as a second "program" (DH0:p1; running it just fails)
                programs.append(str(ROOT / "tests" / "pages" / args.pagina))
                prog_args = ["DH0:p1", ""]
                red = ""
            fondo = []
            if args.acciones:
                fondo.append((str(ROOT / "tools" / "amiga" / "clicar.dash"), args.acciones))
            if args.latido:
                fondo.append((str(ROOT / "tools" / "amiga" / "latido.dash"), f'"Tachyon" {args.latido * 50}'))
            out = run_programs(programs, timeout=args.segundos + 60,
                               kickstart=os.environ.get("DASH_KICKSTART_32" if args.maquina.startswith("rtg") else "DASH_KICKSTART"),
                               extra_config=red + (MAQUINAS[args.maquina] if not args.memoria else
                                                   MAQUINAS[args.maquina].replace("zorro_iii_memory = 131072",
                                                                                  f"zorro_iii_memory = {args.memoria * 1024}")),
                               screenshot=shot, system=args.sistema, keep=args.guardar,
                               background=fondo or None, args=prog_args)[0]
        finally:
            server.kill()
            server.wait()
    print(f"{args.maquina}, programa de {size} bytes, rc {out.rc}")
    print(out.output or "(sin salida)")


if __name__ == "__main__":
    main()
