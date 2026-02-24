import type { AuctionPriceRow } from '../types/agriPrice';

export type SortType = 'none' | 'price-desc' | 'price-asc' | 'qty-desc' | 'qty-asc';

export function sortAuctionItems(items: AuctionPriceRow[], sortType: SortType): AuctionPriceRow[] {
  const copied = [...items];

  switch (sortType) {
    case 'price-desc':
      return copied.sort((a, b) => b.bidPrice - a.bidPrice);
    case 'price-asc':
      return copied.sort((a, b) => a.bidPrice - b.bidPrice);
    case 'qty-desc':
      return copied.sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0));
    case 'qty-asc':
      return copied.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
    case 'none':
    default:
      return copied;
  }
}