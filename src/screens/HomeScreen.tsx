import React from 'react';
import { SafeAreaView, View } from 'react-native';
import SearchScreen from './SearchScreen';
import PriceListScreen from './PriceListScreen';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 0 }}>
        <SearchScreen />
      </View>
      <View style={{ flex: 1 }}>
        <PriceListScreen />
      </View>
    </SafeAreaView>
  );
}