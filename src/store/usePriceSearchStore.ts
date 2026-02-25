import { create } from 'zustand';
import type { AuctionPriceRow } from '../types/agriPrice';
import { fetchAuctionPrices } from '../api/agriPriceApi';

import { sortAuctionItems, type SortType } from '../utils/sortAuctionItems';

type State = {
  date: string;
  marketName: string;
  productName: string;

  loading: boolean;
  error: string | null;
  items: AuctionPriceRow[];

  sortType: SortType;

  setDate: (v: string) => void;
  setMarketName: (v: string) => void;
  setProductName: (v: string) => void;
  setSortType: (v: SortType) => void;

  search: () => Promise<void>;
  clearError: () => void;
};

export const usePriceSearchStore = create<State>((set, get) => ({
  date: '',
  marketName: '',
  productName: '',
  loading: false,
  error: null,
  items: [],
  sortType: 'none',

  setDate: (v) => set({ date: v }),
  setMarketName: (v) => set({ marketName: v }),
  setProductName: (v) => set({ productName: v }),

  setSortType: (v) => {
  const { items } = get();
  set({
    sortType: v,
    items: sortAuctionItems(items, v),
  });
},

  clearError: () => set({ error: null }),

  search: async () => {
    const { date, marketName, productName, sortType } = get();

    if (!date.trim() || !marketName.trim()) {
      set({ error: '조회일자와 시장명은 필수입니다.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const items = await fetchAuctionPrices({
  date,
  marketName,
  productName,
  startIndex: 1,
  endIndex: 50, // 또는 100
});
      set({
        items: sortAuctionItems(items, sortType),
        loading: false,
      });
   } catch (e: any) {
  console.error('[STORE] search failed:', e);
  set({
    loading: false,
    error: '데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.',
  });
}
  },
}));