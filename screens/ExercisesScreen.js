import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { useExercises } from '../context/ExercisesContext';
import ExerciseBrowser from '../components/ExerciseBrowser';

// Pestaña "Ejercicios": todo el catálogo + los ejercicios propios del usuario.
export default function ExercisesScreen({ navigation }) {
  const { t, language } = useLanguage();
  const { allExercises } = useExercises();

  const openInfo = useCallback((ex) => navigation.navigate('ExerciseInfo', { exerciseId: ex.id }), [navigation]);
  const create = useCallback(() => navigation.navigate('CreateExercise'), [navigation]);

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t.exerciseLibrary}</Text>
        <Text style={styles.sub}>{t.librarySubtitle}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={create} activeOpacity={0.85} accessibilityLabel={t.newExercise}>
        <Icon name="add" size={26} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ExerciseBrowser
        exercises={allExercises}
        t={t}
        language={language}
        onPressItem={openInfo}
        onCreate={create}
        ListHeaderComponent={header}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 24, marginBottom: 14 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sub: { color: COLORS.textSecondary, fontSize: 14 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
});
