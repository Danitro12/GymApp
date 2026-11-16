// ─── Formato de intercambio de rutinas ────────────────────────────────────────
// Tabla (Excel, CSV, texto pegado o Markdown), una fila por ejercicio:
//
//   Rutina | Días     | Ejercicio                 | Series | Reps     | ID ejercicio (opcional)
//   Torso  | Lun, Jue | Press de banca con barra  | 4      | 8-8-6-6
//          |          | Dominadas supinas         | 3      | 10
//
// - Si "Rutina" está vacía, la fila pertenece a la rutina de arriba.
// - Días: Lun/Mar/Mié/Jue/Vie/Sáb/Dom, L M X J V S D, Mon..Sun o 1-7.
// - Reps: un número (igual en todas las series) o una lista "12-10-8".
//   También vale "4x10" en Series o en Reps.
// - El ejercicio se busca por nombre (español o inglés, sin importar tildes ni
//   mayúsculas) o por su ID. También se aceptan los ejercicios propios.
// También se acepta JSON: [{ name, days, exercises: [{ exercise, sets, reps }] }].

// Sin dependencias del catálogo (que importa SVG) para poder probarlo aislado.
const nameIn = (ex, language) => ex?.name_i18n?.[language] || ex?.name || '';

const MAX_SETS = 20;
const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

export const normalizeText = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// ── Cabeceras ──
const HEADER_ALIASES = {
  routine: ['rutina', 'routine', 'nombre rutina', 'routine name', 'dia de entreno', 'workout'],
  days: ['dias', 'dia', 'days', 'day', 'dias de entreno', 'training days'],
  exercise: ['ejercicio', 'exercise', 'nombre', 'name', 'ejercicios', 'exercises'],
  sets: ['series', 'sets', 'set', 'serie', 'n series', 'num series'],
  reps: ['reps', 'repeticiones', 'repetitions', 'rep', 'repes'],
  exerciseId: ['id ejercicio', 'exercise id', 'id', 'exerciseid', 'id del ejercicio'],
};
const HEADER_LOOKUP = Object.entries(HEADER_ALIASES).reduce((acc, [key, list]) => {
  list.forEach((a) => { acc[normalizeText(a)] = key; });
  return acc;
}, {});
const headerKey = (cell) => HEADER_LOOKUP[normalizeText(cell).replace(/ opcional$/, '').trim()] || null;

const DEFAULT_COLUMNS = ['routine', 'days', 'exercise', 'sets', 'reps', 'exerciseId'];

// ── Días ──
const DAY_TOKENS = {
  lunes: 0, lun: 0, l: 0, monday: 0, mon: 0, mo: 0,
  martes: 1, mar: 1, m: 1, tuesday: 1, tue: 1, tues: 1, tu: 1,
  miercoles: 2, mie: 2, mi: 2, x: 2, wednesday: 2, wed: 2, we: 2, w: 2,
  jueves: 3, jue: 3, j: 3, thursday: 3, thu: 3, thur: 3, thurs: 3, th: 3,
  viernes: 4, vie: 4, v: 4, friday: 4, fri: 4, fr: 4, f: 4,
  sabado: 5, sab: 5, s: 5, saturday: 5, sat: 5, sa: 5,
  domingo: 6, dom: 6, d: 6, sunday: 6, sun: 6, su: 6,
};

export const parseDays = (value) => {
  if (Array.isArray(value)) return [...new Set(value.flatMap((v) => parseDays(v)))].sort();
  if (typeof value === 'number') return value >= 1 && value <= 7 ? [value - 1] : [];
  const tokens = normalizeText(value).split(' ').filter(Boolean);
  const out = new Set();
  tokens.forEach((tok) => {
    if (/^[1-7]$/.test(tok)) out.add(Number(tok) - 1);
    else if (tok in DAY_TOKENS) out.add(DAY_TOKENS[tok]);
  });
  return [...out].sort();
};

