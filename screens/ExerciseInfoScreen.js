import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path } from 'react-native-svg';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { EXERCISE_CATALOG, getExerciseText } from '../data/exercises';
import { WorkoutIcons } from '../assets/index_exercises';
import FrontSvg from '../assets/frontal.svg';
import BackSvg from '../assets/back.svg';
import BodyFrontSvg from '../assets/cuerpo-frontal.svg';
import BodyBackSvg from '../assets/cuerpo-back.svg';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: SW } = Dimensions.get('window');

const muscleColor = (intensity) => {
  if (!intensity || intensity < 0.05) return '#2e2e2e';
  const a = Math.min(intensity, 1);
  const r = Math.round(60 + a * (220 - 60));
  const g = Math.round(30 + a * (60 - 30));
  const b = Math.round(30 + a * (60 - 30));
  return `rgb(${r},${g},${b})`;
};

const stripFillFromStyle = (style) => {
  if (!style) return style;
  if (typeof style === 'string') {
    return style.replace(/fill:[^;]+;?/g, '');
  }
  if (Array.isArray(style)) {
    return style.map(stripFillFromStyle);
  }
  if (typeof style === 'object') {
    const { fill, ...rest } = style;
    return rest;
  }
  return style;
};

const applyMuscleColors = (node, colorMap, activeGroup) => {
  if (!React.isValidElement(node)) return node;

  const nodeId = node.props?.id;
  const currentGroup = (nodeId && colorMap[nodeId]) ? nodeId : activeGroup;
  const isPath = node.type === Path || node.props?.d;

  let nextProps = { ...node.props };

  if (isPath && currentGroup && colorMap[currentGroup]) {
    nextProps.fill = colorMap[currentGroup];
    if (nextProps.style) {
      nextProps.style = stripFillFromStyle(nextProps.style);
    }
  }

  const nextChildren = React.Children.map(node.props.children, (child) =>
    applyMuscleColors(child, colorMap, currentGroup)
  );

  return React.cloneElement(node, nextProps, nextChildren);
};

