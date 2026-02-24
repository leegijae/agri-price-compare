import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import type { AuctionPriceRow, SearchParams } from '../types/agriPrice';

const BASE_URL = 'http://localhost:4000/api';
export const SERVICE_NAME = 'Grid_20151127000000000313_1';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
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

export function extractApiResultInfo(parsed: any): { code?: string; message?: string } {
  // 케이스 1) <result><code>...</code></result> (루트가 result)
  if (parsed?.result?.code || parsed?.result?.message) {
    return {
      code: toStr(parsed.result.code) || undefined,
      message: toStr(parsed.result.message) || undefined,
    };
  }

  // 케이스 2) <Grid_xxx><result><code>...</code></result></Grid_xxx>
  const root = parsed?.[SERVICE_NAME];
  if (root?.result?.code || root?.result?.message) {
    return {
      code: toStr(root.result.code) || undefined,
      message: toStr(root.result.message) || undefined,
    };
  }

  return {};
}

export function extractRowsFromParsedXml(parsed: any): any[] {
  const root = parsed?.[SERVICE_NAME] ?? parsed;

  let rows = root?.row ?? root?.rows ?? [];
  if (!Array.isArray(rows)) {
    rows = rows ? [rows] : [];
  }

  return rows;
}

export function mapRow(raw: any): AuctionPriceRow {
  return {
    rowNum: toNumber(raw?.ROW_NUM),
    tradeDate: toStr(raw?.DELNG_DE),
    bidTime: toStr(raw?.SBID_TIME) || undefined,
    marketCode: toStr(raw?.WHSAL_MRKT_CODE) || undefined,
    marketName: toStr(raw?.WHSAL_MRKT_NM),
    corpCode: toStr(raw?.CPR_INSTT_CODE) || undefined,
    corpName: toStr(raw?.INSTT_NM) || undefined,
    categoryCode: toStr(raw?.CATGORY_CODE) || undefined,
    categoryName: toStr(raw?.CATGORY_NM) || undefined,
    productCode: toStr(raw?.STD_PRDLST_CODE) || undefined,
    productName: toStr(raw?.STD_PRDLST_NM),
    speciesCode: toStr(raw?.STD_SPCIES_CODE) || undefined,
    speciesName: toStr(raw?.STD_SPCIES_NM) || undefined,
    unitName: toStr(raw?.STD_UNIT_NEW_NM) || undefined,
    qualityName: toStr(raw?.STD_QLITY_NEW_NM) || undefined,
    bidPrice: toNumber(raw?.SBID_PRIC),
    quantity: toOptionalNumber(raw?.DELNG_QY),
    originAreaName: toStr(raw?.CPR_MTC_NM) || undefined,
  };
}

export function filterRowsByProductName(
  rows: AuctionPriceRow[],
  productName?: string
): AuctionPriceRow[] {
  if (!productName?.trim()) return rows;
  const keyword = productName.trim();
  return rows.filter((r) => r.productName.includes(keyword));
}

export async function fetchAuctionPrices(params: SearchParams): Promise<AuctionPriceRow[]> {
  const {
    date,
    marketName,
    productName,
    startIndex = 1,
    endIndex = 50,
  } = params;

  const url = `${BASE_URL}/agri-price`;

  const response = await axios.get<string>(url, {
    params: {
      DELNG_DE: date,
      WHSAL_MRKT_NM: marketName,
      startIndex,
      endIndex,
    },
    responseType: 'text',
  });

  const parsed = xmlParser.parse(response.data);

  const { code: apiErrorCode, message: apiErrorMessage } = extractApiResultInfo(parsed);

  // INFO-000 이외 코드는 API 에러로 간주
  if (apiErrorCode && apiErrorCode !== 'INFO-000') {
    throw new Error(apiErrorMessage || `API 오류: ${apiErrorCode}`);
  }

  const rows = extractRowsFromParsedXml(parsed).map(mapRow);
  return filterRowsByProductName(rows, productName);
}