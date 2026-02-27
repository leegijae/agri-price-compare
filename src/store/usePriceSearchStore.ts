import { create } from 'zustand';
import type { AuctionPriceRow } from '../types/agriPrice';
import { fetchAuctionPrices, fetchWholesaleMarkets, type WholesaleMarket } from '../api/agriPriceApi';
import { sortAuctionItems, type SortType } from '../utils/sortAuctionItems';

type State = {
  productName: string;
  region: string;

  loading: boolean;
  error: string | null;
  items: AuctionPriceRow[];

  sortType: SortType;
  effectiveDate: string | null;

  setProductName: (v: string) => void;
  setRegion: (v: string) => void;
  setSortType: (v: SortType) => void;

  search: () => Promise<void>;
  clearError: () => void;
};

// ---- date helpers (YYYYMMDD) ----
function yyyymmddToDate(s: string) {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  return new Date(Date.UTC(y, m - 1, d));
}
function dateToYyyymmdd(dt: Date) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
function minusDays(yyyymmdd: string, days: number) {
  const dt = yyyymmddToDate(yyyymmdd);
  dt.setUTCDate(dt.getUTCDate() - days);
  return dateToYyyymmdd(dt);
}

let MARKET_CACHE: { date: string; markets: WholesaleMarket[] } | null = null;

function normalizeMarketName(name: string) {
  return (name || '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/도매시장|공영도매시장|농수산물|농산물|수산물|축산물/g, '')
    .trim();
}

/**
 * ✅ 지역별 시장명 키워드 매칭
 * - codeName에 지역명이 생략되는 경우가 흔함(예: "엄궁")
 * - 그래서 region -> 키워드로 넓게 매칭
 */
const REGION_KEYWORDS: Record<string, string[]> = {
  서울: ['서울', '가락', '강서', '노량진'],
  부산: ['부산', '엄궁', '반여', '국제', '국제수산'],
  대구: ['대구', '북부', '칠성'],
  인천: ['인천', '남촌', '삼산', '부평', '계양'],
  광주: ['광주', '각화', '서부'],
  대전: ['대전', '오정', '노은'],
  경기: ['경기', '구리', '수원', '안양', '안산', '성남', '평택', '고양', '부천', '광명', '용인', '화성'],
  강원: ['강원', '춘천', '원주', '강릉'],
  전북: ['전북', '전주', '익산', '정읍', '군산'],
  전남: ['전남', '순천', '목포', '여수', '광양', '나주'],
  경북: ['경북', '안동', '구미', '포항'],
  경남: ['경남', '창원', '팔용', '내서', '진주', '김해', '마산'],
  제주: ['제주', '서귀포'],
};

function marketMatchesRegion(codeName: string, region: string): boolean {
  const n = normalizeMarketName(codeName);
  const keywords = REGION_KEYWORDS[region] ?? [region];
  return keywords.some((k) => k && n.includes(k));
}

/**
 * ✅ (핵심) 특정 날짜의 wholesale-markets 목록에 부산/인천/제주 시장이 “빠지는 날”이 있어
 * “최근 60일”을 거슬러 올라가며 “해당 지역 시장코드 존재” 날짜를 찾습니다. (무음 fallback)
 */
async function getMarketCodesByRegion(region: string, baseDate: string): Promise<string[]> {
  const LOOKBACK_DAYS = 60;

  for (let i = 0; i <= LOOKBACK_DAYS; i++) {
  const d = minusDays(baseDate, i);

  let markets: WholesaleMarket[] = [];
  try {
    markets = await fetchWholesaleMarkets(d);
  } catch {
    continue; // ✅ 어떤 이유든 실패하면 다음 날짜로
  }

  if (!markets.length) continue;

  MARKET_CACHE = { date: d, markets };

  const codes = markets
    .filter((m) => marketMatchesRegion(m.codeName, region))
    .map((m) => m.codeId);

  if (codes.length > 0) return codes;
}

  return [];
}

export const usePriceSearchStore = create<State>((set, get) => ({
  productName: '',
  region: '전체',

  loading: false,
  error: null,
  items: [],
  sortType: 'none',

  effectiveDate: null,

  setProductName: (v) => set({ productName: v }),
  setRegion: (v) => set({ region: v }),

  setSortType: (v) => {
    const { items } = get();
    set({
      sortType: v,
      items: sortAuctionItems(items, v),
    });
  },

  clearError: () => set({ error: null }),

  search: async () => {
    const { region, sortType } = get();

    if (!region || region === '전체') {
      set({ error: '지역을 선택해주세요.' });
      return;
    }

    const todayYyyymmdd = (() => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    })();

    const marketCodes = await getMarketCodesByRegion(region, todayYyyymmdd);

    // ✅ “시장 데이터 부족 알림/대체지역 알림” 삭제 (요구사항)
    if (marketCodes.length === 0) {
      set({ error: `선택한 지역(${region})에서 사용 가능한 시장코드를 찾지 못했습니다.` });
      return;
    }

    const chunk = <T,>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const dateCandidates: string[] = [];
    for (let i = 0; i < 60; i++) dateCandidates.push(minusDays(todayYyyymmdd, i));

    set({ loading: true, error: null, effectiveDate: null });

    try {
      const makeProductKey = (row: AuctionPriceRow) =>
        [row.productName, row.speciesName ?? '', row.unitName ?? '', row.qualityName ?? ''].join('|');

      // ✅ 최근 거래 “최신 50종” 수집
      const latestByProduct = new Map<string, AuctionPriceRow>();

      for (const d of dateCandidates) {
        if (latestByProduct.size >= 50) break;

        const dayRows: AuctionPriceRow[] = [];
        for (const group of chunk(marketCodes, 4)) {
          const settled = await Promise.allSettled(
            group.map((code) =>
              fetchAuctionPrices({
                date: d,
                marketName: code,
                startIndex: 1,
                endIndex: 300,
              })
            )
          );

          for (const r of settled) {
            if (r.status === 'fulfilled') dayRows.push(...r.value);
          }
        }

        for (const row of dayRows) {
          const k = makeProductKey(row);
          if (!latestByProduct.has(k)) latestByProduct.set(k, row);
          if (latestByProduct.size >= 50) break;
        }
      }

      const merged = Array.from(latestByProduct.values());

      if (merged.length === 0) {
        set({
          loading: false,
          items: [],
          error: '최근 60일 내 조회 결과 0건입니다. (데이터 미집계/해당 기간 거래 없음 가능)',
          effectiveDate: todayYyyymmdd,
        });
        return;
      }

      const maxTradeDate = merged.map((r) => r.tradeDate).filter(Boolean).sort().at(-1);

      set({
        items: sortAuctionItems(merged, sortType),
        loading: false,
        effectiveDate: maxTradeDate ?? todayYyyymmdd,
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