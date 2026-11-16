import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  loadActiveWorkout,
  saveActiveWorkout,
  clearActiveWorkout,
  saveWorkoutToHistory,
  updateRoutineRecords,
} from '../data/storage';
import { getExerciseById, getExerciseName } from '../data/exercises';
import { toDateKey } from '../utils/date';
import useKeepScreenOn from '../hooks/useKeepScreenOn';

// ─── Entrenamiento activo ─────────────────────────────────────────────────────
// El cronómetro NO cuenta ticks: guarda cuándo se puso en marcha
// (`runningSince`) y el tiempo acumulado antes de la última pausa. El tiempo
// transcurrido se calcula siempre con Date.now(), así que sigue avanzando
// aunque cambies de pestaña, bloquees el móvil o se recargue la web.
//
// La sesión completa se guarda en AsyncStorage (localStorage en web) en cada
// cambio y se restaura al abrir la app.

const WorkoutContext = createContext(null);

export const getElapsedMs = (session, now = Date.now()) => {
  if (!session?.timer) return 0;
  const { accumulatedMs = 0, runningSince = null } = session.timer;
  return accumulatedMs + (runningSince ? Math.max(0, now - runningSince) : 0);
};

// Descanso = tiempo desde la última serie marcada (null si aún no hay ninguna).
export const getRestMs = (session, now = Date.now()) => (
  session?.lastSetAt ? Math.max(0, now - session.lastSetAt) : null
);

const buildSession = (routine) => {
  const now = Date.now();
  return {
    id: `w_${now}`,
    routine: {
      id: routine.id,
      name: routine.name,
      exercises: routine.exercises || [],
    },
    exerciseSets: (routine.exercises || []).map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: (ex.sets || []).map((_, i) => ({ id: i + 1, reps: '', weight: '', checked: false })),
    })),
    currentIndex: 0,
    startedAt: now,
    timer: { accumulatedMs: 0, runningSince: now },
    lastSetAt: null,
    updatedAt: now,
  };
};

export const countCompletedExercises = (session) =>
  (session?.exerciseSets || []).filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.checked)).length;

export function WorkoutProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const sessionRef = useRef(null);
  const saveTimeout = useRef(null);

  // Pantalla siempre encendida mientras haya un entreno en curso.
  useKeepScreenOn(!!session);

  useEffect(() => {
    loadActiveWorkout().then((saved) => {
      if (saved?.routine && Array.isArray(saved.exerciseSets)) {
        sessionRef.current = saved;
        setSession(saved);
      }
      setLoaded(true);
    });
  }, []);

  // Guardado inmediato (para cuando la app pasa a segundo plano).
  const flush = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    if (sessionRef.current) saveActiveWorkout(sessionRef.current);
  }, []);

  // Guardado con pequeño retardo para no escribir en cada pulsación.
  const scheduleSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(flush, 300);
  }, [flush]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flush();
    });
    let removeWeb = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('pagehide', flush);
      removeWeb = () => {
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('pagehide', flush);
      };
    }
    return () => { sub.remove(); removeWeb(); };
  }, [flush]);

  const updateSession = useCallback((updater) => {
    const prev = sessionRef.current;
    if (!prev) return;
    const next = { ...updater(prev), updatedAt: Date.now() };
    sessionRef.current = next;
    setSession(next);
    scheduleSave();
  }, [scheduleSave]);

  const startWorkout = useCallback((routine) => {
    const next = buildSession(routine);
    sessionRef.current = next;
    setSession(next);
    saveActiveWorkout(next);
    return next;
  }, []);

  const endSession = useCallback(async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = null;
    sessionRef.current = null;
    setSession(null);
    await clearActiveWorkout();
  }, []);

  const discardWorkout = endSession;

  const finishWorkout = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return null;
    const now = Date.now();
    const elapsedMs = getElapsedMs(current, now);
    const entry = {
      id: `h_${now}`,
      routineId: current.routine.id,
      routineName: current.routine.name,
      date: toDateKey(new Date(current.startedAt)),
      startedAt: new Date(current.startedAt).toISOString(),
      finishedAt: new Date(now).toISOString(),
      duration: Math.round(elapsedMs / 60000),
      durationSeconds: Math.round(elapsedMs / 1000),
      exercisesCompleted: countCompletedExercises(current),
      totalExercises: current.routine.exercises.length,
      // Guardamos el nombre por si el ejercicio se borra más adelante.
      sets: current.exerciseSets.map((ex) => ({
        ...ex,
        exerciseName: getExerciseName(getExerciseById(ex.exerciseId), 'en') || ex.exerciseId,
      })),
    };
    await saveWorkoutToHistory(entry);
    await updateRoutineRecords(current.routine.id, current.exerciseSets);
    await endSession();
    return entry;
  }, [endSession]);

  // ── Cronómetro ──
  const pauseTimer = useCallback(() => updateSession((s) => {
    if (!s.timer.runningSince) return s;
    return { ...s, timer: { accumulatedMs: getElapsedMs(s), runningSince: null } };
  }), [updateSession]);

  const resumeTimer = useCallback(() => updateSession((s) => {
    if (s.timer.runningSince) return s;
    return { ...s, timer: { ...s.timer, runningSince: Date.now() } };
  }), [updateSession]);

  const resetTimer = useCallback(() => updateSession((s) => ({
    ...s,
    timer: { accumulatedMs: 0, runningSince: s.timer.runningSince ? Date.now() : null },
  })), [updateSession]);

  // Reinicia el cronómetro de descanso (al marcar una serie o a mano).
  const restartRest = useCallback(() => updateSession((s) => ({ ...s, lastSetAt: Date.now() })), [updateSession]);

  const value = useMemo(() => ({
    loaded,
    session,
    startWorkout,
    updateSession,
    finishWorkout,
    discardWorkout,
    pauseTimer,
    resumeTimer,
    resetTimer,
    restartRest,
  }), [loaded, session, startWorkout, updateSession, finishWorkout, discardWorkout, pauseTimer, resumeTimer, resetTimer, restartRest]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export const useWorkout = () => useContext(WorkoutContext);

// Fuerza un re-render periódico mientras `active` sea true y, además, en cuanto
// la app/pestaña vuelve a primer plano (el navegador congela los intervalos de
// las pestañas en segundo plano; al volver el tiempo se recalcula al instante).
export function useNow(active, intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    let removeWeb = () => {};
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisible = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
      document.addEventListener('visibilitychange', onVisible);
      removeWeb = () => document.removeEventListener('visibilitychange', onVisible);
    }
    return () => { clearInterval(id); sub.remove(); removeWeb(); };
  }, [active, intervalMs]);
  return now;
}
