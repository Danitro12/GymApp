import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { useTab } from '../context/TabContext';
import { useWorkout } from '../context/WorkoutContext';
import ActiveWorkoutBar from '../components/ActiveWorkoutBar';

// Screens
import HomeScreen from '../screens/HomeScreen';
import RoutinesScreen from '../screens/RoutinesScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MusclesScreen from '../screens/MusclesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import CreateRoutineScreen from '../screens/CreateRoutineScreen';
import CreateExerciseScreen from '../screens/CreateExerciseScreen';
import ExerciseInfoScreen from '../screens/ExerciseInfoScreen';
import DataScreen from '../screens/DataScreen';

const AppStack = createNativeStackNavigator();

// ─── Tab metadata ─────────────────────────────────────────────────────────────
const TAB_DEFS = [
  { key: 'Home', icon: 'home', labelKey: 'home', component: HomeScreen },
  { key: 'Routines', icon: 'event-note', labelKey: 'routines', component: RoutinesScreen },
  { key: 'Exercises', icon: 'fitness-center', labelKey: 'exercisesTab', component: ExercisesScreen },
  { key: 'Muscles', icon: 'accessibility-new', labelKey: 'muscles', component: MusclesScreen },
  { key: 'Settings', icon: 'settings', labelKey: 'settings', component: SettingsScreen },
];

// ─── Swipeable Tabs pager ─────────────────────────────────────────────────────
function SwipeableTabs({ navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  // useWindowDimensions (y no Dimensions al cargar el módulo) para que el
  // paginado siga cuadrando si se redimensiona la ventana en la web.
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { registerSwitch } = useTab();
  const { loaded: workoutLoaded, session } = useWorkout();
  const restoredRef = useRef(false);

  const TAB_COUNT = TAB_DEFS.length;
  const TAB_W = screenWidth / TAB_COUNT;

  const scrollToIndex = useCallback((index) => {
    const isAdjacent = Math.abs(index - activeIndexRef.current) === 1;
    scrollRef.current?.scrollTo({ x: index * screenWidth, animated: isAdjacent });
    if (!isAdjacent) scrollX.setValue(index * screenWidth);
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, [screenWidth, scrollX]);

  useEffect(() => {
    registerSwitch((tabName) => {
      const index = TAB_DEFS.findIndex((tab) => tab.key === tabName);
      if (index !== -1) scrollToIndex(index);
    });
  }, [registerSwitch, scrollToIndex]);

  // Mantener la pestaña actual al cambiar el ancho de la ventana.
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: activeIndexRef.current * screenWidth, animated: false });
    scrollX.setValue(activeIndexRef.current * screenWidth);
  }, [screenWidth, scrollX]);

  // Si al abrir la app había un entreno a medias, volvemos directamente a él.
  useEffect(() => {
    if (!workoutLoaded || restoredRef.current) return;
    restoredRef.current = true;
    if (session) navigation.navigate('ActiveWorkout');
  }, [workoutLoaded, session, navigation]);

  const onMomentumScrollEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, [screenWidth]);

  const indicatorX = scrollX.interpolate({
    inputRange: [0, screenWidth * (TAB_COUNT - 1)],
    outputRange: [TAB_W * 0.15, TAB_W * (TAB_COUNT - 1) + TAB_W * 0.15],
    extrapolate: 'clamp',
  });

  const screens = useMemo(() => TAB_DEFS.map((tab) => {
    const Screen = tab.component;
    return (
      <View key={tab.key} style={{ width: screenWidth, flex: 1 }}>
        {/* Se pasa la navegación del stack para poder abrir pantallas apiladas */}
        <Screen navigation={navigation} />
      </View>
    );
  }), [navigation, screenWidth]);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        onMomentumScrollEnd={onMomentumScrollEnd}
        directionalLockEnabled
        style={styles.pager}
        contentContainerStyle={{ flexDirection: 'row' }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
      >
        {screens}
      </Animated.ScrollView>

      <ActiveWorkoutBar onPress={() => navigation.navigate('ActiveWorkout')} />

      {/* Barra de pestañas */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Animated.View
          style={[styles.indicator, { width: TAB_W * 0.7, transform: [{ translateX: indicatorX }] }]}
        />
        {TAB_DEFS.map((tab, i) => {
          const inputRange = [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth];
          const color = scrollX.interpolate({
            inputRange,
            outputRange: [COLORS.textSecondary, COLORS.orange, COLORS.textSecondary],
            extrapolate: 'clamp',
          });
          const isActive = activeIndex === i;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => scrollToIndex(i)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Icon name={tab.icon} size={22} color={isActive ? COLORS.orange : COLORS.textSecondary} />
              <Animated.Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {t[tab.labelKey]}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
// Las pantallas apiladas viven en el stack raíz para poder abrirse desde
// cualquier pestaña sin anidar navegadores dentro del ScrollView.
export default function TabNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <AppStack.Screen name="Tabs" component={SwipeableTabs} />
      <AppStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} options={{ animation: 'slide_from_bottom' }} />
      <AppStack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
      <AppStack.Screen name="CreateExercise" component={CreateExerciseScreen} />
      <AppStack.Screen name="ExerciseInfo" component={ExerciseInfoScreen} />
      <AppStack.Screen name="History" component={HistoryScreen} />
      <AppStack.Screen name="Data" component={DataScreen} />
    </AppStack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pager: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderTopColor: '#2a2a2a',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: COLORS.orange,
    borderRadius: 2,
  },
});
