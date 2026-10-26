// Copies the web app (single source of truth in ../cold-cap-timer) into www/ for Capacitor.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, '..', 'cold-cap-timer');
const dest = join(root, 'www');
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const f of ['index.html', 'logic.js', 'manifest.webmanifest', 'icons']) {
  cpSync(join(src, f), join(dest, f), { recursive: true });
}
