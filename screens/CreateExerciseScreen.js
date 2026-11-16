import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS } from '../data/theme';
import { useLanguage } from '../context/LanguageContext';
import { useExercises } from '../context/ExercisesContext';
import ScreenHeader from '../components/ScreenHeader';
import BodyMap, { normalizeLoad } from '../components/BodyMap';
import {
  CATEGORY_VALUES, getCategoryLabel, percentagesToRatios, ratiosToPercentages,
} from '../data/exercises';
import { countRoutinesUsingExercise } from '../data/storage';
import { confirmAsync, notify } from '../utils/dialogs';
import { fmt, sanitizeNumberInput } from '../utils/text';

const MAX_IMAGE_SIDE = 480;
const STEP = 5;

const round1 = (n) => Math.round(n * 10) / 10;

export default function CreateExerciseScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { getExercise, addCustomExercise, updateCustomExercise, deleteCustomExercise } = useExercises();
  const editId = route.params?.exerciseId;
  const returnTo = route.params?.returnTo;
  const editing = editId ? getExercise(editId) : null;

  const [name, setName] = useState(editing?.name || '');
  const [category, setCategory] = useState(editing?.category || CATEGORY_VALUES[0]);
  const [description, setDescription] = useState(editing?.description || '');
  const [imageUri, setImageUri] = useState(editing?.imageUri || null);
  const [percentages, setPercentages] = useState(() => {
    const p = ratiosToPercentages(editing?.muscles);
    return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]));
  });
  const [submitted, setSubmitted] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const muscleLabels = useMemo(() => {
    const map = {};
    (t.musclesList || []).forEach((m) => { map[m.key] = m.label; });
    return map;
  }, [t.musclesList]);

  const selectedKeys = Object.keys(percentages);
  const total = round1(selectedKeys.reduce((acc, k) => acc + (Number(percentages[k]) || 0), 0));
  const totalOk = Math.abs(total - 100) < 0.05;
  const ratios = useMemo(() => percentagesToRatios(percentages), [percentages]);
  const previewLoad = useMemo(() => normalizeLoad(ratios), [ratios]);

  const errors = [];
  if (!name.trim()) errors.push(t.nameRequired);
  if (selectedKeys.length === 0) errors.push(t.musclesRequired);
  else if (!totalOk) errors.push(fmt(t.totalMustBe100, { n: total }));

  // ── Músculos ──
  const toggleMuscle = (key) => {
    setPercentages((prev) => {
      if (key in prev) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      const used = Object.values(prev).reduce((a, v) => a + (Number(v) || 0), 0);
      return { ...prev, [key]: String(round1(Math.max(0, 100 - used))) };
    });
  };

  const setMusclePct = (key, raw) => {
    const clean = sanitizeNumberInput(raw);
    const n = Number(clean);
    setPercentages((prev) => ({ ...prev, [key]: n > 100 ? '100' : clean }));
  };

  const stepMuscle = (key, delta) => {
    setPercentages((prev) => {
      const next = Math.max(0, Math.min(100, round1((Number(prev[key]) || 0) + delta)));
      return { ...prev, [key]: String(next) };
    });
  };

  const splitEvenly = () => {
    const keys = Object.keys(percentages);
    if (!keys.length) return;
    const base = Math.floor((1000 / keys.length)) / 10;
    const out = {};
    keys.forEach((k, i) => {
      out[k] = String(i === 0 ? round1(100 - base * (keys.length - 1)) : base);
    });
    setPercentages(out);
  };

  // ── Imagen ──
  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          notify(t.imageLabel, t.imagePermission);
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (res.canceled || !res.assets?.length) return;
      setLoadingImage(true);
      const asset = res.assets[0];
      // Reducimos y comprimimos para que quepa sin problema en el
      // almacenamiento local (en la web, localStorage tiene ~5 MB).
      const longest = Math.max(asset.width || 0, asset.height || 0);
      const actions = longest > MAX_IMAGE_SIDE
        ? [{ resize: (asset.width || 0) >= (asset.height || 0) ? { width: MAX_IMAGE_SIDE } : { height: MAX_IMAGE_SIDE } }]
        : [];
      const out = await ImageManipulator.manipulateAsync(asset.uri, actions, {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      setImageUri(`data:image/jpeg;base64,${out.base64}`);
    } catch (e) {
      console.error('Image pick error:', e);
      notify(t.imageLabel, t.imageError);
    } finally {
      setLoadingImage(false);
    }
  };

  // ── Guardar / borrar ──
  const handleSave = async () => {
    setSubmitted(true);
    if (errors.length || saving) return;
    setSaving(true);
    const data = {
      name: name.trim(),
      category,
      muscles: ratios,
      description: description.trim(),
      imageUri: imageUri || null,
    };
    try {
      if (editing) {
        await updateCustomExercise(editing.id, data);
        navigation.goBack();
        return;
      }
      const created = await addCustomExercise(data);
      if (returnTo) {
        // Volvemos a la rutina y le pasamos el ejercicio para añadirlo.
        navigation.navigate({ name: returnTo, params: { newExerciseId: created.id }, merge: true });
      } else {
        navigation.replace('ExerciseInfo', { exerciseId: created.id });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    const used = await countRoutinesUsingExercise(editing.id);
    const msg = used > 0 ? fmt(t.deleteExerciseUsedMsg, { n: used }) : t.deleteExerciseMsg;
    const ok = await confirmAsync(t.deleteExerciseQ, msg, { confirmText: t.delete, cancelText: t.cancel, destructive: true });
    if (!ok) return;
    await deleteCustomExercise(editing.id);
    navigation.navigate('Tabs');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader onBack={() => navigation.goBack()} title={editing ? t.editExercise : t.newExercise} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Imagen + nombre */}
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={0.85}>
              {loadingImage ? (
                <ActivityIndicator color={COLORS.orange} />
              ) : imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="add-a-photo" size={26} color={COLORS.textSecondary} />
                  <Text style={styles.imageHint}>{t.pickImage}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t.exerciseNameLabel}</Text>
              <TextInput
                style={[styles.input, submitted && !name.trim() && styles.inputError]}
                value={name}
                onChangeText={setName}
                placeholder={t.exerciseNamePlaceholder}
                placeholderTextColor={COLORS.textMuted}
                selectionColor={COLORS.orange}
                maxLength={60}
              />
              <Text style={styles.optionalNote}>{t.imageLabel} ({t.optional})</Text>
              {!!imageUri && (
                <View style={styles.imageActions}>
                  <TouchableOpacity onPress={pickImage}><Text style={styles.link}>{t.changeImage}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setImageUri(null)}><Text style={[styles.link, styles.linkDanger]}>{t.removeImage}</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Categoría */}
          <Text style={styles.label}>{t.categoryLabel}</Text>
          <View style={styles.chipsWrap}>
            {CATEGORY_VALUES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{getCategoryLabel(c, t)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Músculos */}
          <View style={styles.sectionHead}>
            <Text style={[styles.label, { marginBottom: 0 }]}>{t.musclesWorked}</Text>
            <View style={[styles.totalPill, totalOk ? styles.totalOk : styles.totalBad]}>
              <Text style={[styles.totalText, totalOk ? styles.totalTextOk : styles.totalTextBad]}>
                {t.totalLabel}: {total}%
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>{t.musclesHint}</Text>

          <View style={styles.chipsWrap}>
            {(t.musclesList || []).map((m) => {
              const on = m.key in percentages;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.chip, on && styles.chipActive]}
                  onPress={() => toggleMuscle(m.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedKeys.length > 0 && (
            <View style={styles.card}>
              {selectedKeys.map((k) => {
                const v = Number(percentages[k]) || 0;
                return (
                  <View key={k} style={styles.muscleRow}>
                    <View style={styles.muscleInfo}>
                      <Text style={styles.muscleName}>{muscleLabels[k] || k}</Text>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${Math.min(100, v)}%` }]} />
                      </View>
                    </View>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepMuscle(k, -STEP)} hitSlop={4}>
                      <Icon name="remove" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.pctBox}>
                      <TextInput
                        style={styles.pctInput}
                        value={percentages[k]}
                        onChangeText={(txt) => setMusclePct(k, txt)}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        selectTextOnFocus
                        maxLength={5}
                      />
                      <Text style={styles.pctSign}>%</Text>
                    </View>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => stepMuscle(k, STEP)} hitSlop={4}>
                      <Icon name="add" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleMuscle(k)} hitSlop={6} style={{ marginLeft: 2 }}>
                      <Icon name="close" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {selectedKeys.length > 1 && (
                <TouchableOpacity style={styles.splitBtn} onPress={splitEvenly} activeOpacity={0.8}>
                  <Icon name="balance" size={16} color={COLORS.orange} />
                  <Text style={styles.splitText}>{t.splitEvenly}</Text>
                </TouchableOpacity>
              )}

              {/* Vista previa en el mapa corporal */}
              <View style={styles.previewRow}>
                <BodyMap load={previewLoad} view="front" width={110} />
                <BodyMap load={previewLoad} view="back" width={110} />
              </View>
            </View>
          )}

          {/* Descripción */}
          <Text style={[styles.label, { marginTop: 20 }]}>{t.descriptionLabel} ({t.optional})</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t.descriptionPlaceholder}
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.orange}
            multiline
            textAlignVertical="top"
            maxLength={1500}
          />

          {submitted && errors.length > 0 && (
            <View style={styles.errorBox}>
              {errors.map((e) => (
                <Text key={e} style={styles.errorText}>• {e}</Text>
              ))}
            </View>
          )}

          {editing && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Icon name="delete-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteText}>{t.deleteExercise}</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, (submitted && errors.length > 0) && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          <Text style={styles.saveText}>{editing ? t.saveChanges : t.saveExercise}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 8 },
  topRow: { flexDirection: 'row', gap: 16, marginBottom: 22 },
  imageBox: {
    width: 112, height: 112, borderRadius: 18, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  imageHint: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  imageActions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  link: { color: COLORS.orange, fontSize: 13, fontWeight: '700' },
  linkDanger: { color: '#ef4444' },
  optionalNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12, color: COLORS.white, fontSize: 16,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  inputError: { borderColor: '#ef4444' },
  textArea: { minHeight: 100 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18,
    backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  hint: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  totalPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  totalOk: { backgroundColor: COLORS.green + '22' },
  totalBad: { backgroundColor: COLORS.orange + '22' },
  totalText: { fontSize: 13, fontWeight: '800' },
  totalTextOk: { color: COLORS.green },
  totalTextBad: { color: COLORS.orange },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, gap: 4, marginTop: -6 },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  muscleInfo: { flex: 1, gap: 6 },
  muscleName: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  track: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.orange, borderRadius: 3 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.inputBg, alignItems: 'center', justifyContent: 'center' },
  pctBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 8, paddingHorizontal: 6, width: 64 },
  pctInput: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '700', textAlign: 'right', paddingVertical: 6, minWidth: 0 },
  pctSign: { color: COLORS.textSecondary, fontSize: 13, marginLeft: 2 },
  splitBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8 },
  splitText: { color: COLORS.orange, fontSize: 13, fontWeight: '700' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  errorBox: { backgroundColor: '#ef444418', borderRadius: 12, padding: 12, marginTop: 16, gap: 4 },
  errorText: { color: '#fca5a5', fontSize: 13 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, paddingVertical: 12 },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  saveBtn: { backgroundColor: COLORS.orange, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
