import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../data/theme';
import { loadHistory, loadRoutines } from '../data/storage';
import { useLanguage } from '../context/LanguageContext';
import { EXERCISE_CATALOG, getExerciseName } from '../data/exercises';
export default function HistoryScreen({ navigation, route }) {
  const { t, language } = useLanguage();
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [history, setHistory] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [newdayroutines, setDayRoutines] = useState([[],[],[],[],[],[],[]]);
  const [routineweights, setRoutineWeights] = useState(0); 


  useFocusEffect(useCallback(() => { 
    const initializeDayRoutines = async () => {
    const historyData = await loadHistory();
    const routinesData = await loadRoutines();
    
    setHistory(historyData);
    setRoutines(routinesData);
    const dayroutines = [[],[],[],[],[],[],[]];
    routinesData.forEach((r) => {r.days.forEach((d) => {dayroutines[d].push(r);})});
    setDayRoutines(dayroutines);
    };
    initializeDayRoutines();
  }, [])); 

  useEffect(() => {
    const requestedDate = route?.params?.selectedDate;
    if (!requestedDate) return;
    setSelectedDate(requestedDate);
    const d = new Date(`${requestedDate}T00:00:00`);
    setViewDate({ year: d.getFullYear(), month: d.getMonth() });
  }, [route?.params?.selectedDate]);

  const { year, month } = viewDate;
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const workoutDates = new Set(history.map((h) => h.date));

  const prevMonth = () => setViewDate((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 });
  const nextMonth = () => setViewDate((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 });

  const formatDay = (day) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const isToday = (day) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const selectedWorkouts = history.filter((h) => h.date === selectedDate);
  const routinesToday = newdayroutines[((new Date(selectedDate + 'T00:00:00')).getDay()+ 6) % 7];
  const pendingRoutines = routinesToday.filter(
    (routine) => !selectedWorkouts.some((workout) => workout.routineId === routine.id)
  );

  const formatSelectedDate = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const dayfromRoutine = (day) => {
    const r = routines.map((r) => r.days.find((d) => d === day));
  };


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backEmoji}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t.workoutHistory}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calendario */}
        <View style={styles.calCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{t.months[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dayLabels}>
            {t.days.map((d, i) => <Text key={i} style={styles.dayLabel}>{d}</Text>)}
          </View>

          <View style={styles.grid}>
            {Array.from({ length: firstDay }).map((_, i) => <View key={`e${i}`} style={styles.cell} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayOfWeek = (new Date(year, month, day).getDay() + 6) % 7;
              const dateStr = formatDay(day);
              const selected = dateStr === selectedDate;
              const todayFlag = isToday(day);
              const worked = workoutDates.has(dateStr);
              const routinesToday = newdayroutines[dayOfWeek] || [];
              const todayDate = today.toISOString().split('T')[0];
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.cell, selected && styles.cellSelected, todayFlag && !selected && styles.cellToday]}
                  onPress={() => setSelectedDate(dateStr)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellText, selected && styles.cellTextSelected, todayFlag && !selected && styles.cellTextToday]}>
                    {day}
                  </Text>
                  {worked && <View style={[styles.dot, selected && styles.dotSelected]} />}
                  {routinesToday.length > 0 && dateStr >= todayDate && <View style={[styles.dot, { backgroundColor: COLORS.orange, right: 12 }, selected && { backgroundColor: COLORS.white }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Día seleccionado */}
        <Text style={styles.selectedLabel}>{formatSelectedDate()}</Text>

        {pendingRoutines.length === 0 && selectedWorkouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t.noWorkoutsOnDay}</Text>
          </View>
        ) : (
          <>
            {pendingRoutines.length > 0 && (
              <Text style={styles.dateHeader}>{t.pendingRoutines}</Text>
            )}
            {pendingRoutines.map((routine) => (
              <TouchableOpacity
                key={routine.id}
                style={styles.histCard}
                onPress={() => setRoutineWeights(routineweights === routine.id ? 0 : routine.id)}
                activeOpacity={0.9}
              >
                <View style={styles.histHeader}>
                  <Text style={styles.histName}>{routine.name}</Text>
                  <Text style={styles.histDuration}></Text>
                </View>
                <Text style={styles.histDetail}>{t.pending}</Text>
                {routineweights === routine.id && Array.isArray(routine.exercises) ? (
                  <View style={{ marginTop: 12 }}>
                    {routine.exercises.map((ex, i) => {
                      const exercise = EXERCISE_CATALOG.find((e) => e.id === ex.exerciseId);
                      const name = exercise ? getExerciseName(exercise, language) : ex.exerciseId;
                      const repsText = ex.sets.map((s) => (Number(s.reps) > 0 ? s.reps : '-')).join('  •  ');
                      return (
                        <View key={`${ex.exerciseId}-${i}`} style={styles.setRow}>
                          <Text style={styles.setExerciseName}>{name}</Text>
                          <Text style={styles.setValues}>{repsText}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}

            {selectedWorkouts.length > 0 && (
              <Text style={styles.dateHeader}>{t.completedRoutines}</Text>
            )}
            {selectedWorkouts.map((workout) => {
              const routineForWorkout = routines.find((r) => r.id === workout.routineId);
              const routineName = workout.routineName || routineForWorkout?.name || t.routine;
              return (
                <TouchableOpacity
                  key={workout.id}
                  style={styles.histCard}
                  onPress={() => setRoutineWeights(routineweights === workout.id ? 0 : workout.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.histHeader}>
                    <Text style={styles.histName}>{routineName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.histDuration}>{workout.duration} {t.min}</Text>
                      <Text style={{ fontSize: 16, color: COLORS.green }}>✓</Text>
                    </View>
                  </View>
                  <Text style={styles.histDetail}>
                    {`${workout.exercisesCompleted}/${workout.totalExercises ?? workout.exercisesCompleted} ${t.exercisesCompleted}`}
                  </Text>

                  {routineweights === workout.id && Array.isArray(workout.sets) ? (
                    <View style={{ marginTop: 12 }}>
                      {workout.sets.map((ex, i) => {
                        const exercise = EXERCISE_CATALOG.find((e) => e.id === ex.exerciseId);
                        const name = exercise ? getExerciseName(exercise, language) : ex.exerciseId;
                        const hasCompletedSet = ex.sets.some(
                          (s) => Number(s.reps) > 0 || Number(s.weight) > 0
                        );
                        if (!hasCompletedSet) return null;
                        return (
                          <View key={i} style={styles.setRow}>
                            <Text style={styles.setExerciseName}>{name}</Text>
                            <Text style={styles.setValues}>
                              {ex.sets.map((s) => `${s.reps}x${s.weight}`).join('  •  ')}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {history.length === 0 && (
          <View style={[styles.emptyCard, { marginTop: 12 }]}>
            <Text style={styles.emptyText}>{t.noWorkoutsYet}</Text>
            <Text style={styles.emptySub}>{t.completeToSee}</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const CELL = 40;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backEmoji: { color: COLORS.white, fontSize: 20 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 8 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
  sub: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 24 },
  calCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 24 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { padding: 8 },
  navArrow: { color: COLORS.textSecondary, fontSize: 22 },
  monthLabel: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  dayLabels: { flexDirection: 'row',gap:6 , marginBottom: 8 },
  dayLabel: { width: CELL, textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap:6 },
  cell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginVertical: 2 },
  cellSelected: { backgroundColor: COLORS.orange },
  cellToday: { backgroundColor: COLORS.border },
  cellText: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
  cellTextSelected: { fontWeight: '700' },
  cellTextToday: { fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.green, position: 'absolute', bottom: 4 },
  dotSelected: { backgroundColor: COLORS.white },
  selectedLabel: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 28, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  emptySub: { color: COLORS.textMuted, fontSize: 13, marginTop: 6 },
  dateHeader: { color: COLORS.orange, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginTop: 16, letterSpacing: 0.5 },
  histCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 18, marginBottom: 12 },
  histHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  histName: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  histDuration: { color: COLORS.orange, fontSize: 14, fontWeight: '600' },
  histDetail: { color: COLORS.textSecondary, fontSize: 13 },
  setRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  setExerciseName: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  setValues: { color: COLORS.textSecondary, fontSize: 13 },
});
