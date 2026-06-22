import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const src = join(root, 'timesheet.png');
const iconsDir = join(root, 'src-tauri', 'icons');

function createIco(pngBuffers) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(headerSize + numImages * dirEntrySize);

  // ICO header
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: ICO
  header.writeUInt16LE(numImages, 4); // count

  let offset = headerSize + numImages * dirEntrySize;
  for (let i = 0; i < numImages; i++) {
    const png = pngBuffers[i];
    const entryOffset = headerSize + i * dirEntrySize;

    // Get image dimensions from PNG
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    header.writeUInt8(width >= 256 ? 0 : width, entryOffset);       // width
    header.writeUInt8(height >= 256 ? 0 : height, entryOffset + 1);  // height
    header.writeUInt8(0, entryOffset + 2);   // colors
    header.writeUInt8(0, entryOffset + 3);   // reserved
    header.writeUInt16LE(1, entryOffset + 4); // planes
    header.writeUInt16LE(32, entryOffset + 6); // bpp
    header.writeUInt32LE(png.length, entryOffset + 8);  // image size
    header.writeUInt32LE(offset, entryOffset + 12);      // image offset

    offset += png.length;
  }

  return Buffer.concat([header, ...pngBuffers]);
}

async function main() {
  // icon.png (1024x1024)
  await sharp(src)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(iconsDir, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  // Generate PNG buffers at various sizes for ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(src)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    ),
  );

  // Create proper ICO
  const icoBuf = createIco(pngBuffers);
  writeFileSync(join(iconsDir, 'icon.ico'), icoBuf);
  console.log('Generated icon.ico (multi-size, proper format)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
