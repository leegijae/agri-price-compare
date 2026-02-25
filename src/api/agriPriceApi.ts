import axios from 'axios';
import dayjs from 'dayjs';
import type { AuctionPriceRow, SearchParams } from '../types/agriPrice';


const BASE_URL = 'http://localhost:4000/api';

function toNumber(value: unknown): number {
  if (value == null) return 0;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : undefined;
}

function toStr(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// data.go.kr katRealTime2 응답 item -> 앱 타입 매핑
function mapRow(raw: any): AuctionPriceRow {
  const unitQty = toOptionalNumber(raw?.unit_qty);
  const unitNm = toStr(raw?.unit_nm);
  const pkgNm = toStr(raw?.pkg_nm);

  return {
    // 구형 ROW_NUM 없음 -> 경매순번으로 대체(숫자 아님 가능성 고려)
    rowNum: toNumber(raw?.auctn_seq),

    // 날짜/시간
    tradeDate: toStr(raw?.trd_clcln_ymd),           // 예: 2026-02-20
    bidTime: toStr(raw?.scsbd_dt) || undefined,     // 예: 2026-02-20 09:15:14

    // 시장
    marketCode: toStr(raw?.whsl_mrkt_cd) || undefined,
    marketName: toStr(raw?.whsl_mrkt_nm),

    // 법인
    corpCode: toStr(raw?.corp_cd) || undefined,
    corpName: toStr(raw?.corp_nm) || undefined,

    // 품목 계층
    categoryCode: toStr(raw?.gds_lclsf_cd) || undefined,
    categoryName: toStr(raw?.gds_lclsf_nm) || undefined,

    productCode: toStr(raw?.gds_mclsf_cd) || undefined,
    productName: toStr(raw?.corp_gds_item_nm) || toStr(raw?.gds_mclsf_nm),

    speciesCode: toStr(raw?.gds_sclsf_cd) || undefined,
    speciesName:
      toStr(raw?.corp_gds_vrty_nm) ||
      toStr(raw?.gds_sclsf_nm) ||
      undefined,

    // 규격/품질
    unitName:
      [unitQty ? String(unitQty) : '', unitNm, pkgNm].filter(Boolean).join(' ') ||
      undefined,
    qualityName: undefined,

    // 가격/수량
    bidPrice: toNumber(raw?.scsbd_prc),
    quantity: toOptionalNumber(raw?.qty),

    // 산지
    originAreaName: toStr(raw?.plor_nm) || undefined,
  };
}

export async function fetchAuctionPrices(params: SearchParams): Promise<AuctionPriceRow[]> {
  const {
    date,
    marketName, // 시장명 또는 시장코드
    productName,
    startIndex = 1,
    endIndex = 50,
  } = params;

  const response = await axios.get(`${BASE_URL}/agri-price`, {
    params: {
      SALEDATE: date,
      WHSALCD: /^\d+$/.test(marketName) ? marketName : undefined,
      WHSAL_MRKT_NM: /^\d+$/.test(marketName) ? undefined : marketName,
      startIndex,
      endIndex,
    },
    // responseType 지정 안 함 (JSON 자동 파싱)
  });

  const data = response.data;
  const header = data?.response?.header;
  const body = data?.response?.body;

  const resultCode = toStr(header?.resultCode);
  const resultMsg = toStr(header?.resultMsg);

  // data.go.kr 정상 코드는 보통 "0"
  if (resultCode && resultCode !== '0') {
    throw new Error(resultMsg || `API 오류: ${resultCode}`);
  }

  const rawItems = asArray(body?.items?.item);
  const rows = rawItems.map(mapRow);

  if (productName?.trim()) {
    const keyword = productName.trim();
    return rows.filter(
      (r) =>
        r.productName.includes(keyword) ||
        (r.speciesName ?? '').includes(keyword) ||
        (r.categoryName ?? '').includes(keyword)
    );
  }

  return rows;
}

export async function fetchRecentVolatilityData(params: {
  marketName: string;
  days?: number;
  endDate?: string; // YYYYMMDD 또는 YYYY-MM-DD
}): Promise<{ date: string; rows: AuctionPriceRow[] }[]> {
  const { marketName, days = 7, endDate } = params;

  const base = dayjs(endDate || dayjs().format('YYYY-MM-DD'));
  const tasks: Promise<{ date: string; rows: AuctionPriceRow[] }>[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = base.subtract(i, 'day').format('YYYYMMDD');

    tasks.push(
      fetchAuctionPrices({
        date: d,
        marketName,
        startIndex: 1,
        endIndex: 200,
      }).then((rows) => ({
        date: base.subtract(i, 'day').format('YYYY-MM-DD'),
        rows,
      }))
    );
  }

  const settled = await Promise.allSettled(tasks);

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<{ date: string; rows: AuctionPriceRow[] }> =>
        r.status === 'fulfilled'
    )
    .map((r) => r.value);
}