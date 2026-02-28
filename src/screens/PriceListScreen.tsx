import React, { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import { usePriceSearchStore } from '../store/usePriceSearchStore';
import type { AuctionPriceRow } from '../types/agriPrice';

function PriceCard({ item }: { item: AuctionPriceRow }) {
  return (
    <View style={{ flex: 1, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#BBF7D0' }}>
          <Text style={{ color: '#166534', fontWeight: '800', fontSize: 12 }}>농산물</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '700' }}>—</Text>
      </View>

      <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '900', color: '#0F172A' }}>{item.productName}</Text>

      {item.speciesName ? <Text style={{ marginTop: 2, color: '#64748B', fontWeight: '700' }}>{item.speciesName}</Text> : null}

      <Text style={{ marginTop: 10, fontSize: 22, fontWeight: '900', color: '#0F172A' }}>
        {Number(item.bidPrice || 0).toLocaleString()}원
      </Text>

      <Text style={{ marginTop: 4, color: '#64748B', fontWeight: '700' }}>
        {item.unitName ? `${item.unitName} 기준` : '단위 정보 없음'}
        {item.qualityName ? ` · ${item.qualityName}` : ''}
      </Text>

      <Text style={{ marginTop: 10, color: '#475569', fontWeight: '700', fontSize: 12 }}>시장: {item.marketName}</Text>
      <Text style={{ marginTop: 4, color: '#475569', fontWeight: '700', fontSize: 12 }}>경락일: {item.tradeDate}</Text>
      <Text style={{ marginTop: 4, color: '#475569', fontWeight: '700', fontSize: 12 }}>
        거래량: {item.quantity != null ? Number(item.quantity).toLocaleString() : '-'}
      </Text>
    </View>
  );
}

export default function PriceListScreen() {
  const { items, loading, error, productName, effectiveDate } = usePriceSearchStore();

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (productName?.trim()) {
        const k = productName.trim();
        const hit =
          it.productName.includes(k) ||
          (it.speciesName ?? '').includes(k) ||
          (it.categoryName ?? '').includes(k) ||
          (it.marketName ?? '').includes(k);
        if (!hit) return false;
      }
      return true;
    });
  }, [items, productName]);

  if (loading) return <Text style={{ padding: 16 }}>조회 중...</Text>;
  if (error) return <Text style={{ padding: 16, color: '#DC2626' }}>{error}</Text>;
  if (items.length === 0) return <Text style={{ padding: 16 }}>조회 결과가 없습니다.</Text>;

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ paddingHorizontal: 16, paddingTop: 10, fontWeight: '800', color: '#0F172A' }}>
        총 {filtered.length}개의 품목
      </Text>

      {effectiveDate ? (
        <Text style={{ paddingHorizontal: 16, paddingTop: 4, color: '#64748B', fontWeight: '700', fontSize: 12 }}>
          최신 거래일: {effectiveDate}
        </Text>
      ) : null}

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
}