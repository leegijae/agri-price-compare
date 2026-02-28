import { create } from 'zustand';
import type { AuctionPriceRow } from '../types/agriPrice';
import { fetchAuctionPrices, fetchWholesaleMarkets, type WholesaleMarket } from '../api/agriPriceApi';
import { sortAuctionItems, type SortType } from '../utils/sortAuctionItems';

type State = {
  productName: string;
  region: string;

  loading: boolean;
  error: string | null;

  baseItems: AuctionPriceRow[];
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

function normalizeMarketName(name: string) {
  return (name || '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/도매시장|공영도매시장|농수산물|농산물|수산물|축산물/g, '')
    .trim();
}

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

async function getMarketCodesByRegion(region: string, baseDate: string): Promise<string[]> {
  const LOOKBACK_DAYS = 60;

  for (let i = 0; i <= LOOKBACK_DAYS; i++) {
    const d = minusDays(baseDate, i);

    let markets: WholesaleMarket[] = [];
    try {
      markets = await fetchWholesaleMarkets(d);
    } catch {
      continue;
    }

    if (!markets.length) continue;


    const codes =
      region === '전체'
        ? markets.map((m) => m.codeId)
        : markets
            .filter((m) => marketMatchesRegion(m.codeName, region))
            .map((m) => m.codeId);

    const uniqueCodes = [...new Set(codes)];
    if (uniqueCodes.length > 0) return uniqueCodes;
  }

  return [];
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function makeProductKey(row: AuctionPriceRow) {
  return [
    row.productName,
    row.speciesName ?? '',
    row.unitName ?? '',
    row.qualityName ?? '',
  ].join('|');
}

function aggregateRows(rows: AuctionPriceRow[]): AuctionPriceRow[] {
  const grouped = new Map<
    string,
    {
      base: AuctionPriceRow;
      totalQty: number;
      weightedPriceSum: number;
      priceWeight: number;
      markets: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = makeProductKey(row);
    const qty = row.quantity ?? 0;

    if (!grouped.has(key)) {
      grouped.set(key, {
        base: row,
        totalQty: 0,
        weightedPriceSum: 0,
        priceWeight: 0,
        markets: new Set<string>(),
      });
    }

    const current = grouped.get(key)!;
    current.totalQty += qty;
    current.markets.add(row.marketName);

    if (qty > 0) {
      current.weightedPriceSum += row.bidPrice * qty;
      current.priceWeight += qty;
    } else {
      current.weightedPriceSum += row.bidPrice;
      current.priceWeight += 1;
    }
  }

  return Array.from(grouped.values()).map((entry, index) => {
    const avgPrice =
      entry.priceWeight > 0
        ? Math.round(entry.weightedPriceSum / entry.priceWeight)
        : entry.base.bidPrice;

    const markets = Array.from(entry.markets);

    let marketName = entry.base.marketName;
    if (markets.length > 1) {
      marketName = `${markets[0]} 외 ${markets.length - 1}곳`;
    }

    return {
      ...entry.base,
      rowNum: index + 1,
      bidPrice: avgPrice,
      quantity: entry.totalQty,
      marketName,
    };
  });
}

export const usePriceSearchStore = create<State>((set, get) => ({
  productName: '',
  region: '전체',

  loading: false,
  error: null,
  baseItems: [],
  items: [],
  sortType: 'none',
  effectiveDate: null,

  setProductName: (v) => set({ productName: v }),
  setRegion: (v) => set({ region: v }),

  setSortType: (v) => {
    const { baseItems } = get();
    set({
      sortType: v,
      items: sortAuctionItems(baseItems, v),
    });
  },

  clearError: () => set({ error: null }),

  search: async () => {
    const { region, sortType, productName } = get();

    if (!region) {
      set({ error: '지역 정보를 확인할 수 없습니다.' });
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

    if (marketCodes.length === 0) {
      set({
        error:
          region === '전체'
            ? '전 지역에서 사용 가능한 시장코드를 찾지 못했습니다.'
            : `선택한 지역(${region})에서 사용 가능한 시장코드를 찾지 못했습니다.`,
      });
      return;
    }

    const dateCandidates: string[] = [];
    for (let i = 0; i < 60; i++) dateCandidates.push(minusDays(todayYyyymmdd, i));

    set({
      loading: true,
      error: null,
      effectiveDate: null,
      baseItems: [],
      items: [],
    });

    try {
      let foundDate: string | null = null;
      let foundRows: AuctionPriceRow[] = [];

      for (const d of dateCandidates) {
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

        if (dayRows.length > 0) {
          foundDate = d;
          foundRows = dayRows;
          break;
        }
      }

      if (!foundDate || foundRows.length === 0) {
        set({
          loading: false,
          baseItems: [],
          items: [],
          error: '최근 60일 내 조회 결과 0건입니다. (데이터 미집계/해당 기간 거래 없음 가능)',
          effectiveDate: todayYyyymmdd,
        });
        return;
      }

      const keyword = productName.trim();
      const filteredRows = keyword
        ? foundRows.filter((r) => {
            return (
              r.productName.includes(keyword) ||
              (r.speciesName ?? '').includes(keyword) ||
              (r.categoryName ?? '').includes(keyword)
            );
          })
        : foundRows;
      function shuffleArray<T>(arr: T[]): T[] {
  const copied = [...arr];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}
      const aggregated = aggregateRows(filteredRows);
const limited = shuffleArray(aggregated).slice(0, 50);

      

      set({
        baseItems: limited,
        items: sortAuctionItems(limited, sortType),
        loading: false,
        effectiveDate: foundDate,
      });
    } catch (e: any) {
      console.error('[STORE] search failed:', e);
      set({
        loading: false,
        baseItems: [],
        items: [],
        error: '데이터 조회 중 오류가 발생했습니다. 네트워크/API 상태를 확인해주세요.',
      });
    }
  },
}));