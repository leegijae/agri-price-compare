import type { AuctionPriceRow } from '@/src/types/agriPrice';
import {
  toNumber,
  toOptionalNumber,
  toStr,
  extractApiResultInfo,
  extractRowsFromParsedXml,
  mapRow,
  filterRowsByProductName,
} from '@/src/api/agriPriceApi';

// 테스트 전용 상수 (소스에서 export 안 하므로 로컬 선언)
const SERVICE_NAME = 'Grid_20151127000000000313_1';
describe('agriPrice parser pure functions', () => {
  describe('toNumber / toOptionalNumber / toStr', () => {
    it('toNumber는 콤마 포함 숫자 문자열을 숫자로 변환한다', () => {
      expect(toNumber('3,000')).toBe(3000);
      expect(toNumber(' 120 ')).toBe(120);
    });

    it('toNumber는 잘못된 값이면 0을 반환한다', () => {
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber('abc')).toBe(0);
      expect(toNumber(null)).toBe(0);
    });

    it('toOptionalNumber는 빈값이면 undefined를 반환한다', () => {
      expect(toOptionalNumber(undefined)).toBeUndefined();
      expect(toOptionalNumber('')).toBeUndefined();
      expect(toOptionalNumber('   ')).toBeUndefined();
    });

    it('toOptionalNumber는 유효한 숫자 문자열을 변환한다', () => {
      expect(toOptionalNumber('2,500')).toBe(2500);
    });

    it('toStr는 null/undefined를 빈 문자열로 처리한다', () => {
      expect(toStr(undefined)).toBe('');
      expect(toStr(null)).toBe('');
      expect(toStr(' 배추 ')).toBe('배추');
    });
  });

  describe('extractApiResultInfo', () => {
    it('루트가 result인 XML 파싱 객체에서 code/message를 추출한다', () => {
      const parsed = {
        result: {
          code: 'ERROR-335',
          message: '샘플 제한',
        },
      };

      expect(extractApiResultInfo(parsed)).toEqual({
        code: 'ERROR-335',
        message: '샘플 제한',
      });
    });

    it(`루트가 ${SERVICE_NAME}인 XML 파싱 객체에서 code/message를 추출한다`, () => {
      const parsed = {
        [SERVICE_NAME]: {
          result: {
            code: 'INFO-000',
            message: '정상 처리되었습니다.',
          },
        },
      };

      expect(extractApiResultInfo(parsed)).toEqual({
        code: 'INFO-000',
        message: '정상 처리되었습니다.',
      });
    });

    it('result가 없으면 빈 객체를 반환한다', () => {
      expect(extractApiResultInfo({ foo: 'bar' })).toEqual({});
    });
  });

  describe('extractRowsFromParsedXml', () => {
    it(`루트가 ${SERVICE_NAME}이고 row가 배열이면 그대로 반환한다`, () => {
      const parsed = {
        [SERVICE_NAME]: {
          row: [{ ROW_NUM: '1' }, { ROW_NUM: '2' }],
        },
      };

      const rows = extractRowsFromParsedXml(parsed);
      expect(rows).toHaveLength(2);
      expect(rows[0].ROW_NUM).toBe('1');
    });

    it('row가 단일 객체면 배열로 감싸서 반환한다', () => {
      const parsed = {
        [SERVICE_NAME]: {
          row: { ROW_NUM: '1' },
        },
      };

      const rows = extractRowsFromParsedXml(parsed);
      expect(Array.isArray(rows)).toBe(true);
      expect(rows).toHaveLength(1);
      expect(rows[0].ROW_NUM).toBe('1');
    });

    it('row가 없으면 빈 배열을 반환한다', () => {
      const parsed = {
        [SERVICE_NAME]: {
          totalCnt: '0',
        },
      };

      expect(extractRowsFromParsedXml(parsed)).toEqual([]);
    });

    it('루트가 서비스명이 아닌 경우에도 row를 추출할 수 있다', () => {
      const parsed = {
        row: [{ ROW_NUM: '1' }],
      };

      const rows = extractRowsFromParsedXml(parsed);
      expect(rows).toHaveLength(1);
    });
  });

  describe('mapRow', () => {
    it('API row를 AuctionPriceRow로 매핑한다', () => {
      const raw = {
        ROW_NUM: '1',
        DELNG_DE: '20151120',
        WHSAL_MRKT_NM: '서울강서도매시장',
        STD_PRDLST_NM: '배추',
        SBID_PRIC: '3,000',
        DELNG_QY: '10',
      };

      const mapped = mapRow(raw);

      expect(mapped).toMatchObject({
        rowNum: 1,
        tradeDate: '20151120',
        marketName: '서울강서도매시장',
        productName: '배추',
        bidPrice: 3000,
        quantity: 10,
      });
    });

    it('선택값 누락 시에도 기본값/undefined로 안전하게 매핑한다', () => {
      const mapped = mapRow({
        ROW_NUM: '',
        DELNG_DE: null,
        STD_PRDLST_NM: undefined,
        SBID_PRIC: '',
        DELNG_QY: '',
      });

      expect(mapped.rowNum).toBe(0);
      expect(mapped.tradeDate).toBe('');
      expect(mapped.productName).toBe('');
      expect(mapped.bidPrice).toBe(0);
      expect(mapped.quantity).toBeUndefined();
    });
  });

  describe('filterRowsByProductName', () => {
    const rows: AuctionPriceRow[] = [
      {
        rowNum: 1,
        tradeDate: '20151120',
        marketName: '서울강서도매시장',
        productName: '배추',
        bidPrice: 1000,
      },
      {
        rowNum: 2,
        tradeDate: '20151120',
        marketName: '서울강서도매시장',
        productName: '무',
        bidPrice: 2000,
      },
      {
        rowNum: 3,
        tradeDate: '20151120',
        marketName: '서울강서도매시장',
        productName: '배추(특)',
        bidPrice: 3000,
      },
    ];

    it('productName이 없으면 원본 배열을 그대로 반환한다', () => {
      expect(filterRowsByProductName(rows, '')).toEqual(rows);
      expect(filterRowsByProductName(rows, undefined)).toEqual(rows);
    });

    it('productName 키워드가 있으면 포함 문자열 기준으로 필터링한다', () => {
      const filtered = filterRowsByProductName(rows, '배추');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.productName)).toEqual(['배추', '배추(특)']);
    });
  });
});