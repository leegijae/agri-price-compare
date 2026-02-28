import { usePriceSearchStore } from '@/src/store/usePriceSearchStore';
import {
  fetchAuctionPrices,
  fetchWholesaleMarkets,
} from '@/src/api/agriPriceApi';
import {
  wholesaleMarketsSeoul,
  wholesaleMarketsEmpty,
} from '@/tests/fixtures/wholesaleMarkets';
import {
  auctionPricesBaechuSuccess,
  auctionPricesEmpty,
} from '@/tests/fixtures/auctionPrices';

jest.mock('@/src/api/agriPriceApi', () => ({
  fetchAuctionPrices: jest.fn(),
  fetchWholesaleMarkets: jest.fn(),
}));

const mockedFetchAuctionPrices =
  fetchAuctionPrices as jest.MockedFunction<typeof fetchAuctionPrices>;
const mockedFetchWholesaleMarkets =
  fetchWholesaleMarkets as jest.MockedFunction<typeof fetchWholesaleMarkets>;

describe('usePriceSearchStore integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-01T12:00:00Z'));

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

  it('시장 코드와 경매 데이터가 있으면 검색 결과를 저장한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue(wholesaleMarketsSeoul);
    mockedFetchAuctionPrices.mockResolvedValue(auctionPricesBaechuSuccess as any);

    usePriceSearchStore.getState().setProductName('배추');
    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(mockedFetchWholesaleMarkets).toHaveBeenCalled();
    expect(mockedFetchAuctionPrices).toHaveBeenCalled();
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.effectiveDate).toBe('20260301');
    expect(state.baseItems.length).toBe(1);
    expect(state.items.length).toBe(1);
    expect(state.items[0].productName).toBe('배추');
    expect(state.items[0].quantity).toBe(40);
  });

  it('선택한 지역에서 시장 코드를 찾지 못하면 에러를 저장한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue(wholesaleMarketsEmpty);

    usePriceSearchStore.getState().setRegion('서울');
    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBe(
      '선택한 지역(서울)에서 사용 가능한 시장코드를 찾지 못했습니다.'
    );
    expect(state.items).toEqual([]);
    expect(state.baseItems).toEqual([]);
  });

  it('전 지역에서도 시장 코드를 찾지 못하면 전체 지역 에러를 저장한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue(wholesaleMarketsEmpty);

    usePriceSearchStore.getState().setRegion('전체');
    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBe(
      '전 지역에서 사용 가능한 시장코드를 찾지 못했습니다.'
    );
    expect(state.items).toEqual([]);
    expect(state.baseItems).toEqual([]);
  });

  it('시장 코드는 찾았지만 최근 60일 내 거래 데이터가 없으면 0건 에러를 저장한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue(wholesaleMarketsSeoul);
    mockedFetchAuctionPrices.mockResolvedValue(auctionPricesEmpty);

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(mockedFetchWholesaleMarkets).toHaveBeenCalled();
    expect(mockedFetchAuctionPrices).toHaveBeenCalled();
    expect(state.error).toBe(
      '최근 60일 내 조회 결과 0건입니다. (데이터 미집계/해당 기간 거래 없음 가능)'
    );
    expect(state.loading).toBe(false);
    expect(state.items).toEqual([]);
    expect(state.baseItems).toEqual([]);
    expect(state.effectiveDate).toBe('20260301');
  });

  it('API 호출 중 예외가 발생해도 최종적으로 0건 처리 메시지를 저장한다', async () => {
    mockedFetchWholesaleMarkets.mockResolvedValue(wholesaleMarketsSeoul);
    mockedFetchAuctionPrices.mockRejectedValue(new Error('network failure'));

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBe(
      '최근 60일 내 조회 결과 0건입니다. (데이터 미집계/해당 기간 거래 없음 가능)'
    );
    expect(state.loading).toBe(false);
    expect(state.items).toEqual([]);
    expect(state.baseItems).toEqual([]);
  });
});