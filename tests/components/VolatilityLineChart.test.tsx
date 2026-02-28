import React from 'react';
import { render } from '@testing-library/react-native';
import VolatilityLineChart from '@/src/components/VolatilityLineChart';

describe('VolatilityLineChart', () => {
  it('데이터가 없으면 빈 상태 문구를 표시한다', () => {
    const { getByText } = render(<VolatilityLineChart data={[]} />);

    expect(getByText('최근 가격 변동 TOP 5')).toBeTruthy();
    expect(getByText('표시할 변동 데이터가 없습니다.')).toBeTruthy();
  });

  it('데이터가 있으면 제목과 범례를 표시한다', () => {
    const data = [
      {
        productKey: '배추__월동',
        productName: '배추',
        speciesName: '월동',
        changeRate: 120,
        firstAvgPrice: 1000,
        latestAvgPrice: 2200,
        changeAmount: 1200,
      },
      {
        productKey: '무__일반',
        productName: '무',
        speciesName: '일반',
        changeRate: -30,
        firstAvgPrice: 2000,
        latestAvgPrice: 1400,
        changeAmount: -600,
      },
    ];

    const { getByText } = render(<VolatilityLineChart data={data as any} />);

    expect(getByText('최근 가격 변동 TOP 2 (변동률 %)')).toBeTruthy();
    expect(getByText('배추 (월동)')).toBeTruthy();
    expect(getByText('+120%')).toBeTruthy();
    expect(getByText('무 (일반)')).toBeTruthy();
    expect(getByText('-30%')).toBeTruthy();
  });

  it('speciesName이 없으면 품목명만 표시한다', () => {
    const data = [
      {
        productKey: '양파__',
        productName: '양파',
        changeRate: 10,
        firstAvgPrice: 1000,
        latestAvgPrice: 1100,
        changeAmount: 100,
      },
    ];

    const { getByText, queryByText } = render(<VolatilityLineChart data={data as any} />);

    expect(getByText('양파')).toBeTruthy();
    expect(getByText('+10%')).toBeTruthy();
    expect(queryByText('양파 ()')).toBeNull();
  });

  it('긴 품목명도 범례에는 전체 이름으로 표시한다', () => {
    const data = [
      {
        productKey: '아주긴품목이름__',
        productName: '아주긴품목이름',
        changeRate: 25,
        firstAvgPrice: 1000,
        latestAvgPrice: 1250,
        changeAmount: 250,
      },
    ];

    const { getByText } = render(<VolatilityLineChart data={data as any} />);
    expect(getByText('아주긴품목이름')).toBeTruthy();
  });
});