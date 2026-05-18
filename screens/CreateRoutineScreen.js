  import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
  import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    SafeAreaView, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform,
  } from 'react-native';
  import { Asset } from 'expo-asset';
  import { SvgXml } from 'react-native-svg';
  import { COLORS } from '../data/theme';
  import { EXERCISE_CATALOG, CATEGORIES, getExerciseText } from '../data/exercises';
  import { saveRoutine, updateRoutine } from '../data/storage';
  import { useLanguage } from '../context/LanguageContext';
  import { WorkoutIcons } from '../assets/index_exercises';
  import { useRoute, useFocusEffect } from '@react-navigation/native';
  import Icon from 'react-native-vector-icons/MaterialIcons';
  // Componente de ejercicio
  const ExerciseItem = React.memo(({ item, localizedName, selected, onToggle, onInfoPress, Icono }) => {
    return (
      <TouchableOpacity
        style={[styles.listRow, selected && styles.listRowSel]}
        onPress={() => onToggle(item)}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.listName, selected && styles.listNameSel]}>{localizedName}</Text>
          <Text style={styles.listCat}>{item.category}</Text>
        </View>
        {Icono && (
          <View style={[styles.exThumbnail, { width: 40, height: 40, marginRight: selected ? 8 : 0 }]}>
            <Icono
              width="100%"
              height="100%"
              viewBox="0 0 500 500"
              preserveAspectRatio="xMidYMid slice"
            />
          </View>
        )}
        <TouchableOpacity onPress={() => onInfoPress(item)} style={{ padding: 6, margin: 4 }}>
          <Icon name="info-outline" size={30} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {selected && (
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  export default function CreateRoutineScreen({ navigation }) {
    const { t, language } = useLanguage();
    const ALL_MUSCLES = '__all__';
    const [routineName, setRoutineName] = useState('');
    const [selectedExercises, setSelectedExercises] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedDays, setSelectedDays] = useState([]);
    const [categorySelected, setSelectedCategory] = useState('All');
    const [muscleSelected, setSelectedMuscle] = useState(ALL_MUSCLES);
    const [setsCreated, setSetsCreated] = useState([]);
    const [filterBtn, setFilterBtn] = useState(false);
    const [seeSetsEx, setSeeSetsEx] = useState(null);
    const [restoreModalOnFocus, setRestoreModalOnFocus] = useState(false);
    const route = useRoute();
    const routineToEdit = route.params?.routineToEdit; 
    const scrollRef = useRef(null);


    useEffect(() => {
      if (routineToEdit) {
        setRoutineName(routineToEdit.name);
        setSelectedExercises(routineToEdit.exercises);
        setSelectedDays(routineToEdit.days || []);
      }
    }, []);

    const toggleDay = (dayIndex) => {
      if (selectedDays.includes(dayIndex)) {
        setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
      } else {
        setSelectedDays([...selectedDays, dayIndex]);
      }
    }
    const exercisesToShow = React.useMemo(() => {
      const selectedCatClean = categorySelected.trim().toLowerCase();
      const muscleCatClean = muscleSelected.trim();
      return EXERCISE_CATALOG.filter((ex) => {
        const localizedName = getExerciseText(ex, language).name.toLowerCase();
        // 1. Filtro de Búsqueda (Texto)
        const matchesSearch = 
          localizedName.includes(search.toLowerCase()) ||
          ex.category.toLowerCase().includes(search.toLowerCase());

        // 2. Filtro de Categoría
        const exerciseCatClean = ex.category.toLowerCase().replace(/\s+/g, '');
        const matchesCategory = 
          categorySelected === 'All' || 
          exerciseCatClean === selectedCatClean;
          
        const matchesMuscle =
          muscleSelected === ALL_MUSCLES ||
          (ex.muscles && Object.prototype.hasOwnProperty.call(ex.muscles, muscleCatClean));

        return matchesSearch && matchesCategory && matchesMuscle;
      });
    }, [search, categorySelected, muscleSelected, ALL_MUSCLES, language]); 

    const allMusclesLabel = React.useMemo(() => {
      const allCategory = t.exercisesCategories?.find((cat) => cat.key === 'All');
      return allCategory?.label || 'All';
    }, [t.exercisesCategories]);

    const musclesFilterOptions = React.useMemo(() => {
      return [{ key: ALL_MUSCLES, label: allMusclesLabel }, ...t.musclesList];
    }, [ALL_MUSCLES, allMusclesLabel, t.musclesList]);


    const selectedIds = useMemo(
      () => new Set(selectedExercises.map((e) => e.id)),
      [selectedExercises]
    );

    const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

    const toggleExercise = React.useCallback((exercise) => {
      setSelectedExercises((prev) => {
        const exists = prev.some((e) => e.id === exercise.id);
        if (exists) {
          return prev.filter((e) => e.id !== exercise.id);
        }
        return [
          ...prev,
          { id: exercise.id, exerciseId: exercise.id, sets: [{ id: `s_${Date.now()}`, reps: 0, weight: 0 }], order: prev.length },
        ];
      });
    }, [])

    const showExerciseInfo = useCallback((exercise) => {
      if (modalVisible) {
        setRestoreModalOnFocus(true);
      }
      setModalVisible(false);
      navigation.navigate('ExerciseInfo', { exerciseId: exercise.id });
    }, [navigation, modalVisible]);

    useFocusEffect(
      useCallback(() => {
        if (restoreModalOnFocus) {
          setModalVisible(true);
          setRestoreModalOnFocus(false);
        }
      }, [restoreModalOnFocus])
    );

    const getIconComponent = useCallback((id) => {
      const icon = WorkoutIcons[id];
      return icon?.default || icon;
    }, []);

    const renderExerciseItem = React.useCallback(({ item }) => (
      <ExerciseItem
        item={item}
        localizedName={getExerciseText(item, language).name}
        selected={isSelected(item.id)}
        onToggle={toggleExercise}
        onInfoPress={showExerciseInfo}
        Icono={getIconComponent(item.id)}
      />
    ), [getIconComponent, isSelected, toggleExercise, showExerciseInfo, language]);



    const removeExercise = (id) => setSelectedExercises((prev) => prev.filter((e) => e.id !== id));
    
    const addSetToExercise = (id) => {
      setSelectedExercises((prev) =>
        prev.map((e) => (e.id === id ? { ...e, sets: [...e.sets, { reps: 0, weight: 0 }] } : e))
      );
    };
    
    const updateExField = (id, nset, field, value) =>
      setSelectedExercises((prev) =>
        prev.map((e) => (e.id === id ? { ...e, sets: e.sets.map((s, i) => i === nset ? { ...s, [field]: Number(value) || 0 } : s) } : e))
      );

    const removeSetFromExercise = (id, nset) => {
      setSelectedExercises((prev) =>
        prev.map((e) => (e.id === id ? { ...e, sets: e.sets.filter((_, i) => i !== nset) } : e))
      );
    };


    const handleCreate = async () => {
      const name = routineName.trim() || t.routine;
      const routine = {
        id: `r_${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        exercises: selectedExercises,
        days: selectedDays,
      };
      if (routineToEdit) {
        routine.id = routineToEdit.id; 
        routine.createdAt = routineToEdit.createdAt; 
        await updateRoutine(routine);
      } else {
        await saveRoutine(routine);
      }
      navigation.goBack();
    };

    const canCreate = selectedExercises.length > 0;

    const handleInputFocus = useCallback((event) => {
      const target = event?.target;
      if (!target || !scrollRef.current) return;
      scrollRef.current.scrollResponderScrollNativeHandleToKeyboard(target, 120, true);
    }, []);

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          {routineToEdit ? (
            <Text style={styles.headerTitle}>{t.editRoutineTitle}</Text>
          ) : (
            <Text style={styles.headerTitle}>{t.createRoutineTitle}</Text>
          )}
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.scroll}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>{t.routineName}</Text>
            <TextInput
              style={styles.nameInput}
              value={routineName}
              onChangeText={setRoutineName}
              placeholder={t.routineNamePlaceholder}
              placeholderTextColor={COLORS.textSecondary}
              selectionColor={COLORS.orange}
            />
            <Text style={styles.fieldLabel}>{t.days?.title || 'Days of training'}</Text>
            <View style={styles.daysRow}>
              {t.days.map((day, index) => {
                const isSelected = selectedDays.includes(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.exHeader}>
              <Text style={styles.exTitle}>{t.exercisesCount} ({selectedExercises.length})</Text>
              <TouchableOpacity style={styles.addExBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
                <Text style={styles.addExText}>+ {t.addExercise}</Text>
              </TouchableOpacity>
            </View>

            {selectedExercises.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>{t.noExercisesYet}</Text>
                <Text style={styles.emptySub}>{t.tapToAdd}</Text>
              </View>
            ) : (
              <View style={styles.exList}>
                {selectedExercises.map((ex) => {
                  const info = EXERCISE_CATALOG.find((e) => e.id === ex.id);
                  const infoName = getExerciseText(info, language).name;
                  const Icono = getIconComponent(ex.id);
                  return (
                    <TouchableOpacity key={ex.id} style={styles.exCard} activeOpacity={0.9} onPress={() => setSeeSetsEx(seeSetsEx === ex.id ? null : ex.id)}>
                      <View style={styles.exCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.exCardName}>{infoName}</Text>
                          <Text style={styles.exCardCat}>{info?.category}</Text>
                        </View>
                        {Icono && (
                          <View style={styles.exThumbnail}>
                            <Icono
                              width="100%"
                              height="100%"
                              viewBox="0 0 500 500"
                              preserveAspectRatio="xMidYMid slice"
                            />
                          </View>
                        )}
                        <TouchableOpacity onPress={() => showExerciseInfo(ex)} style={{ padding: 0, margin: 2, marginLeft: 0, paddingLeft: 2 }}>
                          <Icon name="info-outline" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeExercise(ex.id)} style={styles.removeBtn}>
                          <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                      </View>

                      {seeSetsEx === ex.id ? (
                        <View>
                        {ex.sets.map((set, setIndex) => (

                        <View key={setIndex} style={{ flexDirection: 'row', gap:8 }}>
                        <View style={{flex: 0.2,width:10,}}>
                          <Text style={styles.fieldGroupLabel}>SETS</Text>
                          <Text style={styles.fieldGroupLabel}>{setIndex + 1}</Text>
                        </View>

                          <View style={{flex: 0.6}}>
                              <Text style={styles.fieldGroupLabel}>{t.reps}</Text>
                              <TextInput
                                style={styles.fieldInput}
                                value={String(set['reps'])}
                                onChangeText={(v) => updateExField(ex.id, setIndex, 'reps', v)}
                                keyboardType="numeric"
                                selectTextOnFocus
                                onFocus={handleInputFocus}
                              />
                          </View>
                          <View style={{flex: 0.1, paddingTop: 5, paddingLeft: 25}}>
                              <TouchableOpacity style={{ justifyContent:'center', alignItems: 'center', flexDirection: 'row', marginTop: 12 } } onPress={() => removeSetFromExercise(ex.id, setIndex)}>
                                <Text style={styles.addtext} >✕</Text>
                              </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                      <TouchableOpacity style={{ justifyContent:'center', alignItems: 'center', flexDirection: 'row', marginTop: 12 }} onPress={() => addSetToExercise(ex.id)}>
                        <Text style={styles.addtext} >+</Text>
                        <Text style={[ styles.addtext, {marginLeft: 4}]}>{t.addSet}</Text>
                      </TouchableOpacity>
                      </View> )
                       : null}
                      
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ height: 160 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate}
            activeOpacity={0.85}
          >
            {routineToEdit ? (
              <Text style={styles.createBtnText}>{t.editRoutineTitle}</Text>
            ) : (
              <Text style={styles.createBtnText}>{t.createRoutine}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{t.addExercise}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setSearch(''); }} style={styles.closeBtn}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t.searchExercises}
                    placeholderTextColor={COLORS.textSecondary}
                    selectionColor={COLORS.orange}
                    autoFocus={false}
                  />

                </View>
                <TouchableOpacity onPress={() => setFilterBtn(true)} style={styles.filterbtn}>
                  <Text style={styles.filterText}>Filters</Text>
                </TouchableOpacity>
              </View>

              {filterBtn && (
                <View style={styles.filterOverlay}>
                  <TouchableOpacity style={styles.filterBackdrop} onPress={() => setFilterBtn(false)} />
                  <View style={styles.filterPanel}>
                    <View style={styles.filterHeader}>
                      <Text style={styles.filterTitle}>Filters</Text>
                      <TouchableOpacity onPress={() => setFilterBtn(false)} style={styles.closeBtn}>
                        <Text style={styles.closeText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                      <View style={styles.filterBody}>
                        {t.exercisesCategories.map((cat) => (
                          <TouchableOpacity
                            key={cat.key}
                            style={[styles.filterpills, cat.key === categorySelected && styles.pillActive]}
                            onPress={() => setSelectedCategory(cat.key)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.pillText, cat.key === categorySelected && styles.pillTextActive]}>
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={styles.filterBody}>
                        {musclesFilterOptions.map((muscle) => (
                          <TouchableOpacity
                            key={muscle.key}
                            style={[styles.filterpills, muscle.key === muscleSelected && styles.pillActive]}
                            onPress={() => setSelectedMuscle(muscle.key)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.pillText, muscle.key === muscleSelected && styles.pillTextActive]}>
                              {muscle.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                  </View>
                </View>
              )}

              <FlatList
                  data={exercisesToShow}
                  keyExtractor={(item) => item.id}
                  renderItem={renderExerciseItem} 
                  initialNumToRender={6}       
                  maxToRenderPerBatch={6}       
                  windowSize={5}               
                  removeClippedSubviews={true}  
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                />

              <View style={styles.sheetBottom}>
                <TouchableOpacity style={styles.doneBtn} onPress={() => { setModalVisible(false); setSearch(''); }} activeOpacity={0.85}>
                  <Text style={styles.doneBtnText}>
                    {t.done}{selectedExercises.length > 0 ? ` (${selectedExercises.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    backBtn: { padding: 4, width: 36 },
    backIcon: { color: COLORS.white, fontSize: 22 },
    headerTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700' },
    scroll: { flex: 1 },
    content: { padding: 20 },
    fieldLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    nameInput: { backgroundColor: COLORS.card, borderRadius: 12, color: COLORS.white, fontSize: 16, padding: 14, marginBottom: 28 },
    exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    exTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
    addExBtn: { backgroundColor: COLORS.orange, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    addExText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
    emptyBox: { backgroundColor: COLORS.card, borderRadius: 14, paddingVertical: 40, alignItems: 'center' },
    emptyTitle: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600', marginBottom: 8 },
    emptySub: { color: COLORS.textMuted, fontSize: 13 },
    exList: { gap: 12 },
    exCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16,gap: 2 },
    exCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
    exCardName: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    exCardCat: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
    exThumbnail: { width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.cardDark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    removeText: { color: COLORS.textSecondary, fontSize: 12 },
    exCardFields: { flexDirection: 'row', gap: 10 },
    fieldGroupLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
    fieldInput: { backgroundColor: COLORS.inputBg, borderRadius: 8, color: COLORS.white, textAlign: 'center', paddingVertical: 8, fontSize: 16, fontWeight: '700', width: '100%' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
    createBtn: { backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    createBtnDisabled: { backgroundColor: '#6b3010' },
    createBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#1e1e1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, flex: 1, marginTop: '18%', paddingTop: 8 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    sheetHeader2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.orange },
    sheetTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    closeText: { color: COLORS.textSecondary, fontSize: 14 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 0 },
    filterbtn: { marginLeft: 4, paddingHorizontal: 10, paddingVertical:12, borderRadius: 8, backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border },
    filterText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, marginLeft: 16, marginRight:0, marginVertical: 12, borderRadius: 12, paddingHorizontal: 12, gap: 8, width: '75%' },
    searchIcon: { fontSize: 16 },
    searchInput: { flex: 1, color: COLORS.white, fontSize: 15, paddingVertical: 12 },
    list: { paddingHorizontal: 16 },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8 },
    listRowSel: { borderWidth: 1, borderColor: COLORS.orange },
    listName: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
    listNameSel: { color: COLORS.orange },
    listCat: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
    checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
    checkMark: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
    sheetBottom: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
    doneBtn: { backgroundColor: COLORS.orange, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    doneBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
    dayCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    dayCircleActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
    dayText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
    dayTextActive: { color: COLORS.white },
    pills:          { flexDirection: 'row', gap: 8,  },
    pill:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border },
    pillActive:     { backgroundColor: COLORS.textSecondary, borderColor: COLORS.textSecondary },
    pillText:       { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
    pillTextActive: { color: COLORS.white },
    selectorCard:   { backgroundColor:  '#1e1e1e', borderRadius: 16, padding: 16, marginTop: 10, marginHorizontal: 16, gap: 12 },
    filterOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', zIndex: 10 },
    filterBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
    filterPanel: { position: 'absolute', top: 100, right: 0, bottom: 130, left: 0, backgroundColor: '#1e1e1e', borderRadius: 24, paddingTop: 8, paddingBottom: 16 },
    filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    filterTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
    filterBody: { flexDirection: 'row', padding: 10, gap: 12 , flexWrap: 'wrap'},
    filterpills: { flexDirection: 'column', gap: 8, flexWrap: 'wrap',  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border  },
    addtext: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700', marginTop: 12 }, 

  });
