const fs = require('fs');
const path = require('path');

const batchFile = process.argv[2] || 'translate_exercises_batch1.json';
const batchPath = path.join(__dirname, batchFile);
const exercisesJsPath = path.join(__dirname, '..', 'data', 'exercises.js');
const workoutJsonPath = path.join(__dirname, '..', 'data', 'workout_api_exercises.json');

const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

const byId = new Map(batch.map((b) => [b.id, b]));
const byName = new Map(batch.map((b) => [b.name_en, b]));

const escapeJsString = (value) =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const updateExercisesJs = () => {
  const lines = fs.readFileSync(exercisesJsPath, 'utf8').split(/\r?\n/);
  const updated = lines.map((line) => {
    const idMatch = line.match(/id: '([^']+)'/);
    if (!idMatch) return line;
    const id = idMatch[1];
    const entry = byId.get(id);
    if (!entry) return line;
    if (line.includes('name_i18n') || line.includes('description_i18n')) return line;

    const nameEs = escapeJsString(entry.name_es);
    const descEs = escapeJsString(entry.description_es);

    let next = line.replace(
      /name: '((?:\\'|[^'])*)'/,
      (m, nameEn) => `name: '${nameEn}', name_i18n: { es: '${nameEs}' }`
    );

    next = next.replace(
      /description: '((?:\\'|[^'])*)'/,
      (m, descEn) => `description: '${descEn}', description_i18n: { es: '${descEs}' }`
    );

    return next;
  });

  fs.writeFileSync(exercisesJsPath, updated.join('\n'));
};

const updateWorkoutJson = () => {
  const json = JSON.parse(fs.readFileSync(workoutJsonPath, 'utf8'));
  const updated = json.map((ex) => {
    const entry = byName.get(ex.name);
    if (!entry) return ex;
    if (ex.name_i18n || ex.description_i18n) return ex;
    return {
      ...ex,
      name_i18n: { es: entry.name_es },
      description_i18n: { es: entry.description_es },
    };
  });

  fs.writeFileSync(workoutJsonPath, JSON.stringify(updated, null, 2));
};

updateExercisesJs();
updateWorkoutJson();
