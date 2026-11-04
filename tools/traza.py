#!/usr/bin/env python3
"""Corre tools/traza_maqueta.dash en el emulador (máquina objetivo) con una página de disco o de la red.

    tools/traza.py pagina.html [ancho] [niveles]
    tools/traza.py https://ejemplo.org/ [ancho] [niveles]
"""
import os, sys, tempfile, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
DASH = Path(os.environ.get("DASH", Path.home() / "Projects" / "FreeMEMLang"))
sys.path.insert(0, str(DASH / "tools"))
from emu_run import run_programs

pagina, ancho, niveles = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "940", sys.argv[3] if len(sys.argv) > 3 else "6"
servidor = None
if not pagina.startswith("http") and Path(pagina).is_file():
    # una página de disco: se sirve su carpeta por HTTP (con sus hojas e imágenes), que es mucho más rápido
    # que copiarla al disco emulado como un programa más
    import time
    servidor = subprocess.Popen([sys.executable, "-m", "http.server", "40862", "--bind", "127.0.0.1"],
                                cwd=str(Path(pagina).resolve().parent), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    pagina = "http://127.0.0.1:40862/" + Path(pagina).name
if len(sys.argv) > 5:            # y además los dibujos entre dos alturas
    niveles = niveles + " " + sys.argv[4] + " " + sys.argv[5]
with tempfile.TemporaryDirectory(prefix="traza_") as tmp:
    exe = Path(tmp) / "traza"
    # TRAZA_PERFIL=1: con ./dash --profile (la tabla de tiempos por función sale al final)
    perfil = ["--profile"] if os.environ.get("TRAZA_PERFIL") else []
    # (con --fpu, como el navegador: sin él nanosvg rasteriza mal y una imagen data:image/svg+xml dejaba la traza
    # colgada; tarea 42j)
    r = subprocess.run([str(DASH / "dash"), "--fpu", str(ROOT / "tools" / "traza_maqueta.dash"), "-o", str(exe)] + perfil, cwd=DASH,
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(r.stdout + r.stderr)
    cfg = "cpu = 68040\nfpu = 68040\njit_compiler = 1\nuae_cpu_speed = max\nzorro_iii_memory = 131072\n"
    if pagina.startswith("http"):
        # por la red: AmiSSL para https
        # TRAZA_CAPTURA="segundos fichero.png": la pantalla del Amiga a esa altura (para ver un cuelgue)
        cap = os.environ.get("TRAZA_CAPTURA", "").split()
        out = run_programs([str(exe)], timeout=int(os.environ.get("TRAZA_TIEMPO", "900")), kickstart=os.environ.get("DASH_KICKSTART"),
                           screenshot=(float(cap[0]), cap[1]) if cap else None,
                           extra_config=cfg + "bsdsocket_library = 1\n",
                           system=os.path.expanduser("~/.cache/dash-emu/sys31muisslweb"), args=[pagina + " " + ancho + " " + niveles])[0]
    else:
        out = run_programs([str(exe), pagina], timeout=600, kickstart=os.environ.get("DASH_KICKSTART"), extra_config=cfg,
                           system=os.path.expanduser("~/.cache/dash-emu/sys31muiweb"), args=["DH0:p1 " + ancho + " " + niveles, ""])[0]
    print(out.output)
if servidor:
    servidor.terminate()
