import React from 'react';
import { View, Text, Pressable } from 'react-native';
import SearchForm from '../components/SearchForm';
import { usePriceSearchStore } from '../store/usePriceSearchStore';

export default function SearchScreen() {
  const {
    date,
    marketName,
    productName,
    loading,
    error,
    setDate,
    setMarketName,
    setProductName,
    search,
    sortType,
    setSortType,
  } = usePriceSearchStore();

  const sortButtons = [
    { key: 'price-desc', label: '가격↓' },
    { key: 'price-asc', label: '가격↑' },
    { key: 'qty-desc', label: '거래량↓' },
    { key: 'qty-asc', label: '거래량↑' },
  ] as const;

  return (
    <View style={{ paddingTop: 8 }}>
      <SearchForm
        date={date}
        marketName={marketName}
        productName={productName}
        loading={loading}
        onChangeDate={setDate}
        onChangeMarketName={setMarketName}
        onChangeProductName={setProductName}
        onSubmit={search}
      />

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        {sortButtons.map((btn) => {
          const active = sortType === btn.key;
          return (
            <Pressable
              key={btn.key}
              onPress={() => setSortType(btn.key)}
              style={{
                borderWidth: 1,
                borderColor: active ? '#222' : '#ccc',
                backgroundColor: active ? '#222' : '#fff',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: active ? '#fff' : '#222' }}>{btn.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text style={{ color: 'red', paddingHorizontal: 16 }}>{error}</Text>
      ) : null}
    </View>
  );
}