import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';

// Cabecera común de las pantallas apiladas (atrás + título + acción opcional).
export default function ScreenHeader({ title, subtitle, onBack, right, backIcon = 'arrow-back' }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.8} accessibilityRole="button">
          <Icon name={backIcon} size={22} color={COLORS.white} />
        </TouchableOpacity>
      ) : <View style={styles.spacer} />}
      <View style={styles.titleWrap}>
        {!!title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right || <View style={styles.spacer} />}
    </View>
  );
}

export function HeaderIconButton({ icon, onPress, color = COLORS.white, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.iconBtn}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 42 },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
