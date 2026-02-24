import { create } from 'zustand';
import type { AuctionPriceRow } from '@/src/types/agriPrice';
import { fetchAuctionPrices } from '@/src/api/agriPriceApi';

type State = {
  date: string;
  marketName: string;
  productName: string;

  loading: boolean;
  error: string | null;
  items: AuctionPriceRow[];

  setDate: (v: string) => void;
  setMarketName: (v: string) => void;
  setProductName: (v: string) => void;

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

  setDate: (v) => set({ date: v }),
  setMarketName: (v) => set({ marketName: v }),
  setProductName: (v) => set({ productName: v }),

  clearError: () => set({ error: null }),

  search: async () => {
    const { date, marketName, productName } = get();

    if (!date.trim() || !marketName.trim()) {
      set({ error: '조회일자와 시장명은 필수입니다.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const items = await fetchAuctionPrices({ date, marketName, productName });
      set({ items, loading: false });
    } catch (e: any) {
      set({
        loading: false,
        error: '데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.',
      });
    }
  },
}));