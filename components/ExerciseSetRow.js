import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../data/theme';

export default function ExerciseSetRow({ set, previous, targetReps, reps, weight, onRepsChange, onWeightChange, onCheck, onWeightSubmit, checked, onInputFocus }) {
  const repsRef = useRef(null);
  const weightRef = useRef(null);
  const targetText = targetReps === null || targetReps === undefined || targetReps === ''
    ? '-'
    : String(targetReps);

  return (
    <View style={[styles.row, checked && styles.rowChecked]}>
      {/* Set number */}
      <View style={styles.setBox}>
        <Text style={styles.setNum}>{set}</Text>
      </View>

      {/* Previous */}
      <Text style={styles.previous}>{previous || '-'}</Text>

      {/* Target reps */}
      <Text style={styles.targetReps}>{targetText}</Text>

      {/* Reps input */}
      <TextInput
        ref={repsRef}
        style={styles.input}
        value={String(reps)}
        onChangeText={onRepsChange}
        keyboardType="decimal-pad"
        selectTextOnFocus
        placeholder="-"
        placeholderTextColor={COLORS.textSecondary}
        returnKeyType="next"
        onSubmitEditing={() => weightRef.current?.focus()}
        onFocus={() => onInputFocus?.(repsRef)}
      />

      {/* Weight input */}
      <TextInput
        ref={weightRef}
        style={styles.input}
        value={String(weight)}
        onChangeText={onWeightChange}
        onSubmitEditing={onWeightSubmit}
        keyboardType="decimal-pad"
        selectTextOnFocus
        placeholder="-"
        placeholderTextColor={COLORS.textSecondary}
        returnKeyType="done"
        onFocus={() => onInputFocus?.(weightRef)}
      />

      {/* Check indicator */}
      <View style={[styles.checkBtn, checked && styles.checkBtnActive]}>
        <Text style={[styles.checkIcon, checked && styles.checkIconActive]}>✓</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
    opacity: 1,
  },
  rowChecked: {
    opacity: 0.6,
  },
  setBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNum: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  previous: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  input: {
    flex: 1.2,
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    color: COLORS.white,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  targetReps: {
    width: 28,
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.checkBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnActive: {
    backgroundColor: COLORS.orange,
  },
  checkIcon: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  checkIconActive: {
    color: COLORS.white,
  },
});
