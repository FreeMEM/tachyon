#!/usr/bin/env python3
"""dashweb test runner.

Compiles tests/test_*.dash with Dash ($DASH, default ~/Projects/FreeMEMLang) for a 68020
with FPU and runs the ones with "# expect-out:" lines in FS-UAE (Dash's tools/emu_run.py),
comparing what they print, line by line.

    python3 tests/run.py               # all
    python3 tests/run.py url           # only tests whose name contains "url"
    python3 tests/run.py --no-emu      # compile only
    python3 tests/run.py --memcheck    # compile with ./dash --memcheck
    python3 tests/run.py -v            # show the output of failing tests in full

Lines a test can have:
    # expect-out: <line>        expected output, one per printed line, in order
    # memcheck                 always compiled with --memcheck (its summary line is in the expect-out)
    # dash-flags: <flags>       extra ./dash options (e.g. --stack 65536)
    # cflags: <flags>           extra gcc options/objects (DASH_CFLAGS), paths relative to the repo
    # emu-config: key = value   extra FS-UAE option (e.g. bsdsocket_library = 1); tests with
                                the same options share one boot
    # emu-needs: x.library      skip on the emulator when $DASH_EMU_SYS has no Libs/x.library;
                                amisslmaster.library: the system is $DASH_EMU_SYS_SSL (AmiSSL)
    # emu-server: script.py PORT  the test uses the network: FS-UAE gets bsdsocket.library (the PC's
                                network) and tests/servers/script.py PORT runs on the PC meanwhile

Environment: $DASH_KICKSTART (A1200 Kickstart 3.1; without it FS-UAE uses AROS and the
results do not count) and $DASH_EMU_SYS (Workbench files), as in Dash.
"""

import argparse
import re
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DASH = Path(os.environ.get("DASH", Path.home() / "Projects" / "FreeMEMLang"))
# tarea 58: DASH_LINEA=gcc compila por el camino de C (./dash --gcc), con su build/pegamento-lib
LINEA = os.environ.get("DASH_LINEA", "dashc")
BUILD = ROOT / "build" / "tests"
EMU_BASE = "fpu = 68882\n"          # the tests are built with --fpu (68020 + 68881)


def directives(src: Path, key: str):
    tag = f"# {key}:"
    return [l.split(tag, 1)[1].strip() for l in src.read_text().splitlines() if l.strip().startswith(tag)]


def compile_test(src: Path, memcheck: bool):
    exe = BUILD / src.stem
    cmd = [sys.executable, str(DASH / "dash"), "--fpu"] + (["--gcc"] if LINEA == "gcc" else []) + [str(src), "-o", str(exe)]
    if memcheck or any(l.strip() == "# memcheck" for l in src.read_text().splitlines()):
        cmd.append("--memcheck")
    for f in directives(src, "dash-flags"):
        cmd += shlex.split(f)
    # ./dash runs "python3 -m compiler.main" and writes build/ in the current directory:
    # the compiler comes from $DASH, build/ is ours (imports: relative to the test file)
    env = dict(os.environ, PYTHONPATH=str(DASH) + os.pathsep + os.environ.get("PYTHONPATH", ""))
    extra = " ".join(directives(src, "cflags"))
    if extra:
        env["DASH_CFLAGS"] = (env.get("DASH_CFLAGS", "") + " " + extra).strip()
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, env=env)
    if r.returncode != 0 or not exe.exists():
        return None, (r.stdout + r.stderr).strip()
    return exe, None


def build_img_lib() -> bool:
    """build/img-lib/libimg.a (lib/imagen_dec.dash links it) when it is missing or older than its sources"""
    lib = ROOT / "build" / "img-lib" / "libimg.a"
    sources = [f for d in ("tjpgd", "stb", "libwebp", "nanosvg", "hubbub") for f in (ROOT / "third_party" / d).rglob("*.[ch]")]
    sources.append(ROOT / "tools" / "build_img.sh")
    if lib.exists() and lib.stat().st_mtime >= max(f.stat().st_mtime for f in sources):
        return True
    print("building build/img-lib/libimg.a (tools/build_img.sh)...", flush=True)
    r = subprocess.run([str(ROOT / "tools" / "build_img.sh")], capture_output=True, text=True)
    if r.returncode != 0:
        print("tools/build_img.sh failed:\n" + r.stdout + r.stderr, file=sys.stderr)
        return False
    return True


