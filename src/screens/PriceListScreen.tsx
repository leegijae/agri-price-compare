import React, { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { usePriceSearchStore, type CategoryTab } from '../store/usePriceSearchStore';
import type { AuctionPriceRow } from '../types/agriPrice';

function badgeStyle(categoryName?: string) {
  const c = (categoryName || '').trim();
  if (c.includes('축산')) return { bg: '#FCE7F3', fg: '#9D174D', border: '#FBCFE8', label: '축산물' };
  if (c.includes('수산')) return { bg: '#E0F2FE', fg: '#075985', border: '#BAE6FD', label: '수산물' };
  return { bg: '#DCFCE7', fg: '#166534', border: '#BBF7D0', label: '농산물' };
}

function normalizeCategory(raw?: string): Exclude<CategoryTab, '전체'> {
  const c = (raw || '').trim();
  if (c.includes('축산')) return '축산물';
  if (c.includes('수산')) return '수산물';
  return '농산물';
}

function PriceCard({ item }: { item: AuctionPriceRow }) {
  const b = badgeStyle(item.categoryName);

  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: b.bg,
            borderWidth: 1,
            borderColor: b.border,
          }}
        >
          <Text style={{ color: b.fg, fontWeight: '800', fontSize: 12 }}>{b.label}</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>—</Text>
      </View>

      <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
        {item.productName}
      </Text>

      {item.speciesName ? (
        <Text style={{ marginTop: 2, color: '#64748B', fontWeight: '700' }}>
          {item.speciesName}
        </Text>
      ) : null}

      <Text style={{ marginTop: 10, fontSize: 22, fontWeight: '900', color: '#0F172A' }}>
        {item.bidPrice.toLocaleString()}원
      </Text>

      <Text style={{ marginTop: 4, color: '#64748B', fontWeight: '700' }}>
        {item.unitName ? `${item.unitName} 기준` : '단위 정보 없음'}
        {item.qualityName ? ` · ${item.qualityName}` : ''}
      </Text>

      <Text style={{ marginTop: 10, color: '#475569', fontWeight: '700', fontSize: 12 }}>
        시장: {item.marketName}
      </Text>
      <Text style={{ marginTop: 4, color: '#475569', fontWeight: '700', fontSize: 12 }}>
        경락일: {item.tradeDate}
      </Text>
      <Text style={{ marginTop: 4, color: '#475569', fontWeight: '700', fontSize: 12 }}>
        거래량: {item.quantity != null ? item.quantity.toLocaleString() : '-'}
      </Text>
    </View>
  );
}

export default function PriceListScreen() {
  const { items, loading, error, region, categoryTab } = usePriceSearchStore();

  const filtered = useMemo(() => {
    return items.filter((it) => {
      // ✅ 지역 필터(안전장치)
      if (region && region !== '전체' && !it.marketName?.includes(region)) return false;

      // ✅ 카테고리 탭 필터(정상 동작)
      if (categoryTab !== '전체') {
  const normalized = normalizeCategory(it.categoryName);
  if (normalized !== categoryTab) return false;
}

      return true;
    });
  }, [items, region, categoryTab]);

  if (loading) return <Text style={{ padding: 16 }}>조회 중...</Text>;
  if (error) return <Text style={{ padding: 16, color: '#DC2626' }}>{error}</Text>;
  if (items.length === 0) return <Text style={{ padding: 16 }}>조회 결과가 없습니다.</Text>;

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ paddingHorizontal: 16, paddingVertical: 10, fontWeight: '800', color: '#0F172A' }}>
        총 {filtered.length}개의 품목
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item.rowNum}-${item.productCode ?? ''}-${index}`}
        renderItem={({ item }) => <PriceCard item={item} />}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
      />
    </View>
  );
  function normalizeCategory(raw?: string): '농산물' | '축산물' | '수산물' {
  const c = (raw || '').trim();
  if (c.includes('축산')) return '축산물';
  if (c.includes('수산')) return '수산물';
  return '농산물';
}
}