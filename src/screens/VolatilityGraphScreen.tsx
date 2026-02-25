import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import VolatilityPeriodLineChart from '../components/VolatilityPeriodLineChart';
import { fetchRecentVolatilityData } from '../api/agriPriceApi';
import { buildSeriesByKeywords } from '../utils/priceVolatilitySeries';
import { getDaysFromPeriod } from '../utils/period';
import type { PeriodOption, VolatilitySeries } from '../types/agriPrice';

export default function VolatilityGraphScreen() {
  const [period, setPeriod] = useState<PeriodOption>('7D');
  const [series, setSeries] = useState<VolatilitySeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
const [submittedKeywords, setSubmittedKeywords] = useState<string[]>([]);

  const canAddKeyword = keywordInput.trim().length > 0 && keywords.length < 5;

  const addKeyword = () => {
  const value = keywordInput.trim();
  if (!value) return;

  if (keywords.length >= 5) {
    setError('품목은 최대 5개까지 추가할 수 있습니다.');
    return;
  }

  // ✅ 중복 금지 (공백 제거 + 소문자 기준 비교)
  const normalizedValue = value.replace(/\s+/g, '').toLowerCase();
  const isDuplicate = keywords.some(
    (k) => k.replace(/\s+/g, '').toLowerCase() === normalizedValue
  );

  if (isDuplicate) {
    setError('이미 추가한 품목입니다. 다른 품목을 입력해주세요.');
    return;
  }

  setKeywords((prev) => [...prev, value]);
  setKeywordInput('');
  setError(''); // 에러 초기화
};

  const removeKeyword = (index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
  };

  const submitKeywords = () => {
  if (keywords.length === 0) {
    setError('비교할 품목을 1개 이상 추가해주세요. (최대 5개)');
    return;
  }
  setError('');
  setSubmittedKeywords([...keywords]);
};

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (submittedKeywords.length === 0) {
        if (mounted) setSeries([]);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const days = getDaysFromPeriod(period);

        // 오늘 미집계 이슈 방지: 어제 기준
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const endDate = yesterday.toISOString().slice(0, 10);

        const daily = await fetchRecentVolatilityData({
          marketName: '서울강서도매시장',
          days,
          endDate,
        });

        const selectedSeries = buildSeriesByKeywords(daily, submittedKeywords);

        if (mounted) {
          if (selectedSeries.length === 0) {
            setError('입력한 품목으로 그래프 데이터를 찾지 못했습니다.');
            setSeries([]);
          } else {
            setSeries(selectedSeries);
          }
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message || '가격 변동 추이 데이터를 불러오지 못했습니다.');
          setSeries([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [period, submittedKeywords]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
        {/* ✅ 품목 입력 영역 */}
        <View style={styles.box}>
          <Text style={styles.title}>비교할 품목 선택 (최대 5개, 중복 가능)</Text>

          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="예: 토마토, 배추"
              value={keywordInput}
              onChangeText={setKeywordInput}
              onSubmitEditing={addKeyword}
            />
            <Pressable
              onPress={addKeyword}
              disabled={!canAddKeyword}
              style={[styles.addBtn, !canAddKeyword && styles.disabled]}
            >
              <Text style={styles.btnText}>추가</Text>
            </Pressable>
          </View>

          <View style={styles.chips}>
            {keywords.map((k, i) => (
              <View key={`${k}-${i}`} style={styles.chip}>
                <Text style={styles.chipText}>{k}</Text>
                <Pressable onPress={() => removeKeyword(i)}>
                  <Text style={styles.chipRemove}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable
            onPress={submitKeywords}
            style={[styles.searchBtn, keywords.length === 0 && styles.disabled]}
            disabled={keywords.length === 0}
          >
            <Text style={styles.searchBtnText}>그래프 비교하기</Text>
          </Pressable>
        </View>

        {loading && <Text style={{ color: '#666' }}>가격 변동 추이 그래프 불러오는 중...</Text>}
        {!!error && <Text style={{ color: 'red', marginBottom: 6 }}>{error}</Text>}

        {!loading && !error && (
          <VolatilityPeriodLineChart
            period={period}
            onChangePeriod={setPeriod}
            series={series}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBtn: {
    backgroundColor: '#2f6fed',
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eef3ff',
    borderWidth: 1,
    borderColor: '#cddcff',
  },
  chipText: { fontSize: 12, color: '#1f3f8f' },
  chipRemove: { fontSize: 12, color: '#1f3f8f', fontWeight: '700' },
  searchBtn: {
    marginTop: 4,
    backgroundColor: '#222',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700' },
});