def build_qjs_lib() -> bool:
    """build/qjs-lib/libqjs.a (lib/js.dash links it) when it is missing or older than its sources"""
    lib = ROOT / "build" / "qjs-lib" / "libqjs.a"
    sources = [f for d in ("quickjs", "fdlibm", "ryu") for f in (ROOT / "third_party" / d).rglob("*.[ch]")]
    sources.append(ROOT / "tools" / "build_qjs.sh")
    if lib.exists() and lib.stat().st_mtime >= max(f.stat().st_mtime for f in sources):
        return True
    print("building build/qjs-lib/libqjs.a (tools/build_qjs.sh lib)...", flush=True)
    r = subprocess.run([str(ROOT / "tools" / "build_qjs.sh"), "lib"], capture_output=True, text=True,
                       env=dict(os.environ, DASH=str(DASH)))
    if r.returncode != 0:
        print("tools/build_qjs.sh lib failed:\n" + r.stdout + r.stderr, file=sys.stderr)
    return r.returncode == 0


def build_pegamento_lib() -> bool:
    """build/pegamento-lib/libpegamento.a (Dash 2.0: the C of lib/js, lienzo, jsdom, html5 and documento, in
    src_c/tachyon.c) when it is missing or older than its C, the .dash files whose structs it sees, or dashc"""
    lib = ROOT / "build" / "pegamento-lib" / "libpegamento.a"
    sources = list((ROOT / "src_c").glob("*.c")) + list((ROOT / "lib").glob("*.dash")) + \
        list((ROOT / "src").glob("*.dash")) + [ROOT / "tools" / "build_pegamento.sh", DASH / "dashc" / "dashc"]
    hecha = lib.parent / "linea"
    if lib.exists() and hecha.exists() and hecha.read_text().strip() == LINEA and \
            lib.stat().st_mtime >= max(f.stat().st_mtime for f in sources if f.exists()):
        return True
    print(f"building build/pegamento-lib/libpegamento.a for {LINEA} (tools/build_pegamento.sh)...", flush=True)
    r = subprocess.run([str(ROOT / "tools" / "build_pegamento.sh")], capture_output=True, text=True,
                       env=dict(os.environ, DASH=str(DASH), DASH_LINEA=LINEA))
    if r.returncode != 0:
        print("tools/build_pegamento.sh failed:\n" + r.stdout + r.stderr, file=sys.stderr)
    return r.returncode == 0


