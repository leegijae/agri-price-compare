import { create } from 'zustand';
import type { AuctionPriceRow } from '../types/agriPrice';
import {
  fetchAuctionPrices,
  fetchWholesaleMarkets,
  type WholesaleMarket,
} from '../api/agriPriceApi';
import { sortAuctionItems, type SortType } from '../utils/sortAuctionItems';

export type CategoryTab = '전체' | '농산물' | '축산물' | '수산물';

type State = {
  date: string;
  productName: string;

  region: string;
  categoryTab: CategoryTab;

  loading: boolean;
  error: string | null;
  items: AuctionPriceRow[];

  sortType: SortType;

  // 실제로 데이터가 나온 날짜/안내 문구
  effectiveDate: string | null;
  fallbackMessage: string | null;

  setDate: (v: string) => void;
  setProductName: (v: string) => void;

  setRegion: (v: string) => void;
  setCategoryTab: (v: CategoryTab) => void;

  setSortType: (v: SortType) => void;

  search: () => Promise<void>;
  clearError: () => void;
};

// ✅ 시장 목록 캐시 (날짜별)
let MARKET_CACHE: { date: string; markets: WholesaleMarket[] } | null = null;

async function ensureMarketCache(date: string): Promise<WholesaleMarket[]> {
  if (MARKET_CACHE && MARKET_CACHE.date === date) return MARKET_CACHE.markets;
  const markets = await fetchWholesaleMarkets(date);
  MARKET_CACHE = { date, markets };
  return markets;
}

// ✅ 시장명 키워드 → 지역 매핑 (서버에서 내려오는 codeName에 포함되는 키워드 기준)
const MARKET_NAME_TO_REGION: Record<string, string> = {
  서울가락: '서울',
  서울강서: '서울',

  부산엄궁: '부산',
  부산반여: '부산',
  부산국제: '부산',
  국제수산: '부산',

  대구북부: '대구',

  인천남촌: '인천',
  인천삼산: '인천',
  남촌: '인천',
  삼산: '인천',

  광주각화: '광주',
  광주서부: '광주',

  대전오정: '대전',
  대전노은: '대전',

  울산: '울산',

  수원: '경기',
  안양: '경기',
  안산: '경기',
  구리: '경기',

  춘천: '강원',
  원주: '강원',
  강릉: '강원',

  청주: '충북',
  충주: '충북',

  천안: '충남',

  전주: '전북',
  익산: '전북',
  정읍: '전북',

  순천: '전남',
  목포: '전남',
  여수: '전남',
  광양: '전남',

  안동: '경북',
  구미: '경북',
  포항: '경북',

  창원팔용: '경남',
  창원내서: '경남',
  진주: '경남',

  제주: '제주',
};

