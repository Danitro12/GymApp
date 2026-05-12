import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS } from '../data/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../context/LanguageContext';
import { getExerciseText } from '../data/exercises';
export default function ExerciseInfo({ exercise, onClose, Icono }) {
  const [DescriptionExpanded, setDescriptionExpanded] = useState(false);
  const { t, language } = useLanguage();
  const exerciseText = getExerciseText(exercise, language);
  return (
    <View style={styles.body}>

      <TouchableOpacity style={styles.filterBackdrop} activeOpacity={1.0} onPress={onClose} />
      
      <View style={styles.filterPanel}>
        <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 16 }}>
          {Icono && (
            <View style={[styles.exThumbnail, { alignSelf: 'center', marginBottom: 16 }]}>
              <Icono width="100%" height="100%" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice"fill={COLORS.white} />
            </View>
          )}
        </View>
 
        
      <Text style={{ color: 'white', fontSize: 24, alignSelf: 'center', alignItems: 'center', flexWrap: 'wrap', width: '80%' }}>{exerciseText.name}</Text>

      <View style={{ margin: 16, paddingHorizontal: 12 , backgroundColor: COLORS.card, borderRadius: 8 , flex: 1}} activeOpacity={0.8} >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: 8 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 16, marginBottom: 8 }}>{t.exerciseDescription}</Text>
          <TouchableOpacity onPress={() => setDescriptionExpanded(!DescriptionExpanded)} activeOpacity={0.8} style={{ marginBottom: 8 }}>
            <Icon name={DescriptionExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {DescriptionExpanded ? (
          <ScrollView
            style={styles.exScroll}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}>
            <Text style={{ color: 'white', fontSize: 15 }}>{exerciseText.description || t.noDescription}</Text>
          </ScrollView>
        ) : null}
      
      </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', zIndex: 10 },
  filterBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  filterPanel: { position: 'absolute', top: 0, right: 20, bottom: 100, left: 20, backgroundColor: '#1e1e1e', borderRadius: 24, paddingTop: 8, paddingBottom: 16 },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 8, backgroundColor: COLORS.primary, borderRadius: 8, zIndex: 2 },
  closeBtnText: { color: 'white', fontSize: 16 },
  exThumbnail: { width: 200, height: 200, borderRadius: 50, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  exScroll: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  }, 
});