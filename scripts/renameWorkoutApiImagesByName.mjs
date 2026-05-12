import fs from 'node:fs/promises';
import path from 'node:path';

const JSON_PATH = path.resolve('data', 'workout_api_exercises.json');
const IMAGES_DIR = path.resolve('assets', 'workout-api-images');

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getUniqueTarget(baseName, ext) {
  let n = 1;
  let candidate = `${baseName}${ext}`;

  while (await fileExists(path.join(IMAGES_DIR, candidate))) {
    n += 1;
    candidate = `${baseName}-${n}${ext}`;
  }

  return candidate;
}

function sourceFromExercise(exercise) {
  if (exercise.localImage) {
    return path.resolve(exercise.localImage);
  }

  if (exercise.id) {
    return path.join(IMAGES_DIR, `${exercise.id}.svg`);
  }

  return null;
}

async function main() {
  const raw = await fs.readFile(JSON_PATH, 'utf8');
  const exercises = JSON.parse(raw);

  if (!Array.isArray(exercises)) {
    throw new Error('Expected JSON root to be an array of exercises');
  }

  let renamedCount = 0;

  for (const exercise of exercises) {
    const sourcePath = sourceFromExercise(exercise);
    if (!sourcePath) continue;

    if (!(await fileExists(sourcePath))) {
      continue;
    }

    const sourceExt = path.extname(sourcePath) || '.svg';
    const safeName = slugify(exercise.name) || slugify(exercise.code) || String(exercise.id || 'exercise');
    const uniqueFile = await getUniqueTarget(safeName, sourceExt);
    const targetPath = path.join(IMAGES_DIR, uniqueFile);

    if (path.resolve(sourcePath) !== path.resolve(targetPath)) {
      await fs.rename(sourcePath, targetPath);
      renamedCount += 1;
    }

    exercise.localImage = path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
  }

  await fs.writeFile(JSON_PATH, JSON.stringify(exercises, null, 2), 'utf8');

  console.log(`Renamed ${renamedCount} image files.`);
  console.log(`Updated JSON at ${JSON_PATH}.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
