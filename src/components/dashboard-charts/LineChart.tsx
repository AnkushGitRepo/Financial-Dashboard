'use client';

import { useId, useState } from 'react';
import { buildChart, type RangeSeries } from '@/lib/dashboard/chartMath';
import styles from './LineChart.module.css';

interface LineChartProps {
  series: RangeSeries;
  height: number;
  formatValue: (v: number) => string;
  deltaLabel?: (v: number) => string;
}

export function LineChart({ series, height, formatValue, deltaLabel }: LineChartProps) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chart = buildChart(series, height);
  const hoverPoint = hoverIndex === null ? null : chart.pts[Math.min(hoverIndex, chart.pts.length - 1)];

  // Axis ticks: many downsampled points fall in the same month/year, which
  // would repeat the label ("Sept Sept Aug Aug…"). Show each label only on
  // the first point where it changes; blank the rest (flex keeps positions).
  const tickLabels = chart.pts.map((p, i) => {
    const prevShown = chart.pts
      .slice(0, i)
      .map((x) => x.label)
      .filter(Boolean)
      .at(-1);
    return p.label && p.label !== prevShown ? p.label : '';
  });

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 720 ${height}`} preserveAspectRatio="none" className={styles.svg} style={{ height }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--app-teal)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--app-teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={chart.areaPath} fill={`url(#${gradientId})`} className={styles.area} />
        <path d={chart.linePath} fill="none" stroke="var(--app-teal)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className={styles.line} />
        {hoverPoint && (
          <g>
            <line x1={hoverPoint.x} x2={hoverPoint.x} y1={0} y2={height - 10} stroke="var(--app-ink)" strokeWidth={1} strokeDasharray="3 4" opacity={0.35} />
            <circle cx={hoverPoint.x} cy={hoverPoint.y} r={6} fill="var(--color-surface)" stroke="var(--app-teal)" strokeWidth={3} />
          </g>
        )}
      </svg>

      <div className={styles.labels}>
        {tickLabels.map((label, i) => (
          <span key={i} className={styles.labelTick}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.hoverLayer}>
        {chart.pts.map((_, i) => (
          <div
            key={i}
            className={styles.hoverCell}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </div>

      {hoverPoint && (
        <div className={styles.tooltip} style={{ left: `${(hoverPoint.x / 720) * 100}%` }}>
          <p className={styles.tooltipLabel}>{hoverPoint.label}</p>
          <p className={styles.tooltipValue}>{formatValue(hoverPoint.v)}</p>
          {deltaLabel && <p className={styles.tooltipDelta}>{deltaLabel(hoverPoint.v)}</p>}
        </div>
      )}
    </div>
  );
}
