import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchScreen from '../SearchScreen';
import { usePriceSearchStore } from '@/src/store/usePriceSearchStore';

// store hook mock
jest.mock('@/src/store/usePriceSearchStore', () => ({
  usePriceSearchStore: jest.fn(),
}));

const mockedUsePriceSearchStore = usePriceSearchStore as jest.MockedFunction<
  typeof usePriceSearchStore
>;

describe('SearchScreen', () => {
  const baseStoreState = {
    date: '20151120',
    marketName: '서울강서도매시장',
    productName: '배추',
    loading: false,
    error: null as string | null,
    setDate: jest.fn(),
    setMarketName: jest.fn(),
    setProductName: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePriceSearchStore.mockReturnValue(baseStoreState as any);
  });

  it('스토어 값을 기반으로 SearchForm 입력값을 렌더링한다', () => {
    const { getByDisplayValue } = render(<SearchScreen />);

    expect(getByDisplayValue('20151120')).toBeTruthy();
    expect(getByDisplayValue('서울강서도매시장')).toBeTruthy();
    expect(getByDisplayValue('배추')).toBeTruthy();
  });

  it('에러가 없으면 에러 메시지를 표시하지 않는다', () => {
    const { queryByText } = render(<SearchScreen />);
    expect(
      queryByText('데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.')
    ).toBeNull();
  });

  it('스토어 error 값이 있으면 에러 메시지를 표시한다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      ...baseStoreState,
      error: '데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.',
    } as any);

    const { getByText } = render(<SearchScreen />);

    expect(
      getByText('데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.')
    ).toBeTruthy();
  });

  it('조회일자 입력 변경이 스토어 setDate로 연결된다', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.changeText(getByTestId('date-input'), '20151121');

    expect(baseStoreState.setDate).toHaveBeenCalledWith('20151121');
  });

  it('시장명 입력 변경이 스토어 setMarketName으로 연결된다', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.changeText(getByTestId('market-input'), '부산엄궁도매시장');

    expect(baseStoreState.setMarketName).toHaveBeenCalledWith('부산엄궁도매시장');
  });

  it('품목명 입력 변경이 스토어 setProductName으로 연결된다', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.changeText(getByTestId('product-input'), '무');

    expect(baseStoreState.setProductName).toHaveBeenCalledWith('무');
  });

  it('조회 버튼 클릭이 스토어 search로 연결된다', () => {
    const { getByTestId } = render(<SearchScreen />);

    fireEvent.press(getByTestId('search-button'));

    expect(baseStoreState.search).toHaveBeenCalledTimes(1);
  });

  it('loading=true 상태가 SearchForm에 반영되어 로딩 문구를 표시한다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      ...baseStoreState,
      loading: true,
    } as any);

    const { getByText } = render(<SearchScreen />);

    expect(getByText('조회 중...')).toBeTruthy();
  });
});