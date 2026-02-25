import axios from 'axios';
import { fetchAuctionPrices } from '@/src/api/agriPriceApi';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
export const SERVICE_NAME = 'Grid_20151127000000000313_1';

describe('agriPriceApi - fetchAuctionPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('INFO-000 + totalCnt=0 응답이면 빈 배열을 반환한다', async () => {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<Grid_20151127000000000313_1>
  <totalCnt>0</totalCnt>
  <startRow>1</startRow>
  <endRow>5</endRow>
  <result>
    <message>정상 처리되었습니다.</message>
    <code>INFO-000</code>
  </result>
</Grid_20151127000000000313_1>`;

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
<Grid_20151127000000000313_1>
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
</Grid_20151127000000000313_1>`;

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
<Grid_20151127000000000313_1>
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
</Grid_20151127000000000313_1>`;

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

  it('axios 호출 시 프록시 API 경로와 파라미터를 사용한다', async () => {
    const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<Grid_20151127000000000313_1>
  <totalCnt>0</totalCnt>
  <result><message>정상 처리되었습니다.</message><code>INFO-000</code></result>
</Grid_20151127000000000313_1>`;

    mockedAxios.get.mockResolvedValueOnce({ data: emptyXml } as any);

    await fetchAuctionPrices({
      date: '20151120',
      marketName: '서울강서도매시장',
      productName: '배추',
      startIndex: 1,
      endIndex: 5,
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);

    const [url, config] = mockedAxios.get.mock.calls[0];

    // 현재 구현 기준: 로컬 프록시 사용
    expect(String(url)).toContain('/agri-price');

    expect(config?.params).toMatchObject({
      DELNG_DE: '20151120',
      WHSAL_MRKT_NM: '서울강서도매시장',
      startIndex: 1,
      endIndex: 5,
    });
  });
});