const DAY_NAMES = {
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
export const formatDays = (days, language) =>
  (days || []).slice().sort().map((d) => (DAY_NAMES[language] || DAY_NAMES.en)[d]).filter(Boolean).join(', ');

// ── Series / reps ──
const numbersIn = (s) => (String(s ?? '').match(/\d+/g) || []).map(Number);

export const parseSetsReps = (setsCell, repsCell) => {
  let sets = null;
  let repsList = [];
  const setsStr = String(setsCell ?? '').trim();
  const repsStr = String(repsCell ?? '').trim();

  // "4x10" o "4 × 10" en cualquiera de las dos columnas
  const nxm = /^(\d+)\s*[x×*]\s*(\d+)/i;
  const mSets = nxm.exec(setsStr);
  const mReps = nxm.exec(repsStr);
  if (mSets) { sets = Number(mSets[1]); repsList = [Number(mSets[2])]; }
  else if (mReps) { sets = Number(mReps[1]); repsList = [Number(mReps[2])]; }
  else {
    if (setsStr !== '') sets = numbersIn(setsStr)[0] ?? null;
    repsList = numbersIn(repsStr);
  }

  if (!sets && repsList.length > 1) sets = repsList.length;
  if (!sets) sets = DEFAULT_SETS;
  sets = Math.max(1, Math.min(MAX_SETS, sets));

  let reps;
  if (repsList.length === 0) reps = Array(sets).fill(DEFAULT_REPS);
  else if (repsList.length === sets) reps = repsList;
  else if (repsList.length === 2 && sets !== 2) reps = Array(sets).fill(Math.min(...repsList)); // rango "8-12"
  else reps = Array.from({ length: sets }, (_, i) => repsList[Math.min(i, repsList.length - 1)]);

  return reps.map((r) => Math.max(0, Math.min(999, r)));
};

// ── Búsqueda de ejercicios ──
export const buildExerciseMatcher = (exercises) => {
  const exact = new Map();
  const entries = [];
  exercises.forEach((ex) => {
    const names = [ex.name, ex.name_i18n?.es, ex.name_i18n?.en].filter(Boolean);
    exact.set(normalizeText(ex.id), ex);
    names.forEach((n) => {
      const key = normalizeText(n);
      if (key && !exact.has(key)) exact.set(key, ex);
      entries.push({ key, ex });
    });
  });

  return (name, id) => {
    if (id) {
      const byId = exact.get(normalizeText(id));
      if (byId) return { exercise: byId, approx: false };
    }
    const q = normalizeText(name);
    if (!q) return { exercise: null, approx: false };
    if (exact.has(q)) return { exercise: exact.get(q), approx: false };
    // Coincidencia parcial: nos quedamos con la más parecida en longitud.
    const candidates = entries.filter(({ key }) => key.length >= 4 && (key.includes(q) || q.includes(key)));
    if (!candidates.length) return { exercise: null, approx: false };
    candidates.sort((a, b) => Math.abs(a.key.length - q.length) - Math.abs(b.key.length - q.length));
    return { exercise: candidates[0].ex, approx: true };
  };
};

// ── Filas → rutinas ──
const findHeader = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const keys = rows[i].map(headerKey);
    if (keys.includes('exercise') && keys.filter(Boolean).length >= 2) return { index: i, keys };
  }
  return null;
};

/**
 * @returns {{ routines: Array<{name, days, items: Array<{raw, exercise, approx, reps: number[]}>}>, error?: string }}
 */
export const rowsToRoutines = (rows, { exercises, fallbackName = 'Rutina' }) => {
  const clean = (rows || []).map((r) => (r || []).map((c) => (c === null || c === undefined ? '' : c)));
  const header = findHeader(clean);
  const keys = header ? header.keys : DEFAULT_COLUMNS;
  const dataRows = clean.slice(header ? header.index + 1 : 0);
  const col = (key) => keys.indexOf(key);
  const iRoutine = col('routine');
  const iDays = col('days');
  const iExercise = col('exercise');
  const iSets = col('sets');
  const iReps = col('reps');
  const iId = col('exerciseId');
  if (iExercise < 0) return { routines: [], error: 'noExerciseColumn' };

  const match = buildExerciseMatcher(exercises);
  const routines = [];
  let current = null;

  dataRows.forEach((row) => {
    const get = (i) => (i >= 0 ? row[i] : '');
    const routineName = String(get(iRoutine) ?? '').trim();
    const exName = String(get(iExercise) ?? '').trim();
    if (!routineName && !exName) return;

    if (routineName && (!current || normalizeText(current.name) !== normalizeText(routineName))) {
      current = routines.find((r) => normalizeText(r.name) === normalizeText(routineName));
      if (!current) {
        current = { name: routineName, days: [], items: [] };
        routines.push(current);
      }
    }
    if (!current) {
      current = { name: fallbackName, days: [], items: [] };
      routines.push(current);
    }
    const days = parseDays(get(iDays));
    if (days.length) current.days = [...new Set([...current.days, ...days])].sort();
    if (!exName) return;

    const { exercise, approx } = match(exName, get(iId));
    current.items.push({ raw: exName, exercise, approx, reps: parseSetsReps(get(iSets), get(iReps)) });
  });

  return { routines: routines.filter((r) => r.items.length) };
};

