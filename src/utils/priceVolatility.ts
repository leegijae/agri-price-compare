import type { AuctionPriceRow, VolatileItemPoint } from '../types/agriPrice';

type DailyRows = {
  date: string;
  rows: AuctionPriceRow[];
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function getTopVolatileItems(
  dailyData: DailyRows[],
  topN = 5
): VolatileItemPoint[] {
  const map = new Map<
    string,
    {
      productName: string;
      speciesName?: string;
      byDate: Map<string, number[]>;
    }
  >();

  for (const day of dailyData) {
    for (const row of day.rows) {
      const productName = row.productName || '미분류';
      const speciesName = row.speciesName || '';
      const key = `${productName}__${speciesName}`;

      if (!map.has(key)) {
        map.set(key, {
          productName,
          speciesName: row.speciesName,
          byDate: new Map(),
        });
      }

      const item = map.get(key)!;
      if (!item.byDate.has(day.date)) item.byDate.set(day.date, []);
      if (row.bidPrice > 0) item.byDate.get(day.date)!.push(row.bidPrice);
    }
  }

  const result: VolatileItemPoint[] = [];

  for (const [key, item] of map.entries()) {
    const dateEntries = [...item.byDate.entries()]
      .map(([date, prices]) => ({ date, avgPrice: avg(prices) }))
      .filter((x) => x.avgPrice > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (dateEntries.length < 2) continue;

    const first = dateEntries[0].avgPrice;
    const last = dateEntries[dateEntries.length - 1].avgPrice;
    if (first <= 0) continue;

    const changeAmount = last - first;
    const changeRate = (changeAmount / first) * 100;

    result.push({
      productKey: key,
      productName: item.productName,
      speciesName: item.speciesName,
      firstAvgPrice: Math.round(first),
      latestAvgPrice: Math.round(last),
      changeAmount: Math.round(changeAmount),
      changeRate: Number(changeRate.toFixed(2)),
    });
  }

  return result
    .sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate))
    .slice(0, topN);
}