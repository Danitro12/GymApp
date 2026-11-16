import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { useExercises } from '../context/ExercisesContext';
import { getExerciseText, getCategoryLabel } from '../data/exercises';
import ScreenHeader, { HeaderIconButton } from '../components/ScreenHeader';
import ExerciseThumb from '../components/ExerciseThumb';
import BodyMap, { normalizeLoad } from '../components/BodyMap';

const BACK_MUSCLES = new Set(['lats', 'midBack', 'traps', 'glutes', 'hamstrings', 'calves']);

export default function ExerciseInfoScreen({ navigation, route }) {
  const { width: SW } = useWindowDimensions();
  const { t, language } = useLanguage();
  const { getExercise, allExercises } = useExercises();
  const exerciseId = route.params?.exerciseId;
  // allExercises en deps: si se edita el ejercicio, la pantalla se actualiza.
  const exercise = useMemo(() => getExercise(exerciseId), [getExercise, exerciseId, allExercises]);
  // Si el músculo principal se ve mejor por detrás, empezamos en esa vista.
  const [viewMode, setViewMode] = useState(() => {
    const top = Object.entries(exercise?.muscles || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    return BACK_MUSCLES.has(top) ? 'back' : 'front';
  });
  const exerciseText = getExerciseText(exercise, language);

  const load = useMemo(() => normalizeLoad(exercise?.muscles), [exercise]);

  const muscleLabelMap = useMemo(() => {
    const map = {};
    (t.musclesList || []).forEach((m) => { map[m.key] = m.label; });
    return map;
  }, [t.musclesList]);

  // Porcentaje real de trabajo de cada músculo (los ratios suman 1).
  const activeMuscles = useMemo(() => (
    Object.entries(exercise?.muscles || {})
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, ratio]) => ({ key, label: muscleLabelMap[key] || key, share: ratio, intensity: load[key] || 0 }))
  ), [exercise, load, muscleLabelMap]);

  const mapWidth = Math.min(Math.max(SW - 200, 140), 220);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScreenHeader onBack={() => navigation.goBack()} title={t.exercise} />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t.noDescription}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        title={exerciseText.name}
        subtitle={getCategoryLabel(exercise.category, t)}
        right={exercise.isCustom && !exercise.deleted ? (
          <HeaderIconButton
            icon="edit"
            label={t.editExercise}
            onPress={() => navigation.navigate('CreateExercise', { exerciseId: exercise.id })}
          />
        ) : undefined}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ExerciseThumb exercise={exercise} size={180} radius={90} />
          {exercise.isCustom && (
            <View style={styles.badge}><Text style={styles.badgeText}>{t.customBadge}</Text></View>
          )}
        </View>

        {/* Reparto muscular */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.muscleSplit}</Text>
          <View style={styles.mapRow}>
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
          {activeMuscles.map((m) => (
            <MuscleBar key={m.key} label={m.label} share={m.share} intensity={m.intensity} />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.exerciseDescription}</Text>
          <Text style={styles.descText}>{exerciseText.description || t.noDescription}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MuscleBar({ label, share, intensity }) {
  const pct = Math.round((share || 0) * 100);
  return (
    <View style={bar.row}>
      <Text style={bar.label} numberOfLines={1}>{label}</Text>
      <View style={bar.track}>
        <View style={[bar.fill, {
          width: `${Math.max(pct, 2)}%`,
          backgroundColor: intensity > 0.6 ? '#dc3c3c' : intensity > 0.3 ? '#b42d2d' : '#7f1d1d',
        }]} />
      </View>
      <Text style={bar.pct}>{pct}%</Text>
    </View>
  );
}

const bar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  label: { color: COLORS.white, fontSize: 13, width: 110 },
  track: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  fill: { height: '100%', borderRadius: 4 },
  pct: { color: COLORS.textSecondary, fontSize: 12, width: 38, textAlign: 'right', fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 8, paddingBottom: 32, gap: 16 },
  hero: { alignItems: 'center', paddingVertical: 4 },
  badge: { marginTop: 10, backgroundColor: COLORS.orange + '26', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: COLORS.orange, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  cardTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  mapRow: { alignItems: 'center', marginTop: 12 },
  descText: { color: COLORS.white, fontSize: 14, marginTop: 10, lineHeight: 21 },
  toggleRow: { flexDirection: 'row', backgroundColor: COLORS.cardDark, borderRadius: 12, padding: 4, marginTop: 4, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.orange },
  toggleText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: COLORS.white },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24, margin: 20 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center' },
});
