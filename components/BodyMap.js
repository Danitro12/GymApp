import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Path } from 'react-native-svg';
import FrontSvg from '../assets/frontal.svg';
import BackSvg from '../assets/back.svg';
import BodyFrontSvg from '../assets/cuerpo-frontal.svg';
import BodyBackSvg from '../assets/cuerpo-back.svg';

// ─── Mapa corporal coloreado ──────────────────────────────────────────────────
// `load`: { chest: 0..1, shoulders: 0..1, ... } (intensidad normalizada).
// Antes esta lógica estaba duplicada en MusclesScreen y ExerciseInfoScreen.

export const muscleColor = (intensity) => {
  if (!intensity || intensity < 0.05) return '#2e2e2e';
  const a = Math.min(intensity, 1);
  const r = Math.round(60 + a * (220 - 60));
  const g = Math.round(30 + a * (60 - 30));
  const b = Math.round(30 + a * (60 - 30));
  return `rgb(${r},${g},${b})`;
};

// id del grupo en el SVG → claves de músculo de la app
const SVG_GROUPS = {
  pecho: ['chest'],
  hombros: ['shoulders'],
  hombrosback: ['shoulders'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  dorsales: ['lats'],
  'espalda-media': ['midBack'],
  trapecios: ['traps'],
  trapeciosback: ['traps'],
  trapecio: ['traps'],
  lumbar: ['glutes', 'hamstrings'],
  gluteos: ['glutes'],
  'gluteo-medio': ['glutes'],
  isquios: ['hamstrings'],
  'isquios-top': ['hamstrings'],
  cuadriceps: ['quadriceps'],
  gemelos: ['calves'],
  gemelosback: ['calves'],
  'abdomen-central': ['abs'],
  'abdomen-lateral': ['obliques'],
  aductores: ['adductors'],
  apductores: ['abductors'],
  'antebrazo-frontal': ['forearms'],
  'antebrazo-trasero': ['forearms'],
};

const stripFillFromStyle = (style) => {
  if (!style) return style;
  if (typeof style === 'string') return style.replace(/fill:[^;]+;?/g, '');
  if (Array.isArray(style)) return style.map(stripFillFromStyle);
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
  const nextProps = { ...node.props };
  if (isPath && currentGroup && colorMap[currentGroup]) {
    nextProps.fill = colorMap[currentGroup];
    if (nextProps.style) nextProps.style = stripFillFromStyle(nextProps.style);
  }
  const nextChildren = React.Children.map(node.props.children, (child) =>
    applyMuscleColors(child, colorMap, currentGroup));
  return React.cloneElement(node, nextProps, nextChildren);
};

const MUSCLE_RATIO = 280 / 130;
const BODY_RATIO = 360 / 130;
const VIEWBOX = '0 0 130 280';

function BodyMap({ load = {}, view = 'front', width = 180 }) {
  const svgHeight = width * MUSCLE_RATIO;
  const bodyHeight = width * BODY_RATIO;
  // Desplazamiento de la capa de músculos respecto a la silueta (proporcional
  // al ancho; valores calibrados con los SVG originales).
  const headOffset = width * (view === 'front' ? 0.3125 : 0.264);

  const colorMap = useMemo(() => {
    const out = {};
    Object.entries(SVG_GROUPS).forEach(([group, keys]) => {
      const value = keys.map((k) => load[k]).find((v) => typeof v === 'number') || 0;
      out[group] = muscleColor(value);
    });
    return out;
  }, [load]);

  const muscles = useMemo(() => {
    const Comp = view === 'front' ? FrontSvg : BackSvg;
    const base = Comp({ width, height: svgHeight, viewBox: VIEWBOX, preserveAspectRatio: 'xMidYMin meet' });
    return React.cloneElement(applyMuscleColors(base, colorMap), { key: view });
  }, [view, width, svgHeight, colorMap]);

  const silhouette = useMemo(() => {
    const Comp = view === 'front' ? BodyFrontSvg : BodyBackSvg;
    return React.cloneElement(
      Comp({ width, height: bodyHeight, preserveAspectRatio: 'xMidYMin meet' }),
      { key: `body-${view}` },
    );
  }, [view, width, bodyHeight]);

  return (
    <View style={[styles.stack, { width, height: bodyHeight }]}>
      {silhouette}
      <View style={[styles.overlay, { height: svgHeight, transform: [{ translateY: headOffset }] }]}>
        {muscles}
      </View>
    </View>
  );
}

export default React.memo(BodyMap);

// Normaliza un mapa de ratios para que el máximo valga 1 (para colorear).
export const normalizeLoad = (muscles) => {
  const values = Object.values(muscles || {});
  if (!values.length) return {};
  const max = Math.max(...values, 0.0001);
  const out = {};
  Object.entries(muscles).forEach(([k, v]) => { out[k] = v / max; });
  return out;
};

const styles = StyleSheet.create({
  stack: { position: 'relative', alignItems: 'center', justifyContent: 'flex-start' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' },
});
