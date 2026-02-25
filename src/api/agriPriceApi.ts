import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import type { AuctionPriceRow, SearchParams } from '../types/agriPrice';

const BASE_URL = 'http://localhost:4000/api';
const SERVICE_NAME = 'Grid_20240625000000000654_1';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
});

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

function extractRowsFromParsedXml(parsed: any): any[] {
  const root = parsed?.[SERVICE_NAME] ?? parsed;
  let rows = root?.row ?? [];
  if (!Array.isArray(rows)) rows = rows ? [rows] : [];
  return rows;
}

function mapRow(raw: any): AuctionPriceRow {
  return {
    rowNum: toNumber(raw?.ROW_NUM),
    tradeDate: toStr(raw?.SALEDATE),            // 변경
    bidTime: toStr(raw?.SBIDTIME) || undefined, // 변경

    // 시장
    marketCode: toStr(raw?.WHSALCD) || undefined,
    marketName: toStr(raw?.WHSALNAME),

    // 법인
    corpCode: toStr(raw?.CMPCD) || undefined,
    corpName: toStr(raw?.CMPNAME) || undefined,

    // 품목 계층 (기존 타입에 맞춰 매핑)
    categoryCode: toStr(raw?.LARGE) || undefined,
    categoryName: toStr(raw?.LARGENAME) || undefined,

    productCode: toStr(raw?.MID) || undefined,
    productName: toStr(raw?.MIDNAME), // 중분류명을 상품명처럼 사용

    speciesCode: toStr(raw?.SMALL) || undefined,
    speciesName: toStr(raw?.SMALLNAME) || undefined,

    unitName: toStr(raw?.STD) || undefined, // 규격
    qualityName: undefined,

    bidPrice: toNumber(raw?.COST),          // 변경
    quantity: toOptionalNumber(raw?.QTY),   // 변경

    originAreaName: toStr(raw?.SANNAME) || undefined,
  };
}

export async function fetchAuctionPrices(params: SearchParams): Promise<AuctionPriceRow[]> {
  const {
    date,
    marketName, // 여기엔 시장명 대신 "시장코드"를 넣어도 됨 (임시)
    productName,
    startIndex = 1,
    endIndex = 50,
  } = params;

  const response = await axios.get<string>(`${BASE_URL}/agri-price`, {
    params: {
      SALEDATE: date,
      // 서버에서 코드/이름 둘 다 처리하도록 해놨지만, 일단 marketName 값을 넘김
      // (입력값이 시장명이면 서버가 매핑, 코드면 그대로 사용)
      WHSALCD: /^\d+$/.test(marketName) ? marketName : undefined,
      WHSAL_MRKT_NM: /^\d+$/.test(marketName) ? undefined : marketName,
      startIndex,
      endIndex,
    },
    responseType: 'text',
  });

  const parsed = xmlParser.parse(response.data);

  // 에러 XML 처리 (result 루트 / 서비스 루트 내부 result 모두 대응)
  const rootResult = parsed?.result;
  const serviceResult = parsed?.[SERVICE_NAME]?.result;
  const resultNode = serviceResult || rootResult;

  const apiErrorCode = toStr(resultNode?.code);
  const apiErrorMessage = toStr(resultNode?.message);

  if (apiErrorCode && apiErrorCode !== 'INFO-000') {
    throw new Error(apiErrorMessage || `API 오류: ${apiErrorCode}`);
  }

  const rows = extractRowsFromParsedXml(parsed).map(mapRow);

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