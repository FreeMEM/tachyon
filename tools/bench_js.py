#!/usr/bin/env python3
"""Mide JavaScript tal como lo usa dashweb (lib/js.dash y build/qjs-lib/libqjs.a): tests/bench/bench.js en la
máquina objetivo (68040 + JIT, AmigaOS 3.2: $DASH_KICKSTART_32 y ~/.cache/dash-emu/sys32rtg) del emulador, cada prueba
con su tiempo (Date.now: pasos de 20 ms).

    tools/bench_js.py            # bench.js
    tools/bench_js.py otro.js    # otro fichero con T("nombre", function () {...}) como bench.js
"""
import json, os, subprocess, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
DASH = Path(os.environ.get("DASH", Path.home() / "Projects" / "FreeMEMLang"))
sys.path.insert(0, str(DASH / "tools"))
from emu_run import run_programs

js = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "tests" / "bench" / "bench.js").read_text()
codigo = 'var R = ""; function ticks() { return Date.now(); } function print(s) { R += s + "\\n"; }\n' + js + "\nR"
with tempfile.TemporaryDirectory(prefix="bench_js_") as tmp:
    src = Path(tmp) / "bench_js.dash"
    # el JS va como literal de texto de Dash (json.dumps escapa comillas, barras y saltos)
    src.write_text('import "%s"\n\nMain\n    js = js_nuevo()\n    Print js_evaluar(js, %s, "bench.js")\n    js_liberar(js)\nend\n'
                   % (ROOT / "lib" / "js.dash", json.dumps(codigo)))
    exe = Path(tmp) / "bench_js"
    r = subprocess.run([str(DASH / "dash"), "--fpu", "--stack", "262144", str(src), "-o", str(exe)], cwd=DASH,
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(r.stdout[-3000:] + r.stderr[-3000:])
    cfg = os.environ.get("BENCH_JS_CFG", "cpu = 68040\nfpu = 68040\njit_compiler = 1\nuae_cpu_speed = max\nzorro_iii_memory = 131072\n")
    # AmigaOS 3.2 con su 68040.library (la de la máquina RTG): el 68040 no tiene todas las instrucciones de la
    # FPU y sin ella un programa con FPU se cuelga (los sistemas 3.1 de pruebas no la traen)
    out = run_programs([str(exe)], timeout=600, kickstart=os.environ.get("DASH_KICKSTART_32"), extra_config=cfg,
                       system=os.environ.get("BENCH_JS_SYS", os.path.expanduser("~/.cache/dash-emu/sys32rtg")))[0]
    print(out.output)
