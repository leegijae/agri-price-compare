import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { usePriceSearchStore } from '@/src/store/usePriceSearchStore';

function PriceCard({ item }: { item: any }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: 16 }}>
        {item.productName} {item.speciesName ? `(${item.speciesName})` : ''}
      </Text>
      <Text>시장: {item.marketName}</Text>
      <Text>경락일: {item.tradeDate}</Text>
      <Text>경락가: {item.bidPrice.toLocaleString()}원</Text>
      <Text>
        거래량: {item.quantity != null ? `${item.quantity.toLocaleString()}` : '-'}
        {item.unitName ? ` ${item.unitName}` : ''}
      </Text>
      {item.qualityName ? <Text>등급: {item.qualityName}</Text> : null}
    </View>
  );
}

export default function PriceListScreen() {
  const { items, loading, error } = usePriceSearchStore();

  if (loading) {
    return <Text style={{ padding: 16 }}>조회 중...</Text>;
  }

  if (error) {
    return <Text style={{ padding: 16, color: 'red' }}>{error}</Text>;
  }

  if (items.length === 0) {
    return <Text style={{ padding: 16 }}>조회 결과가 없습니다.</Text>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => `${item.rowNum}-${item.productCode ?? ''}-${index}`}
      renderItem={({ item }) => <PriceCard item={item} />}
      contentContainerStyle={{ paddingVertical: 12 }}
    />
  );
}