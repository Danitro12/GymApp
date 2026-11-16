import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { loadRoutines, deleteRoutine } from '../data/storage';
import { getExerciseById, resolveExerciseName } from '../data/exercises';
import { useLanguage } from '../context/LanguageContext';
import { useWorkout } from '../context/WorkoutContext';
import useStartWorkout from '../hooks/useStartWorkout';
import ExerciseThumb from '../components/ExerciseThumb';
import { confirmAsync } from '../utils/dialogs';

export default function RoutinesScreen({ navigation }) {
  const { t, language } = useLanguage();
  const { session } = useWorkout();
  const startRoutine = useStartWorkout(navigation);
  const [routines, setRoutines] = useState([]);
  const [menuId, setMenuId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadRoutines().then(setRoutines);
      setMenuId(null);
    }, []),
  );

  const handleDelete = async (routine) => {
    setMenuId(null);
    const ok = await confirmAsync(
      t.deleteRoutineTitle,
      `${t.deleteRoutineMsg} "${routine.name}"?`,
      { confirmText: t.delete, cancelText: t.cancel, destructive: true },
    );
    if (!ok) return;
    const updated = await deleteRoutine(routine.id);
    if (updated) setRoutines(updated);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t.myRoutines}</Text>
            <Text style={styles.sub}>{routines.length} {routines.length === 1 ? t.routine.toLowerCase() : t.routinesPl}</Text>
          </View>
          <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Data')}
            activeOpacity={0.85}
            accessibilityLabel={t.dataTitle}
          >
            <Icon name="import-export" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateRoutine')}
            activeOpacity={0.85}
            accessibilityLabel={t.createRoutine}
          >
            <Icon name="add" size={26} color={COLORS.white} />
          </TouchableOpacity>
          </View>
        </View>

        {routines.length === 0 && (
          <TouchableOpacity style={styles.emptyBox} onPress={() => navigation.navigate('CreateRoutine')} activeOpacity={0.85}>
            <Icon name="event-note" size={34} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{t.noRoutinesYet}</Text>
            <Text style={styles.emptySub}>{t.noRoutinesDesc}</Text>
          </TouchableOpacity>
        )}

        {routines.map((routine) => {
          const exercises = routine.exercises || [];
          const expanded = expandedId === routine.id;
          const inProgress = session?.routine?.id === routine.id;
          const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
          return (
            <View key={routine.id} style={[styles.card, { zIndex: menuId === routine.id ? 100 : 1 }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cardHeader}
                onPress={() => { setExpandedId(expanded ? null : routine.id); setMenuId(null); }}
              >
                <View style={styles.left}>
                  <Text style={styles.cardName} numberOfLines={1}>{routine.name}</Text>
                  <Text style={styles.cardSub}>
                    {exercises.length} {exercises.length === 1 ? t.exercise : t.exercises} · {totalSets} {t.sets.toLowerCase()}
                  </Text>
                  <View style={styles.daysRow}>
                    {t.days.map((d, i) => {
                      const on = (routine.days || []).includes(i);
                      return (
                        <View key={i} style={[styles.dayDot, on && styles.dayDotOn]}>
                          <Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.right}>
                  <TouchableOpacity
                    style={[styles.playBtn, inProgress && styles.playBtnActive]}
                    onPress={() => startRoutine(routine)}
                    activeOpacity={0.85}
                    accessibilityLabel={inProgress ? t.continueWorkout : t.startWorkout}
                  >
                    <Icon name={inProgress ? 'play-circle-outline' : 'play-arrow'} size={26} color={COLORS.white} />
                  </TouchableOpacity>
                  <Pressable
                    onPress={() => setMenuId(menuId === routine.id ? null : routine.id)}
                    style={({ pressed }) => [styles.moreBtn, pressed && { backgroundColor: COLORS.cardPressed }]}
                    accessibilityLabel="Menu"
                  >
                    <Icon name="more-vert" size={24} color={COLORS.textSecondary} />
                  </Pressable>
                </View>
              </TouchableOpacity>

              {menuId === routine.id && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setMenuId(null); navigation.navigate('CreateRoutine', { routineToEdit: routine }); }}
                  >
                    <Icon name="edit" size={18} color={COLORS.white} />
                    <Text style={styles.menuText}>{t.edit}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => handleDelete(routine)}>
                    <Icon name="delete-outline" size={18} color="#ef4444" />
                    <Text style={[styles.menuText, { color: '#ef4444' }]}>{t.delete}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {expanded && (
                <View style={styles.exContainer}>
                  {exercises.map((ex, i) => {
                    const data = getExerciseById(ex.exerciseId);
                    const reps = ex.sets.map((s) => s.reps || '-').join(' · ');
                    return (
                      <TouchableOpacity
                        key={ex.id || i}
                        style={[styles.exRow, i === exercises.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => data && navigation.navigate('ExerciseInfo', { exerciseId: ex.exerciseId })}
                        activeOpacity={0.8}
                      >
                        <ExerciseThumb exercise={data} size={38} radius={8} />
                        <Text style={styles.exName} numberOfLines={2}>{resolveExerciseName(ex.exerciseId, language)}</Text>
                        <View style={styles.exRight}>
                          <Text style={styles.exSets}>{ex.sets.length} × </Text>
                          <Text style={styles.exReps} numberOfLines={1}>{reps}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sub: { color: COLORS.textSecondary, fontSize: 14 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  secondaryBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  emptyBox: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  left: { flex: 1 },
  cardName: { color: COLORS.white, fontSize: 19, fontWeight: '700' },
  cardSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  daysRow: { flexDirection: 'row', marginTop: 10, gap: 5 },
  dayDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardDark },
  dayDotOn: { backgroundColor: COLORS.orange + '33' },
  dayText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  dayTextOn: { color: COLORS.orange },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  playBtnActive: { backgroundColor: COLORS.green },
  moreBtn: { width: 36, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exContainer: { marginTop: 14, backgroundColor: COLORS.cardDark, borderRadius: 12, paddingHorizontal: 10 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  exName: { color: COLORS.white, fontSize: 14, fontWeight: '600', flex: 1 },
  exRight: { flexDirection: 'row', alignItems: 'center', maxWidth: '40%' },
  exSets: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  exReps: { color: COLORS.textSecondary, fontSize: 13, flexShrink: 1 },
  dropdownMenu: {
    position: 'absolute', top: 64, right: 16, backgroundColor: COLORS.cardDark, borderRadius: 12, width: 150,
    borderWidth: 1, borderColor: COLORS.border, zIndex: 101,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
});
