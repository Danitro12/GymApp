import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../data/theme';

// Campo de fecha (AAAA-MM-DD). En la web usa el selector nativo del navegador.
export default function DateField({ label, value, onChange, min, max }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'web' ? (
        React.createElement('input', {
          type: 'date',
          value: value || '',
          min,
          max,
          onChange: (e) => onChange(e.target.value),
          style: webInputStyle,
          'aria-label': label,
        })
      ) : (
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^0-9-]/g, '').slice(0, 10))}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      )}
    </View>
  );
}

const webInputStyle = {
  backgroundColor: COLORS.inputBg,
  color: COLORS.white,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 15,
  fontFamily: 'inherit',
  colorScheme: 'dark',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.inputBg, color: COLORS.white, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
});
