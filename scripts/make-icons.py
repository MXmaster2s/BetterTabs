"""Draws the toolbar icons (a folder with a highlighted tab) as PNGs.

Run with: python3 scripts/make-icons.py
Uses only the standard library, so there is nothing to install.
"""

import struct
import zlib
from pathlib import Path

INK = (36, 69, 107)
MARK = (255, 217, 61)
LINE = (237, 241, 245)


def rounded_rect(x, y, x0, y0, x1, y1, r):
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def colour_at(x, y):
    """Colour of the 128x128 design at point (x, y), or None for transparent."""
    if rounded_rect(x, y, 14, 20, 64, 46, 9):
        return MARK
    if rounded_rect(x, y, 10, 36, 118, 110, 12):
        for top in (54, 72, 90):
            if rounded_rect(x, y, 26, top, 102 if top != 90 else 76, top + 8, 4):
                return LINE
        return INK
    return None


def draw(size, samples=4):
    scale = 128 / size
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            totals = [0, 0, 0]
            hits = 0
            for sy in range(samples):
                for sx in range(samples):
                    c = colour_at((px + (sx + 0.5) / samples) * scale, (py + (sy + 0.5) / samples) * scale)
                    if c:
                        hits += 1
                        for i in range(3):
                            totals[i] += c[i]
            if hits:
                row += bytes([totals[0] // hits, totals[1] // hits, totals[2] // hits, 255 * hits // samples**2])
            else:
                row += bytes(4)
        rows.append(bytes(row))
    return png(size, b"".join(rows))


def png(size, raw):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "extension" / "icons"
    out.mkdir(exist_ok=True)
    for size in (16, 32, 48, 128):
        (out / f"icon{size}.png").write_bytes(draw(size))
