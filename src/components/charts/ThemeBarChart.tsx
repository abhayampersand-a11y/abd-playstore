'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';

import { percent, plainNumber, truncate } from '@/lib/format';
import { useChartTokens } from '@/theme/chartTokens';
import type { ThemeBucket } from '@/lib/types';
import { ChartFrame, ChartTooltipCard, useAxisProps } from './ChartFrame';

type Tone = 'complaint' | 'praise' | 'request';

interface ThemeBarChartProps {
  buckets: ThemeBucket[];
  title: string;
  subtitle?: string;
  tone?: Tone;
  max?: number;
  height?: number;
}

/**
 * Ranked theme shares as horizontal bars.
 *
 * Horizontal because the labels are phrases, not tokens - a vertical axis would
 * force them to rotate, and rotated labels are unreadable. One series, so no
 * legend: the title names the measure. The percentage is direct-labelled on the
 * axis side rather than hidden in a tooltip, because ranking these four or five
 * numbers against each other is the entire point of the chart.
 */
export function ThemeBarChart({
  buckets,
  title,
  subtitle,
  tone = 'complaint',
  max = 8,
  height,
}: ThemeBarChartProps) {
  const tokens = useChartTokens();
  const axis = useAxisProps();

  const color =
    tone === 'complaint'
      ? tokens.status.critical
      : tone === 'praise'
        ? tokens.status.good
        : tokens.categorical[0]!;

  const data = useMemo(
    () =>
      buckets.slice(0, max).map((bucket) => ({
        id: bucket.id,
        label: truncate(bucket.label, 34),
        fullLabel: bucket.label,
        percentage: bucket.percentage,
        count: bucket.count,
        example: bucket.examples[0],
      })),
    [buckets, max],
  );

  const chartHeight = height ?? Math.max(180, data.length * 38 + 32);

  return (
    <ChartFrame title={title} subtitle={subtitle} height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barCategoryGap="24%"
      >
        <CartesianGrid stroke={axis.grid.stroke} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax / 10) * 10)]}
          tick={axis.tick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `${value}%`}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ ...axis.tick, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={190}
        />
        <Tooltip
          cursor={{ fill: axis.grid.stroke, fillOpacity: 0.3 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!point) return null;
            return (
              <ChartTooltipCard
                title={point.fullLabel}
                rows={[
                  { label: 'Share of reviews', value: percent(point.percentage, 1), color },
                  { label: 'Reviews', value: plainNumber(point.count) },
                  ...(point.example ? [{ label: 'Example', value: truncate(point.example, 90) }] : []),
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="percentage"
          radius={[0, 4, 4, 0]}
          isAnimationActive
          label={{
            position: 'right',
            formatter: (value: number) => `${value}%`,
            fill: tokens.inkSecondary,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {data.map((point) => (
            <Cell key={point.id} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