function normalizeMarketName(name: string) {
  return (name || '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/도매시장|공영도매시장|농수산물|농산물|수산물|축산물/g, '')
    .trim();
}

function pickRegionByMarketName(codeName: string): string | null {
  const n = normalizeMarketName(codeName);

  const key = Object.keys(MARKET_NAME_TO_REGION).find((k) => n.includes(k));
  if (key) return MARKET_NAME_TO_REGION[key];

  // fallback: 지역명이 직접 포함된 경우
  const REGIONS = [
    '서울','부산','대구','인천','광주','대전','울산','세종',
    '경기','강원','충북','충남','전북','전남','경북','경남','제주',
  ];
  const direct = REGIONS.find((r) => n.includes(r));
  return direct ?? null;
}

async function getMarketCodesByRegion(region: string, date: string): Promise<string[]> {
  const markets = await ensureMarketCache(date);

  if (region === '전체') return markets.map((m) => m.codeId);

  return markets
    .filter((m) => pickRegionByMarketName(m.codeName) === region)
    .map((m) => m.codeId);
}

/**
 * ✅ 해법 B: “지역 코드가 없을 때 인접 권역으로 자동 대체”
 * - 세종: 대전/충남/충북 순으로 대체
 * - 울산: 부산/경남 순으로 대체
 * - 충청권: 대전 우선 대체(데이터셋에서 대전이 가장 잘 잡히는 편)
 * - 제주는 대체하지 않고 그대로 실패(원하면 대체 규칙 추가 가능)
 */
const REGION_FALLBACK: Record<string, string[]> = {
  세종: ['대전', '충남', '충북'],
  울산: ['부산', '경남'],
  충북: ['대전', '충남'],
  충남: ['대전', '세종'],
  제주: [],
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

export const usePriceSearchStore = create<State>((set, get) => ({
  date: '',
  productName: '',

  region: '전체',
  categoryTab: '전체',

  loading: false,
  error: null,
  items: [],
  sortType: 'none',

  effectiveDate: null,
  fallbackMessage: null,

  setDate: (v) => set({ date: v }),
  setProductName: (v) => set({ productName: v }),

  setRegion: (v) => set({ region: v }),
  setCategoryTab: (v) => set({ categoryTab: v }),

  setSortType: (v) => {
    const { items } = get();
    set({
      sortType: v,
      items: sortAuctionItems(items, v),
    });
  },

  clearError: () => set({ error: null, fallbackMessage: null }),

  search: async () => {
    const { date, region, productName, sortType } = get();

    if (!date.trim()) {
      set({ error: '조회일자는 필수입니다.' });
      return;
    }
    if (!region) {
      set({ error: '지역을 선택해주세요.' });
      return;
    }

    // ✅ 1) 먼저 선택 지역 코드 조회
    let marketCodes = await getMarketCodesByRegion(region, date);
    let usedRegionForCodes: string | null = null;

    // ✅ 2) 코드가 없으면 인접 권역으로 대체(해법 B)
    if (region !== '전체' && marketCodes.length === 0) {
      const fallbacks = REGION_FALLBACK[region] ?? [];
      for (const r of fallbacks) {
        const codes = await getMarketCodesByRegion(r, date);
        if (codes.length > 0) {
          marketCodes = codes;
          usedRegionForCodes = r;
          break;
        }
      }

      if (usedRegionForCodes) {
        set({
          // error는 지우고, 안내만 띄움
          error: null,
          fallbackMessage: `선택한 지역(${region})에 시장 데이터가 부족하여 인접 지역(${usedRegionForCodes}) 기준으로 조회합니다.`,
        });
      }
    }

    // ✅ 3) 여전히 코드가 없으면 실패
    if (marketCodes.length === 0) {
      set({
        error:
          region === '전체'
            ? '시장코드 목록을 불러오지 못했거나 비어 있습니다.'
            : `선택한 지역(${region})에서 사용 가능한 시장코드를 찾지 못했습니다.`,
      });
      return;
    }

    // ✅ 4) 4개씩 끊어서 순차 호출(웹에서 안정)
    const chunk = <T,>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    // ✅ “가장 근접한 날짜” 후보
    const dateCandidates = [
      date,
      minusDays(date, 1),
      minusDays(date, 2),
      minusDays(date, 3),
      minusDays(date, 7),
      minusDays(date, 14),
    ];

    // 여기서 fallbackMessage를 초기화하면 “지역 대체 안내”가 사라지므로
    // 이미 set한 fallbackMessage가 있다면 유지합니다.
    const prevFallback = get().fallbackMessage;
    set({ loading: true, error: null, effectiveDate: null, fallbackMessage: prevFallback });

    try {
      let finalRows: AuctionPriceRow[] = [];
      let usedDate: string | null = null;

      // 후보 날짜를 순서대로 시도하다가, 처음으로 rows > 0 나오면 채택
      for (const d of dateCandidates) {
        const okRows: AuctionPriceRow[] = [];

        for (const group of chunk(marketCodes, 4)) {
          const settled = await Promise.allSettled(
            group.map((code) =>
              fetchAuctionPrices({
                date: d,
                marketName: code, // 숫자 코드 → WHSALCD
                productName: productName?.trim() ? productName : undefined,
                startIndex: 1,
                endIndex: 50,
              })
            )
          );

          for (const r of settled) {
            if (r.status === 'fulfilled') okRows.push(...r.value);
          }
        }

        if (okRows.length > 0) {
          finalRows = okRows;
          usedDate = d;
          break;
        }
      }

      if (finalRows.length === 0 || !usedDate) {
        set({
          loading: false,
          items: [],
          error: '조회 결과 0건입니다. (데이터 미집계/해당 기간 거래 없음 가능)',
          effectiveDate: date,
          // 기존 fallbackMessage(지역 대체 안내)는 유지
          fallbackMessage: get().fallbackMessage,
        });
        return;
      }

      // ✅ 중복 제거
      const uniqMap = new Map<string, AuctionPriceRow>();
      for (const row of finalRows) {
        const key = [
          row.tradeDate,
          row.marketCode ?? '',
          row.marketName,
          row.productName,
          row.speciesName ?? '',
          row.unitName ?? '',
          row.qualityName ?? '',
          row.bidPrice,
          row.quantity ?? '',
        ].join('|');
        if (!uniqMap.has(key)) uniqMap.set(key, row);
      }

      const merged = Array.from(uniqMap.values());

      // ✅ 날짜가 바뀐 경우 안내 (기존 지역 대체 안내가 있으면 함께 노출)
      const dateFallback =
        usedDate !== date
          ? `선택한 날짜(${date})에 데이터가 없어 가장 근접한 날짜(${usedDate}) 기준으로 표시합니다.`
          : null;

      const combinedFallbackMessage = [get().fallbackMessage, dateFallback]
        .filter(Boolean)
        .join('\n');

      set({
        items: sortAuctionItems(merged, sortType),
        loading: false,
        effectiveDate: usedDate,
        fallbackMessage: combinedFallbackMessage || null,
      });
    } catch (e: any) {
      console.error('[STORE] search failed:', e);
      set({
        loading: false,
        error: '데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.',
        fallbackMessage: null,
      });
    }
  },
}));