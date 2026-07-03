/**
 * Minimal store-only (uncompressed) ZIP writer — just enough to assemble a
 * valid .xlsx (an OOXML zip) with no dependencies. Files are stored with
 * method 0 (no compression), which Excel/Numbers/LibreOffice all open fine.
 */

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    const idx = (c ^ byte) & 0xff;
    c = (CRC_TABLE[idx] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Encode a string to UTF-8 bytes without relying on the DOM `TextEncoder`. */
export function utf8Bytes(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

/** Build a ZIP archive (stored, no compression) from the given entries. */
export function zipStore(entries: ZipEntry[]): Uint8Array {
  const prepped = entries.map((e) => {
    const name = utf8Bytes(e.name);
    return { name, data: e.data, crc: crc32(e.data), size: e.data.length };
  });

  // total size: per-entry (local header 30 + name + data) + (central 46 + name) + EOCD 22
  let total = 22;
  for (const p of prepped) total += 30 + p.name.length + p.size + 46 + p.name.length;

  const buf = new Uint8Array(total);
  const dv = new DataView(buf.buffer);
  let pos = 0;
  const u16 = (v: number) => {
    dv.setUint16(pos, v & 0xffff, true);
    pos += 2;
  };
  const u32 = (v: number) => {
    dv.setUint32(pos, v >>> 0, true);
    pos += 4;
  };
  const write = (b: Uint8Array) => {
    buf.set(b, pos);
    pos += b.length;
  };

  // local headers + file data
  const localOffsets: number[] = [];
  for (const p of prepped) {
    localOffsets.push(pos);
    u32(0x04034b50);
    u16(20);
    u16(0);
    u16(0); // method: stored
    u16(0);
    u16(0); // mod time/date
    u32(p.crc);
    u32(p.size);
    u32(p.size);
    u16(p.name.length);
    u16(0); // extra len
    write(p.name);
    write(p.data);
  }

  // central directory
  const cdStart = pos;
  prepped.forEach((p, i) => {
    u32(0x02014b50);
    u16(20);
    u16(20);
    u16(0);
    u16(0);
    u16(0);
    u16(0);
    u32(p.crc);
    u32(p.size);
    u32(p.size);
    u16(p.name.length);
    u16(0);
    u16(0);
    u16(0);
    u16(0);
    u32(0);
    u32(localOffsets[i] ?? 0);
    write(p.name);
  });
  const cdSize = pos - cdStart;

  // end of central directory
  u32(0x06054b50);
  u16(0);
  u16(0);
  u16(prepped.length);
  u16(prepped.length);
  u32(cdSize);
  u32(cdStart);
  u16(0);

  return buf;
}
