import { getTopVolatileItems } from '@/src/utils/priceVolatility';
import type { AuctionPriceRow } from '@/src/types/agriPrice';

type DailyRows = {
  date: string;
  rows: AuctionPriceRow[];
};

function makeRow(overrides: Partial<AuctionPriceRow> = {}): AuctionPriceRow {
  return {
    rowNum: 1,
    tradeDate: '20260228',
    marketName: '서울가락',
    productName: '배추',
    bidPrice: 1000,
    quantity: 10,
    ...overrides,
  };
}

describe('getTopVolatileItems', () => {
  it('품목별 날짜 평균가를 기준으로 변동률 상위 N개를 반환한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [
          makeRow({ productName: '배추', speciesName: '월동', bidPrice: 1000 }),
          makeRow({ productName: '배추', speciesName: '월동', bidPrice: 3000 }),
          makeRow({ productName: '무', speciesName: '일반', bidPrice: 2000 }),
        ],
      },
      {
        date: '20260228',
        rows: [
          makeRow({ productName: '배추', speciesName: '월동', bidPrice: 5000 }),
          makeRow({ productName: '배추', speciesName: '월동', bidPrice: 7000 }),
          makeRow({ productName: '무', speciesName: '일반', bidPrice: 1000 }),
        ],
      },
    ];

    const result = getTopVolatileItems(dailyData, 5);

    expect(result).toHaveLength(2);

    expect(result[0]).toMatchObject({
      productKey: '배추__월동',
      productName: '배추',
      speciesName: '월동',
      firstAvgPrice: 2000,
      latestAvgPrice: 6000,
      changeAmount: 4000,
      changeRate: 200,
    });

    expect(result[1]).toMatchObject({
      productKey: '무__일반',
      productName: '무',
      speciesName: '일반',
      firstAvgPrice: 2000,
      latestAvgPrice: 1000,
      changeAmount: -1000,
      changeRate: -50,
    });
  });

  it('bidPrice가 0 이하인 값은 평균 계산에서 제외한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [
          makeRow({ productName: '토마토', bidPrice: 0 }),
          makeRow({ productName: '토마토', bidPrice: 3000 }),
        ],
      },
      {
        date: '20260228',
        rows: [
          makeRow({ productName: '토마토', bidPrice: -100 }),
          makeRow({ productName: '토마토', bidPrice: 6000 }),
        ],
      },
    ];

    const result = getTopVolatileItems(dailyData, 5);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productName: '토마토',
      firstAvgPrice: 3000,
      latestAvgPrice: 6000,
      changeAmount: 3000,
      changeRate: 100,
    });
  });

  it('2일 미만으로 관측된 품목은 제외한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [makeRow({ productName: '배추', bidPrice: 1000 })],
      },
      {
        date: '20260228',
        rows: [makeRow({ productName: '무', bidPrice: 3000 })],
      },
    ];

    const result = getTopVolatileItems(dailyData, 5);

    expect(result).toEqual([]);
  });

  it('speciesName이 없으면 빈 문자열 키로 그룹화한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [makeRow({ productName: '양파', speciesName: undefined, bidPrice: 1000 })],
      },
      {
        date: '20260228',
        rows: [makeRow({ productName: '양파', speciesName: undefined, bidPrice: 2000 })],
      },
    ];

    const result = getTopVolatileItems(dailyData, 5);

    expect(result).toHaveLength(1);
    expect(result[0].productKey).toBe('양파__');
    expect(result[0].speciesName).toBeUndefined();
    expect(result[0].changeRate).toBe(100);
  });

  it('changeRate 절대값 기준 내림차순으로 정렬하고 topN만 반환한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [
          makeRow({ productName: 'A', bidPrice: 1000 }),
          makeRow({ productName: 'B', bidPrice: 1000 }),
          makeRow({ productName: 'C', bidPrice: 1000 }),
        ],
      },
      {
        date: '20260228',
        rows: [
          makeRow({ productName: 'A', bidPrice: 4000 }), // +300%
          makeRow({ productName: 'B', bidPrice: 500 }),  // -50%
          makeRow({ productName: 'C', bidPrice: 2000 }), // +100%
        ],
      },
    ];

    const result = getTopVolatileItems(dailyData, 2);

    expect(result).toHaveLength(2);
    expect(result.map((x) => x.productName)).toEqual(['A', 'C']);
    expect(result.map((x) => x.changeRate)).toEqual([300, 100]);
  });

  it('입력이 비어 있으면 빈 배열을 반환한다', () => {
    expect(getTopVolatileItems([], 5)).toEqual([]);
  });
  it('productName이 없으면 미분류로 그룹화한다', () => {
  const dailyData: DailyRows[] = [
    {
      date: '20260227',
      rows: [makeRow({ productName: '', speciesName: '일반', bidPrice: 1000 })],
    },
    {
      date: '20260228',
      rows: [makeRow({ productName: '', speciesName: '일반', bidPrice: 2000 })],
    },
  ];

  const result = getTopVolatileItems(dailyData, 5);

  expect(result).toHaveLength(1);
  expect(result[0].productName).toBe('미분류');
  expect(result[0].productKey).toBe('미분류__일반');
  expect(result[0].changeRate).toBe(100);
});

it('특정 날짜의 bidPrice가 모두 0 이하이면 그 날짜는 제외되어 계산된다', () => {
  const dailyData: DailyRows[] = [
    {
      date: '20260227',
      rows: [makeRow({ productName: '감자', bidPrice: 1000 })],
    },
    {
      date: '20260228',
      rows: [
        makeRow({ productName: '감자', bidPrice: 0 }),
        makeRow({ productName: '감자', bidPrice: -100 }),
      ],
    },
    {
      date: '20260301',
      rows: [makeRow({ productName: '감자', bidPrice: 3000 })],
    },
  ];

  const result = getTopVolatileItems(dailyData, 5);

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    productName: '감자',
    firstAvgPrice: 1000,
    latestAvgPrice: 3000,
    changeAmount: 2000,
    changeRate: 200,
  });
});

it('유효한 bidPrice가 없는 품목은 결과에 포함되지 않는다', () => {
  const dailyData: DailyRows[] = [
    {
      date: '20260227',
      rows: [
        makeRow({ productName: '고구마', bidPrice: 0 }),
        makeRow({ productName: '고구마', bidPrice: -10 }),
      ],
    },
    {
      date: '20260228',
      rows: [
        makeRow({ productName: '고구마', bidPrice: 0 }),
        makeRow({ productName: '고구마', bidPrice: -20 }),
      ],
    },
  ];

  const result = getTopVolatileItems(dailyData, 5);

  expect(result).toEqual([]);
});
});