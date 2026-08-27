'use client';

import { useMemo } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from 'recharts';

import { SCORE_DESCRIPTORS } from '@/lib/research/scoring';
import { useChartTokens } from '@/theme/chartTokens';
import type { ScoreSet } from '@/lib/types';
import { ChartFrame, ChartTooltipCard } from './ChartFrame';

/**
 * The five component scores on one radar.
 *
 * A radar works here only because every axis shares the same 0-10 scale and the
 * same polarity - higher is better on all five - so the enclosed shape is
 * meaningful rather than decorative. The overall opportunity score is
 * deliberately *not* plotted: it is a verdict about the shape, not another axis
 * of it, and it gets its own hero dial.
 */
export function ScoreRadarChart({ scores, height = 280 }: { scores: ScoreSet; height?: number }) {
  const tokens = useChartTokens();
  const color = tokens.categorical[0]!;

  const data = useMemo(
    () =>
      SCORE_DESCRIPTORS.map((descriptor) => ({
        axis: descriptor.label,
        value: scores[descriptor.key],
        highMeans: descriptor.highMeans,
      })),
    [scores],
  );

  return (
    <ChartFrame
      title="Opportunity profile"
      subtitle="All five axes run 0-10; higher is always better for you"
      height={height}
    >
      <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
        <PolarGrid stroke={tokens.grid} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: tokens.inkSecondary, fontSize: 11.5, fontWeight: 550 }} />
        <PolarRadiusAxis
          domain={[0, 10]}
          tickCount={6}
          tick={{ fill: tokens.inkMuted, fontSize: 10 }}
          axisLine={false}
        />
        <Radar
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.22}
          isAnimationActive
          dot={{ r: 4, fill: color, stroke: tokens.surface, strokeWidth: 2 }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!point) return null;
            return (
              <ChartTooltipCard
                title={point.axis}
                rows={[
                  { label: 'Score', value: `${point.value.toFixed(1)} / 10`, color },
                  { label: 'High means', value: point.highMeans },
                ]}
              />
            );
          }}
        />
      </RadarChart>
    </ChartFrame>
  );
}
