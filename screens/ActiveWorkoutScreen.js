import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, findNodeHandle, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../data/theme';
import ExerciseSetRow from '../components/ExerciseSetRow';
import { getExerciseById, getExerciseName } from '../data/exercises';
import { saveWorkoutToHistory, updateRoutineRecords, loadRoutineRecords } from '../data/storage';
import { useLanguage } from '../context/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AnimatedIcon = Animated.createAnimatedComponent(Icon)
export default function ActiveWorkoutScreen({ route, navigation }) {
  const { t, language } = useLanguage();
  const { routine } = route.params;
  const scrollRef = useRef(null);
  const [idxexercise, setExercise] = useState(0);
  const idx = 0;
  const buildInitialSets = () =>
    routine.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((set, i) => ({
        id: i + 1, reps: '', weight: '', checked: false,
      })),
    }));

  const [exerciseSets, setExerciseSets] = useState(buildInitialSets);
  const [routineRecords, setRoutineRecords] = useState({});
  const [elapsed, setElapsed]           = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const timerRef                        = useRef(null);

  useEffect(() => {
    if (!isTimerRunning) return () => {};
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  useEffect(() => {
    loadRoutineRecords(routine.id).then(setRoutineRecords);
  }, [routine.id]);


  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const completedCount = exerciseSets.filter((ex) => ex.sets.every((s) => s.checked)).length;

  const updateSet = (exIndex, setIndex, field, value) => {
    setExerciseSets((prev) => {
      const next = [...prev];
      next[exIndex] = {
        ...next[exIndex],
        sets: next[exIndex].sets.map((s, i) => {
          if (i === setIndex) {
            const updated = { ...s, [field]: value };
            // Auto-check if both fields are filled (not empty strings)
            if (updated.reps !== '' && updated.weight !== '') {
              updated.checked = true;
            } else {
              updated.checked = false;
            }
            return updated;
          }
          return s;
        })
      };
      return next;
    });
  };

  const handleWeightSubmit = (exIndex, setIndex) => {
    setExerciseSets((prev) => {
      const next = [...prev];
      const set = next[exIndex].sets[setIndex];
      if (set.reps && set.weight) {
        set.checked = true;
      }
      return next;
    });
  };

  const handleInputFocus = (inputRef) => {
    if (Platform.OS === 'web') return;
    const node = inputRef?.current ? findNodeHandle(inputRef.current) : null;
    const responder = scrollRef.current?.getScrollResponder?.();
    if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
      setTimeout(() => {
        responder.scrollResponderScrollNativeHandleToKeyboard(node, 150, true);
      }, 0);
    }
  };

  const toggleCheck = (exIndex, setIndex) => {
    setExerciseSets((prev) => {
      const next = [...prev];
      next[exIndex] = { ...next[exIndex], sets: next[exIndex].sets.map((s, i) => i === setIndex ? { ...s, checked: !s.checked } : s) };
      return next;
    });
  };

  const handleFinish = () => {
    const msg = `${t.finishWorkoutMsg} ${completedCount}/${routine.exercises.length} ${t.finishExercisesIn} ${formatTime(elapsed)}.`;
    const onFinish = async () => {
      clearInterval(timerRef.current);
      const today = new Date().toISOString().split('T')[0];
      await saveWorkoutToHistory({
        id:                 `h_${Date.now()}`,
        routineId:          routine.id,
        routineName:        routine.name,
        date:               today,
        duration:           Math.round(elapsed / 60),
        exercisesCompleted: completedCount,
        totalExercises:     routine.exercises.length,
        sets:               exerciseSets,
      });
      await updateRoutineRecords(routine.id, exerciseSets);
      navigation.goBack();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${t.finishWorkoutQ}\n\n${msg}`)) {
        onFinish();
      }
    } else {
      Alert.alert(
        t.finishWorkoutQ,
        msg,
        [
          { text: t.keepGoing, style: 'cancel' },
          { text: t.finish, onPress: onFinish },
        ]
      );
    }
  };

  const toggleTimer = () => setIsTimerRunning((prev) => !prev);
  const resetTimer = () => setElapsed(0);

  const openExerciseInfo = (exerciseId) => {
    navigation.navigate('ExerciseInfo', { exerciseId });
  };


  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => {
          if (Platform.OS === 'web') {
            if (window.confirm(`${t.cancelWorkout}\n\n${t.cancelWorkoutMsg}`)) {
              navigation.goBack();
            }
          } else {
            Alert.alert(t.cancelWorkout, t.cancelWorkoutMsg, [
              { text: t.keepGoing, style: 'cancel' },
              { text: t.cancel, style: 'destructive', onPress: () => navigation.goBack() },
            ]);
          }
        }} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title}>{routine.name}</Text>
        <Text style={styles.sub}>{completedCount}/{routine.exercises.length} {t.exercises}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(completedCount / routine.exercises.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

      {(() => {
        const exData = exerciseSets[idxexercise];
        const exIndex = idxexercise;
        const exercise = getExerciseById(exData.exerciseId);
        return (
          <View key={exData.exerciseId + exIndex} style={styles.exCard}>
            <View style={styles.exTitleRow}>
              <Text style={styles.exName}>{getExerciseName(exercise, language) || exData.exerciseId}</Text>
              <TouchableOpacity
                onPress={() => openExerciseInfo(exData.exerciseId)}
                style={styles.infoBtn}
                activeOpacity={0.8}
              >
                <Icon name="info-outline" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.exCat}>{exercise?.category}</Text>
            <View style={styles.colHeaders}>
              <Text style={[styles.colLabel, { width: 32, textAlign: 'center' }]}>{t.set}</Text>
              <Text style={[styles.colLabel, { flex: 1, textAlign: 'center' }]}>{t.record}</Text>
              <Text style={[styles.colLabel, { width: 28, textAlign: 'center' }]}></Text>
              <Text style={[styles.colLabel, { flex: 1.2, textAlign: 'center' }]}>{t.reps}</Text>
              <Text style={[styles.colLabel, { flex: 1.2, textAlign: 'center' }]}>{t.weight}</Text>
              <View style={{ width: 36 }} />
            </View>
            {exData.sets.map((set, setIndex) => {
              const record = routineRecords?.[exData.exerciseId]?.[setIndex];
              const recordText = record ? `${record.maxRepsAtMaxWeight}x${record.maxWeight}` : '-';

              return (
              <ExerciseSetRow
                key={set.id}
                set={set.id}
                previous={recordText}
                targetReps={routine.exercises?.[exIndex]?.sets?.[setIndex]?.reps}
                reps={set.reps}
                weight={set.weight}
                checked={set.checked}
                onRepsChange={(v) => updateSet(exIndex, setIndex, 'reps', v)}
                onWeightChange={(v) => updateSet(exIndex, setIndex, 'weight', v)}
                onWeightSubmit={() => handleWeightSubmit(exIndex, setIndex)}
                onCheck={() => toggleCheck(exIndex, setIndex)}
                onInputFocus={handleInputFocus}
              />
              );
            })}

          </View>
        );
      })()}
      </ScrollView>
      <View style={styles.switchContainer}>
        <TouchableOpacity style={styles.btnswitch} onPress={() => {setExercise((prev) => Math.max(0, prev - 1)); }}>
          <AnimatedIcon name="arrow-back-ios" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.timerControls}>
          <Text style={styles.timerBig}>{formatTime(elapsed)}</Text>
          <View style={styles.timerButtons}>
            <TouchableOpacity style={styles.timerBtn} onPress={toggleTimer} activeOpacity={0.8}>
              <AnimatedIcon
                name={isTimerRunning ? 'stop' : 'play-arrow'}
                size={40}
                color={isTimerRunning ? '#ef4444' : '#22c55e'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerBtn} onPress={resetTimer} activeOpacity={0.8}>
              <AnimatedIcon name="refresh" size={40} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.btnswitch} onPress={() => {setExercise((prev) => Math.min(exerciseSets.length - 1, prev + 1)); }}>
          <AnimatedIcon name="arrow-forward-ios" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
            

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.finishText}>{t.finishWorkout}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.background },
  topBar:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn:  { padding: 4 },
  backIcon: { color: COLORS.white, fontSize: 22 },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  timerIcon:{ fontSize: 14, color: COLORS.orange },
  timer:    { color: COLORS.orange, fontSize: 15, fontWeight: '700' },
  titleSection: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: COLORS.white, fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:   { color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 },
  progressBar:  { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.orange, borderRadius: 2 },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 200 },
  exCard:  { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 16 },
  exTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  exName:  { color: COLORS.white, fontSize: 18, fontWeight: '700', flex: 1 },
  infoBtn: { padding: 6, borderRadius: 10, backgroundColor: COLORS.cardDark },
  exCat:   { color: COLORS.textSecondary, fontSize: 13, marginBottom: 14 },
  colHeaders: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  colLabel:   { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  bottomBar:  {  padding: 16, 
  backgroundColor: COLORS.background, 
  borderTopWidth: 1, 
  borderTopColor: COLORS.border },
  finishBtn:  { backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  finishText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  switchContainer: {flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 10, justifyContent: 'space-between', alignItems: 'center' },
  btnswitch: { padding: 12, backgroundColor: COLORS.card, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnswitchText: { color: COLORS.white, fontSize: 14 }, 
  timerControls: { flex: 1, alignItems: 'center', gap: 8 },
  timerBig: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  timerButtons: { flexDirection: 'row', gap: 8 },
  timerBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.card },
  timerBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
