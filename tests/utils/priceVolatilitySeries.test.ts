import { buildSeriesByKeywords } from '@/src/utils/priceVolatilitySeries';
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

describe('buildSeriesByKeywords', () => {
  it('키워드 기준 시계열을 만들고 기준일 대비 changeRate를 계산한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [
          makeRow({ productName: '배추', bidPrice: 1000 }),
          makeRow({ productName: '배추', bidPrice: 3000 }),
        ],
      },
      {
        date: '20260228',
        rows: [
          makeRow({ productName: '배추', bidPrice: 5000 }),
          makeRow({ productName: '배추', bidPrice: 7000 }),
        ],
      },
    ];

    const result = buildSeriesByKeywords(dailyData, ['배추']);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      productKey: 'kw:0:배추',
      productName: '배추',
      latestChangeRate: 200,
    });

    expect(result[0].points).toEqual([
      { date: '20260227', price: 2000, changeRate: 0 },
      { date: '20260228', price: 6000, changeRate: 200 },
    ]);
  });

  it('productName/speciesName/categoryName 중 하나라도 키워드를 포함하면 매칭한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [
          makeRow({ productName: '일반채소', speciesName: '방울토마토', bidPrice: 1000 }),
        ],
      },
      {
        date: '20260228',
        rows: [
          makeRow({ productName: '일반채소', categoryName: '토마토류', bidPrice: 3000 }),
        ],
      },
    ];

    const result = buildSeriesByKeywords(dailyData, ['토마토']);

    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe('토마토');
    expect(result[0].points).toEqual([
      { date: '20260227', price: 1000, changeRate: 0 },
      { date: '20260228', price: 3000, changeRate: 200 },
    ]);
  });

  it('중복 키워드는 표시명을 (2), (3) 형태로 구분한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [makeRow({ productName: '토마토', bidPrice: 1000 })],
      },
      {
        date: '20260228',
        rows: [makeRow({ productName: '토마토', bidPrice: 2000 })],
      },
    ];

    const result = buildSeriesByKeywords(dailyData, ['토마토', '토마토', '토마토']);

    expect(result).toHaveLength(3);
    expect(result.map((x) => x.productName)).toEqual([
      '토마토',
      '토마토 (2)',
      '토마토 (3)',
    ]);
  });

  it('공백 키워드는 제거하고 최대 5개까지만 처리한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [
          makeRow({ productName: 'A', bidPrice: 1000 }),
          makeRow({ productName: 'B', bidPrice: 1000 }),
          makeRow({ productName: 'C', bidPrice: 1000 }),
          makeRow({ productName: 'D', bidPrice: 1000 }),
          makeRow({ productName: 'E', bidPrice: 1000 }),
          makeRow({ productName: 'F', bidPrice: 1000 }),
        ],
      },
      {
        date: '20260228',
        rows: [
          makeRow({ productName: 'A', bidPrice: 2000 }),
          makeRow({ productName: 'B', bidPrice: 2000 }),
          makeRow({ productName: 'C', bidPrice: 2000 }),
          makeRow({ productName: 'D', bidPrice: 2000 }),
          makeRow({ productName: 'E', bidPrice: 2000 }),
          makeRow({ productName: 'F', bidPrice: 2000 }),
        ],
      },
    ];

    const result = buildSeriesByKeywords(dailyData, [
      '  ',
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
    ]);

    expect(result).toHaveLength(5);
    expect(result.map((x) => x.productName)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('유효한 평균가가 2일 미만이면 해당 시리즈를 제외한다', () => {
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

    const result = buildSeriesByKeywords(dailyData, ['배추', '무']);

    expect(result).toEqual([]);
  });

  it('bidPrice가 0 이하이거나 숫자가 아니면 평균 계산에서 제외한다', () => {
    const dailyData: DailyRows[] = [
      {
        date: '20260227',
        rows: [
          makeRow({ productName: '양파', bidPrice: 0 }),
          makeRow({ productName: '양파', bidPrice: 1000 }),
        ],
      },
      {
        date: '20260228',
        rows: [
          makeRow({ productName: '양파', bidPrice: -1 }),
          makeRow({ productName: '양파', bidPrice: 3000 }),
        ],
      },
    ];

    const result = buildSeriesByKeywords(dailyData, ['양파']);

    expect(result).toHaveLength(1);
    expect(result[0].points).toEqual([
      { date: '20260227', price: 1000, changeRate: 0 },
      { date: '20260228', price: 3000, changeRate: 200 },
    ]);
  });

  it('입력이 비어 있거나 키워드가 없으면 빈 배열을 반환한다', () => {
    expect(buildSeriesByKeywords([], ['배추'])).toEqual([]);
    expect(
      buildSeriesByKeywords(
        [
          {
            date: '20260228',
            rows: [makeRow({ productName: '배추', bidPrice: 1000 })],
          },
        ],
        []
      )
    ).toEqual([]);
  });
});