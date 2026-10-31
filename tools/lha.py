#!/usr/bin/env python3
"""Make an LHA archive compressed with -lh5- (what LhA on the Amiga makes by default; level 0 headers), which LhA and
lhasa read: Lhasa (the lha of Linux distributions) only extracts. A file that does not get smaller goes as -lh0-.

    tools/lha.py archivo.lha DIRECTORIO      # DIRECTORIO and everything in it, with its paths
    tools/lha.py archivo.lha DIR DIR.info    # several: directories (whole) and files
    tools/lha.py --lh0 archivo.lha ...       # without compression

-lh5-: LZSS with an 8 KB window (matches of 3 to 256 bytes) and, per block, Huffman codes for the literals and
lengths (510 codes), for the distances (14) and for the lengths of the first table (19), as LHa for UNIX writes them
(huf.c: send_block, write_pt_len, write_c_len).
"""
import heapq
import os
import struct
import sys
import time

DICBIT = 13                 # -lh5-: 8 KB window
WINDOW = 1 << DICBIT
MINMATCH = 3
MAXMATCH = 256
NC = 256 + MAXMATCH - MINMATCH + 1   # literals and lengths: 510
NP = DICBIT + 1             # distances: 14
NT = 19                     # lengths of the code lengths (16 + 3)
CBIT, PBIT, TBIT = 9, 4, 5
BLOCK = 16384               # codes per block (the block size is 16 bits)
CHAIN = 48                  # candidates tried for each match


def crc16(data: bytes) -> int:
    """CRC-16/ARC, the one of LHA"""
    tabla = _CRC_TABLA
    crc = 0
    for b in data:
        crc = (crc >> 8) ^ tabla[(crc ^ b) & 0xFF]
    return crc


def _crc_tabla():
    t = []
    for i in range(256):
        c = i
        for _ in range(8):
            c = (c >> 1) ^ 0xA001 if c & 1 else c >> 1
        t.append(c)
    return t


_CRC_TABLA = _crc_tabla()


