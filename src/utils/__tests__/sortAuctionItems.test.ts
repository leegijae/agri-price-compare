import { sortAuctionItems } from '../sortAuctionItems';
import type { AuctionPriceRow } from '../../types/agriPrice';

const mockItems: AuctionPriceRow[] = [
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
    quantity: 30,
  },
  {
    rowNum: 3,
    tradeDate: '20151120',
    marketName: '서울강서도매시장',
    productName: '양파',
    bidPrice: 2000,
    quantity: 20,
  },
];

describe('sortAuctionItems', () => {
  it('price-desc로 정렬된다', () => {
    const result = sortAuctionItems(mockItems, 'price-desc');
    expect(result.map((x) => x.bidPrice)).toEqual([3000, 2000, 1000]);
  });

  it('price-asc로 정렬된다', () => {
    const result = sortAuctionItems(mockItems, 'price-asc');
    expect(result.map((x) => x.bidPrice)).toEqual([1000, 2000, 3000]);
  });

  it('qty-desc로 정렬된다', () => {
    const result = sortAuctionItems(mockItems, 'qty-desc');
    expect(result.map((x) => x.quantity)).toEqual([30, 20, 10]);
  });

  it('qty-asc로 정렬된다', () => {
    const result = sortAuctionItems(mockItems, 'qty-asc');
    expect(result.map((x) => x.quantity)).toEqual([10, 20, 30]);
  });

  it('none이면 원본 순서를 유지한 복사본을 반환한다', () => {
    const result = sortAuctionItems(mockItems, 'none');
    expect(result.map((x) => x.rowNum)).toEqual([1, 2, 3]);
    expect(result).not.toBe(mockItems); // 원본 배열 불변성
  });
});