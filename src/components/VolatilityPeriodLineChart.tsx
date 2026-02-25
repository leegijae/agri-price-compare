import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Rect, Circle, G } from 'react-native-svg';
import type { PeriodOption, VolatilitySeries } from '../types/agriPrice';

type Props = {
  period: PeriodOption;
  onChangePeriod: (period: PeriodOption) => void;
  series: VolatilitySeries[];
};

const PERIODS: PeriodOption[] = ['7D', '30D'];
const COLORS = ['#2f6fed', '#2e7d32', '#c62828', '#8e24aa', '#ef6c00'];

type ActivePoint = {
  seriesIndex: number;
  pointIndex: number;
  x: number;
  y: number;
  color: string;
  productName: string;
  date: string;
  changeRate: number;
  price: number;
};

export default function VolatilityPeriodLineChart({
  period,
  onChangePeriod,
  series,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>기간별 가격 변동률 비교</Text>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => onChangePeriod(p)}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
          >
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
              {p === '7D' ? '7일' : '30일'}
            </Text>
          </Pressable>
        ))}
      </View>

      {series.length > 0 && (
        <View style={styles.legendWrap}>
          {series.map((s, idx) => (
            <View key={`legend-${s.productKey}-${idx}`} style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  { backgroundColor: COLORS[idx % COLORS.length] },
                ]}
              />
              <Text style={styles.legendText}>{s.productName}</Text>
            </View>
          ))}
        </View>
      )}

      {series.length === 0 ? (
        <Text style={styles.empty}>표시할 데이터가 없습니다.</Text>
      ) : (
        <ChartLayout series={series} />
      )}
    </View>
  );
}

