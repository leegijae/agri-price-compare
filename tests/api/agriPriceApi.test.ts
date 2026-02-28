import axios from 'axios';
import {
  fetchAuctionPrices,
  fetchWholesaleMarkets,
} from '@/src/api/agriPriceApi';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const SERVICE_NAME = 'Grid_20151127000000000313_1';

describe('agriPriceApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWholesaleMarkets', () => {
    it('정상 응답이면 markets 배열을 반환한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          markets: [
            { codeId: '110001', codeName: '서울가락' },
            { codeId: '110008', codeName: '서울강서' },
          ],
        },
      } as any);

      const result = await fetchWholesaleMarkets('20260228');

      expect(result).toEqual([
        { codeId: '110001', codeName: '서울가락' },
        { codeId: '110008', codeName: '서울강서' },
      ]);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/wholesale-markets'),
        expect.objectContaining({
          params: { SALEDATE: '20260228' },
          timeout: 15000,
          validateStatus: expect.any(Function),
        })
      );
    });

    it('서버가 502/500 등을 반환하면 빈 배열을 반환한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 502,
        data: { message: 'Bad Gateway' },
      } as any);

      const result = await fetchWholesaleMarkets('20260228');

      expect(result).toEqual([]);
    });

    it('네트워크 에러가 발생해도 빈 배열을 반환한다', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await fetchWholesaleMarkets('20260228');

      expect(result).toEqual([]);
    });

    it('응답에 markets가 없으면 빈 배열을 반환한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {},
      } as any);

      const result = await fetchWholesaleMarkets('20260228');

      expect(result).toEqual([]);
    });
  });

  describe('fetchAuctionPrices', () => {
    it('INFO-000 + totalCnt=0 응답이면 빈 배열을 반환한다', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<${SERVICE_NAME}>
  <totalCnt>0</totalCnt>
  <startRow>1</startRow>
  <endRow>5</endRow>
  <result>
    <message>정상 처리되었습니다.</message>
    <code>INFO-000</code>
  </result>
</${SERVICE_NAME}>`;

      mockedAxios.get.mockResolvedValueOnce({ data: emptyXml } as any);

      const result = await fetchAuctionPrices({
        date: '20151120',
        marketName: '서울강서도매시장',
        startIndex: 1,
        endIndex: 5,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('ERROR-335 샘플 제한 응답이면 예외를 throw 한다', async () => {
      const errorXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
  <code>ERROR-335</code>
  <message>샘플데이터(샘플키:sample)는 한번에 최대 5건을 넘을 수 없습니다.</message>
</result>`;

      mockedAxios.get.mockResolvedValueOnce({ data: errorXml } as any);

      await expect(
        fetchAuctionPrices({
          date: '20260224',
          marketName: '서울강서도매시장',
          startIndex: 1,
          endIndex: 50,
        })
      ).rejects.toThrow(
        '샘플데이터(샘플키:sample)는 한번에 최대 5건을 넘을 수 없습니다.'
      );
    });

    it('정상 row XML을 AuctionPriceRow로 매핑한다', async () => {
      const rowsXml = `<?xml version="1.0" encoding="UTF-8"?>
<${SERVICE_NAME}>
  <totalCnt>2</totalCnt>
  <startRow>1</startRow>
  <endRow>2</endRow>
  <result>
    <message>정상 처리되었습니다.</message>
    <code>INFO-000</code>
  </result>
  <row>
    <ROW_NUM>1</ROW_NUM>
    <DELNG_DE>20151120</DELNG_DE>
    <WHSAL_MRKT_NM>서울강서도매시장</WHSAL_MRKT_NM>
    <STD_PRDLST_NM>배추</STD_PRDLST_NM>
    <SBID_PRIC>3,000</SBID_PRIC>
    <DELNG_QY>10</DELNG_QY>
  </row>
  <row>
    <ROW_NUM>2</ROW_NUM>
    <DELNG_DE>20151120</DELNG_DE>
    <WHSAL_MRKT_NM>서울강서도매시장</WHSAL_MRKT_NM>
    <STD_PRDLST_NM>무</STD_PRDLST_NM>
    <SBID_PRIC>1,500</SBID_PRIC>
    <DELNG_QY>20</DELNG_QY>
  </row>
</${SERVICE_NAME}>`;

      mockedAxios.get.mockResolvedValueOnce({ data: rowsXml } as any);

      const result = await fetchAuctionPrices({
        date: '20151120',
        marketName: '서울강서도매시장',
        startIndex: 1,
        endIndex: 2,
      });

      expect(result).toHaveLength(2);

      expect(result[0]).toMatchObject({
        rowNum: 1,
        tradeDate: '20151120',
        marketName: '서울강서도매시장',
        productName: '배추',
        bidPrice: 3000,
        quantity: 10,
      });

      expect(result[1]).toMatchObject({
        rowNum: 2,
        productName: '무',
        bidPrice: 1500,
        quantity: 20,
      });
    });

    it('productName이 있으면 클라이언트 필터링을 적용한다', async () => {
      const rowsXml = `<?xml version="1.0" encoding="UTF-8"?>
<${SERVICE_NAME}>
  <totalCnt>3</totalCnt>
  <startRow>1</startRow>
  <endRow>3</endRow>
  <result>
    <message>정상 처리되었습니다.</message>
    <code>INFO-000</code>
  </result>
  <row>
    <ROW_NUM>1</ROW_NUM>
    <DELNG_DE>20151120</DELNG_DE>
    <WHSAL_MRKT_NM>서울강서도매시장</WHSAL_MRKT_NM>
    <STD_PRDLST_NM>배추</STD_PRDLST_NM>
    <SBID_PRIC>3000</SBID_PRIC>
    <DELNG_QY>10</DELNG_QY>
  </row>
  <row>
    <ROW_NUM>2</ROW_NUM>
    <DELNG_DE>20151120</DELNG_DE>
    <WHSAL_MRKT_NM>서울강서도매시장</WHSAL_MRKT_NM>
    <STD_PRDLST_NM>무</STD_PRDLST_NM>
    <SBID_PRIC>2000</SBID_PRIC>
    <DELNG_QY>20</DELNG_QY>
  </row>
  <row>
    <ROW_NUM>3</ROW_NUM>
    <DELNG_DE>20151120</DELNG_DE>
    <WHSAL_MRKT_NM>서울강서도매시장</WHSAL_MRKT_NM>
    <STD_PRDLST_NM>배추(특)</STD_PRDLST_NM>
    <SBID_PRIC>5000</SBID_PRIC>
    <DELNG_QY>5</DELNG_QY>
  </row>
</${SERVICE_NAME}>`;

      mockedAxios.get.mockResolvedValueOnce({ data: rowsXml } as any);

      const result = await fetchAuctionPrices({
        date: '20151120',
        marketName: '서울강서도매시장',
        productName: '배추',
        startIndex: 1,
        endIndex: 3,
      });

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.productName.includes('배추'))).toBe(true);
      expect(result.map((r) => r.productName)).toEqual(['배추', '배추(특)']);
    });

    it('신형 JSON 응답도 AuctionPriceRow로 매핑한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: {
              resultCode: '0',
              resultMsg: 'OK',
            },
            body: {
              items: {
                item: [
                  {
                    auctn_seq: '1',
                    trd_clcln_ymd: '20260228',
                    whsl_mrkt_cd: '110001',
                    whsl_mrkt_nm: '서울가락',
                    std_prdlst_nm: '배추',
                    scsbd_prc: '3500',
                    qty: '12',
                  },
                  {
                    auctn_seq: '2',
                    trd_clcln_ymd: '20260228',
                    whsl_mrkt_cd: '110008',
                    whsl_mrkt_nm: '서울강서',
                    PRDLST_NM: '무',
                    scsbd_prc: '1800',
                    qty: '22',
                  },
                ],
              },
            },
          },
        },
      } as any);

      const result = await fetchAuctionPrices({
        date: '20260228',
        marketName: '서울가락',
        startIndex: 1,
        endIndex: 50,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        rowNum: 1,
        tradeDate: '20260228',
        marketCode: '110001',
        marketName: '서울가락',
        bidPrice: 3500,
        quantity: 12,
      });
      expect(result[1]).toMatchObject({
        rowNum: 2,
        marketName: '서울강서',
        productName: '무',
        bidPrice: 1800,
        quantity: 22,
      });
    });

    it('신형 JSON 응답에서 오류 코드면 예외를 throw 한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: {
              resultCode: 'ERROR-500',
              resultMsg: '내부 오류',
            },
            body: {},
          },
        },
      } as any);

      await expect(
        fetchAuctionPrices({
          date: '20260228',
          marketName: '서울가락',
        })
      ).rejects.toThrow('내부 오류');
    });

    it('이미 파싱된 객체 응답도 처리한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          [SERVICE_NAME]: {
            result: {
              code: 'INFO-000',
              message: '정상 처리되었습니다.',
            },
            row: {
              ROW_NUM: '1',
              DELNG_DE: '20151120',
              WHSAL_MRKT_NM: '서울강서도매시장',
              STD_PRDLST_NM: '양파',
              SBID_PRIC: '2500',
              DELNG_QY: '7',
            },
          },
        },
      } as any);

      const result = await fetchAuctionPrices({
        date: '20151120',
        marketName: '서울강서도매시장',
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rowNum: 1,
        productName: '양파',
        bidPrice: 2500,
        quantity: 7,
      });
    });

    it('marketName이 숫자면 WHSALCD를 사용하고 WHSAL_MRKT_NM은 비운다', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<${SERVICE_NAME}>
  <totalCnt>0</totalCnt>
  <result><message>정상 처리되었습니다.</message><code>INFO-000</code></result>
</${SERVICE_NAME}>`;

      mockedAxios.get.mockResolvedValueOnce({ data: emptyXml } as any);

      await fetchAuctionPrices({
        date: '20260228',
        marketName: '110001',
        startIndex: 1,
        endIndex: 5,
      });

      const [, config] = mockedAxios.get.mock.calls[0];

      expect(config?.params).toMatchObject({
        DELNG_DE: '20260228',
        SALEDATE: '20260228',
        WHSALCD: '110001',
        startIndex: 1,
        endIndex: 5,
      });
      expect(config?.params?.WHSAL_MRKT_NM).toBeUndefined();
    });

    it('marketName이 문자열이면 WHSAL_MRKT_NM을 사용한다', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<${SERVICE_NAME}>
  <totalCnt>0</totalCnt>
  <result><message>정상 처리되었습니다.</message><code>INFO-000</code></result>
</${SERVICE_NAME}>`;

      mockedAxios.get.mockResolvedValueOnce({ data: emptyXml } as any);

      await fetchAuctionPrices({
        date: '20260228',
        marketName: '서울강서도매시장',
        startIndex: 1,
        endIndex: 5,
      });

      const [, config] = mockedAxios.get.mock.calls[0];

      expect(String(mockedAxios.get.mock.calls[0][0])).toContain('/agri-price');
      expect(config?.params).toMatchObject({
        DELNG_DE: '20260228',
        SALEDATE: '20260228',
        WHSAL_MRKT_NM: '서울강서도매시장',
        startIndex: 1,
        endIndex: 5,
      });
      expect(config?.params?.WHSALCD).toBeUndefined();
    });
  });
});