import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../data/theme';

export default function StatCard({ icon, label, value, unit, accent }) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <View style={styles.top}>
        <Text style={[styles.icon]}>{icon}</Text>
        <Text style={[styles.label, accent && styles.labelAccent]}>{label}</Text>
      </View>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      <Text style={[styles.unit, accent && styles.unitAccent]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 4,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  cardAccent: {
    backgroundColor: COLORS.orange,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  labelAccent: {
    color: COLORS.white,
  },
  value: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 6,
  },
  valueAccent: {
    color: COLORS.white,
  },
  unit: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  unitAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
});
