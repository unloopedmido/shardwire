import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public');
const outFile = path.join(outDir, 'og.png');

const width = 1200;
const height = 630;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0c0f"/>
      <stop offset="100%" stop-color="#16161d"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="72" y="220" font-family="ui-sans-serif, system-ui, sans-serif" font-size="76" font-weight="700" fill="#f4f4f5">Shardwire</text>
  <text x="72" y="300" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" fill="#a1a1aa">Discord split-process bridge</text>
  <text x="72" y="360" font-family="ui-mono, ui-monospace, monospace" font-size="22" fill="#71717a">shardwire.js.org</text>
</svg>`;

await mkdir(outDir, { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).resize(width, height).toFile(outFile);
process.stdout.write(`generate-og: wrote ${path.relative(process.cwd(), outFile)}\n`);
