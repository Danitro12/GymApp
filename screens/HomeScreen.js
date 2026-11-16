import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../data/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import { loadRoutines, loadHistory } from '../data/storage';
import { resolveExerciseName } from '../data/exercises';
import { useLanguage } from '../context/LanguageContext';
import { useTab } from '../context/TabContext';
import { useWorkout } from '../context/WorkoutContext';
import useStartWorkout from '../hooks/useStartWorkout';
import {
  toDateKey, fromDateKey, weekdayIndex, localeFor, historyMinutes,
} from '../utils/date';

export default function HomeScreen({ navigation }) {
  const { t, language } = useLanguage();
  const { switchTab } = useTab();
  const { session } = useWorkout();
  const startRoutine = useStartWorkout(navigation);
  const [routines, setRoutines] = useState([]);
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([loadRoutines(), loadHistory()]).then(([r, h]) => {
        if (!alive) return;
        setRoutines(r);
        setHistory(h);
      });
      return () => { alive = false; };
    }, []),
  );

  // Recargar el historial al terminar un entreno (session pasa a null).
  useEffect(() => {
    if (!session) loadHistory().then(setHistory);
  }, [session]);

  const today = new Date();
  const todayKey = toDateKey(today);
  const todayIdx = weekdayIndex(today);

  const weekDays = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - todayIdx);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [todayKey]);

  const workoutDates = useMemo(() => new Set(history.map((h) => h.date)), [history]);
  const todayRoutines = useMemo(() => routines.filter((r) => r.days?.includes(todayIdx)), [routines, todayIdx]);

  // Meta semanal = días distintos con alguna rutina programada.
  const scheduledDays = useMemo(() => new Set(routines.flatMap((r) => r.days || [])), [routines]);
  const weeklyGoal = scheduledDays.size || routines.length;
  const weeklyWorkouts = weekDays.filter((d) => workoutDates.has(toDateKey(d))).length;
  const progressPercent = weeklyGoal > 0 ? Math.min(weeklyWorkouts / weeklyGoal, 1) : 0;

  // Racha: días seguidos entrenando. Si hoy aún no has entrenado, la racha de
  // ayer sigue viva.
  const streak = useMemo(() => {
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!workoutDates.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (workoutDates.has(toDateKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [workoutDates]);

  const locale = localeFor(language);
  const dateLabel = today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
  const formatHistoryDate = (key) => fromDateKey(key).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  const recent = history.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.welcome}>{t.welcomeBack}</Text>
          </View>
          <TouchableOpacity
            style={styles.calBtn}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.7}
            accessibilityLabel={t.history}
          >
            <Icon name="calendar-month" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Semana */}
        <View style={styles.weekContainer}>
          {weekDays.map((day, i) => {
            const key = toDateKey(day);
            const isToday = key === todayKey;
            const hasWorkout = workoutDates.has(key);
            const scheduled = scheduledDays.has(i);
            return (
              <View key={key} style={styles.weekDayColumn}>
                <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelActive]}>{t.days[i]}</Text>
                <View style={[
                  styles.weekDayCircle,
                  scheduled && styles.weekDayScheduled,
                  hasWorkout && styles.weekDayDone,
                  isToday && styles.weekDayToday,
                ]}
                >
                  <Text style={[styles.weekDayNum, hasWorkout && styles.weekDayNumDone]}>{day.getDate()}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Progreso semanal + racha */}
        <View style={styles.statsRow}>
          <View style={styles.wheelWrapper}>
            <Svg width={132} height={132} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.08)" strokeWidth="9" fill="transparent" />
              {progressPercent > 0 && (
              <Circle
                cx="50"
                cy="50"
                r="44"
                stroke={COLORS.orange}
                strokeWidth="9"
                fill="transparent"
                strokeDasharray={`${progressPercent * 276.5} 276.5`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
              )}
            </Svg>
            <View style={styles.wheelTextContainer}>
              <Text style={styles.wheelNumber}>{weeklyWorkouts}<Text style={styles.wheelOf}>/{weeklyGoal || 0}</Text></Text>
              <Text style={styles.wheelSub}>{weeklyWorkouts === 1 ? t.dayCompleted : t.daysCompleted}</Text>
            </View>
          </View>
          <View style={styles.statsSide}>
            <View style={styles.statTile}>
              <Icon name="local-fire-department" size={20} color={COLORS.orange} />
              <View>
                <Text style={styles.statValue}>{streak} <Text style={styles.statUnit}>{streak === 1 ? t.dayCompleted : t.daysCompleted}</Text></Text>
                <Text style={styles.statLabel}>{t.streak}</Text>
              </View>
            </View>
            <View style={styles.statTile}>
              <Icon name="emoji-events" size={20} color={COLORS.orange} />
              <View>
                <Text style={styles.statValue}>{history.length} <Text style={styles.statUnit}>{t.workouts}</Text></Text>
                <Text style={styles.statLabel}>{t.total}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Entreno de hoy */}
        <Text style={styles.sectionTitle}>{t.todaysWorkout}</Text>

        {todayRoutines.length > 0 ? (
          todayRoutines.map((routine) => {
            const inProgress = session?.routine?.id === routine.id;
            return (
              <View key={routine.id} style={styles.workoutCard}>
                <Text style={styles.workoutName}>{routine.name}</Text>
                <Text style={styles.workoutSub}>
                  {routine.exercises.length} {routine.exercises.length === 1 ? t.exercise : t.exercises}
                </Text>
                <View style={styles.exList}>
                  {routine.exercises.slice(0, 4).map((ex, i) => (
                    <View key={`${ex.exerciseId}-${i}`} style={styles.exRow}>
                      <Text style={styles.exName} numberOfLines={1}>
                        {resolveExerciseName(ex.exerciseId, language)}
                      </Text>
                      <Text style={styles.exDetail}>{ex.sets.length} × {ex.sets[0]?.reps || '-'}</Text>
                    </View>
                  ))}
                  {routine.exercises.length > 4 && (
                    <Text style={styles.moreEx}>+{routine.exercises.length - 4} {t.moreExercises}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.startBtn} onPress={() => startRoutine(routine)} activeOpacity={0.85}>
                  <Icon name={inProgress ? 'play-circle-outline' : 'play-arrow'} size={22} color={COLORS.white} />
                  <Text style={styles.startText}>{inProgress ? t.continueWorkout : t.startWorkout}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : routines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t.noRoutinesYet}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateRoutine')}>
              <Text style={styles.orangeLink}>{t.createFirstRoutine}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Icon name="self-improvement" size={30} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{t.restDay}</Text>
            <TouchableOpacity onPress={() => switchTab('Routines')}>
              <Text style={styles.orangeLink}>{t.goToRoutines}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actividad reciente */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t.recentActivity}</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.orangeLink}>{t.viewAll}</Text>
            </TouchableOpacity>
          )}
        </View>

        {recent.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t.noWorkoutsLogged}</Text>
          </View>
        ) : (
          recent.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.histCard}
              onPress={() => navigation.navigate('History', { selectedDate: item.date })}
              activeOpacity={0.85}
            >
              <View style={styles.histIcon}>
                <Icon name="check" size={18} color={COLORS.green} />
              </View>
              <View style={styles.histLeft}>
                <Text style={styles.histName}>{item.routineName}</Text>
                <Text style={styles.histDetail}>
                  {formatHistoryDate(item.date)} · {item.exercisesCompleted}/{item.totalExercises ?? item.exercisesCompleted} {t.exercises} · {historyMinutes(item)} {t.min}
                </Text>
              </View>
              <Icon name="chevron-right" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  date: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  welcome: { color: COLORS.white, fontSize: 26, fontWeight: '800', marginTop: 2 },
  calBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },

  weekContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 16,
  },
  weekDayColumn: { alignItems: 'center', gap: 6 },
  weekDayLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  weekDayLabelActive: { color: COLORS.orange },
  weekDayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  weekDayScheduled: { borderColor: COLORS.border, borderStyle: 'dashed' },
  weekDayDone: { backgroundColor: COLORS.orange, borderColor: COLORS.orange, borderStyle: 'solid' },
  weekDayToday: { borderColor: COLORS.orange, borderStyle: 'solid' },
  weekDayNum: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  weekDayNumDone: { color: COLORS.white, fontWeight: '800' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginBottom: 26 },
  wheelWrapper: { width: 132, height: 132, justifyContent: 'center', alignItems: 'center' },
  wheelTextContainer: { position: 'absolute', alignItems: 'center' },
  wheelNumber: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  wheelOf: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '700' },
  wheelSub: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  statsSide: { flex: 1, gap: 10 },
  statTile: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.cardDark, borderRadius: 12, padding: 12 },
  statValue: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  statUnit: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  orangeLink: { color: COLORS.orange, fontSize: 14, fontWeight: '600' },
  workoutCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, marginBottom: 14 },
  workoutName: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  workoutSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2, marginBottom: 10 },
  exList: { marginBottom: 14 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  exName: { color: COLORS.white, fontSize: 14, flex: 1 },
  exDetail: { color: COLORS.textSecondary, fontSize: 14, fontVariant: ['tabular-nums'] },
  moreEx: { color: COLORS.textSecondary, fontSize: 13, marginTop: 8 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.orange, borderRadius: 14, paddingVertical: 14,
  },
  startText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 26, gap: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  histCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  histIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.green + '22', alignItems: 'center', justifyContent: 'center' },
  histLeft: { flex: 1 },
  histName: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  histDetail: { color: COLORS.textSecondary, fontSize: 12 },
});
