import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { useTab } from '../context/TabContext';

// Icons
import Icon from 'react-native-vector-icons/MaterialIcons';
// Screens
import HomeScreen from '../screens/HomeScreen';
import RoutinesScreen from '../screens/RoutinesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MusclesScreen from '../screens/MusclesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import CreateRoutineScreen from '../screens/CreateRoutineScreen';
import ExerciseInfoScreen from '../screens/ExerciseInfoScreen';

const AnimatedIcon = Animated.createAnimatedComponent(Icon)
const AppStack = createNativeStackNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Tab metadata ─────────────────────────────────────────────────────────────
const TABS = (t) => [
  { key: 'Home', icon: "home", label: t.home, component: HomeScreen },
  { key: 'Routines', icon: "fitness-center", label: t.routines, component: RoutinesScreen },
  { key: 'Muscles', icon: "accessibility-new", label: t.muscles, component: MusclesScreen },
  { key: 'Settings', icon: "settings", label: t.settings, component: SettingsScreen },
];

// ─── Swipeable Tabs pager ─────────────────────────────────────────────────────
function SwipeableTabs({ navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabs = TABS(t);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { registerSwitch } = useTab();
  // Allow other screens to switch tabs programmatically by name
  const scrollToIndex = useCallback((index) => {
    const isAdjacent = Math.abs(index - activeIndex) === 1;
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: isAdjacent });
    setActiveIndex(index);
  }, [activeIndex]);
  const TAB_COUNT = tabs.length;
  const TAB_W = SCREEN_WIDTH / TAB_COUNT; // width of each tab bar item
  useEffect(() => {
    registerSwitch((tabName) => {
      const index = tabs.findIndex((tab) => tab.key === tabName);
      if (index !== -1) scrollToIndex(index);
    });
  }, [registerSwitch, tabs, scrollToIndex]);
  const onMomentumScrollEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }, []);
  // Sliding indicator translateX: maps scroll offset → tab bar position
  const indicatorX = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH * (TAB_COUNT - 1)],
    outputRange: [TAB_W * 0.15, TAB_W * (TAB_COUNT - 1) + TAB_W * 0.15],
    extrapolate: 'clamp',
  });
  return (
    <View style={styles.container}>
      {/* Horizontal ScrollView — pagingEnabled gives native finger-tracking slide */}
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
          { useNativeDriver: false }
        )}
      >
        {tabs.map((tab) => {
          const Screen = tab.component;
          return (
            <View key={tab.key} style={{ width: SCREEN_WIDTH, flex: 1 }}>
              {/* Forward the AppStack navigation so screens can push ActiveWorkout/CreateRoutine */}
              <Screen navigation={navigation} />
            </View>
          );
        })}
      </Animated.ScrollView>
      {/* Custom bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* Sliding orange indicator that follows the swipe */}
        <Animated.View
          style={[
            styles.indicator,
            { width: TAB_W * 0.7, transform: [{ translateX: indicatorX }] },
          ]}
        />
        {tabs.map((tab, i) => {
          // Each tab animates its own color based on how close scrollX is to its position
          const inputRange = [
            (i - 1) * SCREEN_WIDTH,
            i * SCREEN_WIDTH,
            (i + 1) * SCREEN_WIDTH,
          ];
          const labelColor = scrollX.interpolate({
            inputRange,
            outputRange: [COLORS.textSecondary, COLORS.orange, COLORS.textSecondary],
            extrapolate: 'clamp',
          });
          const emojiOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => scrollToIndex(i)}
              activeOpacity={0.7}
            >
              <AnimatedIcon name={tab.icon} size={20} color="white" />
                <Animated.Text style={[styles.tabLabel, { color: labelColor }]}>
                  {tab.label}
                </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

}


// ─── Root navigator ───────────────────────────────────────────────────────────
// AppStack places ActiveWorkout and CreateRoutine as top-level screens so they
// can be navigated to from any tab without needing nested stack navigators
// (which caused "Another navigator is already registered" when inside a ScrollView).export default function TabNavigator() {
export default function TabNavigator() {


  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={SwipeableTabs} />
      <AppStack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <AppStack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
      <AppStack.Screen name="ExerciseInfo" component={ExerciseInfoScreen} />
      <AppStack.Screen name="History" component={HistoryScreen} />
    </AppStack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  pager: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderTopColor: '#2a2a2a',
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: COLORS.orange,
    borderRadius: 2,
  },
});
