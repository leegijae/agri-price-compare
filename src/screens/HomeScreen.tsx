import React from 'react';
import { SafeAreaView, View } from 'react-native';
import SearchScreen from './SearchScreen';
import PriceListScreen from './PriceListScreen';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* 검색 영역: 내용만큼만 */}
      <View>
        <SearchScreen />
      </View>

      {/* 리스트 영역: 나머지 공간 */}
      <View style={{ flex: 1 }}>
        <PriceListScreen />
      </View>
    </SafeAreaView>
  );
}