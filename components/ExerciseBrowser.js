import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { COLORS } from '../data/theme';
import { CATEGORY_VALUES, getCategoryLabel, getExerciseText } from '../data/exercises';
import ExerciseThumb from './ExerciseThumb';

const ALL = '__all__';
const MINE = '__mine__';

const normalize = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

const ExerciseRow = React.memo(({
  item, name, subtitle, selected, onPress, onInfo, customLabel,
}) => (
  <TouchableOpacity
    style={[styles.row, selected && styles.rowSel]}
    onPress={() => onPress?.(item)}
    activeOpacity={0.75}
  >
    <ExerciseThumb exercise={item} size={48} />
    <View style={styles.rowText}>
      <View style={styles.nameLine}>
        <Text style={[styles.name, selected && styles.nameSel]} numberOfLines={2}>{name}</Text>
      </View>
      <View style={styles.metaLine}>
        {item.isCustom && (
          <View style={styles.badge}><Text style={styles.badgeText}>{customLabel}</Text></View>
        )}
        <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
    </View>
    {onInfo && (
      <TouchableOpacity onPress={() => onInfo(item)} style={styles.infoBtn} hitSlop={8} accessibilityLabel="Info">
        <Icon name="info-outline" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>
    )}
    {selected !== undefined && (
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected && <Icon name="check" size={16} color={COLORS.white} />}
      </View>
    )}
  </TouchableOpacity>
));

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ExerciseBrowser({
  exercises,
  t,
  language,
  selectedIds,         // Set opcional → muestra casilla de selección
  onPressItem,
  onInfo,
  onCreate,            // muestra "¿No lo encuentras? Créalo"
  ListHeaderComponent,
  contentBottomPadding = 24,
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [muscle, setMuscle] = useState(ALL);

  const muscleLabels = useMemo(() => {
    const map = {};
    (t.musclesList || []).forEach((m) => { map[m.key] = m.label; });
    return map;
  }, [t.musclesList]);

  const data = useMemo(() => {
    const q = normalize(search.trim());
    const list = exercises.filter((ex) => {
      if (category === MINE && !ex.isCustom) return false;
      if (category !== ALL && category !== MINE && ex.category !== category) return false;
      if (muscle !== ALL && !(ex.muscles?.[muscle] > 0)) return false;
      if (!q) return true;
      const haystack = normalize([
        getExerciseText(ex, language).name,
        ex.name,
        getCategoryLabel(ex.category, t),
      ].join(' '));
      return haystack.includes(q);
    });
    // Con filtro de músculo, primero los que más lo trabajan.
    if (muscle !== ALL) {
      return [...list].sort((a, b) => (b.muscles?.[muscle] || 0) - (a.muscles?.[muscle] || 0));
    }
    return list;
  }, [exercises, search, category, muscle, language, t]);

  const subtitleFor = useCallback((ex) => {
    const top = Object.entries(ex.muscles || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => muscleLabels[k] || k);
    return [getCategoryLabel(ex.category, t), ...top].filter(Boolean).join(' · ');
  }, [muscleLabels, t]);

  const renderItem = useCallback(({ item }) => (
    <ExerciseRow
      item={item}
      name={getExerciseText(item, language).name}
      subtitle={subtitleFor(item)}
      selected={selectedIds ? selectedIds.has(item.id) : undefined}
      onPress={onPressItem}
      onInfo={onInfo}
      customLabel={t.customBadge}
    />
  ), [language, subtitleFor, selectedIds, onPressItem, onInfo, t.customBadge]);

  const hasCustom = useMemo(() => exercises.some((e) => e.isCustom), [exercises]);

  const header = (
    <View>
      {ListHeaderComponent}
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t.searchExercises}
          placeholderTextColor={COLORS.textSecondary}
          selectionColor={COLORS.orange}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="close" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        <Chip label={t.exercisesCategories?.[0]?.label || 'All'} active={category === ALL} onPress={() => setCategory(ALL)} />
        {hasCustom && <Chip label={t.myExercises} active={category === MINE} onPress={() => setCategory(MINE)} />}
        {CATEGORY_VALUES.map((c) => (
          <Chip key={c} label={getCategoryLabel(c, t)} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        <Chip label={t.allMuscles} active={muscle === ALL} onPress={() => setMuscle(ALL)} />
        {(t.musclesList || []).map((m) => (
          <Chip key={m.key} label={m.label} active={muscle === m.key} onPress={() => setMuscle(muscle === m.key ? ALL : m.key)} />
        ))}
      </ScrollView>
      <Text style={styles.count}>{data.length} {t.exercises}</Text>
    </View>
  );

  const footer = onCreate ? (
    <TouchableOpacity style={styles.createCard} onPress={onCreate} activeOpacity={0.85}>
      <Icon name="add-circle-outline" size={22} color={COLORS.orange} />
      <Text style={styles.createText}>
        {t.cantFindIt} <Text style={styles.createLink}>{t.createIt}</Text>
      </Text>
    </TouchableOpacity>
  ) : null;

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={<Text style={styles.empty}>{t.noResults}</Text>}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[styles.list, { paddingBottom: contentBottomPadding }]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 15, paddingVertical: 12, outlineStyle: 'none' },
  chips: { gap: 8, paddingTop: 10 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18,
    backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  count: { color: COLORS.textMuted, fontSize: 12, marginTop: 12, marginBottom: 8, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 10, paddingRight: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  rowSel: { borderColor: COLORS.orange },
  rowText: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center' },
  name: { color: COLORS.white, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  nameSel: { color: COLORS.orange },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  sub: { color: COLORS.textSecondary, fontSize: 12, flexShrink: 1 },
  badge: { backgroundColor: COLORS.orange + '26', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: COLORS.orange, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoBtn: { padding: 4 },
  check: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  empty: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 32 },
  createCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 14,
    paddingVertical: 16, marginTop: 4, marginBottom: 8,
  },
  createText: { color: COLORS.textSecondary, fontSize: 14 },
  createLink: { color: COLORS.orange, fontWeight: '700' },
});
