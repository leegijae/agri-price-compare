import axios from 'axios';
import dayjs from 'dayjs';
import type { AuctionPriceRow, SearchParams } from '../types/agriPrice';
import { XMLParser } from 'fast-xml-parser';

const BASE_URL = 'http://localhost:4000/api';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

export function toNumber(value: unknown): number {
  if (value == null) return 0;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || String(value).trim() === '') return undefined;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : undefined;
}

export function toStr(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * XML/JSON 응답에서 resultCode/resultMsg 추출
 * - XML 구형: result.result_Code / result.result_Msg
 * - JSON 신형: response.header.resultCode / resultMsg
 */
export function extractApiResultInfo(parsed: any): { code?: string; message?: string } {
  const root =
    parsed?.result ??
    parsed?.response?.header ??
    parsed?.header;

  if (!root) return {};

  const code =
    toStr(root?.result_Code) ||
    toStr(root?.resultCode);

  const message =
    toStr(root?.result_Msg) ||
    toStr(root?.resultMsg);

  return {
    code: code || undefined,
    message: message || undefined,
  };
}

/**
 * XML 파싱 객체 / JSON 객체에서 row 배열 추출
 * 테스트에서 다양한 루트 구조를 검증하므로 넓게 대응
 */
export function extractRowsFromParsedXml(parsed: any): any[] {
  const directCandidates = [
    parsed?.response?.body?.items?.item,   // JSON-like
    parsed?.items?.item,
    parsed?.row,
    parsed?.ROW,
    parsed?.item,
    parsed?.Grid_20151124000000000472_1?.row, // 구형 서비스명 예시
    parsed?.Grid_20151124000000000473_1?.row,
    parsed?.ServiceResult?.row,
  ];

  for (const candidate of directCandidates) {
    const arr = asArray(candidate);
    if (arr.length > 0) return arr;
  }

  // 최상위 객체의 임의 서비스명 루트 탐색
  if (parsed && typeof parsed === 'object') {
    for (const value of Object.values(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const row = (value as any)?.row ?? (value as any)?.ROW ?? (value as any)?.item;
      const arr = asArray(row);
      if (arr.length > 0) return arr;
    }
  }

  return [];
}

/**
 * data.go.kr row -> 앱 타입 매핑
 * 신형 JSON(katRealTime2) + 구형 XML 테스트 필드 모두 대응
 */
export function mapRow(raw: any): AuctionPriceRow {
  // 신형 JSON 단위 정보
  const unitQty = toOptionalNumber(raw?.unit_qty ?? raw?.UNIT_QTY);
  const unitNm = toStr(raw?.unit_nm ?? raw?.UNIT_NM);
  const pkgNm = toStr(raw?.pkg_nm ?? raw?.PKG_NM);

  // 구형 XML에서는 DELNGBUNDLE_QY 같은 필드가 단위 역할을 할 수 있음
  const legacyUnit = toStr(raw?.DELNGBUNDLE_QY);

  return {
    // 구형 XML: ROW_NUM, 신형 JSON: auctn_seq
    rowNum: toNumber(raw?.ROW_NUM ?? raw?.auctn_seq),

    // 날짜/시간
    tradeDate: toStr(raw?.DELNG_DE ?? raw?.trd_clcln_ymd),
    bidTime: toStr(raw?.SCSBDE ?? raw?.scsbd_dt) || undefined,

    // 시장
    marketCode: toStr(raw?.WHSAL_MRKT_CD ?? raw?.whsl_mrkt_cd) || undefined,
    marketName: toStr(raw?.WHSAL_MRKT_NM ?? raw?.whsl_mrkt_nm),

    // 법인
    corpCode: toStr(raw?.INSTT_NEW_NM_CD ?? raw?.corp_cd) || undefined,
    corpName: toStr(raw?.INSTT_NEW_NM ?? raw?.corp_nm) || undefined,

    // 품목 계층
    categoryCode: toStr(raw?.STD_PRDLST_CODE ?? raw?.gds_lclsf_cd) || undefined,
    categoryName: toStr(raw?.STD_PRDLST_NM ?? raw?.gds_lclsf_nm) || undefined,

    productCode: toStr(raw?.STD_SPCIES_CODE ?? raw?.gds_mclsf_cd) || undefined,
    productName:
      toStr(raw?.STD_SPCIES_NM) ||
      toStr(raw?.corp_gds_item_nm) ||
      toStr(raw?.gds_mclsf_nm),

    // 구형 XML은 speciesCode 필드가 명확하지 않을 수 있음
    speciesCode: toStr(raw?.SPCIES_CD ?? raw?.gds_sclsf_cd) || undefined,
    speciesName:
      toStr(raw?.SPCIES_NM) ||
      toStr(raw?.corp_gds_vrty_nm) ||
      toStr(raw?.gds_sclsf_nm) ||
      undefined,

    // 규격/품질
    unitName:
      [unitQty ? String(unitQty) : '', unitNm, pkgNm].filter(Boolean).join(' ') ||
      legacyUnit ||
      undefined,
    qualityName: toStr(raw?.GRAD ?? raw?.stndrd) || undefined,

    // 가격/수량
    bidPrice: toNumber(raw?.SBID_PRIC ?? raw?.scsbd_prc),
    quantity: toOptionalNumber(raw?.DELNG_QY ?? raw?.qty),

    // 산지
    originAreaName: toStr(raw?.SHIPMNT_SE_NM ?? raw?.plor_nm) || undefined,
  };
}

export function filterRowsByProductName(
  rows: AuctionPriceRow[],
  productName?: string
): AuctionPriceRow[] {
  if (!productName?.trim()) return rows;

  const keyword = productName.trim();

  return rows.filter(
    (r) =>
      r.productName.includes(keyword) ||
      (r.speciesName ?? '').includes(keyword) ||
      (r.categoryName ?? '').includes(keyword)
  );
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
      // ✅ 테스트 기대값에 맞춤 (기존 SALEDATE → DELNG_DE)
      DELNG_DE: date,
      // 프록시 호환성 위해 SALEDATE도 같이 전달해도 무방 (선택)
      SALEDATE: date,

      WHSALCD: /^\d+$/.test(marketName) ? marketName : undefined,
      WHSAL_MRKT_NM: /^\d+$/.test(marketName) ? undefined : marketName,
      startIndex,
      endIndex,
    },
  });

  const data = response.data;

  // 1) 신형 JSON 응답 처리
  if (data?.response?.body || data?.response?.header) {
    const info = extractApiResultInfo(data);
    if (info.code && info.code !== '0' && info.code !== 'INFO-000') {
      throw new Error(info.message || `API 오류: ${info.code}`);
    }

    const rows = extractRowsFromParsedXml(data).map(mapRow);
    return filterRowsByProductName(rows, productName);
  }

  // 2) XML 문자열 응답 처리 (테스트 케이스 포함)
  if (typeof data === 'string') {
    const parsed = xmlParser.parse(data);

    const info = extractApiResultInfo(parsed);
    if (info.code && info.code !== '0' && info.code !== 'INFO-000') {
      // ERROR-335 등
      throw new Error(info.message || `API 오류: ${info.code}`);
    }

    const rows = extractRowsFromParsedXml(parsed).map(mapRow);
    return filterRowsByProductName(rows, productName);
  }

  // 3) 이미 파싱된 XML 객체(또는 기타 객체) 처리
  if (data && typeof data === 'object') {
    const info = extractApiResultInfo(data);
    if (info.code && info.code !== '0' && info.code !== 'INFO-000') {
      throw new Error(info.message || `API 오류: ${info.code}`);
    }

    const rows = extractRowsFromParsedXml(data).map(mapRow);
    return filterRowsByProductName(rows, productName);
  }

  return [];
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