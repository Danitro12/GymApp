import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://api.workoutapi.com';
const API_KEY = process.env.WORKOUT_API_KEY;

if (!API_KEY) {
  console.error('Missing env var WORKOUT_API_KEY');
  console.error('PowerShell example: $env:WORKOUT_API_KEY="your_key"; node scripts/fetchWorkoutApiExercises.mjs');
  process.exit(1);
}

const OUT_JSON = path.resolve('data', 'workout_api_exercises.json');
const OUT_IMAGES_DIR = path.resolve('assets', 'workout-api-images');

const jsonHeaders = {
  Accept: 'application/json',
  'x-api-key': API_KEY,
};

const svgHeaders = {
  Accept: 'image/svg+xml',
  'x-api-key': API_KEY,
};

function getExerciseId(exercise, index) {
  return exercise.id ?? exercise.exercise_id ?? exercise.uuid ?? exercise.slug ?? index + 1;
}

async function fetchExercises() {
  const res = await fetch(`${API_BASE}/exercises`, { headers: jsonHeaders });
  if (!res.ok) {
    throw new Error(`Failed to fetch exercises: ${res.status}`);
  }

  const payload = await res.json();
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.exercises)) return payload.exercises;
  if (Array.isArray(payload.data)) return payload.data;

  throw new Error('Unexpected exercises response format');
}

async function fetchExerciseSvg(exerciseId) {
  const res = await fetch(`${API_BASE}/exercises/${exerciseId}/image`, { headers: svgHeaders });
  if (!res.ok) {
    throw new Error(`Failed to fetch image for ${exerciseId}: ${res.status}`);
  }

  return res.text();
}

async function main() {
  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.mkdir(OUT_IMAGES_DIR, { recursive: true });

  const exercises = await fetchExercises();
  const enriched = [];

  for (let i = 0; i < exercises.length; i += 1) {
    const exercise = exercises[i];
    const exerciseId = getExerciseId(exercise, i);
    const fileName = `${String(exerciseId)}.svg`;
    const filePath = path.join(OUT_IMAGES_DIR, fileName);

    try {
      const svg = await fetchExerciseSvg(exerciseId);
      await fs.writeFile(filePath, svg, 'utf8');
      enriched.push({
        ...exercise,
        localImage: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      });
      console.log(`Downloaded image for exercise ${exerciseId}`);
    } catch (error) {
      console.warn(`Skipping image for exercise ${exerciseId}: ${error.message}`);
      enriched.push(exercise);
    }
  }

  await fs.writeFile(OUT_JSON, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`Saved ${enriched.length} exercises in ${OUT_JSON}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
