import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { clearAllData } from '../data/storage';

const LANGUAGES = [
  { code: 'en', flag: 'US', name: 'English',  native: 'English'  },
  { code: 'es', flag: 'ES', name: 'Español',  native: 'Spanish'  },
];
const DEBUG = __DEV__;
export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [shouldClear, setShouldClear] = useState(false);

  useEffect(() => {
    if (shouldClear) {
      clearAllData();
      console.log('✅ Datos borrados completamente');
      setShouldClear(false);
    }
  }, [shouldClear]);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.title}>{t.settingsTitle}</Text>
        <Text style={styles.sub}>{t.settingsSubtitle}</Text>

        {/* Language card */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🌐</Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>{t.language}</Text>
              <Text style={styles.cardSub}>{t.chooseLanguage}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Language options */}
          {LANGUAGES.map((lang) => {
            const selected = language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langRow, selected && styles.langRowSelected]}
                onPress={() => setLanguage(lang.code)}
                activeOpacity={0.75}
              >
                {/* Flag badge */}
                <View style={[styles.flagBadge, selected && styles.flagBadgeSelected]}>
                  <Text style={styles.flagText}>{lang.flag}</Text>
                </View>

                {/* Name */}
                <View style={styles.langInfo}>
                  <Text style={[styles.langName, selected && styles.langNameSelected]}>
                    {lang.name}
                  </Text>
                  <Text style={styles.langNative}>{lang.native}</Text>
                </View>

                {/* Check */}
                {selected && (
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}


          
        </View>

        {DEBUG && (
          <>
            <View style={{ height: 15 }} />
            <View style={styles.card}>
              <TouchableOpacity
                key={123}
                style={[styles.langRow]}
                activeOpacity={0.75}
                onPress={() => setShouldClear(true)}
              >
                <View style={styles.langInfo}>
                  <Text style={[styles.langName]}>
                    🗑️ Clean Data (DEBUG)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingTop: 24 },

  title: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sub:   { color: COLORS.textSecondary, fontSize: 14, marginBottom: 28 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.orange + '22', // naranja con transparencia
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 20 },
  cardTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  cardSub:   { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },

  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },

  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardDark,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  langRowSelected: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orange + '15',
  },

  flagBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBadgeSelected: {
    backgroundColor: COLORS.orange,
  },
  flagText: { color: COLORS.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  langInfo: { flex: 1 },
  langName: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  langNameSelected: { color: COLORS.orange },
  langNative: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
