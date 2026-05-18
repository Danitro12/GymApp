import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { G, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../data/theme';
import { loadRoutines } from '../data/storage';
import { getExerciseById } from '../data/exercises';
import FrontSvg from '../assets/frontal.svg';
import BackSvg from '../assets/back.svg';
import BodyFrontSvg from '../assets/cuerpo-frontal.svg';
import BodyBackSvg from '../assets/cuerpo-back.svg';

// ─── Calcula carga muscular normalizada ───────────────────────────────────────
const computeLoad = (routine) => {
  const totals = {};
  routine.exercises.forEach((ex) => {
    const exercise = getExerciseById(ex.exerciseId);
    if (!exercise) return;
    const volume = (ex.numSets || 3) * (ex.reps || 10);
    Object.entries(exercise.muscles).forEach(([m, ratio]) => {
      totals[m] = (totals[m] || 0) + ratio * volume;
    });
  });
  const max = Math.max(...Object.values(totals), 1);
  const out = {};
  Object.entries(totals).forEach(([m, v]) => { out[m] = v / max; });
  return out;
};

// Interpola de gris oscuro a rojo según intensidad
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

const isSvgType = (type, name) => {
  if (!type) return false;
  if (name === 'G') {
    return type === G || type.displayName === 'G' || type.name === 'G';
  }
  if (name === 'Path') {
    return type === Path || type.displayName === 'Path' || type.name === 'Path';
  }
  return false;
};

const applyMuscleColors = (node, colorMap, activeGroup) => {
  if (!React.isValidElement(node)) return node;

  // Priorizamos el ID del nodo actual, si no, mantenemos el del padre (activeGroup)
  const nodeId = node.props?.id;
  const currentGroup = (nodeId && colorMap[nodeId]) ? nodeId : activeGroup;

  const isPath = node.type === Path || node.props?.d;

  let nextProps = { ...node.props };

  if (isPath && currentGroup && colorMap[currentGroup]) {
    nextProps.fill = colorMap[currentGroup];
    // IMPORTANTE: Eliminamos estilos que puedan sobreescribir el fill
    if (nextProps.style) {
      nextProps.style = stripFillFromStyle(nextProps.style);
    }
  }

  const nextChildren = React.Children.map(node.props.children, (child) =>
    applyMuscleColors(child, colorMap, currentGroup)
  );

  return React.cloneElement(node, nextProps, nextChildren);
};

// ─── BARRA DE INTENSIDAD ──────────────────────────────────────────────────────
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

// ─── PANTALLA PRINCIPAL ───────────────────────────────────────────────────────
export default function MusclesScreen() {
  const { width: SW } = useWindowDimensions();
  const { t } = useLanguage();
  const [routines,          setRoutines]          = useState([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [viewMode,          setViewMode]          = useState('front');

  useFocusEffect(
    useCallback(() => {
      loadRoutines().then((r) => {
        setRoutines(r);
        if (r.length > 0 && !selectedRoutineId) {
          setSelectedRoutineId(r[0].id);
        }
      });
    }, [])
  );

  const selectedRoutine = routines.find((r) => r.id === selectedRoutineId);
  const load = selectedRoutine ? computeLoad(selectedRoutine) : {};

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

  const svgWidth = SW-208;
  const muscleRatio = 280 / 130;
  const bodyRatio = 360 / 130;

  const svgHeight = svgWidth * muscleRatio;
  const bodyBgHeight = svgWidth * bodyRatio; // Un poco más alto para cubrir toda la figura y evitar bordes sin color en músculos bajos como gemelos o glúteos
  const headOffset = viewMode === 'front' ? 57 : 48;
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

  const muscleLabelMap = useMemo(() => {
    const map = {};
    (t.musclesList || []).forEach((m) => {
      map[m.key] = m.label;
    });
    return map;
  }, [t.musclesList]);

  const frontMuscles = [
    { key: 'chest' },
    { key: 'shoulders' },
    { key: 'biceps' },
    { key: 'triceps' },
    { key: 'forearms' },
    { key: 'abs' },
    { key: 'obliques' },
    { key: 'adductors' },
    { key: 'abductors' },
    { key: 'quadriceps' },
  ];
  const backMuscles = [
    { key: 'lats' },
    { key: 'midBack' },
    { key: 'traps' },
    { key: 'triceps' },
    { key: 'shoulders' },
    { key: 'forearms' },
    { key: 'adductors' },
    { key: 'glutes' },
    { key: 'hamstrings' },
    { key: 'calves' },
  ];
  const displayMuscles = viewMode === 'front' ? frontMuscles : backMuscles;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t.muscleMap}</Text>
        <Text style={styles.sub}>{t.visualizeIntensity}</Text>

        {routines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t.noRoutinesMuscle}</Text>
            <Text style={styles.emptySub}>{t.createToSeeMuscle}</Text>
          </View>
        ) : (
          <>
            {/* Figura SVG */}
            <View style={styles.bodyContainer}>
              <View style={[styles.bodyStack, { width: svgWidth, height: bodyBgHeight }]}>
                {bodyBgSvg}
                <View style={[styles.muscleOverlay, { height: svgHeight, transform: [{ translateY: headOffset }] }]}> 
                  {bodySvg}
                </View>
              </View>
            </View>

            {/* Toggle frontal / posterior */}
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

            {/* Selector de rutina */}
            <View style={styles.selectorCard}>
              <Text style={styles.selectorLabel}>{t.selectRoutine}</Text>
              <View style={styles.pills}>
                {routines.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.pill, r.id === selectedRoutineId && styles.pillActive]}
                    onPress={() => setSelectedRoutineId(r.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, r.id === selectedRoutineId && styles.pillTextActive]}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Barras de intensidad */}
            <View style={styles.barsCard}>
              <Text style={styles.barsTitle}>{t.muscleIntensity}</Text>
              {displayMuscles.map((m) => (
                <MuscleBar key={m.key} label={muscleLabelMap[m.key] || m.key} intensity={load[m.key]} />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.background },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingTop: 24 },
  title:   { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sub:     { color: COLORS.textSecondary, fontSize: 14, marginBottom: 20 },

  emptyCard:  { backgroundColor: COLORS.card, borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySub:   { color: COLORS.textSecondary, fontSize: 14 },

  selectorCard:   { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  selectorLabel:  { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  pills:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border },
  pillActive:     { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  pillText:       { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: COLORS.white },

  toggleRow:       { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 14 },
  toggleBtn:       { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.orange },
  toggleText:      { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  toggleTextActive:{ color: COLORS.white },

  bodyContainer: { backgroundColor: COLORS.card, borderRadius: 16, alignItems: 'center', paddingVertical: 12, marginBottom: 14, overflow: 'hidden' },
  bodyStack: { position: 'relative', alignItems: 'center', justifyContent: 'flex-start' },
  muscleOverlay: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' },

  barsCard:  { backgroundColor: COLORS.card, borderRadius: 16, padding: 18 },
  barsTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700', marginBottom: 16 },
});