// ── JSON → rutinas ──
export const jsonToRoutines = (data, { exercises, fallbackName = 'Rutina' }) => {
  const list = Array.isArray(data) ? data : (data?.routines || (data?.exercises ? [data] : []));
  const match = buildExerciseMatcher(exercises);
  const routines = list.map((r, idx) => ({
    name: String(r.name || r.rutina || r.routine || `${fallbackName} ${idx + 1}`).trim(),
    days: parseDays(r.days ?? r.dias ?? r['días'] ?? []),
    items: (r.exercises || r.ejercicios || []).map((e) => {
      const raw = String(e.exercise || e.ejercicio || e.name || e.nombre || e.exerciseId || '').trim();
      const { exercise, approx } = match(raw, e.exerciseId || e.id);
      // Formato propio de la app: sets = [{ reps }]
      const reps = Array.isArray(e.sets)
        ? e.sets.map((s) => Number(typeof s === 'object' ? s.reps : s) || DEFAULT_REPS)
        : parseSetsReps(e.sets ?? e.series, Array.isArray(e.reps) ? e.reps.join('-') : e.reps);
      return { raw, exercise, approx, reps };
    }).filter((i) => i.raw),
  })).filter((r) => r.items.length);
  return { routines };
};

// ── Texto cualquiera → rutinas ──
export const parseRoutinesText = (text, opts, textToRows) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { routines: [] };
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return jsonToRoutines(JSON.parse(trimmed), opts);
    } catch {
      // no era JSON válido: lo intentamos como tabla
    }
  }
  return rowsToRoutines(textToRows(trimmed), opts);
};

// Rutina parseada → rutina de la app (solo ejercicios encontrados).
export const toAppRoutine = (parsed, idSuffix = '') => {
  const seen = new Set();
  const exercises = [];
  parsed.items.forEach((item) => {
    if (!item.exercise || seen.has(item.exercise.id)) return;
    seen.add(item.exercise.id);
    exercises.push({
      id: item.exercise.id,
      exerciseId: item.exercise.id,
      sets: item.reps.map((reps, i) => ({ id: `s_${Date.now().toString(36)}${idSuffix}${exercises.length}_${i}`, reps, weight: 0 })),
      order: exercises.length,
    });
  });
  return {
    id: `r_${Date.now()}${idSuffix}`,
    name: parsed.name,
    createdAt: new Date().toISOString(),
    exercises,
    days: parsed.days,
  };
};

// ── Rutinas de la app → filas para exportar ──
export const routinesToRows = (routines, { language, getExercise }) => {
  const head = language === 'es'
    ? ['Rutina', 'Días', 'Ejercicio', 'Series', 'Reps', 'ID ejercicio']
    : ['Routine', 'Days', 'Exercise', 'Sets', 'Reps', 'Exercise ID'];
  const rows = [head];
  routines.forEach((r) => {
    (r.exercises || []).forEach((ex, i) => {
      const exercise = getExercise(ex.exerciseId);
      const name = exercise ? nameIn(exercise, language) : (ex.exerciseName || ex.exerciseId);
      const reps = (ex.sets || []).map((s) => Number(s.reps) || 0);
      const allSame = reps.every((x) => x === reps[0]);
      rows.push([
        i === 0 ? r.name : '',
        i === 0 ? formatDays(r.days, language) : '',
        name,
        reps.length,
        allSame ? (reps[0] ?? '') : reps.join('-'),
        ex.exerciseId,
      ]);
    });
  });
  return rows;
};
