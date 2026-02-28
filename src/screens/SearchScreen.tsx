import React from 'react';
import { View, Text, Pressable } from 'react-native';
import SearchForm from '../components/SearchForm';
import { usePriceSearchStore } from '../store/usePriceSearchStore';

export default function SearchScreen() {
  const {
    productName,
    loading,
    error,
    setProductName,
    search,
    sortType,
    setSortType,
    region,
    setRegion,
  } = usePriceSearchStore();

  const sortButtons = [
    { key: 'price-desc', label: '가격↓' },
    { key: 'price-asc', label: '가격↑' },
    { key: 'qty-desc', label: '거래량↓' },
    { key: 'qty-asc', label: '거래량↑' },
  ] as const;

  return (
    <View style={{ paddingTop: 8, gap: 10 }}>
      <SearchForm
        productName={productName}
        loading={loading}
        region={region}
        onChangeProductName={setProductName}
        onChangeRegion={setRegion}
        onSubmit={search}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        {sortButtons.map((btn) => {
          const active = sortType === btn.key;
          return (
            <Pressable
              key={btn.key}
              onPress={() => setSortType(active ? 'none' : btn.key)}
              style={{
                borderWidth: 1,
                borderColor: active ? '#2563EB' : '#D1D5DB',
                backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: '#111827', fontWeight: '700', fontSize: 12 }}>{btn.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={{ color: '#DC2626', paddingHorizontal: 16, paddingBottom: 6 }}>{error}</Text> : null}
    </View>
  );
}