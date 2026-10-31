// Zips the extension folder for the Chrome Web Store: `node scripts/package.mjs`.
// Writes dist/bettertabs-<version>.zip containing only what Chrome loads (no docs, scripts or preview).
// No dependencies: the zip is written here with Node's built-in zlib.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extension = join(root, 'extension');
const { version } = JSON.parse(readFileSync(join(extension, 'manifest.json'), 'utf8'));

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const list = (folder) =>
  readdirSync(folder)
    .sort()
    .flatMap((name) => {
      const path = join(folder, name);
      if (name === '.DS_Store') return [];
      return statSync(path).isDirectory() ? list(path) : [path];
    });

const chunks = [];
const directory = [];
let offset = 0;
for (const path of list(extension)) {
  const name = Buffer.from(relative(extension, path).split('\\').join('/'));
  const data = readFileSync(path);
  const packed = deflateRawSync(data);
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(0x0021, 12); // 1980-01-01, so the zip is reproducible
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(packed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  chunks.push(local, name, packed);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(8, 10);
  entry.writeUInt16LE(0x0021, 14);
  entry.writeUInt32LE(crc, 16);
  entry.writeUInt32LE(packed.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE(offset, 42);
  directory.push(entry, name);

  offset += local.length + name.length + packed.length;
}

const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(directory.length / 2, 8);
end.writeUInt16LE(directory.length / 2, 10);
end.writeUInt32LE(directorySize, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(join(root, 'dist'), { recursive: true });
const target = join(root, 'dist', `bettertabs-${version}.zip`);
writeFileSync(target, Buffer.concat([...chunks, ...directory, end]));
console.log(`✓ ${relative(root, target)} (${directory.length / 2} files)`);
