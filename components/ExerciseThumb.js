import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { WorkoutIcons } from '../assets/index_exercises';

// Miniatura de un ejercicio: SVG del catálogo, imagen subida por el usuario o
// un icono genérico si no tiene ninguna.
function ExerciseThumb({ exercise, size = 48, radius = 10, style }) {
  const box = [styles.box, { width: size, height: size, borderRadius: radius }, style];
  if (!exercise) return <View style={box} />;

  const svg = WorkoutIcons[exercise.id];
  const Svg = svg?.default || svg;
  if (Svg) {
    return (
      <View style={box}>
        <Svg width="100%" height="100%" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice" />
      </View>
    );
  }

  if (exercise.imageUri) {
    return (
      <View style={box}>
        <Image source={{ uri: exercise.imageUri }} style={styles.img} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View style={box}>
      <Icon name="fitness-center" size={Math.round(size * 0.45)} color={COLORS.textSecondary} />
    </View>
  );
}

export default React.memo(ExerciseThumb);

const styles = StyleSheet.create({
  box: { backgroundColor: COLORS.cardDark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
});
