import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import VolatilityPeriodLineChart from '@/src/components/VolatilityPeriodLineChart';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const {
    View,
    Text,
    Pressable,
  } = require('react-native');

  const Svg = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const Path = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const Line = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const Rect = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const Circle = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const G = ({ children, onPress, ...props }: any) => (
    <Pressable onPress={onPress} {...props}>
      {children}
    </Pressable>
  );
  const SvgText = ({ children, ...props }: any) => <Text {...props}>{children}</Text>;

  return {
    __esModule: true,
    default: Svg,
    Path,
    Line,
    Rect,
    Circle,
    G,
    Text: SvgText,
  };
});

describe('VolatilityPeriodLineChart', () => {
  const sampleSeries = [
    {
      productKey: 'kw:0:토마토',
      productName: '토마토',
      latestChangeRate: 30,
      points: [
        { date: '2026-02-26', price: 1000, changeRate: 0 },
        { date: '2026-02-27', price: 1100, changeRate: 10 },
        { date: '2026-02-28', price: 1300, changeRate: 30 },
      ],
    },
    {
      productKey: 'kw:1:배추',
      productName: '배추',
      latestChangeRate: -20,
      points: [
        { date: '2026-02-26', price: 2000, changeRate: 0 },
        { date: '2026-02-27', price: 1800, changeRate: -10 },
        { date: '2026-02-28', price: 1600, changeRate: -20 },
      ],
    },
  ];

  it('제목과 기간 버튼을 렌더링한다', () => {
    const { getByText } = render(
      <VolatilityPeriodLineChart
        period="7D"
        onChangePeriod={jest.fn()}
        series={[]}
      />
    );

    expect(getByText('기간별 가격 변동률 비교')).toBeTruthy();
    expect(getByText('7일')).toBeTruthy();
    expect(getByText('30일')).toBeTruthy();
  });

  it('series가 없으면 빈 상태 문구를 표시한다', () => {
    const { getByText } = render(
      <VolatilityPeriodLineChart
        period="7D"
        onChangePeriod={jest.fn()}
        series={[]}
      />
    );

    expect(getByText('표시할 데이터가 없습니다.')).toBeTruthy();
  });

  it('series가 있으면 범례와 안내 문구를 표시한다', () => {
    const { getByText } = render(
      <VolatilityPeriodLineChart
        period="7D"
        onChangePeriod={jest.fn()}
        series={sampleSeries as any}
      />
    );

    expect(getByText('토마토')).toBeTruthy();
    expect(getByText('배추')).toBeTruthy();
    expect(getByText('점(●)을 눌러 해당 날짜의 변동률을 확인하세요.')).toBeTruthy();
  });

  it('기간 버튼 클릭 시 onChangePeriod를 호출한다', () => {
    const onChangePeriod = jest.fn();

    const { getByText } = render(
      <VolatilityPeriodLineChart
        period="7D"
        onChangePeriod={onChangePeriod}
        series={sampleSeries as any}
      />
    );

    fireEvent.press(getByText('30일'));
    expect(onChangePeriod).toHaveBeenCalledWith('30D');
  });

  it('포인트 클릭 시 툴팁이 열리고 다시 클릭하면 닫힌다', () => {
    const { UNSAFE_root, getByText, queryByText } = render(
      <VolatilityPeriodLineChart
        period="7D"
        onChangePeriod={jest.fn()}
        series={sampleSeries as any}
      />
    );

    const pressableLikeNodes = UNSAFE_root.findAll(
      (node: any) => typeof node.props?.onPress === 'function'
    );

    fireEvent.press(pressableLikeNodes[2]);

    expect(getByText(/변동률:/)).toBeTruthy();
    expect(getByText(/평균가:/)).toBeTruthy();

    fireEvent.press(pressableLikeNodes[2]);

    expect(queryByText(/변동률:/)).toBeNull();
    expect(queryByText(/평균가:/)).toBeNull();
  });

  it('음수 변동률 포인트 클릭 시 마이너스 값과 말줄임 상품명을 표시한다', () => {
  const longNameSeries = [
    {
      productKey: 'kw:0:very-long-name',
      productName: '아주아주긴상품명이름테스트용배추',
      latestChangeRate: -20,
      points: [
        { date: '2026-02-26', price: 2000, changeRate: 0 },
        { date: '2026-02-27', price: 1800, changeRate: -10 },
        { date: '2026-02-28', price: 1600, changeRate: -20 },
      ],
    },
  ];

  const { UNSAFE_root, getByText, getAllByText } = render(
    <VolatilityPeriodLineChart
      period="7D"
      onChangePeriod={jest.fn()}
      series={longNameSeries as any}
    />
  );

  const pressableLikeNodes = UNSAFE_root.findAll(
    (node: any) => typeof node.props?.onPress === 'function'
  );

  fireEvent.press(pressableLikeNodes[4]);

  expect(getByText(/변동률:/)).toBeTruthy();
  expect(getByText(/-20%|-10%/)).toBeTruthy();
  expect(getAllByText(/아주아주긴상품명이름테스/).length).toBeGreaterThan(0);
});

  it('포인트가 1개뿐이어도 차트를 렌더링하고 툴팁을 표시한다', () => {
    const singlePointSeries = [
      {
        productKey: 'kw:0:양파',
        productName: '양파',
        latestChangeRate: 0,
        points: [
          { date: '2026-02-28', price: 1500, changeRate: 0 },
        ],
      },
    ];

    const { UNSAFE_root, getByText } = render(
      <VolatilityPeriodLineChart
        period="7D"
        onChangePeriod={jest.fn()}
        series={singlePointSeries as any}
      />
    );

    expect(getByText('양파')).toBeTruthy();

    const pressableLikeNodes = UNSAFE_root.findAll(
      (node: any) => typeof node.props?.onPress === 'function'
    );

    fireEvent.press(pressableLikeNodes[2]);

    expect(getByText(/변동률:/)).toBeTruthy();
    expect(getByText(/평균가:/)).toBeTruthy();
  });

  it('날짜가 많으면 X축 라벨을 일부만 표시한다', () => {
    const manyPoints = Array.from({ length: 16 }, (_, i) => ({
      date: `2026-02-${String(i + 1).padStart(2, '0')}`,
      price: 1000 + i * 100,
      changeRate: i * 5,
    }));

    const longSeries = [
      {
        productKey: 'kw:0:토마토',
        productName: '토마토',
        latestChangeRate: 75,
        points: manyPoints,
      },
    ];

    const { queryByText } = render(
      <VolatilityPeriodLineChart
        period="30D"
        onChangePeriod={jest.fn()}
        series={longSeries as any}
      />
    );

    expect(queryByText('02-16')).toBeTruthy();
  });
});