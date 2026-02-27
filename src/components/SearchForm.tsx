import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { CategoryTab } from '../store/usePriceSearchStore';

type Props = {
  date: string;
  productName: string;
  loading?: boolean;

  region: string;
  categoryTab: CategoryTab;

  onChangeDate: (v: string) => void;
  onChangeProductName: (v: string) => void;

  onChangeRegion: (v: string) => void;
  onChangeCategoryTab: (v: CategoryTab) => void;

  onSubmit: () => void;
};

const REGIONS = [
  '전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산',
  '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const;

const TABS: CategoryTab[] = ['전체', '농산물', '축산물', '수산물'];

export default function SearchForm({
  date,
  productName,
  loading = false,
  region,
  categoryTab,
  onChangeDate,
  onChangeProductName,
  onChangeRegion,
  onChangeCategoryTab,
  onSubmit,
}: Props) {
  const isValid = date.trim().length > 0 && region !== '전체';
  const disabled = !isValid || loading;

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>농수축산물 가격정보</Text>

      {/* 패널: 지역 선택 */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>도매시장 선택</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {REGIONS.map((r) => {
            const active = region === r;
            return (
              <Pressable
                key={r}
                onPress={() => onChangeRegion(r)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 날짜 입력 */}
        <View style={styles.miniRow}>
          <TextInput
            testID="date-input"
            style={styles.miniInput}
            placeholder="조회일자 검색"
            value={date}
            onChangeText={onChangeDate}
          />
        </View>

        {/* 안내 */}
        {region === '전체' ? (
          <Text style={styles.helperText}>지역을 선택하면 해당 지역 시장만 조회됩니다.</Text>
        ) : (
          <Text style={styles.helperText}>선택 지역: {region}</Text>
        )}
      </View>

      {/* 품목 검색 */}
      <View style={styles.searchBoxWhite}>
        <Text style={styles.searchIcon}></Text>
        <TextInput
          testID="product-input"
          style={styles.searchInput}
          placeholder="농수축산물 검색..."
          value={productName}
          onChangeText={onChangeProductName}
        />
      </View>

      {/* 카테고리 탭 */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => {
          const active = categoryTab === t;
          return (
            <Pressable
              key={t}
              onPress={() => onChangeCategoryTab(t)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 조회 버튼 */}
      <Pressable
        testID="search-button"
        accessibilityRole="button"
        onPress={onSubmit}
        disabled={disabled}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{loading ? '조회 중...' : '조회'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 10, paddingHorizontal: 16, gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },

  panel: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  panelTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A' },

  chipRow: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { color: '#111827', fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF' },

  searchBoxWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14 },

  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 13,
  },

  helperText: { fontSize: 12, color: '#475569', fontWeight: '700' },

  tabsRow: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#2563EB' },
  tabText: { fontWeight: '700', color: '#111827', fontSize: 13 },
  tabTextActive: { color: '#FFFFFF' },

  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});