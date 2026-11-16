import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  EXERCISE_CATALOG,
  registerCustomExercises,
  getExerciseById,
} from '../data/exercises';
import {
  loadCustomExercises,
  saveCustomExercises,
  removeExerciseFromRoutines,
} from '../data/storage';

const ExercisesContext = createContext(null);

const newCustomId = () => `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function ExercisesProvider({ children }) {
  const [customExercises, setCustomExercises] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadCustomExercises().then((list) => {
      registerCustomExercises(list);
      setCustomExercises(list);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (list) => {
    registerCustomExercises(list);
    setCustomExercises(list);
    await saveCustomExercises(list);
  }, []);

  const addCustomExercise = useCallback(async (data) => {
    const exercise = {
      ...data,
      id: newCustomId(),
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    await persist([...customExercises, exercise]);
    return exercise;
  }, [customExercises, persist]);

  const updateCustomExercise = useCallback(async (id, data) => {
    const list = customExercises.map((e) => (e.id === id ? { ...e, ...data, id, isCustom: true } : e));
    await persist(list);
  }, [customExercises, persist]);

  // Borrado lógico: se oculta de las listas y se quita de las rutinas, pero se
  // conserva para que el historial y los récords sigan mostrando su nombre.
  const deleteCustomExercise = useCallback(async (id) => {
    const list = customExercises.map((e) => (
      e.id === id ? { ...e, deleted: true, imageUri: null, deletedAt: new Date().toISOString() } : e
    ));
    await persist(list);
    await removeExerciseFromRoutines(id);
  }, [customExercises, persist]);

  // Lista visible: catálogo + personalizados no borrados.
  const allExercises = useMemo(
    () => [...customExercises.filter((e) => !e.deleted), ...EXERCISE_CATALOG],
    [customExercises],
  );

  const value = useMemo(() => ({
    loaded,
    allExercises,
    customExercises: customExercises.filter((e) => !e.deleted),
    getExercise: getExerciseById,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
  }), [loaded, allExercises, customExercises, addCustomExercise, updateCustomExercise, deleteCustomExercise]);

  return <ExercisesContext.Provider value={value}>{children}</ExercisesContext.Provider>;
}

export const useExercises = () => useContext(ExercisesContext);
