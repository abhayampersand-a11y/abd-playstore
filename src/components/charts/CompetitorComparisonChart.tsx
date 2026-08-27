'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';

import { percent, plainNumber, rating, truncate } from '@/lib/format';
import { useChartTokens } from '@/theme/chartTokens';
import type { ReviewInsights } from '@/lib/types';
import { ChartFrame, ChartTooltipCard, useAxisProps } from './ChartFrame';

interface CompetitorComparisonChartProps {
  perApp: ReviewInsights['perApp'];
  height?: number;
  max?: number;
}

/**
 * Average sampled rating per competitor, with the field average as a reference
 * line so a bar can be read as "above or below the market" without arithmetic.
 *
 * Single series, single hue - the bars are the same entity measured across
 * apps, not five different things, so colouring them differently would imply a
 * distinction that does not exist.
 */
export function CompetitorComparisonChart({ perApp, height, max = 8 }: CompetitorComparisonChartProps) {
  const tokens = useChartTokens();
  const axis = useAxisProps();
  const color = tokens.categorical[0]!;

  const { data, average } = useMemo(() => {
    const rows = [...perApp]
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, max)
      .map((entry) => ({
        appId: entry.appId,
        label: truncate(entry.title, 26),
        fullLabel: entry.title,
        averageScore: entry.averageScore,
        analysed: entry.analysed,
        negativeShare: entry.negativeShare,
      }));

    const mean = rows.length > 0 ? rows.reduce((sum, row) => sum + row.averageScore, 0) / rows.length : 0;
    return { data: rows, average: Math.round(mean * 100) / 100 };
  }, [perApp, max]);

  const chartHeight = height ?? Math.max(180, data.length * 38 + 40);

  return (
    <ChartFrame
      title="Average sampled rating by app"
      subtitle={`Dashed line marks the field average (${rating(average)})`}
      height={chartHeight}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barCategoryGap="24%"
      >
        <CartesianGrid stroke={axis.grid.stroke} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tick={axis.tick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ ...axis.tick, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={170}
        />
        <ReferenceLine x={average} stroke={tokens.inkMuted} strokeDasharray="4 4" strokeWidth={1.5} />
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
                  { label: 'Average rating', value: rating(point.averageScore), color },
                  { label: 'Reviews sampled', value: plainNumber(point.analysed) },
                  { label: 'Negative share', value: percent(point.negativeShare, 1) },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="averageScore"
          radius={[0, 4, 4, 0]}
          isAnimationActive
          label={{
            position: 'right',
            formatter: (value: number) => value.toFixed(2),
            fill: tokens.inkSecondary,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {data.map((point) => (
            <Cell key={point.appId} fill={color} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
