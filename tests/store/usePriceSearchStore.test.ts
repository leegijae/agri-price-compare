import { usePriceSearchStore } from '@/src/store/usePriceSearchStore';
import {
  fetchAuctionPrices,
  fetchWholesaleMarkets,
} from '@/src/api/agriPriceApi';
import type { AuctionPriceRow } from '@/src/types/agriPrice';

jest.mock('@/src/api/agriPriceApi', () => ({
  fetchAuctionPrices: jest.fn(),
  fetchWholesaleMarkets: jest.fn(),
}));

const mockedFetchAuctionPrices = fetchAuctionPrices as jest.MockedFunction<
  typeof fetchAuctionPrices
>;
const mockedFetchWholesaleMarkets = fetchWholesaleMarkets as jest.MockedFunction<
  typeof fetchWholesaleMarkets
>;

function makeRow(
  overrides: Partial<AuctionPriceRow> = {}
): AuctionPriceRow {
  return {
    rowNum: 1,
    tradeDate: '20260228',
    marketName: '서울가락',
    productName: '배추',
    bidPrice: 3000,
    quantity: 10,
    ...overrides,
  };
}

describe('usePriceSearchStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-28T09:00:00+09:00'));

    usePriceSearchStore.setState({
      productName: '',
      region: '전체',
      loading: false,
      error: null,
      baseItems: [],
      items: [],
      sortType: 'none',
      effectiveDate: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('region이 비어 있으면 에러를 설정하고 API를 호출하지 않는다', async () => {
    usePriceSearchStore.setState({
      region: '',
      productName: '',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBe('지역 정보를 확인할 수 없습니다.');
    expect(state.loading).toBe(false);
    expect(mockedFetchWholesaleMarkets).not.toHaveBeenCalled();
    expect(mockedFetchAuctionPrices).not.toHaveBeenCalled();
  });

  it('선택한 지역의 시장코드를 찾지 못하면 지역별 에러를 설정한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([]);

    usePriceSearchStore.setState({
      region: '부산',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(mockedFetchWholesaleMarkets).toHaveBeenCalled();
    expect(state.loading).toBe(false);
    expect(state.items).toEqual([]);
    expect(state.baseItems).toEqual([]);
    expect(state.error).toBe(
      '선택한 지역(부산)에서 사용 가능한 시장코드를 찾지 못했습니다.'
    );
    expect(state.effectiveDate).toBeNull();
    expect(mockedFetchAuctionPrices).not.toHaveBeenCalled();
  });

  it('최근 날짜에 데이터가 없으면 과거 날짜로 fallback 후 effectiveDate를 설정한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([
      { codeId: '110001', codeName: '서울가락' },
    ]);

    mockedFetchAuctionPrices.mockImplementation(async ({ date, marketName }) => {
      if (marketName !== '110001') return [];

      if (date === '20260228') return [];
      if (date === '20260227') {
        return [
          makeRow({
            tradeDate: '20260227',
            marketName: '서울가락',
            productName: '배추',
            bidPrice: 3200,
            quantity: 12,
          }),
        ];
      }
      return [];
    });

    usePriceSearchStore.setState({
      region: '서울',
      productName: '',
      sortType: 'none',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.effectiveDate).toBe('20260227');
    expect(state.baseItems).toHaveLength(1);
    expect(state.items).toHaveLength(1);

    expect(mockedFetchAuctionPrices).toHaveBeenCalledWith({
      date: '20260228',
      marketName: '110001',
      startIndex: 1,
      endIndex: 300,
    });
    expect(mockedFetchAuctionPrices).toHaveBeenCalledWith({
      date: '20260227',
      marketName: '110001',
      startIndex: 1,
      endIndex: 300,
    });
  });

  it('품목명 필터 + 집계 + 정렬(sortType)을 적용한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([
      { codeId: '110001', codeName: '서울가락' },
      { codeId: '110008', codeName: '서울강서' },
      { codeId: '220001', codeName: '대구북부' },
    ]);

    mockedFetchAuctionPrices.mockImplementation(async ({ marketName }) => {
      if (marketName === '110001') {
        return [
          makeRow({
            rowNum: 1,
            tradeDate: '20260228',
            marketName: '서울가락',
            productName: '배추',
            speciesName: '월동',
            unitName: '10kg',
            qualityName: '특',
            bidPrice: 3000,
            quantity: 10,
          }),
          makeRow({
            rowNum: 2,
            tradeDate: '20260228',
            marketName: '서울가락',
            productName: '무',
            speciesName: '일반',
            unitName: '20kg',
            qualityName: '상',
            bidPrice: 1000,
            quantity: 20,
          }),
        ];
      }

      if (marketName === '110008') {
        return [
          makeRow({
            rowNum: 3,
            tradeDate: '20260228',
            marketName: '서울강서',
            productName: '배추',
            speciesName: '월동',
            unitName: '10kg',
            qualityName: '특',
            bidPrice: 5000,
            quantity: 30,
          }),
        ];
      }

      if (marketName === '220001') {
        return [
          makeRow({
            rowNum: 4,
            tradeDate: '20260228',
            marketName: '대구북부',
            productName: '토마토',
            speciesName: '완숙',
            unitName: '5kg',
            qualityName: '상',
            bidPrice: 7000,
            quantity: 5,
          }),
        ];
      }

      return [];
    });

    usePriceSearchStore.setState({
      region: '전체',
      productName: '배추',
      sortType: 'price-asc',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.effectiveDate).toBe('20260228');
    expect(state.baseItems).toHaveLength(1);
    expect(state.items).toHaveLength(1);

    const aggregated = state.items[0];

    expect(aggregated.productName).toBe('배추');
    expect(aggregated.bidPrice).toBe(4500);
    expect(aggregated.quantity).toBe(40);
    expect(aggregated.marketName).toContain('서울');
    expect(aggregated.marketName).toContain('외 1곳');
  });

  it('일부 시장 API가 실패해도 성공한 결과만 반영한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([
      { codeId: '110001', codeName: '서울가락' },
      { codeId: '110008', codeName: '서울강서' },
      { codeId: '230001', codeName: '인천남촌' },
      { codeId: '250001', codeName: '대전오정' },
      { codeId: '311201', codeName: '구리' },
    ]);

    mockedFetchAuctionPrices.mockImplementation(async ({ marketName, date }) => {
      if (date !== '20260228') return [];

      if (marketName === '110008') {
        throw new Error('Network Error');
      }

      if (marketName === '110001') {
        return [
          makeRow({
            rowNum: 1,
            tradeDate: '20260228',
            marketName: '서울가락',
            productName: '배추',
            bidPrice: 3000,
            quantity: 10,
          }),
        ];
      }

      if (marketName === '230001') {
        return [
          makeRow({
            rowNum: 2,
            tradeDate: '20260228',
            marketName: '인천남촌',
            productName: '무',
            bidPrice: 1800,
            quantity: 15,
          }),
        ];
      }

      if (marketName === '250001') {
        return [];
      }

      if (marketName === '311201') {
        return [
          makeRow({
            rowNum: 3,
            tradeDate: '20260228',
            marketName: '구리',
            productName: '토마토',
            bidPrice: 6500,
            quantity: 8,
          }),
        ];
      }

      return [];
    });

    usePriceSearchStore.setState({
      region: '전체',
      productName: '',
      sortType: 'none',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.effectiveDate).toBe('20260228');
    expect(state.items.length).toBeGreaterThan(0);

    const productNames = state.items.map((item) => item.productName);
    expect(productNames).toEqual(
      expect.arrayContaining(['배추', '무', '토마토'])
    );
  });

  it('최근 60일 내 모든 조회 결과가 0건이면 안내 메시지를 설정한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([
      { codeId: '110001', codeName: '서울가락' },
    ]);

    mockedFetchAuctionPrices.mockResolvedValue([]);

    usePriceSearchStore.setState({
      region: '서울',
      productName: '',
      sortType: 'none',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.loading).toBe(false);
    expect(state.baseItems).toEqual([]);
    expect(state.items).toEqual([]);
    expect(state.error).toBe(
      '최근 60일 내 조회 결과 0건입니다. (데이터 미집계/해당 기간 거래 없음 가능)'
    );
    expect(state.effectiveDate).toBe('20260228');
  });

  it('setSortType 호출 시 baseItems 기준으로 재정렬한다', () => {
    usePriceSearchStore.setState({
      baseItems: [
        makeRow({ productName: '배추', bidPrice: 3000, quantity: 10 }),
        makeRow({ productName: '무', bidPrice: 1000, quantity: 30 }),
        makeRow({ productName: '토마토', bidPrice: 5000, quantity: 5 }),
      ],
      items: [
        makeRow({ productName: '배추', bidPrice: 3000, quantity: 10 }),
        makeRow({ productName: '무', bidPrice: 1000, quantity: 30 }),
        makeRow({ productName: '토마토', bidPrice: 5000, quantity: 5 }),
      ],
      sortType: 'none',
    });

    usePriceSearchStore.getState().setSortType('price-asc');

    const state = usePriceSearchStore.getState();

    expect(state.sortType).toBe('price-asc');
    expect(state.items.map((x) => x.bidPrice)).toEqual([1000, 3000, 5000]);
    expect(state.items.map((x) => x.productName)).toEqual(['무', '배추', '토마토']);
  });

  it('setProductName, setRegion, clearError가 상태를 갱신한다', () => {
    usePriceSearchStore.setState({
      productName: '',
      region: '전체',
      error: '임시 에러',
    });

    usePriceSearchStore.getState().setProductName('배추');
    usePriceSearchStore.getState().setRegion('서울');
    usePriceSearchStore.getState().clearError();

    const state = usePriceSearchStore.getState();

    expect(state.productName).toBe('배추');
    expect(state.region).toBe('서울');
    expect(state.error).toBeNull();
  });

  it('새 검색을 수행하면 이전 error/items/baseItems/effectiveDate를 새 결과로 갱신한다', async () => {
  mockedFetchWholesaleMarkets.mockResolvedValue([
    { codeId: '110001', codeName: '서울가락' },
  ]);

  mockedFetchAuctionPrices.mockImplementation(async ({ date }) => {
    return [
      {
        rowNum: 1,
        tradeDate: date,
        marketName: '서울가락',
        productName: '배추',
        bidPrice: 3000,
        quantity: 10,
      },
    ];
  });

  usePriceSearchStore.setState({
    region: '서울',
    productName: '',
    error: '이전 에러',
    items: [
      {
        rowNum: 99,
        tradeDate: '20260101',
        marketName: '이전시장',
        productName: '이전품목',
        bidPrice: 1,
        quantity: 1,
      },
    ],
    baseItems: [
      {
        rowNum: 98,
        tradeDate: '20260101',
        marketName: '이전시장',
        productName: '이전품목',
        bidPrice: 1,
        quantity: 1,
      },
    ],
    effectiveDate: '20260101',
  });

  await usePriceSearchStore.getState().search();

  const state = usePriceSearchStore.getState();

  expect(state.loading).toBe(false);
  expect(state.error).toBeNull();
  expect(state.effectiveDate).toBe('20260228');
  expect(state.items).toHaveLength(1);
  expect(state.baseItems).toHaveLength(1);
  expect(state.items[0]).toMatchObject({
    productName: '배추',
    bidPrice: 3000,
    quantity: 10,
  });
  expect(state.items[0].productName).not.toBe('이전품목');
});

  it('quantity가 0 또는 undefined인 항목도 집계에 포함되고 bidPrice 평균 fallback을 사용한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([
      { codeId: '110001', codeName: '서울가락' },
      { codeId: '110008', codeName: '서울강서' },
    ]);

    mockedFetchAuctionPrices.mockImplementation(async ({ marketName, date }) => {
      if (date !== '20260228') return [];

      if (marketName === '110001') {
        return [
          {
            rowNum: 1,
            tradeDate: date,
            marketName: '서울가락',
            productName: '배추',
            speciesName: '월동',
            unitName: '10kg',
            qualityName: '특',
            bidPrice: 3000,
            quantity: 0,
          },
        ];
      }

      if (marketName === '110008') {
        return [
          {
            rowNum: 2,
            tradeDate: date,
            marketName: '서울강서',
            productName: '배추',
            speciesName: '월동',
            unitName: '10kg',
            qualityName: '특',
            bidPrice: 5000,
            quantity: undefined,
          },
        ];
      }

      return [];
    });

    jest.spyOn(Math, 'random').mockReturnValue(0);

    usePriceSearchStore.setState({
      region: '전체',
      productName: '배추',
      sortType: 'none',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      productName: '배추',
      quantity: 0,
      bidPrice: 4000,
    });

    (Math.random as jest.Mock).mockRestore();
  });

  it('검색 결과 저장 시 현재 sortType을 적용한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([
      { codeId: '110001', codeName: '서울가락' },
      { codeId: '110008', codeName: '서울강서' },
    ]);

    mockedFetchAuctionPrices.mockImplementation(async ({ marketName, date }) => {
      if (date !== '20260228') return [];

      if (marketName === '110001') {
        return [
          {
            rowNum: 1,
            tradeDate: date,
            marketName: '서울가락',
            productName: '배추',
            bidPrice: 5000,
            quantity: 10,
          },
        ];
      }

      if (marketName === '110008') {
        return [
          {
            rowNum: 2,
            tradeDate: date,
            marketName: '서울강서',
            productName: '무',
            bidPrice: 1000,
            quantity: 20,
          },
        ];
      }

      return [];
    });

    jest.spyOn(Math, 'random').mockReturnValue(0);

    usePriceSearchStore.setState({
      region: '전체',
      productName: '',
      sortType: 'price-asc',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.items.map((x) => x.bidPrice)).toEqual([1000, 5000]);
    expect(state.sortType).toBe('price-asc');
    expect(state.effectiveDate).toBe('20260228');

    (Math.random as jest.Mock).mockRestore();
  });

  it('공백만 있는 productName은 필터 없이 전체 결과를 사용한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue([
      { codeId: '110001', codeName: '서울가락' },
    ]);

    mockedFetchAuctionPrices.mockResolvedValue([
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
        marketName: '서울가락',
        productName: '무',
        bidPrice: 1000,
        quantity: 20,
      },
    ]);

    jest.spyOn(Math, 'random').mockReturnValue(0);

    usePriceSearchStore.setState({
      region: '서울',
      productName: '   ',
      sortType: 'none',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.items).toHaveLength(2);

    (Math.random as jest.Mock).mockRestore();
  });
});