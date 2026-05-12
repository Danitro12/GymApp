import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ROUTINES: '@gymapp_routines',
  HISTORY:  '@gymapp_history',
  RECORDS:  '@gymapp_records',
};

// ─── RUTINAS ──────────────────────────────────────────────────────────────────

export const loadRoutines = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ROUTINES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading routines:', e);
    return [];
  }
};

export const saveRoutine = async (routine) => {
  try {
    const existing = await loadRoutines();
    const updated = [...existing, routine];
    await AsyncStorage.setItem(KEYS.ROUTINES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving routine:', e);
  }
};

export const updateRoutine = async (routine) => {
  try {
    const existing = await loadRoutines();
    const updated = existing.map((r) => (r.id === routine.id ? routine : r));
    await AsyncStorage.setItem(KEYS.ROUTINES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error updating routine:', e);
  }
};

export const deleteRoutine = async (routineId) => {
  try {
    const existing = await loadRoutines();
    const updated = existing.filter((r) => r.id !== routineId);
    await AsyncStorage.setItem(KEYS.ROUTINES, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting routine:', e);
  }
};

// ─── HISTORIAL ────────────────────────────────────────────────────────────────

export const loadHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading history:', e);
    return [];
  }
};

export const loadRecords = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RECORDS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error loading records:', e);
    return {};
  }
};

export const loadRoutineRecords = async (routineId) => {
  try {
    const all = await loadRecords();
    return all[routineId] || {};
  } catch (e) {
    console.error('Error loading routine records:', e);
    return {};
  }
};

export const updateRoutineRecords = async (routineId, exerciseSets) => {
  try {
    const existing = await loadRecords();
    const routineRecords = existing[routineId] || {};
    const updatedRoutine = { ...routineRecords };

    exerciseSets.forEach((exercise) => {
      const exId = exercise.exerciseId;
      const exRecords = updatedRoutine[exId] ? { ...updatedRoutine[exId] } : {};

      exercise.sets.forEach((set, setIndex) => {
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        if (weight === 0 && reps === 0) return;

        const prev = exRecords[setIndex] || { maxWeight: 0, maxRepsAtMaxWeight: 0 };

        if (weight > prev.maxWeight) {
          exRecords[setIndex] = { maxWeight: weight, maxRepsAtMaxWeight: reps };
          return;
        }

        if (weight === prev.maxWeight && reps > prev.maxRepsAtMaxWeight) {
          exRecords[setIndex] = { maxWeight: prev.maxWeight, maxRepsAtMaxWeight: reps };
        }
      });

      if (Object.keys(exRecords).length > 0) {
        updatedRoutine[exId] = exRecords;
      }
    });

    const updated = { ...existing, [routineId]: updatedRoutine };
    await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error updating routine records:', e);
  }
};

export const saveWorkoutToHistory = async (entry) => {
  try {
    const existing = await loadHistory();
    // Más reciente primero
    const updated = [entry, ...existing];
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving history entry:', e);
  }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(KEYS.HISTORY);
  } catch (e) {
    console.error('Error clearing history:', e);
  }
};

// ─── DEBUG: borrar todo (útil en desarrollo) ──────────────────────────────────
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([KEYS.ROUTINES, KEYS.HISTORY, KEYS.RECORDS]);
  } catch (e) {
    console.error('Error clearing all data:', e);
  }
};
