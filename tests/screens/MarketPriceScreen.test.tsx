import React from 'react';
import { render } from '@testing-library/react-native';
import MarketPriceScreen from '@/src/screens/MarketPriceScreen';

jest.mock('@/src/screens/SearchScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockSearchScreen() {
    return <Text>Mock SearchScreen</Text>;
  };
});

jest.mock('@/src/screens/PriceListScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockPriceListScreen() {
    return <Text>Mock PriceListScreen</Text>;
  };
});

describe('MarketPriceScreen', () => {
  it('SearchScreen과 PriceListScreen을 함께 렌더링한다', () => {
    const { getByText } = render(<MarketPriceScreen />);

    expect(getByText('Mock SearchScreen')).toBeTruthy();
    expect(getByText('Mock PriceListScreen')).toBeTruthy();
  });
});