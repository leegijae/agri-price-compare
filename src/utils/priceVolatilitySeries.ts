import type { AuctionPriceRow, VolatilitySeries } from '../types/agriPrice';

type DailyRows = {
  date: string;
  rows: AuctionPriceRow[];
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ✅ 추가: 사용자가 입력한 키워드(품목명) 기준으로 시계열 생성
export function buildSeriesByKeywords(
  dailyData: DailyRows[],
  keywords: string[]
): VolatilitySeries[] {
  const normalized = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  // 중복 허용 라벨 처리 (예: 토마토, 토마토 -> 토마토 / 토마토 (2))
  const dupCount = new Map<string, number>();

  return normalized
    .map((keyword, idx) => {
      const cnt = (dupCount.get(keyword) ?? 0) + 1;
      dupCount.set(keyword, cnt);
      const displayName = cnt > 1 ? `${keyword} (${cnt})` : keyword;

      const dateEntries = dailyData
        .map((day) => {
          const matched = day.rows.filter((row) => {
            const p = row.productName ?? '';
            const s = row.speciesName ?? '';
            const c = row.categoryName ?? '';
            return (
              p.includes(keyword) ||
              s.includes(keyword) ||
              c.includes(keyword)
            );
          });

          const prices = matched
            .map((r) => r.bidPrice)
            .filter((v) => Number.isFinite(v) && v > 0);

          return {
            date: day.date,
            avgPrice: avg(prices),
          };
        })
        .filter((d) => d.avgPrice > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (dateEntries.length < 2) return null;

      const basePrice = dateEntries[0].avgPrice;
      if (basePrice <= 0) return null;

      const points = dateEntries.map((d) => ({
        date: d.date,
        price: Math.round(d.avgPrice),
        changeRate: Number((((d.avgPrice - basePrice) / basePrice) * 100).toFixed(2)),
      }));

      const latestChangeRate = points[points.length - 1]?.changeRate ?? 0;

      return {
        productKey: `kw:${idx}:${keyword}`,
        productName: displayName,
        speciesName: undefined,
        latestChangeRate,
        points,
      } as VolatilitySeries;
    })
    .filter((v): v is VolatilitySeries => !!v);
}