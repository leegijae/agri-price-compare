import { getDaysFromPeriod } from '@/src/utils/period';

describe('getDaysFromPeriod', () => {
  it('7D는 7을 반환한다', () => {
    expect(getDaysFromPeriod('7D')).toBe(7);
  });

  it('30D는 30을 반환한다', () => {
    expect(getDaysFromPeriod('30D')).toBe(30);
  });

  it('알 수 없는 값은 기본값 7을 반환한다', () => {
    expect(getDaysFromPeriod('UNKNOWN' as any)).toBe(7);
  });
});