import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../data/theme';
import { loadRoutines } from '../data/storage';
import { getExerciseById } from '../data/exercises';
import { useExercises } from '../context/ExercisesContext';
import BodyMap, { normalizeLoad } from '../components/BodyMap';

// ─── Calcula carga muscular normalizada ───────────────────────────────────────
// Volumen = series × reps objetivo de cada serie, repartido según el % de
// trabajo de cada músculo del ejercicio.
const computeLoad = (routine) => {
  const totals = {};
  (routine?.exercises || []).forEach((ex) => {
    const exercise = getExerciseById(ex.exerciseId);
    if (!exercise?.muscles) return;
    const volume = (ex.sets || []).reduce((acc, s) => acc + (Number(s.reps) || 10), 0);
    Object.entries(exercise.muscles).forEach(([m, ratio]) => {
      totals[m] = (totals[m] || 0) + ratio * volume;
    });
  });
  return normalizeLoad(totals);
};

// ─── BARRA DE INTENSIDAD ──────────────────────────────────────────────────────
function MuscleBar({ label: lbl, intensity }) {
  const pct = Math.round((intensity || 0) * 100);
  return (
    <View style={bar.row}>
      <Text style={bar.label}>{lbl}</Text>
      <View style={bar.track}>
        <View style={[bar.fill, {
          width: `${pct}%`,
          backgroundColor: pct > 60 ? '#d32f2f' : pct > 30 ? '#b71c1c' : '#7f1d1d',
        }]} />
      </View>
      <Text style={bar.pct}>{pct}%</Text>
    </View>
  );
}
const bar = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { color: COLORS.white, fontSize: 13, width: 110 },
  track: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  fill:  { height: '100%', borderRadius: 4 },
  pct:   { color: COLORS.textSecondary, fontSize: 12, width: 34, textAlign: 'right' },
});

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────────
const FRONT_MUSCLES = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'adductors', 'abductors', 'quadriceps'];
const BACK_MUSCLES = ['lats', 'midBack', 'traps', 'triceps', 'shoulders', 'forearms', 'adductors', 'glutes', 'hamstrings', 'calves'];

export default function MusclesScreen() {
  const { width: SW } = useWindowDimensions();
  const { t } = useLanguage();
  const { allExercises } = useExercises();
  const [routines, setRoutines] = useState([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [viewMode, setViewMode] = useState('front');

  useFocusEffect(
    useCallback(() => {
      loadRoutines().then((r) => {
        setRoutines(r);
        setSelectedRoutineId((prev) => (r.some((x) => x.id === prev) ? prev : r[0]?.id ?? null));
      });
    }, []),
  );

  const selectedRoutine = routines.find((r) => r.id === selectedRoutineId);
  // allExercises como dependencia: recalcula si cambian los ejercicios propios.
  const load = useMemo(() => computeLoad(selectedRoutine), [selectedRoutine, allExercises]);

  const muscleLabelMap = useMemo(() => {
    const map = {};
    (t.musclesList || []).forEach((m) => { map[m.key] = m.label; });
    return map;
  }, [t.musclesList]);

  const mapWidth = Math.min(Math.max(SW - 208, 140), 240);
  const displayMuscles = (viewMode === 'front' ? FRONT_MUSCLES : BACK_MUSCLES)
    .map((key) => ({ key, value: load[key] || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t.muscleMap}</Text>
        <Text style={styles.sub}>{t.visualizeIntensity}</Text>

        {routines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t.noRoutinesMuscle}</Text>
            <Text style={styles.emptySub}>{t.createToSeeMuscle}</Text>
          </View>
        ) : (
          <>
            {/* Selector de rutina */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={styles.pillsScroll}>
              {routines.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pill, r.id === selectedRoutineId && styles.pillActive]}
                  onPress={() => setSelectedRoutineId(r.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, r.id === selectedRoutineId && styles.pillTextActive]}>{r.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.bodyContainer}>
              <BodyMap load={load} view={viewMode} width={mapWidth} />
            </View>

            <View style={styles.toggleRow}>
              {['front', 'back'].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
                  onPress={() => setViewMode(mode)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                    {mode === 'front' ? t.frontView : t.backView}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.barsCard}>
              <Text style={styles.barsTitle}>{t.muscleIntensity}</Text>
              {displayMuscles.map((m) => (
                <MuscleBar key={m.key} label={muscleLabelMap[m.key] || m.key} intensity={m.value} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingTop: 24 },
  title:   { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sub:     { color: COLORS.textSecondary, fontSize: 14, marginBottom: 16 },

  emptyCard:  { backgroundColor: COLORS.card, borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySub:   { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },

  pillsScroll:    { flexGrow: 0, marginBottom: 14 },
  pills:          { gap: 8 },
  pill:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border },
  pillActive:     { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  pillText:       { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: COLORS.white },

  toggleRow:       { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 14 },
  toggleBtn:       { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.orange },
  toggleText:      { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  toggleTextActive:{ color: COLORS.white },

  bodyContainer: { backgroundColor: COLORS.card, borderRadius: 16, alignItems: 'center', paddingVertical: 12, marginBottom: 14, overflow: 'hidden' },

  barsCard:  { backgroundColor: COLORS.card, borderRadius: 16, padding: 18 },
  barsTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 16 },
});