def dos_time(t: float) -> int:
    lt = time.localtime(t)
    return (((lt.tm_year - 1980) << 25) | (lt.tm_mon << 21) | (lt.tm_mday << 16)
            | (lt.tm_hour << 11) | (lt.tm_min << 5) | (lt.tm_sec // 2))


class Bits:
    """Bits, the most significant first"""
    def __init__(self):
        self.out = bytearray()
        self.acc = 0
        self.n = 0

    def put(self, n: int, v: int):
        self.acc = (self.acc << n) | (v & ((1 << n) - 1))
        self.n += n
        while self.n >= 8:
            self.n -= 8
            self.out.append((self.acc >> self.n) & 0xFF)
        self.acc &= (1 << self.n) - 1

    def end(self) -> bytes:
        if self.n:
            self.out.append((self.acc << (8 - self.n)) & 0xFF)
            self.n = self.acc = 0
        return bytes(self.out)


def lengths(freq, maxbits=16):
    """Huffman code lengths of freq (0 for the unused), none longer than maxbits"""
    used = [i for i, f in enumerate(freq) if f]
    lens = [0] * len(freq)
    if len(used) < 2:
        return lens
    f = list(freq)
    while True:
        heap = [(f[i], i, (i,)) for i in used]
        heapq.heapify(heap)
        depth = dict.fromkeys(used, 0)
        k = len(freq)
        while len(heap) > 1:
            a = heapq.heappop(heap)
            b = heapq.heappop(heap)
            for s in a[2] + b[2]:
                depth[s] += 1
            heapq.heappush(heap, (a[0] + b[0], k, a[2] + b[2]))
            k += 1
        if max(depth.values()) <= maxbits:
            for s, d in depth.items():
                lens[s] = d
            return lens
        f = [(x + 1) // 2 if x else 0 for x in f]


def codes(lens):
    """The canonical codes of LHA (make_code): by length, and in each length in the order of the symbols"""
    count = [0] * 18
    for n in lens:
        count[n] += 1
    start = [0] * 18
    for i in range(1, 17):
        start[i + 1] = (start[i] + count[i]) << 1
    out = [0] * len(lens)
    for i, n in enumerate(lens):
        if n:
            out[i] = start[n]
            start[n] += 1
    return out


def pcode(o: int) -> int:
    """The distance code of an offset (distance - 1): 0, 1, or its bit length"""
    return o.bit_length()


def lz(data: bytes):
    """The data as codes: (literal byte) or (length, offset), greedy, with hash chains of 3 bytes"""
    n = len(data)
    head = {}
    prev = [-1] * n
    out = []
    i = 0
    while i < n:
        best, best_o = 0, 0
        if i + MINMATCH <= n:
            key = data[i:i + MINMATCH]
            c = head.get(key, -1)
            lim = min(MAXMATCH, n - i)
            tries = CHAIN
            while c >= 0 and i - c <= WINDOW and tries:
                if data[c + best] == data[i + best] if best < lim else False:
                    m = MINMATCH
                    while m < lim and data[c + m] == data[i + m]:
                        m += 1
                    if m > best:
                        best, best_o = m, i - c - 1
                        if m == lim:
                            break
                c = prev[c]
                tries -= 1
        step = best if best >= MINMATCH else 1
        if best >= MINMATCH:
            out.append((best, best_o))
        else:
            out.append(data[i])
        for j in range(i, min(i + step, n - MINMATCH + 1)):
            k = data[j:j + MINMATCH]
            prev[j] = head.get(k, -1)
            head[k] = j
        i += step
    return out


def write_pt_len(bits, lens, n, nbit, special):
    while n > 0 and lens[n - 1] == 0:
        n -= 1
    bits.put(nbit, n)
    i = 0
    while i < n:
        k = lens[i]
        i += 1
        if k <= 6:
            bits.put(3, k)
        else:
            bits.put(k - 3, (1 << (k - 3)) - 2)
        if i == special:
            while i < 6 and lens[i] == 0:
                i += 1
            bits.put(2, (i - 3) & 3)


def c_runs(c_len):
    """c_len as the symbols of the first table: (t, extra bits, value)"""
    n = NC
    while n > 0 and c_len[n - 1] == 0:
        n -= 1
    out = []
    i = 0
    while i < n:
        k = c_len[i]
        i += 1
        if k == 0:
            count = 1
            while i < n and c_len[i] == 0:
                i += 1
                count += 1
            if count <= 2:
                out += [(0, 0, 0)] * count
            elif count <= 18:
                out.append((1, 4, count - 3))
            elif count == 19:
                out += [(0, 0, 0), (1, 4, 15)]
            else:
                out.append((2, CBIT, count - 20))
        else:
            out.append((k + 2, 0, 0))
    return n, out


def send_block(bits, block):
    c_freq = [0] * NC
    p_freq = [0] * NP
    for x in block:
        if isinstance(x, int):
            c_freq[x] += 1
        else:
            c_freq[256 + x[0] - MINMATCH] += 1
            p_freq[pcode(x[1])] += 1
    bits.put(16, len(block))
    c_len = lengths(c_freq)
    c_used = [i for i, f in enumerate(c_freq) if f]
    if len(c_used) >= 2:
        n, runs = c_runs(c_len)
        t_freq = [0] * NT
        for t, _, _ in runs:
            t_freq[t] += 1
        t_len = lengths(t_freq)
        t_used = [i for i, f in enumerate(t_freq) if f]
        if len(t_used) >= 2:
            write_pt_len(bits, t_len, NT, TBIT, 3)
        else:
            bits.put(TBIT, 0)
            bits.put(TBIT, t_used[0])
        t_code = codes(t_len)
        bits.put(CBIT, n)
        for t, nb, v in runs:
            if t_len[t]:
                bits.put(t_len[t], t_code[t])
            if nb:
                bits.put(nb, v)
    else:
        bits.put(TBIT, 0)
        bits.put(TBIT, 0)
        bits.put(CBIT, 0)
        bits.put(CBIT, c_used[0])
    c_code = codes(c_len)
    p_len = lengths(p_freq)
    p_used = [i for i, f in enumerate(p_freq) if f]
    if len(p_used) >= 2:
        write_pt_len(bits, p_len, NP, PBIT, -1)
    else:
        bits.put(PBIT, 0)
        bits.put(PBIT, p_used[0] if p_used else 0)
    p_code = codes(p_len)
    for x in block:
        if isinstance(x, int):
            if c_len[x]:
                bits.put(c_len[x], c_code[x])
        else:
            c = 256 + x[0] - MINMATCH
            if c_len[c]:
                bits.put(c_len[c], c_code[c])
            p = pcode(x[1])
            if p_len[p]:
                bits.put(p_len[p], p_code[p])
            if p > 1:
                bits.put(p - 1, x[1])


def lh5(data: bytes) -> bytes:
    bits = Bits()
    todo = lz(data)
    for i in range(0, len(todo), BLOCK):
        send_block(bits, todo[i:i + BLOCK])
    return bits.end()


def entry(name: str, data: bytes, mtime: float, comprimir: bool) -> bytes:
    fname = name.replace("/", "\\").encode("latin-1")
    metodo, cuerpo = b"-lh0-", data
    if comprimir and data:
        z = lh5(data)
        if len(z) < len(data):
            metodo, cuerpo = b"-lh5-", z
    body = (metodo + struct.pack("<IIIBB", len(cuerpo), len(data), dos_time(mtime), 0x20, 0)
            + bytes([len(fname)]) + fname + struct.pack("<H", crc16(data)))
    header = bytes([len(body), sum(body) & 0xFF]) + body
    return header + cuerpo


def main():
    args = sys.argv[1:]
    comprimir = True
    if args and args[0] == "--lh0":
        comprimir = False
        args = args[1:]
    if len(args) < 2:
        sys.exit(__doc__)
    archive = args[0]
    out = b""
    for top in (t.rstrip("/") for t in args[1:]):
        base = os.path.dirname(top)
        if os.path.isfile(top):
            with open(top, "rb") as fh:
                out += entry(os.path.relpath(top, base), fh.read(), os.path.getmtime(top), comprimir)
            continue
        for root, dirs, files in os.walk(top):
            dirs.sort()
            for f in sorted(files):
                path = os.path.join(root, f)
                with open(path, "rb") as fh:
                    out += entry(os.path.relpath(path, base), fh.read(), os.path.getmtime(path), comprimir)
    with open(archive, "wb") as fh:
        fh.write(out + b"\0")


if __name__ == "__main__":
    main()
