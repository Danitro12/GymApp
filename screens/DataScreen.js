import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { useExercises } from '../context/ExercisesContext';
import { useTab } from '../context/TabContext';
import ScreenHeader from '../components/ScreenHeader';
import DateField from '../components/DateField';
import { loadHistory, loadRoutines, saveRoutine } from '../data/storage';
import { getCategoryLabel, getExerciseText, resolveExerciseName } from '../data/exercises';
import { toDateKey } from '../utils/date';
import { fmt } from '../utils/text';
import { notify } from '../utils/dialogs';
import { writeXlsx, readXlsx } from '../utils/xlsx';
import { textToRows } from '../utils/delimited';
import {
  parseRoutinesText, rowsToRoutines, jsonToRoutines, routinesToRows, toAppRoutine, formatDays,
} from '../utils/routineFormat';
import { buildHistorySheets, filterHistoryByRange } from '../utils/historyExport';
import {
  saveFile, pickFile, bytesToText, isZip,
} from '../utils/fileIO';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const presetRange = (key) => {
  const today = new Date();
  const to = toDateKey(today);
  const d = new Date(today);
  switch (key) {
    case '7': d.setDate(d.getDate() - 6); return { from: toDateKey(d), to };
    case '30': d.setDate(d.getDate() - 29); return { from: toDateKey(d), to };
    case 'thisMonth': return { from: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)), to };
    case 'lastMonth': return {
      from: toDateKey(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: toDateKey(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
    case 'year': return { from: toDateKey(new Date(today.getFullYear(), 0, 1)), to };
    default: return { from: '', to: '' };
  }
};

// Ejemplo de la plantilla con ejercicios reales del catálogo.
const TEMPLATE_EXAMPLE = [
  { exId: 'ex-33', sets: 4, reps: '8-8-6-6' },
  { exId: 'ex-23', sets: 3, reps: 10 },
  { exId: 'ex-3', sets: 3, reps: 12 },
];

export default function DataScreen({ navigation, route }) {
  const { t, language } = useLanguage();
  const { allExercises, getExercise } = useExercises();
  const { switchTab } = useTab();

  const initial = route.params?.from || route.params?.to
    ? { from: route.params.from || '', to: route.params.to || '' }
    : presetRange('30');
  const [range, setRange] = useState(initial);
  const [preset, setPreset] = useState(route.params?.from ? null : '30');
  const [history, setHistory] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [busy, setBusy] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState(null); // { routines: [...] }

  useFocusEffect(useCallback(() => {
    loadHistory().then(setHistory);
    loadRoutines().then(setRoutines);
  }, []));

  const rangeValid = (!range.from || DATE_RE.test(range.from))
    && (!range.to || DATE_RE.test(range.to))
    && (!range.from || !range.to || range.from <= range.to);
  const inRange = useMemo(
    () => (rangeValid ? filterHistoryByRange(history, range.from, range.to) : []),
    [history, range, rangeValid],
  );

  const applyPreset = (key) => {
    setPreset(key);
    setRange(presetRange(key));
  };
  const setFrom = (v) => { setPreset(null); setRange((r) => ({ ...r, from: v })); };
  const setTo = (v) => { setPreset(null); setRange((r) => ({ ...r, to: v })); };

  const nameOf = useCallback((id, fallback) => resolveExerciseName(id, language, fallback), [language]);

  const exercisesSheet = useCallback(() => {
    const muscles = {};
    (t.musclesList || []).forEach((m) => { muscles[m.key] = m.label; });
    const head = language === 'es'
      ? ['Ejercicio', 'Nombre en inglés', 'Categoría', 'Músculos principales', 'ID ejercicio']
      : ['Exercise', 'Spanish name', 'Category', 'Main muscles', 'Exercise ID'];
    const rows = allExercises.map((ex) => [
      getExerciseText(ex, language).name,
      language === 'es' ? ex.name : (ex.name_i18n?.es || ex.name),
      getCategoryLabel(ex.category, t),
      Object.entries(ex.muscles || {}).sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${muscles[k] || k} ${Math.round(v * 100)}%`).join(', '),
      ex.id,
    ]);
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return { name: t.sheetExercises, rows: [head, ...rows], colWidths: [40, 40, 16, 50, 22] };
  }, [allExercises, language, t]);

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      notify(t.dataTitle, t.readError);
    } finally {
      setBusy(null);
    }
  };

  // ── Exportar historial ──
  const exportHistory = () => run('history', async () => {
    if (!rangeValid) { notify(t.historySection, t.invalidRange); return; }
    if (!inRange.length) { notify(t.historySection, t.nothingToExport); return; }
    const sheets = buildHistorySheets(inRange, { language, nameOf });
    const dates = inRange.map((h) => h.date).sort();
    const from = range.from || dates[0];
    const to = range.to || dates[dates.length - 1];
    const prefix = language === 'es' ? 'gymapp-historial' : 'gymapp-history';
    await saveFile(writeXlsx(sheets), `${prefix}_${from}_${to}.xlsx`);
  });

  // ── Exportar rutinas / plantilla ──
  const exportRoutines = () => run('routines', async () => {
    if (!routines.length) { notify(t.routinesSection, t.noRoutinesToExport); return; }
    const rows = routinesToRows(routines, { language, getExercise });
    const prefix = language === 'es' ? 'gymapp-rutinas' : 'gymapp-routines';
    await saveFile(writeXlsx([
      { name: t.sheetRoutines, rows, colWidths: [20, 18, 40, 8, 12, 22] },
      exercisesSheet(),
    ]), `${prefix}_${toDateKey()}.xlsx`);
  });

  const downloadTemplate = () => run('template', async () => {
    const example = TEMPLATE_EXAMPLE
      .map((e) => ({ ...e, ex: getExercise(e.exId) }))
      .filter((e) => e.ex);
    const rows = routinesToRows([], { language, getExercise });
    example.forEach((e, i) => rows.push([
      i === 0 ? t.exampleRoutine : '',
      i === 0 ? formatDays([0, 3], language) : '',
      getExerciseText(e.ex, language).name,
      e.sets,
      e.reps,
      '',
    ]));
    const name = language === 'es' ? 'gymapp-plantilla-rutinas.xlsx' : 'gymapp-routine-template.xlsx';
    await saveFile(writeXlsx([
      { name: t.sheetRoutines, rows, colWidths: [20, 18, 40, 8, 12, 22] },
      exercisesSheet(),
    ]), name);
  });

  // ── Importar ──
  const parseOpts = { exercises: allExercises, fallbackName: t.routine };

  const showPreview = (result) => {
    if (!result?.routines?.length) {
      notify(t.importReview, t.noRoutinesParsed);
      return;
    }
    setPreview(result);
  };

  const importFromFile = () => run('import', async () => {
    const file = await pickFile();
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (isZip(file.bytes)) {
      const sheets = readXlsx(file.bytes);
      // Preferimos la hoja de rutinas; si no, la primera que tenga ejercicios.
      const ordered = [...sheets].sort((a, b) => {
        const score = (s) => (/rutina|routine/i.test(s.name) ? 0 : /ejercicios disponibles|available exercises/i.test(s.name) ? 2 : 1);
        return score(a) - score(b);
      });
      const result = ordered.map((s) => rowsToRoutines(s.rows, parseOpts)).find((r) => r.routines.length);
      showPreview(result);
      return;
    }
    const text = bytesToText(file.bytes);
    if (lower.endsWith('.json')) {
      showPreview(jsonToRoutines(JSON.parse(text), parseOpts));
      return;
    }
    showPreview(parseRoutinesText(text, parseOpts, textToRows));
  });

  const reviewPaste = () => {
    const result = parseRoutinesText(pasteText, parseOpts, textToRows);
    if (!result.routines.length) {
      notify(t.pasteTitle, t.noRoutinesParsed);
      return;
    }
    setPasteOpen(false);
    setPreview(result);
  };

  // Marca repetidos dentro de cada rutina (la app no admite el mismo
  // ejercicio dos veces en una rutina).
  const previewRoutines = useMemo(() => (preview?.routines || []).map((r) => {
    const seen = new Set();
    return {
      ...r,
      items: r.items.map((it) => {
        if (!it.exercise) return { ...it, status: 'missing' };
        if (seen.has(it.exercise.id)) return { ...it, status: 'duplicate' };
        seen.add(it.exercise.id);
        return { ...it, status: it.approx ? 'approx' : 'ok' };
      }),
    };
  }), [preview]);
  const importable = previewRoutines.filter((r) => r.items.some((i) => i.status === 'ok' || i.status === 'approx'));

  const confirmImport = () => run('confirm', async () => {
    for (let i = 0; i < importable.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await saveRoutine(toAppRoutine(importable[i], `_${i}`));
    }
    const n = importable.length;
    setPreview(null);
    setPasteText('');
    notify(t.dataTitle, fmt(t.importDone, { n }));
    navigation.navigate('Tabs');
    switchTab('Routines');
  });

  const presets = [
    ['7', t.preset7], ['30', t.preset30], ['thisMonth', t.presetThisMonth],
    ['lastMonth', t.presetLastMonth], ['year', t.presetYear], ['all', t.presetAll],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader onBack={() => navigation.goBack()} title={t.dataTitle} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Historial ── */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.iconWrap}><Icon name="history" size={20} color={COLORS.orange} /></View>
            <Text style={styles.cardTitle}>{t.historySection}</Text>
          </View>
          <Text style={styles.cardDesc}>{t.historySectionDesc}</Text>

          <View style={styles.chips}>
            {presets.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, preset === key && styles.chipActive]}
                onPress={() => applyPreset(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, preset === key && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dateRow}>
            <DateField label={t.fromDate} value={range.from} onChange={setFrom} max={range.to || undefined} />
            <DateField label={t.toDate} value={range.to} onChange={setTo} min={range.from || undefined} />
          </View>

          <Text style={[styles.countText, !rangeValid && styles.errorText]}>
            {rangeValid ? fmt(t.workoutsInRange, { n: inRange.length }) : t.invalidRange}
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, (!rangeValid || !inRange.length) && styles.btnDisabled]}
            onPress={exportHistory}
            activeOpacity={0.85}
          >
            {busy === 'history' ? <ActivityIndicator color={COLORS.white} /> : (
              <>
                <Icon name="file-download" size={20} color={COLORS.white} />
                <Text style={styles.primaryText}>{t.exportToExcel}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Rutinas ── */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.iconWrap}><Icon name="event-note" size={20} color={COLORS.orange} /></View>
            <Text style={styles.cardTitle}>{t.routinesSection}</Text>
          </View>
          <Text style={styles.cardDesc}>{t.routinesSectionDesc}</Text>

          <View style={styles.grid}>
            <ActionTile icon="file-download" label={t.exportRoutines} sub={`${routines.length} ${routines.length === 1 ? t.routine.toLowerCase() : t.routinesPl}`} onPress={exportRoutines} loading={busy === 'routines'} />
            <ActionTile icon="upload-file" label={t.importFile} sub=".xlsx · .csv · .json" onPress={importFromFile} loading={busy === 'import'} />
            <ActionTile icon="content-paste" label={t.pasteText} sub="Excel · CSV · Markdown" onPress={() => setPasteOpen(true)} />
            <ActionTile icon="description" label={t.template} sub=".xlsx" onPress={downloadTemplate} loading={busy === 'template'} />
          </View>

          <TouchableOpacity style={styles.helpToggle} onPress={() => setShowHelp((v) => !v)} activeOpacity={0.8}>
            <Icon name="help-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.helpToggleText}>{t.formatTitle}</Text>
            <Icon name={showHelp ? 'expand-less' : 'expand-more'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showHelp && (
            <View style={styles.helpBox}>
              <Text style={styles.helpText}>{t.formatHelp}</Text>
              <View style={styles.sampleTable}>
                {[
                  language === 'es' ? ['Rutina', 'Días', 'Ejercicio', 'Series', 'Reps'] : ['Routine', 'Days', 'Exercise', 'Sets', 'Reps'],
                  [t.exampleRoutine, formatDays([0, 3], language), getExerciseText(getExercise('ex-33'), language).name, '4', '8-8-6-6'],
                  ['', '', getExerciseText(getExercise('ex-23'), language).name, '3', '10'],
                ].map((row, i) => (
                  <View key={i} style={[styles.sampleRow, i === 0 && styles.sampleHead]}>
                    {row.map((c, j) => (
                      <Text key={j} style={[styles.sampleCell, j === 2 && { flex: 2.4 }, i === 0 && styles.sampleHeadText]} numberOfLines={2}>{c}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Pegar texto ── */}
      <Modal visible={pasteOpen} transparent animationType="slide" onRequestClose={() => setPasteOpen(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.pasteTitle}</Text>
              <TouchableOpacity onPress={() => setPasteOpen(false)} style={styles.closeBtn}>
                <Icon name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>{t.pasteHint}</Text>
            <TextInput
              style={styles.pasteInput}
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              textAlignVertical="top"
              placeholder={'Rutina\tDías\tEjercicio\tSeries\tReps\nTorso\tLun, Jue\tPress de banca con barra\t4\t8-8-6-6'}
              placeholderTextColor={COLORS.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, !pasteText.trim() && styles.btnDisabled]}
              onPress={reviewPaste}
              disabled={!pasteText.trim()}
              activeOpacity={0.85}
            >
              <Icon name="fact-check" size={20} color={COLORS.white} />
              <Text style={styles.primaryText}>{t.review}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Vista previa de importación ── */}
      <Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, styles.sheetTall]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.importReview}</Text>
              <TouchableOpacity onPress={() => setPreview(null)} style={styles.closeBtn}>
                <Icon name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
              {previewRoutines.map((r, ri) => (
                <View key={`${r.name}-${ri}`} style={styles.previewCard}>
                  <Text style={styles.previewName}>{r.name}</Text>
                  <Text style={styles.previewDays}>{r.days.length ? formatDays(r.days, language) : t.noDaysSet}</Text>
                  {r.items.map((it, ii) => {
                    const ok = it.status === 'ok' || it.status === 'approx';
                    const shownName = it.exercise ? getExerciseText(it.exercise, language).name : it.raw;
                    return (
                      <View key={ii} style={styles.previewItem}>
                        <Icon
                          name={ok ? 'check-circle' : 'remove-circle-outline'}
                          size={18}
                          color={ok ? (it.status === 'approx' ? COLORS.orange : COLORS.green) : '#ef4444'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.previewEx, !ok && styles.previewExBad]} numberOfLines={2}>{shownName}</Text>
                          {it.status === 'approx' && <Text style={styles.previewNote}>{t.interpretedAs}: «{it.raw}»</Text>}
                          {it.status === 'missing' && <Text style={[styles.previewNote, { color: '#fca5a5' }]}>{t.notFoundSkip}</Text>}
                          {it.status === 'duplicate' && <Text style={[styles.previewNote, { color: '#fca5a5' }]}>{t.duplicateSkip}</Text>}
                        </View>
                        <Text style={styles.previewReps}>{it.reps.length} × {it.reps.every((x) => x === it.reps[0]) ? it.reps[0] : it.reps.join('-')}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.primaryBtn, !importable.length && styles.btnDisabled]}
              onPress={confirmImport}
              disabled={!importable.length}
              activeOpacity={0.85}
            >
              {busy === 'confirm' ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Icon name="playlist-add-check" size={20} color={COLORS.white} />
                  <Text style={styles.primaryText}>{fmt(t.importN, { n: importable.length })}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionTile({ icon, label, sub, onPress, loading }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={label}>
      {loading ? <ActivityIndicator color={COLORS.orange} /> : <Icon name={icon} size={24} color={COLORS.orange} />}
      <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
      {!!sub && <Text style={styles.tileSub} numberOfLines={1}>{sub}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 8, gap: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.orange + '22', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  cardDesc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  dateRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  countText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 12 },
  errorText: { color: '#fca5a5' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.orange, borderRadius: 14, paddingVertical: 14, minHeight: 50,
  },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  tile: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: COLORS.cardDark, borderRadius: 14, padding: 14, gap: 6,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 104,
  },
  tileLabel: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  tileSub: { color: COLORS.textMuted, fontSize: 11 },
  helpToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingVertical: 4 },
  helpToggleText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', flex: 1 },
  helpBox: { marginTop: 8, gap: 12 },
  helpText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  sampleTable: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  sampleRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  sampleHead: { backgroundColor: COLORS.orange + '33', borderTopWidth: 0 },
  sampleCell: { flex: 1, color: COLORS.white, fontSize: 11, paddingHorizontal: 6, paddingVertical: 6 },
  sampleHeadText: { fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetTall: { flex: 1, marginTop: 60 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  sheetHint: { color: COLORS.textSecondary, fontSize: 13 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  pasteInput: {
    minHeight: 220, maxHeight: 360, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.white, padding: 12, fontSize: 13, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  previewCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14 },
  previewName: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  previewDays: { color: COLORS.orange, fontSize: 12, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.border },
  previewEx: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  previewExBad: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  previewNote: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  previewReps: { color: COLORS.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
});
