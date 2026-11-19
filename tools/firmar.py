#!/usr/bin/env python3
"""Firma un fichero de una versión publicada: deja junto a él fichero.sig con la firma Ed25519 de sus bytes en 128
cifras hexadecimales. El actualizador solo instala lo que lleve una firma buena con la clave pública de dentro del
programa (aviso de seguridad del 31/10/2026: con la cuenta de GitHub robada se podía repartir un ejecutable falso).

    python3 tools/firmar.py build/Tachyon.gz

La clave privada (semilla en hexadecimal) está en ~/.config/freemem/firma-actualizaciones (no va al repo); la
pública, en ~/.config/freemem/firma-actualizaciones.pub y en el código (actualizar_clave, lib/actualizar.dash).
"""
import sys
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import ed25519

CLAVE = Path.home() / ".config" / "freemem" / "firma-actualizaciones"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    k = ed25519.Ed25519PrivateKey.from_private_bytes(bytes.fromhex(CLAVE.read_text().strip()))
    for f in sys.argv[1:]:
        datos = Path(f).read_bytes()
        firma = k.sign(datos)
        k.public_key().verify(firma, datos)
        Path(f + ".sig").write_text(firma.hex() + "\n")
        print(f + ".sig")


if __name__ == "__main__":
    main()
