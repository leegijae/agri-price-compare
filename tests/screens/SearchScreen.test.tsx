import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchScreen from '@/src/screens/SearchScreen';
import { usePriceSearchStore } from '@/src/store/usePriceSearchStore';

jest.mock('@/src/store/usePriceSearchStore', () => ({
  usePriceSearchStore: jest.fn(),
}));

const mockedUsePriceSearchStore = usePriceSearchStore as jest.MockedFunction<
  typeof usePriceSearchStore
>;

describe('SearchScreen', () => {
  const baseStoreState = {
    productName: '배추',
    loading: false,
    error: null as string | null,
    sortType: 'none',
    region: '전체',
    setSortType: jest.fn(),
    setRegion: jest.fn(),
    setProductName: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePriceSearchStore.mockReturnValue(baseStoreState as any);
  });

  it('스토어 값을 기반으로 SearchForm 입력값을 렌더링한다', () => {
    const { getByDisplayValue, getByText } = render(<SearchScreen />);
    expect(getByDisplayValue('배추')).toBeTruthy();
    expect(
      getByText('전체 지역 기준으로 최근 60일 내 거래 데이터를 조회합니다.')
    ).toBeTruthy();
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

  it('품목명 입력 변경이 스토어 setProductName으로 연결된다', () => {
    const { getByTestId } = render(<SearchScreen />);
    fireEvent.changeText(getByTestId('product-input'), '무');
    expect(baseStoreState.setProductName).toHaveBeenCalledWith('무');
  });

  it('지역 칩 클릭이 스토어 setRegion으로 연결된다', () => {
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('서울'));
    expect(baseStoreState.setRegion).toHaveBeenCalledWith('서울');
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

  it('정렬 버튼 클릭이 setSortType으로 연결된다', () => {
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('가격↓'));
    expect(baseStoreState.setSortType).toHaveBeenCalledWith('price-desc');
  });

  it('활성화되지 않은 정렬 버튼을 누르면 해당 sortType으로 설정한다', () => {
    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('거래량↑'));
    expect(baseStoreState.setSortType).toHaveBeenCalledWith('qty-asc');
  });

  it('이미 활성화된 정렬 버튼을 다시 누르면 none으로 되돌린다', () => {
    mockedUsePriceSearchStore.mockReturnValue({
      ...baseStoreState,
      sortType: 'price-desc',
    } as any);

    const { getByText } = render(<SearchScreen />);
    fireEvent.press(getByText('가격↓'));
    expect(baseStoreState.setSortType).toHaveBeenCalledWith('none');
  });
});