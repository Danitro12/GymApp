import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, findNodeHandle, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import ExerciseSetRow from '../components/ExerciseSetRow';
import ExerciseThumb from '../components/ExerciseThumb';
import ScreenHeader, { HeaderIconButton } from '../components/ScreenHeader';
import { getExerciseById, getCategoryLabel, resolveExerciseName } from '../data/exercises';
import { loadRoutineRecords } from '../data/storage';
import { useLanguage } from '../context/LanguageContext';
import {
  useWorkout, useNow, getElapsedMs, getLapMs, getLaps, countCompletedExercises,
} from '../context/WorkoutContext';
import { confirmAsync } from '../utils/dialogs';
import { formatDuration } from '../utils/date';
import { fmt, sanitizeNumberInput } from '../utils/text';

export default function ActiveWorkoutScreen({ navigation }) {
  const { t, language } = useLanguage();
  const {
    session, loaded, updateSession, finishWorkout, discardWorkout,
    pauseTimer, resumeTimer, resetTimer, lap,
  } = useWorkout();
  const scrollRef = useRef(null);
  const chipsRef = useRef(null);
  const [routineRecords, setRoutineRecords] = useState({});
  const [busy, setBusy] = useState(false);

  const running = !!session?.timer?.runningSince;
  const now = useNow(!!session && running, 1000);

  const leave = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  }, [navigation]);

  // Si no hay sesión (p. ej. se descartó), volvemos atrás.
  useEffect(() => {
    if (loaded && !session && !busy) leave();
  }, [loaded, session, busy, leave]);

  const routineId = session?.routine?.id;
  useEffect(() => {
    if (routineId) loadRoutineRecords(routineId).then(setRoutineRecords);
  }, [routineId]);

  const idx = session ? Math.min(session.currentIndex || 0, Math.max(0, session.exerciseSets.length - 1)) : 0;

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [idx]);

  const completedCount = useMemo(() => countCompletedExercises(session), [session]);

  if (!session) return <SafeAreaView style={styles.safe} />;

  const { routine, exerciseSets } = session;
  const total = exerciseSets.length;
  const elapsedSec = getElapsedMs(session, now) / 1000;


  const setIndex = (i) => updateSession((s) => ({ ...s, currentIndex: Math.max(0, Math.min(total - 1, i)) }));

  const updateSet = (exIndex, sIdx, field, raw) => {
    const value = sanitizeNumberInput(raw);
    updateSession((s) => {
      const next = [...s.exerciseSets];
      next[exIndex] = {
        ...next[exIndex],
        sets: next[exIndex].sets.map((set, i) => {
          if (i !== sIdx) return set;
          const updated = { ...set, [field]: value };
          // Se marca sola cuando reps y peso están rellenos.
          updated.checked = updated.reps !== '' && updated.weight !== '';
          return updated;
        }),
      };
      return { ...s, exerciseSets: next };
    });
  };

  const toggleCheck = (exIndex, sIdx) => {
    updateSession((s) => {
      const next = [...s.exerciseSets];
      next[exIndex] = {
        ...next[exIndex],
        sets: next[exIndex].sets.map((set, i) => (i === sIdx ? { ...set, checked: !set.checked } : set)),
      };
      return { ...s, exerciseSets: next };
    });
  };

  const handleInputFocus = (inputRef) => {
    if (Platform.OS === 'web') return;
    const node = inputRef?.current ? findNodeHandle(inputRef.current) : null;
    const responder = scrollRef.current?.getScrollResponder?.();
    if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
      setTimeout(() => responder.scrollResponderScrollNativeHandleToKeyboard(node, 150, true), 0);
    }
  };

  const handleFinish = async () => {
    const msg = `${t.finishWorkoutMsg} ${completedCount}/${total} ${t.finishExercisesIn} ${formatDuration(elapsedSec)}.`;
    const ok = await confirmAsync(t.finishWorkoutQ, msg, { confirmText: t.finish, cancelText: t.keepGoing });
    if (!ok) return;
    setBusy(true);
    await finishWorkout();
    leave();
  };

  const handleDiscard = async () => {
    const ok = await confirmAsync(t.discardWorkoutQ, t.discardWorkoutMsg, {
      confirmText: t.discard, cancelText: t.keepGoing, destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    await discardWorkout();
    leave();
  };

  const exData = exerciseSets[idx];
  const exercise = exData ? getExerciseById(exData.exerciseId) : null;
  const exerciseName = exData ? resolveExerciseName(exData.exerciseId, language) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        onBack={leave}
        backIcon="keyboard-arrow-down"
        title={routine.name}
        subtitle={`${completedCount}/${total} ${t.exercises}`}
        right={<HeaderIconButton icon="delete-outline" color="#ef4444" onPress={handleDiscard} label={t.discardWorkout} />}
      />

      <View style={styles.progressWrap}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${total ? (completedCount / total) * 100 : 0}%` }]} />
        </View>
      </View>

      {/* Saltar a cualquier ejercicio */}
      <ScrollView
        ref={chipsRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {exerciseSets.map((ex, i) => {
          const done = ex.sets.length > 0 && ex.sets.every((s) => s.checked);
          const active = i === idx;
          return (
            <TouchableOpacity
              key={`${ex.exerciseId}-${i}`}
              onPress={() => setIndex(i)}
              style={[styles.chip, done && styles.chipDone, active && styles.chipActive]}
              activeOpacity={0.8}
            >
              {done && <Icon name="check" size={14} color={active ? COLORS.white : COLORS.green} />}
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {i + 1}. {resolveExerciseName(ex.exerciseId, language)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {exData && (
          <View style={styles.exCard}>
            <View style={styles.exTitleRow}>
              <ExerciseThumb exercise={exercise} size={52} radius={12} />
              <View style={{ flex: 1 }}>
                <Text style={styles.exOf}>{fmt(t.exerciseOf, { i: idx + 1, n: total })}</Text>
                <Text style={styles.exName}>{exerciseName}</Text>
                {!!exercise?.category && <Text style={styles.exCat}>{getCategoryLabel(exercise.category, t)}</Text>}
              </View>
              {!!exercise && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('ExerciseInfo', { exerciseId: exData.exerciseId })}
                  style={styles.infoBtn}
                  activeOpacity={0.8}
                >
                  <Icon name="info-outline" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.colHeaders}>
              <Text style={[styles.colLabel, { width: 40 }]} numberOfLines={1}>{t.set}</Text>
              <Text style={[styles.colLabel, { flex: 1 }]} numberOfLines={1}>{t.record}</Text>
              <Text style={[styles.colLabel, { width: 36 }]} numberOfLines={1}>{t.goal}</Text>
              <Text style={[styles.colLabel, { flex: 1.2 }]} numberOfLines={1}>{t.reps}</Text>
              <Text style={[styles.colLabel, { flex: 1.2 }]} numberOfLines={1}>{t.weight}</Text>
              <View style={{ width: 36 }} />
            </View>

            {exData.sets.map((set, sIdx) => {
              const record = routineRecords?.[exData.exerciseId]?.[sIdx];
              const recordText = record ? `${record.maxRepsAtMaxWeight}×${record.maxWeight}` : '-';
              return (
                <ExerciseSetRow
                  key={set.id}
                  set={set.id}
                  previous={recordText}
                  targetReps={routine.exercises?.[idx]?.sets?.[sIdx]?.reps || ''}
                  reps={set.reps}
                  weight={set.weight}
                  checked={set.checked}
                  onRepsChange={(v) => updateSet(idx, sIdx, 'reps', v)}
                  onWeightChange={(v) => updateSet(idx, sIdx, 'weight', v)}
                  onCheck={() => toggleCheck(idx, sIdx)}
                  onInputFocus={handleInputFocus}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Cronómetro estilo iPhone: total + vuelta actual */}
      <Stopwatch
        session={session}
        t={t}
        onLap={lap}
        onReset={resetTimer}
        onStart={resumeTimer}
        onStop={pauseTimer}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.navBtn, idx === 0 && styles.navBtnDisabled]}
          onPress={() => setIndex(idx - 1)}
          disabled={idx === 0}
          accessibilityLabel="Previous exercise"
        >
          <Icon name="chevron-left" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85} disabled={busy}>
          <Icon name="flag" size={20} color={COLORS.white} />
          <Text style={styles.finishText}>{t.finishWorkout}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, idx >= total - 1 && styles.navBtnDisabled]}
          onPress={() => setIndex(idx + 1)}
          disabled={idx >= total - 1}
          accessibilityLabel="Next exercise"
        >
          <Icon name="chevron-right" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Cronómetro con vueltas, como el del iPhone. Va en su propio componente
// para refrescarse cada 100 ms (décimas) sin redibujar toda la pantalla.
function Stopwatch({ session, t, onLap, onReset, onStart, onStop }) {
  const running = !!session?.timer?.runningSince;
  const now = useNow(running, 100);
  const elapsedSec = getElapsedMs(session, now) / 1000;
  const lapSec = getLapMs(session, now) / 1000;
  const laps = getLaps(session);
  return (
    <View style={styles.clockPanel}>
      <View style={styles.clockRow}>
        <TouchableOpacity
          style={[styles.roundBtn, styles.roundBtnGrey, !running && laps.list.length === 0 && elapsedSec < 1 && styles.roundBtnDisabled]}
          onPress={running ? onLap : onReset}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={running ? t.lapBtn : t.resetBtn}
        >
          <Text style={[styles.roundBtnText, !running && styles.roundBtnTextSmall]} numberOfLines={1}>{running ? t.lapBtn : t.resetBtn}</Text>
        </TouchableOpacity>

        <View style={styles.clockCenter}>
          <Text style={[styles.totalBig, !running && styles.timerPaused]} numberOfLines={1} adjustsFontSizeToFit>
            {formatClock(elapsedSec)}
          </Text>
          <Text style={styles.lapNow}>
            {t.lapLabel} {laps.list.length + 1} · <Text style={styles.lapNowTime}>{formatClock(lapSec)}</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.roundBtn, running ? styles.roundBtnStop : styles.roundBtnStart]}
          onPress={running ? onStop : onStart}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={running ? t.stopBtn : t.startBtn}
        >
          <Text style={[styles.roundBtnText, running ? styles.stopText : styles.startText]}>
            {running ? t.stopBtn : t.startBtn}
          </Text>
        </TouchableOpacity>
      </View>

      {laps.list.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lapsRow}>
          {laps.list.map((ms, i) => (
            <View key={`${laps.list.length - i}`} style={styles.lapChip}>
              <Text style={styles.lapChipLabel}>{t.lapLabel} {laps.list.length - i}</Text>
              <Text style={styles.lapChipTime}>{formatClock(ms / 1000)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// mm:ss,d con décimas, como el cronómetro del iPhone (h:mm:ss si pasa de una hora).
const formatClock = (totalSeconds) => {
  const secs = Math.max(0, totalSeconds);
  if (secs >= 3600) return formatDuration(secs);
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const d = Math.floor((secs * 10) % 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${d}`;
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  progressWrap: { paddingHorizontal: 20, paddingBottom: 6 },
  progressBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.orange, borderRadius: 2 },
  chipsScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 200,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipDone: { borderColor: COLORS.green + '66' },
  chipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  chipTextActive: { color: COLORS.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  exCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  exTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  exOf: { color: COLORS.orange, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  exName: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginTop: 2 },
  exCat: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  infoBtn: { padding: 8, borderRadius: 10, backgroundColor: COLORS.cardDark },
  colHeaders: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  colLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  clockPanel: { marginHorizontal: 16, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 12, backgroundColor: COLORS.card, borderRadius: 20 },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clockCenter: { flex: 1, alignItems: 'center' },
  totalBig: { color: COLORS.white, fontSize: 40, fontWeight: '300', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  timerPaused: { color: COLORS.textSecondary },
  lapNow: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 2 },
  lapNowTime: { color: COLORS.white, fontVariant: ['tabular-nums'] },
  roundBtn: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  roundBtnGrey: { backgroundColor: '#333333', borderColor: '#3d3d3d' },
  roundBtnStart: { backgroundColor: '#0f3a1d', borderColor: '#14532d' },
  roundBtnStop: { backgroundColor: '#3a1414', borderColor: '#5a1d1d' },
  roundBtnDisabled: { opacity: 0.45 },
  roundBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  roundBtnTextSmall: { fontSize: 12 },
  startText: { color: '#4ade80' },
  stopText: { color: '#f87171' },
  lapsRow: { gap: 8, paddingTop: 12 },
  lapChip: { backgroundColor: COLORS.cardDark, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  lapChipLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  lapChipTime: { color: COLORS.white, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  navBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.35 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 2 },
  finishBtn: {
    flex: 1, height: 52, backgroundColor: COLORS.orange, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  finishText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