export default function ExerciseInfoScreen({ navigation, route }) {
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState('front');
  const pagerRef = useRef(null);
  const exerciseId = route.params?.exerciseId;
  const exercise = EXERCISE_CATALOG.find((e) => e.id === exerciseId);
  const exerciseText = getExerciseText(exercise, language);
  const Icono = exerciseId ? WorkoutIcons[exerciseId] : null;

  const load = useMemo(() => {
    if (!exercise?.muscles) return {};
    const max = Math.max(...Object.values(exercise.muscles), 1);
    const out = {};
    Object.entries(exercise.muscles).forEach(([m, v]) => {
      out[m] = v / max;
    });
    return out;
  }, [exercise]);

  const muscleLabelMap = useMemo(() => {
    const map = {};
    (t.musclesList || []).forEach((m) => {
      map[m.key] = m.label;
    });
    return map;
  }, [t.musclesList]);

  const activeMuscles = useMemo(() => (
    Object.entries(load)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, intensity]) => ({
        key,
        label: muscleLabelMap[key] || key,
        intensity,
      }))
  ), [load, muscleLabelMap]);

  const pickLoad = (keys) => {
    for (const key of keys) {
      const value = load[key];
      if (typeof value === 'number') return value;
    }
    return 0;
  };

  const muscleColorMap = useMemo(() => ({
    pecho: muscleColor(pickLoad(['chest'])),
    hombros: muscleColor(pickLoad(['shoulders'])),
    hombrosback: muscleColor(pickLoad(['shoulders'])),
    biceps: muscleColor(pickLoad(['biceps'])),
    triceps: muscleColor(pickLoad(['triceps'])),
    dorsales: muscleColor(pickLoad(['lats'])),
    'espalda-media': muscleColor(pickLoad(['midBack'])),
    trapecios: muscleColor(pickLoad(['traps'])),
    trapeciosback: muscleColor(pickLoad(['traps'])),
    trapecio: muscleColor(pickLoad(['traps'])),
    lumbar: muscleColor(pickLoad(['glutes', 'hamstrings'])),
    gluteos: muscleColor(pickLoad(['glutes'])),
    'gluteo-medio': muscleColor(pickLoad(['glutes'])),
    isquios: muscleColor(pickLoad(['hamstrings'])),
    'isquios-top': muscleColor(pickLoad(['hamstrings'])),
    cuadriceps: muscleColor(pickLoad(['quadriceps'])),
    gemelos: muscleColor(pickLoad(['calves'])),
    gemelosback: muscleColor(pickLoad(['calves'])),
    'abdomen-central': muscleColor(pickLoad(['abs'])),
    'abdomen-lateral': muscleColor(pickLoad(['obliques'])),
    aductores: muscleColor(pickLoad(['adductors'])),
    apductores: muscleColor(pickLoad(['abductors'])),
    'antebrazo-frontal': muscleColor(pickLoad(['forearms'])),
    'antebrazo-trasero': muscleColor(pickLoad(['forearms'])),
  }), [load]);

  const svgWidth = SW - 220;
  const muscleRatio = 280 / 130;
  const bodyRatio = 360 / 130;

  const svgHeight = svgWidth * muscleRatio;
  const bodyBgHeight = svgWidth * bodyRatio;
  const headOffset = viewMode === 'front' ? 53 : 45;
  const sharedViewBox = '0 0 130 280';

  const bodySvg = useMemo(() => {
    const baseSvg = viewMode === 'front'
      ? FrontSvg({ width: svgWidth, height: svgHeight, viewBox: sharedViewBox, preserveAspectRatio: 'xMidYMin meet' })
      : BackSvg({ width: svgWidth, height: svgHeight, viewBox: sharedViewBox, preserveAspectRatio: 'xMidYMin meet' });

    const coloredSvg = applyMuscleColors(baseSvg, muscleColorMap);
    return React.cloneElement(coloredSvg, { key: viewMode });
  }, [viewMode, svgWidth, svgHeight, sharedViewBox, muscleColorMap]);

  const bodyBgSvg = useMemo(() => (
    viewMode === 'front'
      ? React.cloneElement(
          BodyFrontSvg({ width: svgWidth, height: bodyBgHeight, preserveAspectRatio: 'xMidYMin meet' }),
          { key: `body-bg-${viewMode}` }
        )
      : React.cloneElement(
          BodyBackSvg({ width: svgWidth, height: bodyBgHeight, preserveAspectRatio: 'xMidYMin meet' }),
          { key: `body-bg-${viewMode}` }
        )
  ), [viewMode, svgWidth, bodyBgHeight]);

  const goToMuscles = () => {
    pagerRef.current?.scrollTo({ x: SW, animated: true });
  };

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.exercise || 'Exercise'}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t.noDescription}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{exerciseText.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        directionalLockEnabled
        style={styles.scroll}
        contentContainerStyle={styles.pagerContent}
      >
        <ScrollView
          style={styles.page}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
        >
          {Icono && (
            <View style={styles.iconWrap}>
              <Icono width="100%" height="100%" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice" />
            </View>
          )}

          <View style={styles.descCard}>
            <Text style={styles.descTitle}>{t.exerciseDescription}</Text>
            <Text style={styles.descText}>{exerciseText.description || t.noDescription}</Text>
          </View>

          <View style={styles.swipeHintRow}>
            <TouchableOpacity style={styles.swipeHintBtn} onPress={goToMuscles} activeOpacity={0.85}>
              <Icon name="arrow-forward-ios" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <ScrollView
          style={styles.page}
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>{t.muscleMap}</Text>
          <View style={styles.bodyContainer}
          >
            <View style={[styles.bodyStack, { width: svgWidth, height: bodyBgHeight }]}>
              {bodyBgSvg}
              <View style={[styles.muscleOverlay, { height: svgHeight, transform: [{ translateY: headOffset }] }]}> 
                {bodySvg}
              </View>
            </View>
          </View>

          {activeMuscles.length > 0 && (
            <View style={styles.barsCard}>
              {activeMuscles.map((m) => (
                <MuscleBar key={m.key} label={m.label} intensity={m.intensity} />
              ))}
            </View>
          )}

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'front' && styles.toggleBtnActive]}
              onPress={() => setViewMode('front')}
              activeOpacity={0.85}
            >
              <Text style={[styles.toggleText, viewMode === 'front' && styles.toggleTextActive]}>
                {t.frontView}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'back' && styles.toggleBtnActive]}
              onPress={() => setViewMode('back')}
              activeOpacity={0.85}
            >
              <Text style={[styles.toggleText, viewMode === 'back' && styles.toggleTextActive]}>
                {t.backView}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function MuscleBar({ label: lbl, intensity }) {
  const pct = Math.round((intensity || 0) * 100);
  return (
    <View style={bar.row}>
      <Text style={bar.label}>{lbl}</Text>
      <View style={bar.track}>
        <View style={[bar.fill, {
          width: `${pct}%`,
          backgroundColor: pct > 60 ? '#d32f2f' : pct > 30 ? '#b71c1c' : '#7f1d1d',
        }]} />
      </View>
      <Text style={bar.pct}>{pct}%</Text>
    </View>
  );
}

const bar = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { color: COLORS.white, fontSize: 13, width: 110 },
  track: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  fill:  { height: '100%', borderRadius: 4 },
  pct:   { color: COLORS.textSecondary, fontSize: 12, width: 34, textAlign: 'right' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { color: COLORS.white, fontSize: 20 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', flex: 1 },
  scroll: { flex: 1 },
  pagerContent: { flexDirection: 'row' },
  page: { width: SW },
  pageContent: { padding: 20, paddingTop: 8 },
  iconWrap: { width: 220, height: 220, borderRadius: 110, backgroundColor: COLORS.card, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  descCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 20 },
  descTitle: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  descText: { color: COLORS.white, fontSize: 14, marginTop: 12, lineHeight: 20 },
  sectionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  swipeHintRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  swipeHintBtn: { padding: 8, borderRadius: 10, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  bodyContainer: { alignItems: 'center', marginBottom: 16 },
  bodyStack: { alignItems: 'center', justifyContent: 'center' },
  muscleOverlay: { position: 'absolute', top: 0 },
  barsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: COLORS.card },
  toggleBtnActive: { backgroundColor: COLORS.orange },
  toggleText: { color: COLORS.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: COLORS.white },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24, margin: 20 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center' },
});
