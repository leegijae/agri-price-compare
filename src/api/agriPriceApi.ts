import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import type { AuctionPriceRow, SearchParams } from '@/src/types/agriPrice';

const BASE_URL = 'http://localhost:4000/api';
const SERVICE_NAME = 'Grid_20151127000000000313_1';

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
  // 후보 루트들을 순서대로 탐색
  const candidates = [
    parsed?.[SERVICE_NAME], // 기존 예상 구조
    parsed?.result,         // 현재 실제 로그 구조
    parsed?.response,       // 다른 공공 API에서 자주 나오는 구조
    parsed,                 // 최후 fallback
  ];

  for (const root of candidates) {
    if (!root) continue;

    // 1) 바로 row가 있는 경우
    let rows = root?.row ?? root?.rows;

    // 2) result 내부에 row가 한 단계 더 들어간 경우 대비
    if (!rows && root?.RESULT) {
      rows = root.RESULT?.row ?? root.RESULT?.rows;
    }

    // 3) 배열/단일객체 모두 처리
    if (rows) {
      if (Array.isArray(rows)) return rows;
      return [rows];
    }

    // 4) root 내부 하위 키를 순회하면서 row/rows 찾기 (추가 안전장치)
    for (const key of Object.keys(root)) {
      const child = root[key];
      const nestedRows = child?.row ?? child?.rows;
      if (nestedRows) {
        if (Array.isArray(nestedRows)) return nestedRows;
        return [nestedRows];
      }
    }
  }

  return [];
}

function mapRow(raw: any): AuctionPriceRow {
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

export async function fetchAuctionPrices(params: SearchParams): Promise<AuctionPriceRow[]> {
  const {
    date,
    marketName,
    productName,
    startIndex = 1,
    endIndex = 5,
  } = params;

  // [로그 1] 요청 파라미터 확인
  console.log('[API] request params:', {
    date,
    marketName,
    productName,
    startIndex,
    endIndex,
  });

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

  // [로그 2] 원본 XML 응답 앞부분 확인 (너무 길어서 일부만)
  console.log(
    '[API] response raw preview:',
    typeof response.data === 'string' ? response.data.slice(0, 500) : response.data
  );

  const parsed = xmlParser.parse(response.data);

  const apiErrorCode = parsed?.result?.code;
const apiErrorMessage = parsed?.result?.message;

if (apiErrorCode && apiErrorCode !== 'INFO-000') {
  throw new Error(apiErrorMessage || `API 오류: ${apiErrorCode}`);
}

  console.log('[API] parsed.result keys:', parsed?.result ? Object.keys(parsed.result) : 'no result'); // 추후 삭제

  // [로그 3] 파싱된 최상위 키 확인 (응답 구조 확인용)
  console.log('[API] parsed xml keys:', Object.keys(parsed || {}));

  const rows = extractRowsFromParsedXml(parsed).map(mapRow);

  // [로그 4] 최종 rows 개수 + 샘플 1건 확인
  console.log('[API] rows length:', rows.length);
  if (rows.length > 0) {
    console.log('[API] first row sample:', rows[0]);
  }

  if (productName?.trim()) {
    const keyword = productName.trim();
    const filteredRows = rows.filter((r) => r.productName.includes(keyword));

    // (선택) 품목 필터 결과 로그
    console.log('[API] filtered rows length:', filteredRows.length, 'keyword:', keyword);

    return filteredRows;
  }

  return rows;
}