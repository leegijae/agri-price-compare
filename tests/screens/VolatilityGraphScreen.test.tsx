import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import VolatilityGraphScreen from '@/src/screens/VolatilityGraphScreen';
import { fetchRecentVolatilityData } from '@/src/api/agriPriceApi';
import { buildSeriesByKeywords } from '@/src/utils/priceVolatilitySeries';
import { getDaysFromPeriod } from '@/src/utils/period';

jest.mock('@/src/api/agriPriceApi', () => ({
  fetchRecentVolatilityData: jest.fn(),
}));

jest.mock('@/src/utils/priceVolatilitySeries', () => ({
  buildSeriesByKeywords: jest.fn(),
}));

jest.mock('@/src/utils/period', () => ({
  getDaysFromPeriod: jest.fn(),
}));

jest.mock('@/src/components/VolatilityPeriodLineChart', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  return function MockVolatilityPeriodLineChart(props: any) {
    return (
      <View>
        <Text>Mock VolatilityPeriodLineChart</Text>
        <Text>{`period:${props.period}`}</Text>
        <Text>{`seriesCount:${props.series.length}`}</Text>
        <Pressable onPress={() => props.onChangePeriod('30D')}>
          <Text>change-to-30D</Text>
        </Pressable>
      </View>
    );
  };
});

const mockedFetchRecentVolatilityData =
  fetchRecentVolatilityData as jest.MockedFunction<typeof fetchRecentVolatilityData>;
const mockedBuildSeriesByKeywords =
  buildSeriesByKeywords as jest.MockedFunction<typeof buildSeriesByKeywords>;
const mockedGetDaysFromPeriod =
  getDaysFromPeriod as jest.MockedFunction<typeof getDaysFromPeriod>;

describe('VolatilityGraphScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDaysFromPeriod.mockReturnValue(7);
    mockedFetchRecentVolatilityData.mockResolvedValue([]);
    mockedBuildSeriesByKeywords.mockReturnValue([]);
  });

  it('초기에는 차트 컴포넌트를 렌더링하고, submittedKeywords가 없으면 API를 호출하지 않는다', () => {
    const { getByText } = render(<VolatilityGraphScreen />);

    expect(getByText('비교할 품목 선택 (최대 5개, 중복 가능)')).toBeTruthy();
    expect(getByText('Mock VolatilityPeriodLineChart')).toBeTruthy();
    expect(mockedFetchRecentVolatilityData).not.toHaveBeenCalled();
  });

  it('공백 입력은 추가되지 않는다', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<VolatilityGraphScreen />);

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), '   ');
    fireEvent.press(getByText('추가'));

    expect(queryByText('✕')).toBeNull();
  });

  it('키워드를 추가하고 그래프 비교하기를 누르면 데이터 로드를 수행한다', async () => {
    mockedBuildSeriesByKeywords.mockReturnValue([
      {
        productKey: 'kw:0:토마토',
        productName: '토마토',
        points: [
          { date: '2026-02-27', price: 1000, changeRate: 0 },
          { date: '2026-02-28', price: 1200, changeRate: 20 },
        ],
        latestChangeRate: 20,
      },
    ] as any);

    const { getByPlaceholderText, getByText } = render(<VolatilityGraphScreen />);

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), '토마토');
    fireEvent.press(getByText('추가'));
    fireEvent.press(getByText('그래프 비교하기'));

    await waitFor(() => {
      expect(mockedGetDaysFromPeriod).toHaveBeenCalledWith('7D');
      expect(mockedFetchRecentVolatilityData).toHaveBeenCalledTimes(1);
      expect(mockedBuildSeriesByKeywords).toHaveBeenCalledWith([], ['토마토']);
    });
  });

  it('동일 키워드를 중복 추가하면 에러를 표시한다', () => {
    const { getByPlaceholderText, getByText } = render(<VolatilityGraphScreen />);

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), '토마토');
    fireEvent.press(getByText('추가'));

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), ' 토마토 ');
    fireEvent.press(getByText('추가'));

    expect(getByText('이미 추가한 품목입니다. 다른 품목을 입력해주세요.')).toBeTruthy();
  });

  it('키워드가 0개이면 그래프 비교하기 버튼이 비활성화된다', () => {
  const { getByText } = render(<VolatilityGraphScreen />);

  const buttonNode = getByText('그래프 비교하기').parent?.parent;

  expect(buttonNode?.props?.accessibilityState?.disabled).toBe(true);
});

  it('키워드가 5개일 때 엔터 제출로 추가를 시도하면 에러를 표시한다', () => {
  const { getByPlaceholderText, getByText } = render(<VolatilityGraphScreen />);
  const input = getByPlaceholderText('예: 토마토, 배추');

  ['A', 'B', 'C', 'D', 'E'].forEach((k) => {
    fireEvent.changeText(input, k);
    fireEvent.press(getByText('추가'));
  });

  fireEvent.changeText(input, 'F');
  fireEvent(input, 'submitEditing');

  expect(getByText('품목은 최대 5개까지 추가할 수 있습니다.')).toBeTruthy();
});

  it('removeKeyword가 동작해 추가한 키워드를 제거할 수 있다', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<VolatilityGraphScreen />);

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), '배추');
    fireEvent.press(getByText('추가'));

    expect(getByText('배추')).toBeTruthy();

    fireEvent.press(getByText('✕'));

    expect(queryByText('배추')).toBeNull();
  });

  it('조회 결과가 비어 있으면 에러를 표시한다', async () => {
    mockedBuildSeriesByKeywords.mockReturnValue([]);

    const { getByPlaceholderText, getByText } = render(<VolatilityGraphScreen />);

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), '양파');
    fireEvent.press(getByText('추가'));
    fireEvent.press(getByText('그래프 비교하기'));

    await waitFor(() => {
      expect(getByText('입력한 품목으로 그래프 데이터를 찾지 못했습니다.')).toBeTruthy();
    });
  });

  it('API 에러가 발생하면 에러 메시지를 표시한다', async () => {
    mockedFetchRecentVolatilityData.mockRejectedValueOnce(new Error('API failure'));

    const { getByPlaceholderText, getByText } = render(<VolatilityGraphScreen />);

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), '배추');
    fireEvent.press(getByText('추가'));
    fireEvent.press(getByText('그래프 비교하기'));

    await waitFor(() => {
      expect(getByText('API failure')).toBeTruthy();
    });
  });

    it('차트 컴포넌트의 period 변경 콜백이 반영되면 30D 기준으로 다시 조회한다', async () => {
    mockedGetDaysFromPeriod
      .mockReturnValueOnce(7)
      .mockReturnValueOnce(30);

    mockedBuildSeriesByKeywords.mockReturnValue([
      {
        productKey: 'kw:0:배추',
        productName: '배추',
        points: [
          { date: '2026-02-27', price: 1000, changeRate: 0 },
          { date: '2026-02-28', price: 1300, changeRate: 30 },
        ],
        latestChangeRate: 30,
      },
    ] as any);

    const { getByPlaceholderText, getByText } = render(<VolatilityGraphScreen />);

    fireEvent.changeText(getByPlaceholderText('예: 토마토, 배추'), '배추');
    fireEvent.press(getByText('추가'));
    fireEvent.press(getByText('그래프 비교하기'));

    await waitFor(() => {
      expect(mockedFetchRecentVolatilityData).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(getByText('change-to-30D'));

    await waitFor(() => {
      expect(mockedGetDaysFromPeriod).toHaveBeenLastCalledWith('30D');
      expect(mockedFetchRecentVolatilityData).toHaveBeenCalledTimes(2);
    });
  });
});
