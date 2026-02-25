import { usePriceSearchStore } from '../usePriceSearchStore';
import { fetchAuctionPrices } from '@/src/api/agriPriceApi';
import type { AuctionPriceRow } from '@/src/types/agriPrice';

// API 모듈 mock
jest.mock('@/src/api/agriPriceApi', () => ({
  fetchAuctionPrices: jest.fn(),
}));

const mockedFetchAuctionPrices = fetchAuctionPrices as jest.MockedFunction<
  typeof fetchAuctionPrices
>;

const mockRows: AuctionPriceRow[] = [
  {
    rowNum: 1,
    tradeDate: '20151120',
    marketName: '서울강서도매시장',
    productName: '배추',
    bidPrice: 3000,
    quantity: 10,
  },
  {
    rowNum: 2,
    tradeDate: '20151120',
    marketName: '서울강서도매시장',
    productName: '무',
    bidPrice: 1000,
    quantity: 20,
  },
];

describe('usePriceSearchStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 상태 초기화
    usePriceSearchStore.setState({
      date: '',
      marketName: '',
      productName: '',
      loading: false,
      error: null,
      items: [],
      sortType: 'none',
    });

    jest.clearAllMocks();
  });

  it('조회일자/시장명이 없으면 에러를 설정하고 API를 호출하지 않는다', async () => {
    // date='', marketName='' 상태 그대로
    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBe('조회일자와 시장명은 필수입니다.');
    expect(state.loading).toBe(false);
    expect(mockedFetchAuctionPrices).not.toHaveBeenCalled();
  });

  it('조회일자만 있고 시장명이 없으면 에러를 설정한다', async () => {
    usePriceSearchStore.getState().setDate('20151120');

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBe('조회일자와 시장명은 필수입니다.');
    expect(mockedFetchAuctionPrices).not.toHaveBeenCalled();
  });

  it('시장명만 있고 조회일자가 없으면 에러를 설정한다', async () => {
    usePriceSearchStore.getState().setMarketName('서울강서도매시장');

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBe('조회일자와 시장명은 필수입니다.');
    expect(mockedFetchAuctionPrices).not.toHaveBeenCalled();
  });

  it('조회 성공 시 items를 저장하고 loading을 false로 종료한다', async () => {
    mockedFetchAuctionPrices.mockResolvedValue(mockRows);

    usePriceSearchStore.setState({
      date: '20151120',
      marketName: '서울강서도매시장',
      productName: '',
      sortType: 'none',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(mockedFetchAuctionPrices).toHaveBeenCalledWith({
      date: '20151120',
      marketName: '서울강서도매시장',
      productName: '',
      startIndex: 1,
  endIndex: 50,
    });

    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.items).toHaveLength(2);
    expect(state.items[0].productName).toBe('배추');
  });

  it('조회 성공 시 sortType이 price-asc이면 정렬된 결과를 저장한다', async () => {
    mockedFetchAuctionPrices.mockResolvedValue(mockRows);

    usePriceSearchStore.setState({
      date: '20151120',
      marketName: '서울강서도매시장',
      productName: '',
      sortType: 'price-asc',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.items.map((x) => x.bidPrice)).toEqual([1000, 3000]);
  });

  it('조회 실패 시 에러 메시지를 설정하고 loading을 false로 종료한다', async () => {
    mockedFetchAuctionPrices.mockRejectedValue(new Error('Network Error'));

    usePriceSearchStore.setState({
      date: '20151120',
      marketName: '서울강서도매시장',
      productName: '배추',
    });

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.loading).toBe(false);
    expect(state.error).toBe(
      '데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.'
    );
  });

  it('기존 에러가 있어도 재조회 시작 시 error를 초기화한다', async () => {
    // 1차: 실패시켜 에러 만들기
    mockedFetchAuctionPrices.mockRejectedValueOnce(new Error('fail'));

    usePriceSearchStore.setState({
      date: '20151120',
      marketName: '서울강서도매시장',
    });

    await usePriceSearchStore.getState().search();
    expect(usePriceSearchStore.getState().error).toBeTruthy();

    // 2차: 성공 응답
    mockedFetchAuctionPrices.mockResolvedValueOnce(mockRows);

    await usePriceSearchStore.getState().search();

    const state = usePriceSearchStore.getState();

    expect(state.error).toBeNull();
    expect(state.items).toHaveLength(2);
    expect(state.loading).toBe(false);
  });
});