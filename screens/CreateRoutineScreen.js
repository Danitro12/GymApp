import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { getExerciseText, getCategoryLabel } from '../data/exercises';
import { saveRoutine, updateRoutine } from '../data/storage';
import { useLanguage } from '../context/LanguageContext';
import { useExercises } from '../context/ExercisesContext';
import ScreenHeader from '../components/ScreenHeader';
import ExerciseThumb from '../components/ExerciseThumb';
import ExerciseBrowser from '../components/ExerciseBrowser';
import { sanitizeNumberInput } from '../utils/text';

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

const newSet = (reps = DEFAULT_REPS) => ({
  id: `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  reps,
  weight: 0,
});

const newRoutineExercise = (exerciseId, order) => ({
  id: exerciseId,
  exerciseId,
  sets: Array.from({ length: DEFAULT_SETS }, () => newSet()),
  order,
});

export default function CreateRoutineScreen({ navigation, route }) {
  const { t, language } = useLanguage();
  const { allExercises, getExercise } = useExercises();
  const routineToEdit = route.params?.routineToEdit;

  const [routineName, setRoutineName] = useState(routineToEdit?.name || '');
  const [selectedExercises, setSelectedExercises] = useState(routineToEdit?.exercises || []);
  const [selectedDays, setSelectedDays] = useState(routineToEdit?.days || []);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [restoreModalOnFocus, setRestoreModalOnFocus] = useState(false);

  // Ejercicio recién creado desde el selector → se añade a la rutina.
  const newExerciseId = route.params?.newExerciseId;
  useEffect(() => {
    if (!newExerciseId) return;
    setSelectedExercises((prev) => (
      prev.some((e) => e.id === newExerciseId) ? prev : [...prev, newRoutineExercise(newExerciseId, prev.length)]
    ));
    setExpandedId(newExerciseId);
    navigation.setParams({ newExerciseId: undefined });
  }, [newExerciseId, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (restoreModalOnFocus) {
        setModalVisible(true);
        setRestoreModalOnFocus(false);
      }
    }, [restoreModalOnFocus]),
  );

  const toggleDay = (dayIndex) => {
    setSelectedDays((prev) => (prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()));
  };

  const selectedIds = useMemo(() => new Set(selectedExercises.map((e) => e.id)), [selectedExercises]);

  const toggleExercise = useCallback((exercise) => {
    setSelectedExercises((prev) => {
      if (prev.some((e) => e.id === exercise.id)) return prev.filter((e) => e.id !== exercise.id);
      return [...prev, newRoutineExercise(exercise.id, prev.length)];
    });
  }, []);

  const showExerciseInfo = useCallback((exercise) => {
    setRestoreModalOnFocus(true);
    setModalVisible(false);
    navigation.navigate('ExerciseInfo', { exerciseId: exercise.id });
  }, [navigation]);

  const createExercise = useCallback(() => {
    setModalVisible(false);
    navigation.navigate('CreateExercise', { returnTo: 'CreateRoutine' });
  }, [navigation]);

  const removeExercise = (id) => setSelectedExercises((prev) => prev.filter((e) => e.id !== id));

  const moveExercise = (id, delta) => {
    setSelectedExercises((prev) => {
      const i = prev.findIndex((e) => e.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((e, order) => ({ ...e, order }));
    });
  };

  const addSet = (id) => setSelectedExercises((prev) => prev.map((e) => {
    if (e.id !== id) return e;
    const lastReps = e.sets[e.sets.length - 1]?.reps ?? DEFAULT_REPS;
    return { ...e, sets: [...e.sets, newSet(lastReps)] };
  }));

  const updateReps = (id, setIdx, value) => setSelectedExercises((prev) => prev.map((e) => (
    e.id === id
      ? { ...e, sets: e.sets.map((s, i) => (i === setIdx ? { ...s, reps: Number(sanitizeNumberInput(value)) || 0 } : s)) }
      : e
  )));

  const removeSet = (id, setIdx) => setSelectedExercises((prev) => prev.map((e) => (
    e.id === id ? { ...e, sets: e.sets.filter((_, i) => i !== setIdx) } : e
  )));

  const handleSave = async () => {
    const routine = {
      id: routineToEdit?.id || `r_${Date.now()}`,
      name: routineName.trim() || t.routine,
      createdAt: routineToEdit?.createdAt || new Date().toISOString(),
      // Ejercicios sin series no aportan nada al entreno.
      exercises: selectedExercises
        .filter((e) => e.sets.length > 0)
        .map((e, order) => ({ ...e, order })),
      days: selectedDays,
    };
    if (routineToEdit) await updateRoutine(routine);
    else await saveRoutine(routine);
    navigation.goBack();
  };

  const canSave = selectedExercises.some((e) => e.sets.length > 0);
  const title = routineToEdit ? t.editRoutineTitle : t.createRoutineTitle;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader onBack={() => navigation.goBack()} title={title} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.fieldLabel}>{t.routineName}</Text>
          <TextInput
            style={styles.nameInput}
            value={routineName}
            onChangeText={setRoutineName}
            placeholder={t.routineNamePlaceholder}
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.orange}
            maxLength={40}
          />

          <View style={styles.daysRow}>
            {t.days.map((day, index) => {
              const on = selectedDays.includes(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayCircle, on && styles.dayCircleActive]}
                  onPress={() => toggleDay(index)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayText, on && styles.dayTextActive]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.exHeader}>
            <Text style={styles.exTitle}>{t.exercisesCount} ({selectedExercises.length})</Text>
            <TouchableOpacity style={styles.addExBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
              <Icon name="add" size={18} color={COLORS.white} />
              <Text style={styles.addExText}>{t.addExercise}</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <TouchableOpacity style={styles.emptyBox} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
              <Icon name="playlist-add" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{t.noExercisesYet}</Text>
              <Text style={styles.emptySub}>{t.tapToAdd}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.exList}>
              {selectedExercises.map((ex, i) => {
                const info = getExercise(ex.exerciseId);
                const name = getExerciseText(info, language).name || ex.exerciseId;
                const expanded = expandedId === ex.id;
                const repsSummary = ex.sets.map((s) => s.reps || '-').join(' · ');
                return (
                  <View key={ex.id} style={[styles.exCard, expanded && styles.exCardExpanded]}>
                    <TouchableOpacity
                      style={styles.exCardTop}
                      activeOpacity={0.85}
                      onPress={() => setExpandedId(expanded ? null : ex.id)}
                    >
                      <ExerciseThumb exercise={info} size={48} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exCardName} numberOfLines={2}>{name}</Text>
                        <Text style={styles.exCardCat} numberOfLines={1}>
                          {ex.sets.length} {t.sets.toLowerCase()} · {repsSummary} {t.reps.toLowerCase()}
                        </Text>
                      </View>
                      <Icon name={expanded ? 'expand-less' : 'expand-more'} size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {expanded && (
                      <View style={styles.setsBox}>
                        {ex.sets.map((set, setIdx) => (
                          <View key={set.id || setIdx} style={styles.setRow}>
                            <Text style={styles.setLabel}>{t.set} {setIdx + 1}</Text>
                            <View style={styles.repsBox}>
                              <TextInput
                                style={styles.repsInput}
                                value={set.reps ? String(set.reps) : ''}
                                placeholder="0"
                                placeholderTextColor={COLORS.textMuted}
                                onChangeText={(v) => updateReps(ex.id, setIdx, v)}
                                keyboardType="number-pad"
                                inputMode="numeric"
                                selectTextOnFocus
                                maxLength={3}
                              />
                              <Text style={styles.repsUnit}>{t.reps.toLowerCase()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeSet(ex.id, setIdx)} hitSlop={8} style={styles.iconBtnSmall}>
                              <Icon name="close" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <View style={styles.exActions}>
                          <TouchableOpacity style={styles.actionBtn} onPress={() => addSet(ex.id)}>
                            <Icon name="add" size={18} color={COLORS.orange} />
                            <Text style={styles.actionText}>{t.addSet}</Text>
                          </TouchableOpacity>
                          <View style={{ flex: 1 }} />
                          <TouchableOpacity style={styles.iconBtnSmall} onPress={() => moveExercise(ex.id, -1)} disabled={i === 0}>
                            <Icon name="arrow-upward" size={18} color={i === 0 ? COLORS.textMuted : COLORS.white} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconBtnSmall}
                            onPress={() => moveExercise(ex.id, 1)}
                            disabled={i === selectedExercises.length - 1}
                          >
                            <Icon name="arrow-downward" size={18} color={i === selectedExercises.length - 1 ? COLORS.textMuted : COLORS.white} />
                          </TouchableOpacity>
                          {!!info && (
                            <TouchableOpacity style={styles.iconBtnSmall} onPress={() => navigation.navigate('ExerciseInfo', { exerciseId: ex.exerciseId })}>
                              <Icon name="info-outline" size={18} color={COLORS.white} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={styles.iconBtnSmall} onPress={() => removeExercise(ex.id)}>
                            <Icon name="delete-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        {!!info?.category && (
                          <Text style={styles.catNote}>{getCategoryLabel(info.category, t)}</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.createBtn, !canSave && styles.createBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>{routineToEdit ? t.saveChanges : t.createRoutine}</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de ejercicios */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.addExercise}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Icon name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ExerciseBrowser
              exercises={allExercises}
              t={t}
              language={language}
              selectedIds={selectedIds}
              onPressItem={toggleExercise}
              onInfo={showExerciseInfo}
              onCreate={createExercise}
            />

            <View style={styles.sheetBottom}>
              <TouchableOpacity style={styles.doneBtn} onPress={() => setModalVisible(false)} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>
                  {t.done}{selectedExercises.length > 0 ? ` (${selectedExercises.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 8 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  nameInput: {
    backgroundColor: COLORS.card, borderRadius: 12, color: COLORS.white, fontSize: 16,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  dayCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  dayCircleActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  dayText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  dayTextActive: { color: COLORS.white },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  exTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.orange, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addExText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  emptyBox: {
    backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 36, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyTitle: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  emptySub: { color: COLORS.textMuted, fontSize: 13 },
  exList: { gap: 10 },
  exCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'transparent' },
  exCardExpanded: { borderColor: COLORS.border },
  exCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exCardName: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  exCardCat: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  setsBox: { marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  setLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', width: 64 },
  repsBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 8, paddingHorizontal: 10 },
  repsInput: { flex: 1, color: COLORS.white, fontSize: 16, fontWeight: '700', paddingVertical: 8, minWidth: 0 },
  repsUnit: { color: COLORS.textSecondary, fontSize: 12 },
  iconBtnSmall: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.cardDark, alignItems: 'center', justifyContent: 'center' },
  exActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  actionText: { color: COLORS.orange, fontSize: 14, fontWeight: '700' },
  catNote: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16,
    backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  createBtn: { backgroundColor: COLORS.orange, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    flex: 1, marginTop: 48, paddingTop: 4, overflow: 'hidden',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  sheetBottom: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  doneBtn: { backgroundColor: COLORS.orange, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
