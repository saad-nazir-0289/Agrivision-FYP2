import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// backend/storage/ndvi, worked out from this file so it is the same wherever the server is started.
const ROOT = fileURLToPath(new URL('../../storage/ndvi/', import.meta.url));

export async function savePixels(file, pixels) {
  const full = path.join(ROOT, file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(pixels));
}

export const loadPixels = async (file) => JSON.parse(await fs.readFile(path.join(ROOT, file), 'utf8'));

export const removeAoiFolder = (aoiId) => fs.rm(path.join(ROOT, String(aoiId)), { recursive: true, force: true });