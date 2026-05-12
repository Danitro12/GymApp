import fs from 'node:fs/promises';
import path from 'node:path';

const JSON_PATH = path.resolve('data', 'workout_api_exercises.json');
const OUT_PATH = path.resolve('data', 'exercises.js');

// Mapeo de códigos de músculos a nombres cortos
const muscleMapping = {
  TRAPEZIUS: 'traps',
  SHOULDERS: 'shoulders',
  CHEST: 'chest',
  TRICEPS: 'triceps',
  BICEPS: 'biceps',
  FOREARMS: 'forearms',
  BACK: 'back',
  ABS: 'abs',
  GLUTES: 'glutes',
  HAMSTRINGS: 'hamstrings',
  QUADS: 'quads',
  CALVES: 'calves',
};

function getMuscleKey(muscle) {
  const key = muscle.code || muscle.name || '';
  return muscleMapping[key] || key.toLowerCase().replace(/ /g, '_');
}

function computeMusclePercentages(exercise) {
  const muscles = {};

  const primaries = (exercise.primaryMuscles || []).filter(Boolean);
  const secondaries = (exercise.secondaryMuscles || []).filter(Boolean);

  if (primaries.length === 0 && secondaries.length === 0) {
    return muscles;
  }

  if (primaries.length > 0 && secondaries.length === 0) {
    // Solo primarios: distribuir 100% entre ellos
    const share = 1 / primaries.length;
    primaries.forEach((muscle) => {
      const key = getMuscleKey(muscle);
      muscles[key] = Math.round(share * 1000) / 1000;
    });
  } else if (primaries.length > 0 && secondaries.length > 0) {
    // Primarios + secundarios: 80% primarios, 20% secundarios
    const primaryShare = 0.8 / primaries.length;
    const secondaryShare = 0.2 / secondaries.length;

    primaries.forEach((muscle) => {
      const key = getMuscleKey(muscle);
      muscles[key] = Math.round(primaryShare * 1000) / 1000;
    });

    secondaries.forEach((muscle) => {
      const key = getMuscleKey(muscle);
      muscles[key] = Math.round(secondaryShare * 1000) / 1000;
    });
  } else if (secondaries.length > 0) {
    // Solo secundarios (raro): distribuir 100% entre ellos
    const share = 1 / secondaries.length;
    secondaries.forEach((muscle) => {
      const key = getMuscleKey(muscle);
      muscles[key] = Math.round(share * 1000) / 1000;
    });
  }

  return muscles;
}

function getCategory(exercise) {
  // Usar type si existe, o primer músculo primario si no
  if (exercise.categories && exercise.categories.length > 0) {
    return exercise.categories[0].name;
  }

  if (exercise.primaryMuscles && exercise.primaryMuscles.length > 0) {
    return exercise.primaryMuscles[0].name;
  }

  return 'General';
}

function toRequirePath(localImagePath) {
  if (!localImagePath) return null;
  // data/exercises.js -> assets/... requires one level up
  const normalized = String(localImagePath).replace(/\\/g, '/');
  return `../${normalized}`;
}

async function main() {
  const raw = await fs.readFile(JSON_PATH, 'utf8');
  const exercises = JSON.parse(raw);

  if (!Array.isArray(exercises)) {
    throw new Error('Expected JSON root to be an array of exercises');
  }

  const catalog = exercises.map((ex, idx) => ({
    id: `ex-${idx + 1}`,
    name: ex.name,
    category: getCategory(ex),
    muscles: computeMusclePercentages(ex),
    image: toRequirePath(ex.localImage),
  }));

  const code = `// ─── CATÁLOGO DE EJERCICIOS (generado automáticamente desde Workout API) ─────────────────────────
// Estos son los ejercicios disponibles para añadir a las rutinas del usuario.
// Las rutinas y el historial se guardan en AsyncStorage, no aquí.

export const EXERCISE_CATALOG = [
${catalog.map((ex) => {
  const musclesStr = Object.entries(ex.muscles)
    .map(([key, val]) => `    ${key}: ${val}`)
    .join(', ');
  const imageStr = ex.image ? `, image: require('${ex.image}')` : '';
  return `  { id: '${ex.id}', name: '${ex.name.replace(/'/g, "\\'")}', category: '${ex.category}', muscles: { ${musclesStr} }${imageStr} }`;
}).join(',\n')}
];

export const getExerciseById = (id) => EXERCISE_CATALOG.find((e) => e.id === id);
`;

  await fs.writeFile(OUT_PATH, code, 'utf8');

  console.log(`Generated ${catalog.length} exercises from Workout API.`);
  console.log(`Saved to ${OUT_PATH}.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
