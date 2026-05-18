import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../data/theme';
import OrangeButton from '../components/OrangeButton';
import { loadRoutines, loadHistory } from '../data/storage';
import { getExerciseById, getExerciseName } from '../data/exercises';
import { useLanguage } from '../context/LanguageContext';
import { useTab } from '../context/TabContext';

export default function HomeScreen({ navigation }) {
  const { t, language } = useLanguage();
  const { switchTab } = useTab();
  const [routines, setRoutines] = useState([]);
  const [history, setHistory] = useState([]);
  const [todayRoutine, setTodayRoutine] = useState([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const r = await loadRoutines();
        const h = await loadHistory();
        setRoutines(r);
        setHistory(h);
        const todayIdx = (new Date().getDay() + 6) % 7;
        setTodayRoutine(r.filter((routine) => routine.days?.includes(todayIdx)));

      })();
    }, [])
  );


  // Get current week (Mon-Sun)
  const getWeekDays = () => {
    const today = new Date();
    const dayIndex = (today.getDay() + 6) % 7; // Monday = 0
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayIndex);
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();
  const formatDateKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const weekISODates = weekDays.map((d) => formatDateKey(d));
  const todayDate = new Date();
  const todayKey = formatDateKey(todayDate);
  const workoutDates = new Set(history.map(h => h.date));

  // Weekly Progress Stats
  const weeklyWorkouts = weekISODates.filter(date => workoutDates.has(date)).length;
  const weeklyGoal = routines.length || 0;
  const progressPercent = weeklyGoal > 0 ? Math.min(weeklyWorkouts / weeklyGoal, 1) : 0;

  const formatDate = () => {
    const d = new Date();
    return d.toLocaleDateString('es-ES', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  };

  const streak = (() => {
    if (history.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    let cursor = new Date(today);
    const dates = new Set(history.map((h) => h.date));
    while (true) {
      const key = cursor.toISOString().split('T')[0];
      if (dates.has(key)) { count++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    return count;
  })();

  const recent = history.slice(0, 3);

  const formatHistoryDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRowCentered}>
          <View style={{ width: 38 }} /> {/* Balancer */}
          <Text style={styles.dateCentered}>{formatDate()}</Text>
          <TouchableOpacity
            style={styles.calIconBtnSmall}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.7}
          >
            <Text style={styles.calEmojiSmall}>📅</Text>
          </TouchableOpacity>
        </View>

        {/* Week Calendar */}
        <View style={styles.weekContainer}>
          {weekDays.map((day, i) => {
            const dateKey = formatDateKey(day);
            const isToday = dateKey === todayKey;
            const hasWorkout = workoutDates.has(dateKey);
            const isWeekend = i === 5 || i === 6;

            return (
              <View key={i} style={styles.weekDayColumn}>
                <Text style={[
                  styles.weekDayLabel,
                  isToday && styles.weekDayLabelActive,
                  isWeekend && !isToday && styles.weekDayLabelWeekend
                ]}>
                  {isToday ? t.today : t.days[i]}
                </Text>
                <View style={[
                  styles.weekDayCircle,
                  isToday && styles.weekDayCircleActive,
                ]}>
                  <Text style={[
                    styles.weekDayNum,
                    isToday && styles.weekDayNumActive,
                    isWeekend && !isToday && styles.weekDayNumWeekend
                  ]}>
                    {day.getDate()}
                  </Text>
                </View>
                {hasWorkout && !isToday && <View style={styles.weekDot} />}
              </View>
            );
          })}
        </View>

        {/* Weekly Progress Wheel */}
        <View style={styles.wheelSection}>
          <View style={styles.wheelWrapper}>
            <Svg width={180} height={180} viewBox="0 0 100 100">
              {/* Background Circle */}
              <Circle
                cx="50" cy="50" r="45"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress Circle Arc */}
              <Circle
                cx="50" cy="50" r="45"
                stroke={COLORS.orange}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${progressPercent * 282.7} 282.7`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </Svg>
            <View style={styles.wheelTextContainer}>
              <Text style={styles.wheelNumber}>{weeklyWorkouts}</Text>
              <Text style={styles.wheelSub}>{weeklyWorkouts === 1 ? (language === 'es' ? 'día' : 'day') : (language === 'es' ? 'días' : 'days')}</Text>
              <Text style={styles.wheelTotal}>{language === 'es' ? 'completados' : 'completed'}</Text>
            </View>
          </View>
          {weeklyGoal > 0 && (
            <Text style={styles.goalText}>
              {language === 'es' ? `Meta semanal:` : `Weekly goal:`} {weeklyGoal} {weeklyGoal === 1 ? (language === 'es' ? 'entreno' : 'workout') : (language === 'es' ? 'entrenos' : 'workouts')}
            </Text>
          )}
        </View>

        {/* Today's Workout */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.todaysWorkout}</Text>
        </View>

        {todayRoutine.length > 0 ? (
          <View style={styles.workoutCard}>
            {todayRoutine.map((routine) => (
              <View key={routine.id}>

                <Text style={styles.workoutName}>{routine.name}</Text>
                <Text style={styles.workoutSub}>
                  {routine.exercises.length}{' '}
                  {routine.exercises.length === 1 ? t.exercise : t.exercises}
                </Text>

                <View style={styles.exList}>
                  {routine.exercises.slice(0, 3).map((ex, i) => {
                    const exercise = getExerciseById(ex.exerciseId);
                    return (
                      <View key={i} style={styles.exRow}>
                        <Text style={styles.exName}>
                          {getExerciseName(exercise, language) || ex.exerciseId}
                        </Text>
                        <Text style={styles.exDetail}>
                          {ex.sets.length} × {ex.sets[0]?.reps}
                          {ex.sets[0]?.weight > 0
                            ? ` @ ${ex.sets[0].weight}lbs`
                            : ''}
                        </Text>
                      </View>
                    );
                  })}

                  {routine.exercises.length > 3 && (
                    <Text style={styles.moreEx}>
                      +{routine.exercises.length - 3} {t.moreExercises}
                    </Text>
                  )}
                </View>

                <OrangeButton
                  icon="▶"
                  onPress={() =>
                    navigation.navigate('ActiveWorkout', { routine })
                  }
                  style={styles.startBtn}
                />

              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t.noRoutinesYet}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateRoutine')}>
              <Text style={styles.orangeLink}>{t.createFirstRoutine}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.recentActivity}</Text>
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
              <View style={styles.histLeft}>
                <Text style={styles.histName}>{item.routineName}</Text>
                <Text style={styles.histDate}>{formatHistoryDate(item.date)}</Text>
                <Text style={styles.histDetail}>{item.exercisesCompleted} {t.exercises} · {item.duration} {t.min}</Text>
              </View>
              <View style={styles.doneBadge}>
                <Text style={styles.doneText}>{t.done}</Text>
              </View>
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
  content: { padding: 20, paddingTop: 12 },
  headerRowCentered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  dateCentered: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  calIconBtnSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calEmojiSmall: { fontSize: 18 },

  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  weekDayColumn: { alignItems: 'center', gap: 6 },
  weekDayLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  weekDayLabelActive: { color: COLORS.white },
  weekDayLabelWeekend: { color: '#ff5c5c' },
  weekDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCircleActive: { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  weekDayNum: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  weekDayNumActive: { color: COLORS.white, fontWeight: '800' },
  weekDayNumWeekend: { color: '#ff5c5c' },
  weekDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.orange, marginTop: -2 },

  wheelSection: { alignItems: 'center', marginBottom: 32 },
  wheelWrapper: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
  wheelTextContainer: { position: 'absolute', alignItems: 'center' },
  wheelNumber: { color: COLORS.white, fontSize: 42, fontWeight: '800' },
  wheelSub: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginTop: -4 },
  wheelTotal: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2 },
  goalText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 16, fontWeight: '500' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  orangeLink: { color: COLORS.orange, fontSize: 14, fontWeight: '600' },
  workoutCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 28, gap: 16 },
  workoutName: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  workoutSub: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 },
  exList: { marginBottom: 16 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  exName: { color: COLORS.white, fontSize: 14 },
  exDetail: { color: COLORS.textSecondary, fontSize: 14 },
  moreEx: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  startBtn: { marginTop: 8 },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 28, alignItems: 'center', marginBottom: 28, gap: 10 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  histCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  histLeft: { flex: 1 },
  histName: { color: COLORS.white, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  histDate: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  histDetail: { color: COLORS.textSecondary, fontSize: 13 },
  doneBadge: { backgroundColor: COLORS.green, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  doneText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