def build_video_lib() -> bool:
    """build/video-lib/libvideo.a (lib/video.dash links it) when it is missing or older than its sources"""
    lib = ROOT / "build" / "video-lib" / "libvideo.a"
    sources = list((ROOT / "third_party" / "mintvid").rglob("*.[chS]")) + [ROOT / "tools" / "build_video.sh"]
    if lib.exists() and lib.stat().st_mtime >= max(f.stat().st_mtime for f in sources):
        return True
    print("building build/video-lib/libvideo.a (tools/build_video.sh)...", flush=True)
    r = subprocess.run([str(ROOT / "tools" / "build_video.sh")], capture_output=True, text=True)
    if r.returncode != 0:
        print("tools/build_video.sh failed:\n" + r.stdout + r.stderr, file=sys.stderr)
    return r.returncode == 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("filter", nargs="?")
    ap.add_argument("--no-emu", action="store_true")
    ap.add_argument("--memcheck", action="store_true")
    # (the tests with the same emulator config run in one session: it gets this plus 75 s per test)
    ap.add_argument("--timeout", type=float, default=600)
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()

    # lib/jsdom_preludio.dash sale de lib/jsdom_preludio.js (tools/preludio.py)
    if subprocess.run([sys.executable, str(ROOT / "tools" / "preludio.py"), "--check"]).returncode != 0:
        return 2
    if not (DASH / "dash").exists():
        print(f"Dash not found in {DASH} (set $DASH; see docs/DASHWEB_LOOP.md, rule 3)", file=sys.stderr)
        return 2
    sys.path.insert(0, str(DASH / "tools"))
    from emu_run import run_programs

    tests = sorted((ROOT / "tests").glob("test_*.dash"))
    if args.filter:
        tests = [t for t in tests if args.filter in t.stem]
    # the programs of src/ must compile too (they are not run: they wait for the user)
    programas = [] if args.filter else sorted((ROOT / "src").glob("*.dash"))
    BUILD.mkdir(parents=True, exist_ok=True)
    if any("js.dash" in t.read_text() or "documento.dash" in t.read_text() for t in tests + programas) and not build_qjs_lib():
        return 1
    if not build_img_lib():
        return 1
    if not build_pegamento_lib():
        return 1
    if any("video.dash" in t.read_text() for t in tests + programas) and not build_video_lib():
        return 1

    results = {}          # name -> (ok, message)
    to_run = {}           # emu config -> [(src, exe, expected)]
    sysdir = os.environ.get("DASH_EMU_SYS", "")
    t0 = time.time()
    for prog in programas:
        exe, err = compile_test(prog, args.memcheck)
        results["src/" + prog.stem] = (False, "compile failed:\n" + err) if err else (True, "compiled")
    for src in tests:
        exe, err = compile_test(src, args.memcheck)
        if err:
            results[src.stem] = (False, "compile failed:\n" + err)
            continue
        expected = directives(src, "expect-out")
        system = os.environ.get("DASH_EMU_SYS_SSL", "") if "amisslmaster.library" in directives(src, "emu-needs") else sysdir
        missing = [lib for lib in directives(src, "emu-needs")
                   if not any((Path(system) / d / lib).exists() for d in ("Libs", "AmiSSL/Libs"))]
        if not expected or args.no_emu:
            results[src.stem] = (True, "compiled")
        elif missing:
            results[src.stem] = (True, f"compiled (emulator skipped: no {', '.join(missing)})")
        else:
            cfg = EMU_BASE + "".join(c + "\n" for c in directives(src, "emu-config"))
            # (--memcheck se lleva 2,7 MB del A1200 de 8 MB para su cuenta de cada bloque: se le dan 4 MB más, para que
            # el programa tenga lo de un A1200 de verdad y no la mitad; con el preludio compilándose, los de JavaScript
            # se quedaban sin memoria según la suerte; tarea 61)
            if (args.memcheck or any(l.strip() == "# memcheck" for l in src.read_text().splitlines())) and "zorro_iii_memory" not in cfg:
                cfg += "zorro_iii_memory = 4096\n"
            # (la Zorro III solo la ve un 68020 entero: el del A1200 de FS-UAE es un 68EC020, de 24 bits, y sin esto no
            # había memoria de más, tampoco en los que pedían 64 MB)
            if "zorro_iii_memory" in cfg and not re.search(r"^cpu\s*=", cfg, re.M):
                cfg += "cpu = 68020\n"
            if directives(src, "emu-server"):
                cfg += "bsdsocket_library = 1\n"
            to_run.setdefault((cfg, system), []).append((src, exe, expected))

    if to_run and not os.environ.get("DASH_KICKSTART"):
        print("warning: $DASH_KICKSTART not set, FS-UAE uses AROS: results do not count", file=sys.stderr)
    for (cfg, system), group in to_run.items():
        servers = [subprocess.Popen([sys.executable, str(ROOT / "tests" / "servers" / d.split()[0])] + d.split()[1:],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                   for src, _, _ in group for d in directives(src, "emu-server")]
        if servers:
            time.sleep(1)       # let them listen
        try:
            # (los de una misma configuración van en una sola sesión del emulador: 75 s por test; con 20, al crecer los de
            # JavaScript, los últimos del grupo se quedaban sin tiempo y daban TIMEOUT en cada batería entera, y con 45,
            # en una tanda filtrada de los de jsdom, que tardan 60-90 s cada uno)
            outs = run_programs([exe for _, exe, _ in group], timeout=args.timeout + 75 * len(group),
                                kickstart=os.environ.get("DASH_KICKSTART"), extra_config=cfg, system=system or None)
        except RuntimeError as e:
            for src, _, _ in group:
                results[src.stem] = (False, f"emulator: {e}")
            continue
        finally:
            for server in servers:
                server.kill()
                server.wait()
        for (src, _, expected), out in zip(group, outs):
            got = (out.output or "").replace("\r", "").splitlines()
            leak = None
            if args.memcheck and not any(e.startswith("memcheck:") for e in expected):
                # --memcheck adds a summary line: nothing alive and no errors, or it fails
                summary = [g for g in got if g.startswith("memcheck:")]
                got = [g for g in got if not g.startswith("memcheck:")]
                # (a program that allocates nothing has no memory runtime and prints none)
                if summary and ("vivos 0 objetos y 0 strings" not in summary[-1] or "errores 0" not in summary[-1]):
                    leak = summary[-1]
            if leak:
                results[src.stem] = (False, "memcheck: " + leak)
            elif out.timed_out:
                results[src.stem] = (False, "TIMEOUT\n" + "\n".join(got))
            elif got == expected and out.rc == 0:
                results[src.stem] = (True, "ok (emulator)")
            else:
                diff = [f"  line {i + 1}: expected {e!r}, got {g!r}"
                        for i, (e, g) in enumerate(zip(expected + [None] * len(got), got + [None] * len(expected)))
                        if e != g and not (e is None and g is None)]
                results[src.stem] = (False, f"RC={out.rc}\n" + "\n".join(diff[:10]) +
                                     ("\n--- output:\n" + "\n".join(got) if args.verbose else ""))

    failed = 0
    names = ["src/" + p.stem for p in programas] + [t.stem for t in tests]
    for name in names:
        ok, msg = results[name]
        failed += not ok
        first, _, rest = msg.partition("\n")
        print(f"{'PASS' if ok else 'FAIL'}  {name}: {first}")
        if not ok and rest:
            print("\n".join("      " + l for l in rest.splitlines()))
    print(f"\n{len(names) - failed}/{len(names)} passed ({time.time() - t0:.0f} s)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
