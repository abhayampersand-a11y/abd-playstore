'use client';

import { useMemo } from 'react';
import { CartesianGrid, Cell, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';

import { compactNumber, rating } from '@/lib/format';
import { useChartTokens } from '@/theme/chartTokens';
import type { Competitor } from '@/lib/types';
import { ChartFrame, ChartTooltipCard, useAxisProps } from './ChartFrame';

/**
 * The competitive landscape: reach against satisfaction.
 *
 * Installs are plotted on a log scale because they span five orders of
 * magnitude - on a linear axis every app below a million installs collapses
 * onto the origin and the chart says nothing. Bubble area encodes rating
 * volume, so a large low-sitting bubble is exactly the signal a developer is
 * hunting for: many users, and many of them unhappy.
 */
export function MarketLandscapeChart({
  competitors,
  height = 300,
}: {
  competitors: Competitor[];
  height?: number;
}) {
  const tokens = useChartTokens();
  const axis = useAxisProps();
  const color = tokens.categorical[0]!;

  const data = useMemo(
    () =>
      competitors
        .filter((competitor) => typeof competitor.score === 'number' && (competitor.minInstalls ?? 0) > 0)
        .map((competitor) => ({
          appId: competitor.appId,
          title: competitor.title,
          developer: competitor.developer,
          // Log10 of installs; the axis is re-labelled back to real numbers.
          x: Math.log10(Math.max(competitor.minInstalls ?? 1, 1)),
          y: competitor.score ?? 0,
          z: Math.max(competitor.ratingCount ?? 1, 1),
          installs: competitor.installs,
          ratingCount: competitor.ratingCount,
        })),
    [competitors],
  );

  if (data.length === 0) {
    return null;
  }

  const minX = Math.floor(Math.min(...data.map((point) => point.x)));
  const maxX = Math.ceil(Math.max(...data.map((point) => point.x)));

  return (
    <ChartFrame
      title="Competitive landscape"
      subtitle="Reach against satisfaction — bubble size is rating volume"
      height={height}
    >
      <ScatterChart margin={{ top: 12, right: 20, bottom: 20, left: -8 }}>
        <CartesianGrid stroke={axis.grid.stroke} />
        <XAxis
          type="number"
          dataKey="x"
          domain={[minX, maxX]}
          ticks={Array.from({ length: maxX - minX + 1 }, (_, index) => minX + index)}
          tickFormatter={(value: number) => compactNumber(10 ** value)}
          tick={axis.tick}
          axisLine={axis.axisLine}
          tickLine={false}
          label={{
            value: 'Installs (log scale)',
            position: 'insideBottom',
            offset: -12,
            fill: tokens.inkMuted,
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={axis.tick}
          axisLine={false}
          tickLine={false}
          width={44}
          label={{
            value: 'Rating',
            angle: -90,
            position: 'insideLeft',
            offset: 20,
            fill: tokens.inkMuted,
            fontSize: 11,
          }}
        />
        <ZAxis type="number" dataKey="z" range={[70, 640]} />
        <Tooltip
          cursor={{ strokeDasharray: '4 4', stroke: tokens.inkMuted }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0]?.payload as (typeof data)[number] | undefined;
            if (!point) return null;
            return (
              <ChartTooltipCard
                title={point.title}
                rows={[
                  { label: 'Developer', value: point.developer },
                  { label: 'Rating', value: rating(point.y), color },
                  { label: 'Installs', value: point.installs ?? compactNumber(10 ** point.x) },
                  { label: 'Ratings', value: compactNumber(point.ratingCount) },
                ]}
              />
            );
          }}
        />
        <Scatter data={data} isAnimationActive>
          {data.map((point) => (
            <Cell
              key={point.appId}
              fill={color}
              fillOpacity={0.55}
              stroke={tokens.surface}
              strokeWidth={2}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartFrame>
  );
}