function ChartLayout({ series }: { series: VolatilitySeries[] }) {
  const [activePoint, setActivePoint] = useState<ActivePoint | null>(null);

  const xLabels = useMemo(
    () =>
      series.reduce<string[]>(
        (acc, s) => (s.points.length > acc.length ? s.points.map((p) => p.date) : acc),
        []
      ),
    [series]
  );

  const allRates = series.flatMap((s) => s.points.map((p) => p.changeRate));
  const maxAbs = Math.max(...allRates.map((v) => Math.abs(v)), 1);

  const yMax = Math.ceil(maxAbs * 1.15);
  const yMin = -yMax;

  // ✅ 차트 크기 확장 (가독성 개선)
  const height = 300;
  const minWidth = 420;
  const perPointWidth = 42; // 날짜 1개당 가로 폭
  const width = Math.max(minWidth, xLabels.length * perPointWidth);

  // ✅ 날짜 라벨/툴팁 여유 확보용 패딩
  const leftW = 40;
  const rightW = 16;
  const topPad = 14;
  const bottomPad = 34;

  const graphLeft = leftW;
  const graphRight = width - rightW;
  const graphTop = topPad;
  const graphBottom = height - bottomPad;
  const graphW = graphRight - graphLeft;
  const graphH = graphBottom - graphTop;

  const xStep = xLabels.length > 1 ? graphW / (xLabels.length - 1) : graphW;

  const toX = (idx: number) => graphLeft + idx * xStep;
  const toY = (rate: number) => {
    const ratio = (rate - yMin) / (yMax - yMin);
    return graphTop + (1 - ratio) * graphH;
  };

  const handlePointPress = (payload: ActivePoint) => {
    setActivePoint((prev) => {
      if (
        prev &&
        prev.seriesIndex === payload.seriesIndex &&
        prev.pointIndex === payload.pointIndex
      ) {
        return null;
      }
      return payload;
    });
  };

  const tooltip = (() => {
    if (!activePoint) return null;

    const boxW = 150;
    const boxH = 64;

    let tx = activePoint.x + 8;
    let ty = activePoint.y - boxH - 8;

    if (tx + boxW > width - 4) tx = activePoint.x - boxW - 8;
    if (tx < 4) tx = 4;

    if (ty < 4) ty = activePoint.y + 8;
    if (ty + boxH > height - 4) ty = height - boxH - 4;

    return { ...activePoint, tx, ty, boxW, boxH };
  })();

  return (
    <View>
      {/* ✅ 가로 스크롤 적용 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.chartScrollContent}
      >
        <Svg width={width} height={height}>
          {/* Y축 가이드 */}
          {[yMax, 0, yMin].map((tick) => {
            const y = toY(tick);
            return (
              <React.Fragment key={`tick-${tick}`}>
                <Line x1={graphLeft} y1={y} x2={graphRight} y2={y} stroke="#ddd" strokeWidth={1} />
                <SvgText x={graphLeft - 4} y={y + 3} fontSize="9" fill="#666" textAnchor="end">
                  {tick}%
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* 라인 + 포인트 */}
          {series.map((s, sIdx) => {
            const color = COLORS[sIdx % COLORS.length];
            const pts = s.points.map((p, i) => ({
              x: toX(i),
              y: toY(p.changeRate),
              date: p.date,
              price: p.price,
              changeRate: p.changeRate,
            }));

            const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

            return (
              <React.Fragment key={`${s.productKey}-${sIdx}`}>
                <Path d={pathD} fill="none" stroke={color} strokeWidth={2} />

                {pts.map((p, idx) => {
                  const isActive =
                    activePoint?.seriesIndex === sIdx && activePoint?.pointIndex === idx;

                  return (
                    <G
                      key={`${s.productKey}-${idx}`}
                      onPress={() =>
                        handlePointPress({
                          seriesIndex: sIdx,
                          pointIndex: idx,
                          x: p.x,
                          y: p.y,
                          color,
                          productName: s.productName,
                          date: p.date,
                          changeRate: p.changeRate,
                          price: p.price,
                        })
                      }
                    >
                      <Circle cx={p.x} cy={p.y} r={12} fill="transparent" />
                      <Circle
                        cx={p.x}
                        cy={p.y}
                        r={isActive ? 4.5 : 3}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={isActive ? 1.5 : 1}
                      />
                    </G>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* X축 날짜 라벨 */}
          {xLabels.map((date, idx) => {
            const x = toX(idx);
            let show = true;

            // ✅ 폭이 늘어났으므로 더 촘촘하게 보여도 됨
            if (xLabels.length > 14) {
              const mod = Math.ceil(xLabels.length / 8);
              show = idx % mod === 0 || idx === xLabels.length - 1;
            }
            if (!show) return null;

            const short = date.slice(5); // MM-DD
            return (
              <SvgText
                key={`date-${idx}`}
                x={x}
                y={height - 8}
                fontSize="10"
                fill="#666"
                textAnchor="middle"
              >
                {short}
              </SvgText>
            );
          })}

          {/* 선택 포인트 보조선 + 툴팁 */}
          {tooltip && (
            <>
              <Line
                x1={tooltip.x}
                y1={graphTop}
                x2={tooltip.x}
                y2={graphBottom}
                stroke={tooltip.color}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.7}
              />

              <Rect
                x={tooltip.tx}
                y={tooltip.ty}
                width={tooltip.boxW}
                height={tooltip.boxH}
                rx={8}
                ry={8}
                fill="#111"
                opacity={0.95}
              />
              <Rect
                x={tooltip.tx + 8}
                y={tooltip.ty + 8}
                width={8}
                height={8}
                rx={2}
                ry={2}
                fill={tooltip.color}
              />
              <SvgText x={tooltip.tx + 20} y={tooltip.ty + 16} fontSize="10" fill="#fff">
                {tooltip.productName.length > 14
                  ? `${tooltip.productName.slice(0, 14)}…`
                  : tooltip.productName}
              </SvgText>
              <SvgText x={tooltip.tx + 8} y={tooltip.ty + 32} fontSize="9" fill="#ddd">
                {tooltip.date}
              </SvgText>
              <SvgText
                x={tooltip.tx + 8}
                y={tooltip.ty + 47}
                fontSize="10"
                fill={tooltip.changeRate >= 0 ? '#8cff9a' : '#ff9b9b'}
              >
                변동률: {tooltip.changeRate >= 0 ? '+' : ''}
                {tooltip.changeRate}%
              </SvgText>
              <SvgText x={tooltip.tx + 8} y={tooltip.ty + 60} fontSize="9" fill="#ddd">
                평균가: {tooltip.price.toLocaleString()}원
              </SvgText>
            </>
          )}
        </Svg>
      </ScrollView>

      <Text style={styles.hint}>점(●)을 눌러 해당 날짜의 변동률을 확인하세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  periodRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  periodBtnActive: {
    borderColor: '#2f6fed',
    backgroundColor: '#eef3ff',
  },
  periodBtnText: {
    fontSize: 12,
    color: '#555',
  },
  periodBtnTextActive: {
    color: '#2f6fed',
    fontWeight: '700',
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  empty: {
    color: '#666',
    fontSize: 13,
  },
  hint: {
    marginTop: 6,
    fontSize: 11,
    color: '#777',
  },
  chartScrollContent: {
    paddingBottom: 2,
  },
});