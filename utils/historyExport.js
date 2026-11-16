// ─── Historial → hojas de Excel ───────────────────────────────────────────────
import { fromDateKey } from './date';
import { dateTime } from './xlsx';

const L = {
  es: {
    workouts: 'Entrenos',
    sets: 'Series',
    byExercise: 'Por ejercicio',
    w: ['Fecha', 'Hora inicio', 'Rutina', 'Duración (min)', 'Ejercicios completados', 'Ejercicios totales', 'Series registradas', 'Reps totales', 'Volumen (kg)'],
    s: ['Fecha', 'Rutina', 'Ejercicio', 'Serie', 'Reps', 'Peso (kg)', 'Volumen (kg)', 'Completada'],
    e: ['Ejercicio', 'Entrenos', 'Series', 'Reps totales', 'Volumen total (kg)', 'Peso máximo (kg)', '1RM estimado (kg)', 'Último entreno'],
    yes: 'Sí',
    no: 'No',
  },
  en: {
    workouts: 'Workouts',
    sets: 'Sets',
    byExercise: 'By exercise',
    w: ['Date', 'Start time', 'Routine', 'Duration (min)', 'Exercises completed', 'Total exercises', 'Sets logged', 'Total reps', 'Volume (kg)'],
    s: ['Date', 'Routine', 'Exercise', 'Set', 'Reps', 'Weight (kg)', 'Volume (kg)', 'Completed'],
    e: ['Exercise', 'Workouts', 'Sets', 'Total reps', 'Total volume (kg)', 'Max weight (kg)', 'Estimated 1RM (kg)', 'Last workout'],
    yes: 'Yes',
    no: 'No',
  },
};

const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const round1 = (n) => Math.round(n * 10) / 10;

export const filterHistoryByRange = (history, from, to) =>
  (history || []).filter((h) => (!from || h.date >= from) && (!to || h.date <= to));

/**
 * @param entries entradas del historial (cualquier orden)
 * @param nameOf (exerciseId, fallbackName) => nombre visible
 */
export const buildHistorySheets = (entries, { language, nameOf }) => {
  const l = L[language] || L.en;
  const sorted = [...entries].sort((a, b) => (a.date + (a.startedAt || '')).localeCompare(b.date + (b.startedAt || '')));

  const workoutRows = [l.w];
  const setRows = [l.s];
  const perExercise = new Map();

  sorted.forEach((h) => {
    const date = fromDateKey(h.date);
    let setsLogged = 0;
    let totalReps = 0;
    let volume = 0;

    (h.sets || []).forEach((ex) => {
      const name = nameOf(ex.exerciseId, ex.exerciseName);
      let agg = perExercise.get(ex.exerciseId);
      let touched = false;
      (ex.sets || []).forEach((s, i) => {
        const reps = num(s.reps);
        const weight = num(s.weight);
        if (reps <= 0 && weight <= 0) return;
        const vol = reps * weight;
        setsLogged += 1;
        totalReps += reps;
        volume += vol;
        setRows.push([date, h.routineName || '', name, i + 1, reps, weight, round1(vol), s.checked ? l.yes : l.no]);

        if (!agg) {
          agg = { name, workouts: 0, sets: 0, reps: 0, volume: 0, max: 0, e1rm: 0, last: h.date };
          perExercise.set(ex.exerciseId, agg);
        }
        touched = true;
        agg.sets += 1;
        agg.reps += reps;
        agg.volume += vol;
        agg.max = Math.max(agg.max, weight);
        // Fórmula de Epley; solo tiene sentido con peso y pocas reps.
        if (weight > 0 && reps > 0 && reps <= 12) agg.e1rm = Math.max(agg.e1rm, weight * (1 + reps / 30));
      });
      if (touched) {
        agg.workouts += 1;
        if (h.date > agg.last) agg.last = h.date;
      }
    });

    const minutes = h.durationSeconds != null ? round1(h.durationSeconds / 60) : num(h.duration);
    workoutRows.push([
      date,
      h.startedAt ? dateTime(new Date(h.startedAt)) : '',
      h.routineName || '',
      minutes,
      num(h.exercisesCompleted),
      num(h.totalExercises ?? h.exercisesCompleted),
      setsLogged,
      totalReps,
      round1(volume),
    ]);
  });

  const exerciseRows = [l.e, ...[...perExercise.values()]
    .sort((a, b) => b.volume - a.volume || a.name.localeCompare(b.name))
    .map((a) => [a.name, a.workouts, a.sets, a.reps, round1(a.volume), a.max, a.e1rm ? round1(a.e1rm) : '', fromDateKey(a.last)])];

  return [
    { name: l.workouts, rows: workoutRows, colWidths: [12, 17, 24, 15, 22, 18, 18, 13, 14] },
    { name: l.sets, rows: setRows, colWidths: [12, 24, 34, 7, 7, 11, 13, 12] },
    { name: l.byExercise, rows: exerciseRows, colWidths: [34, 10, 8, 13, 18, 17, 18, 15] },
  ];
};
