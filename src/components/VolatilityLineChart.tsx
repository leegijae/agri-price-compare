import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import type { VolatileItemPoint } from '../types/agriPrice';

type Props = {
  data: VolatileItemPoint[];
};

export default function VolatilityLineChart({ data }: Props) {
  if (!data.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>최근 가격 변동 TOP 5</Text>
        <Text style={styles.empty}>표시할 변동 데이터가 없습니다.</Text>
      </View>
    );
  }

  // 가로축: 품목, 세로축: 변동률(%)
  const chartData = data.map((d) => ({
    label: d.productName,
    value: d.changeRate,
  }));

  const width = 320;
  const height = 180;
  const padding = { top: 16, right: 12, bottom: 32, left: 40 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const values = chartData.map((d) => d.value);
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);

  // 위아래 여유 조금 추가
  const yMax = Math.ceil(maxAbs * 1.1);
  const yMin = -yMax;

  const xStep = chartData.length > 1 ? plotW / (chartData.length - 1) : plotW;

  const toX = (index: number) => padding.left + index * xStep;
  const toY = (value: number) => {
    const ratio = (value - yMin) / (yMax - yMin); // 0~1
    return padding.top + (1 - ratio) * plotH;
  };

  const points = chartData.map((d, i) => ({
    x: toX(i),
    y: toY(d.value),
    label: d.label,
    value: d.value,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const zeroY = toY(0);

  // Y축 가이드 라인 (상/중/하)
  const yTicks = [yMax, 0, yMin];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>최근 가격 변동 TOP {data.length} (변동률 %)</Text>

      <Svg width={width} height={height}>
        {/* 배경 가이드 라인 */}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <React.Fragment key={`tick-${tick}`}>
              <Line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#ddd"
                strokeWidth={1}
              />
              <SvgText
                x={padding.left - 6}
                y={y + 4}
                fontSize="10"
                fill="#666"
                textAnchor="end"
              >
                {tick}%
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* 0% 기준선 강조 */}
        <Line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#999"
          strokeWidth={1.2}
        />

        {/* 꺾은선 */}
        <Path d={linePath} fill="none" stroke="#2f6fed" strokeWidth={2} />

        {/* 점 + 값 라벨 */}
        {points.map((p, idx) => {
          const isUp = p.value >= 0;
          return (
            <React.Fragment key={`pt-${idx}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={3.5}
                fill={isUp ? '#2e7d32' : '#c62828'}
              />
              <SvgText
                x={p.x}
                y={p.y - 8}
                fontSize="9"
                fill={isUp ? '#2e7d32' : '#c62828'}
                textAnchor="middle"
              >
                {`${p.value > 0 ? '+' : ''}${p.value}%`}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X축 라벨 (짧게) */}
        {points.map((p, idx) => {
          const short = p.label.length > 4 ? `${p.label.slice(0, 4)}…` : p.label;
          return (
            <SvgText
              key={`x-${idx}`}
              x={p.x}
              y={height - 8}
              fontSize="9"
              fill="#666"
              textAnchor="middle"
            >
              {short}
            </SvgText>
          );
        })}
      </Svg>

      {/* 상세 텍스트 목록 (가독성 보완) */}
      <View style={styles.legendWrap}>
        {data.map((item) => (
          <View key={item.productKey} style={styles.legendRow}>
            <Text style={styles.legendName} numberOfLines={1}>
              {item.productName}
              {item.speciesName ? ` (${item.speciesName})` : ''}
            </Text>
            <Text style={[styles.legendRate, item.changeRate >= 0 ? styles.upText : styles.downText]}>
              {item.changeRate >= 0 ? '+' : ''}
              {item.changeRate}%
            </Text>
          </View>
        ))}
      </View>
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
  empty: {
    color: '#666',
    fontSize: 13,
  },
  legendWrap: {
    marginTop: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  legendName: {
    flex: 1,
    marginRight: 8,
    fontSize: 12,
    color: '#333',
  },
  legendRate: {
    fontSize: 12,
    fontWeight: '600',
  },
  upText: {
    color: '#2e7d32',
  },
  downText: {
    color: '#c62828',
  },
});