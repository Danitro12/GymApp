// Vercel no publica carpetas llamadas node_modules dentro del output, y Expo
// exporta ahí las fuentes de iconos (dist/assets/node_modules/...). La movemos
// a dist/assets/vendor y vercel.json redirige las rutas antiguas.
import { existsSync, renameSync } from 'node:fs';

const from = 'dist/assets/node_modules';
const to = 'dist/assets/vendor';
if (existsSync(from)) {
  renameSync(from, to);
  console.log(`Moved ${from} -> ${to}`);
} else {
  console.log(`${from} not found, nothing to move`);
}
