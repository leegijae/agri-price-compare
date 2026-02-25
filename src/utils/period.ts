import type { PeriodOption } from '../types/agriPrice';

export function getDaysFromPeriod(period: PeriodOption): number {
  switch (period) {
    case '7D':
      return 7;
    case '30D':
      return 30;
    default:
      return 7;
  }
}