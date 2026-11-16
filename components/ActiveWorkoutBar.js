import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import {
  useWorkout, useNow, getElapsedMs, getRestMs, countCompletedExercises,
} from '../context/WorkoutContext';
import { formatDuration } from '../utils/date';

// Barra flotante sobre las pestañas mientras hay un entreno en curso.
export default function ActiveWorkoutBar({ onPress }) {
  const { t } = useLanguage();
  const { session } = useWorkout();
  const running = !!session?.timer?.runningSince;
  const now = useNow(!!session);
  if (!session) return null;

  const elapsed = getElapsedMs(session, now) / 1000;
  const done = countCompletedExercises(session);
  const total = session.routine.exercises.length;
  const restMs = getRestMs(session, now);
  const rest = restMs === null ? null : Math.floor(restMs / 1000);

  return (
    <TouchableOpacity style={styles.bar} onPress={onPress} activeOpacity={0.9} accessibilityRole="button">
      <View style={[styles.pulse, !running && styles.pulsePaused]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{t.workoutInProgress}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {session.routine.name} · {done}/{total}
          {rest !== null ? ` · ${t.restLabel} ${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}` : ''}
        </Text>
      </View>
      <Text style={[styles.time, !running && styles.timePaused]}>
        {running ? formatDuration(elapsed) : `${formatDuration(elapsed)} · ${t.paused}`}
      </Text>
      <Icon name="chevron-right" size={24} color={COLORS.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.orange,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.white },
  pulsePaused: { opacity: 0.4 },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  time: { color: COLORS.white, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timePaused: { fontSize: 13, opacity: 0.85 },
});
