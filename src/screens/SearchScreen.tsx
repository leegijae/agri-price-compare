import React from 'react';
import { View, Text } from 'react-native';
import SearchForm from '@/src/components/SearchForm';
import { usePriceSearchStore } from '@/src/store/usePriceSearchStore';

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
  } = usePriceSearchStore();

  return (
    <View style={{ flex: 1 }}>
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

      {error ? (
        <Text style={{ color: 'red', paddingHorizontal: 16 }}>{error}</Text>
      ) : null}
    </View>
  );
}