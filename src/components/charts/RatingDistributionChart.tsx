'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';

import { compactNumber, percent } from '@/lib/format';
import { useHistogramColors } from '@/theme/chartTokens';
import type { RatingHistogram } from '@/lib/types';
import { ChartFrame, ChartTooltipCard, useAxisProps } from './ChartFrame';

interface RatingDistributionChartProps {
  histogram: RatingHistogram;
  title?: string;
  subtitle?: string;
  height?: number;
}

/**
 * Star distribution.
 *
 * The scale is ordinal (1★ is worse than 5★), so it is coloured with the
 * bad→good status ramp rather than five categorical hues - the reader should
 * see polarity at a glance, not five unrelated categories.
 */
export function RatingDistributionChart({
  histogram,
  title = 'Rating distribution',
  subtitle,
  height = 240,
}: RatingDistributionChartProps) {
  const colors = useHistogramColors();
  const axis = useAxisProps();

  const { data, total } = useMemo(() => {
    const stars = ['1', '2', '3', '4', '5'] as const;
    const sum = stars.reduce((acc, star) => acc + (histogram[star] ?? 0), 0);
    return {
      total: sum,
      data: stars.map((star, index) => ({
        star: `${star}★`,
        count: histogram[star] ?? 0,
        share: sum > 0 ? ((histogram[star] ?? 0) / sum) * 100 : 0,
        color: colors[index] ?? colors[0]!,
      })),
    };
  }, [histogram, colors]);

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle ?? `${compactNumber(total)} ratings`}
      height={height}
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
        <CartesianGrid stroke={axis.grid.stroke} vertical={false} />
        <XAxis dataKey="star" tick={axis.tick} axisLine={axis.axisLine} tickLine={axis.tickLine} />
        <YAxis
          tick={axis.tick}
          axisLine={false}
          tickLine={axis.tickLine}
          tickFormatter={(value: number) => compactNumber(value)}
          width={48}
        />
        <Tooltip
          cursor={{ fill: axis.grid.stroke, fillOpacity: 0.35 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!point) return null;
            return (
              <ChartTooltipCard
                title={`${point.star} ratings`}
                rows={[
                  { label: 'Ratings', value: compactNumber(point.count), color: point.color },
                  { label: 'Share', value: percent(point.share, 1) },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive>
          {data.map((point) => (
            <Cell key={point.star} fill={point.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
