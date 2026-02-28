import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';

type Props = {
  productName: string;
  loading?: boolean;

  region: string;

  onChangeProductName: (v: string) => void;
  onChangeRegion: (v: string) => void;

  onSubmit: () => void;
};

const REGIONS = [
  '전체', '서울', '부산', '대구', '인천', '광주', '대전',
  '경기', '강원', '전북', '전남', '경북', '경남', '제주',
] as const;

export default function SearchForm({
  productName,
  loading = false,
  region,
  onChangeProductName,
  onChangeRegion,
  onSubmit,
}: Props) {
  const disabled = loading;

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>농산물 가격정보</Text>

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

        {region === '전체' ? (
          <Text style={styles.helperText}>전체 지역 기준으로 최근 60일 내 거래 데이터를 조회합니다.</Text>
        ) : (
          <Text style={styles.helperText}>선택 지역: {region} · 최근 60일 기준</Text>
        )}
      </View>

      <View style={styles.searchBoxWhite}>
        <Text style={styles.searchIcon}></Text>
        <TextInput
          testID="product-input"
          style={styles.searchInput}
          placeholder="농산물 검색(선택)..."
          value={productName}
          onChangeText={onChangeProductName}
        />
      </View>

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
  helperText: { fontSize: 12, color: '#475569', fontWeight: '700' },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
});