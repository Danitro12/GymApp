import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Modal, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../data/theme';
import { loadRoutines, deleteRoutine } from '../data/storage';
import { getExerciseById, getExerciseName } from '../data/exercises';
import OrangeButton from '../components/OrangeButton';
import { useLanguage } from '../context/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Pressable } from 'react-native';
export default function RoutinesScreen({ navigation }) {
  const { t, language } = useLanguage();
  const [routines, setRoutines] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [exercisesData, setExercisesData] = useState(null);
  const [pressed, setPressed] = useState(false);
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true);
  const exAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (exercisesData) {
      exAnim.setValue(0);
      Animated.timing(exAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(exAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
    }
  }, [exercisesData, exAnim]);
  useEffect(() => {
    if (!exercisesData) {
      setOuterScrollEnabled(true);
    }
  }, [exercisesData]);
  useFocusEffect(
    useCallback(() => { loadRoutines().then(setRoutines); }, [])
  );

  const handleDelete = (routine) => {
    Alert.alert(
      t.deleteRoutineTitle,
      `${t.deleteRoutineMsg} "${routine.name}"?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete, style: 'destructive',
          onPress: async () => {
            const updated = await deleteRoutine(routine.id);
            setRoutines(updated);
          },
        },
      ]
    );
  };

  
  return (
    <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={outerScrollEnabled} nestedScrollEnabled>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t.myRoutines}</Text>
              <Text style={styles.sub}>
                {routines.length} {routines.length === 1 ? t.routine : t.routinesPl}
              </Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateRoutine')} activeOpacity={0.85}>
              <Text style={styles.addIcon}>+</Text>
            </TouchableOpacity>
          </View>

          {routines.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptySub}>{t.noRoutinesYet}</Text>
            </View>
          )}

          {routines.map((routine) => {
            const exercises = routine.exercises || [];
            const needsScroll = exercises.length > 3;
            return (
              <View key={routine.id} style={[styles.card, {zIndex: activeMenuId === routine.id ? 100 : 1 }]}>
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={styles.cardHeader} 
                  onPress={() => {
                    setExercisesData(exercisesData === routine.id ? null : routine.id);
                    setActiveMenuId(null);
                  }}
                >
                  <View style={styles.left}>
                    <Text style={styles.cardName}>
                      {routine.name}
                    </Text>

                    <View style={styles.daysRow}>
                      {(routine.days || []).map((dayIndex) => (
                        <View key={dayIndex} style={styles.dayCircle}>
                          <Text style={styles.dayText}>
                            {t.days[dayIndex]}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.right}>
                    <OrangeButton icon={<Icon name="play-arrow" size={20} color="white"/>} onPress={() => navigation.navigate('ActiveWorkout', { routine })}  />
                    <Pressable onPress={() => setActiveMenuId(activeMenuId == routine.id ? null : routine.id)}
                      style={({ pressed }) => [
                        styles.settingsbtn,
                        {
                          backgroundColor: pressed ? COLORS.cardPressed : COLORS.card,
                        },
                      ]}
                    >
                      <Text style={styles.settingsIcon}>⋮</Text>
                    </Pressable>
                  </View>

                </TouchableOpacity>

                {activeMenuId === routine.id && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setActiveMenuId(null); navigation.navigate('CreateRoutine', { routineToEdit: routine }); }}>
                      <Text style={styles.menuText}>{t.edit}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => { setActiveMenuId(null); handleDelete(routine);}}>
                      <Text style={styles.menuText}>{t.delete}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {exercisesData === routine.id && (
                  <Animated.View
                    style={[
                      needsScroll ? styles.exContainerLimited : styles.exContainer,
                      {
                        opacity: exAnim,
                        transform: [
                          {
                            translateY: exAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
                          },
                        ],
                      },
                    ]}
                  >
                    <ScrollView
                        style={styles.exScroll}
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        // Importante: Para que el scroll interno no se pelee con el externo
                        onStartShouldSetResponder={() => true} 
                        onTouchStart={() => setOuterScrollEnabled(false)}
                        onTouchEnd={() => setOuterScrollEnabled(true)}
                        onMomentumScrollEnd={() => setOuterScrollEnabled(true)}
                      >
                        {exercises.map((ex) => {
                          const data = getExerciseById(ex.exerciseId);
                          const maxWeight = Math.max(...ex.sets.map(s => Number(s.weight) || 0));
                          return (
                            <View key={ex.id} style={styles.exRow}>
                              <View>
                                <Text style={styles.exName}>{getExerciseName(data, language)}</Text>
                                <Text style={styles.exCat}>{data.category}</Text>
                              </View>
                              <View style={styles.exRight}>
                                <Text style={styles.exSets}>{ex.sets.length} {t.sets}</Text>
                                {maxWeight > 0 && <Text style={styles.exWeight}>{maxWeight} kg</Text>}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                  </Animated.View>
                )}
                
              </View>
            );
          })}

          <View style={{ height: 24 }} />
        </ScrollView>
    </SafeAreaView>


  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sub: { color: COLORS.textSecondary, fontSize: 14 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  addIcon: { color: COLORS.white, fontSize: 26, fontWeight: '400', lineHeight: 28 },
  emptyBox: { backgroundColor: COLORS.card, borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 16 },
  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16,
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84, },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap:4 },
  cardName: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
  cardSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 18 },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 14 },
  exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  exName: { color: COLORS.white, fontSize: 15, fontWeight: '600' , flexWrap: 'wrap', width: '90%'},
  exCat: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  exRight: { alignItems: 'flex-end' },
  exSets: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  exWeight: { color: COLORS.orange, fontSize: 13, marginTop: 2 },
  moreEx: { color: COLORS.textSecondary, fontSize: 13, marginTop: 10 }, daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  dayCircle: { width: 30, height: 30, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', gap: 4 },
  dayCircleActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  dayText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  dayTextActive: { color: COLORS.white },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  settingsbtn: { width: 38, height: 38,padding: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4}, 
  settingsIcon: { color: COLORS.textSecondary, fontSize: 30 ,alignItems: 'center', justifyContent: 'center', lineHeight: 30},
  left: {
    flex: 1,
    marginLeft: 10
  },

  daysRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1, 
  },
  exContainer: {
    marginTop: 16,
    borderRadius: 12,
    height: 100,
  },
  exScroll: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  exContainerLimited: {
    marginTop: 16,
    height: 180,
    maxHeight: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 68, 
    right: 22,
    backgroundColor: COLORS.card, 
    borderRadius: 8,
    width: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 101,
   
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuText: {
    color: COLORS.white,
    fontSize: 14,
  },
});
