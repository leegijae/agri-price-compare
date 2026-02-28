import React from 'react';
import { render } from '@testing-library/react-native';
import PriceListScreen from '@/src/screens/PriceListScreen';
import { usePriceSearchStore } from '@/src/store/usePriceSearchStore';

jest.mock('@/src/store/usePriceSearchStore', () => ({
  usePriceSearchStore: jest.fn(),
}));

const mockedUsePriceSearchStore = usePriceSearchStore as jest.MockedFunction<
  typeof usePriceSearchStore
>;

describe('PriceListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loading=true 이면 조회 중 문구를 표시한다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      items: [],
      loading: true,
      error: null,
      productName: '',
      effectiveDate: null,
    } as any);

    const { getByText } = render(<PriceListScreen />);
    expect(getByText('조회 중...')).toBeTruthy();
  });

  it('error가 있으면 에러 문구를 표시한다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      items: [],
      loading: false,
      error: '데이터 조회 실패',
      productName: '',
      effectiveDate: null,
    } as any);

    const { getByText } = render(<PriceListScreen />);
    expect(getByText('데이터 조회 실패')).toBeTruthy();
  });

  it('items가 비어 있으면 빈 결과 문구를 표시한다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      productName: '',
      effectiveDate: null,
    } as any);

    const { getByText } = render(<PriceListScreen />);
    expect(getByText('조회 결과가 없습니다.')).toBeTruthy();
  });

  it('items가 있으면 총 개수와 최신 거래일을 표시한다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      items: [
        {
          rowNum: 1,
          tradeDate: '20260228',
          marketName: '서울가락',
          productName: '배추',
          bidPrice: 3000,
          quantity: 10,
          speciesName: '월동',
          unitName: '10kg',
          qualityName: '특',
        },
        {
          rowNum: 2,
          tradeDate: '20260228',
          marketName: '서울강서',
          productName: '무',
          bidPrice: 1500,
          quantity: 20,
        },
      ],
      loading: false,
      error: null,
      productName: '',
      effectiveDate: '20260228',
    } as any);

    const { getByText } = render(<PriceListScreen />);

    expect(getByText('총 2개의 품목')).toBeTruthy();
    expect(getByText('최신 거래일: 20260228')).toBeTruthy();
    expect(getByText('배추')).toBeTruthy();
    expect(getByText('무')).toBeTruthy();
  });

  it('productName이 있으면 리스트를 화면에서 한 번 더 필터링한다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      items: [
        {
          rowNum: 1,
          tradeDate: '20260228',
          marketName: '서울가락',
          productName: '배추',
          bidPrice: 3000,
          quantity: 10,
        },
        {
          rowNum: 2,
          tradeDate: '20260228',
          marketName: '서울강서',
          productName: '무',
          bidPrice: 1500,
          quantity: 20,
        },
      ],
      loading: false,
      error: null,
      productName: '배추',
      effectiveDate: '20260228',
    } as any);

    const { getByText, queryByText } = render(<PriceListScreen />);

    expect(getByText('총 1개의 품목')).toBeTruthy();
    expect(getByText('배추')).toBeTruthy();
    expect(queryByText('무')).toBeNull();
  });
});