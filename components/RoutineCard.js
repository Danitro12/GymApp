import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../data/theme';
import OrangeButton from './OrangeButton';
import { getExerciseById, getExerciseName } from '../data/exercises';
import { useLanguage } from '../context/LanguageContext';

export default function RoutineCard({ routine, onStartWorkout }) {
  const { t, language } = useLanguage();
  const preview = routine.exercises.slice(0, 3);
  const remaining = routine.exercises.length - 3;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{routine.name}</Text>
          <Text style={styles.sub}>{routine.exercises.length} {routine.exercises.length === 1 ? t.exercise : t.exercises}</Text>
        </View>
        <Text style={styles.editIcon}>✎</Text>
      </View>

      <View style={styles.divider} />

      {preview.map((ex) => {
        const exercise = getExerciseById(ex.exerciseId);
        return (
          <View key={ex.exerciseId} style={styles.exRow}>
            <View>
              <Text style={styles.exName}>{getExerciseName(exercise, language)}</Text>
              <Text style={styles.exCat}>{exercise?.category}</Text>
            </View>
            <View style={styles.exRight}>
              <Text style={styles.exSets}>{ex.sets.length} × {ex.sets[0]?.reps}</Text>
              <Text style={styles.exWeight}>{ex.sets[0]?.weight > 0 ? `${ex.sets[0].weight} lbs` : t.bodyweight}</Text>
            </View>
          </View>
        );
      })}

      {remaining > 0 && (
        <Text style={styles.more}>+{remaining} {t.moreExercises}</Text>
      )}

      <OrangeButton label={t.startWorkout} icon="▶" onPress={() => onStartWorkout(routine)} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  editIcon: {
    color: COLORS.textSecondary,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  exCat: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  exRight: {
    alignItems: 'flex-end',
  },
  exSets: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  exWeight: {
    color: COLORS.orange,
    fontSize: 13,
    marginTop: 2,
  },
  more: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
  },
  btn: {
    marginTop: 16,
  },
});
