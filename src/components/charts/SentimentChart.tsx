'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { compactNumber, percent } from '@/lib/format';
import { useSentimentColors } from '@/theme/chartTokens';
import type { SentimentSplit } from '@/lib/types';
import { ChartLegend, ChartTooltipCard } from './ChartFrame';

interface SentimentChartProps {
  sentiment: SentimentSplit;
  title?: string;
  height?: number;
}

/**
 * Review sentiment as a donut.
 *
 * A donut is defensible here for the reason it usually is not: there are
 * exactly three parts, they sum to a meaningful whole, and the reader's job is
 * "roughly how much of this is angry", not precise comparison. The hole carries
 * the number that actually matters - the negative share - as a hero figure.
 */
export function SentimentChart({ sentiment, title = 'Review sentiment', height = 240 }: SentimentChartProps) {
  const colors = useSentimentColors();

  const { data, total, negativeShare } = useMemo(() => {
    const sum = sentiment.positive + sentiment.neutral + sentiment.negative;
    return {
      total: sum,
      negativeShare: sum > 0 ? (sentiment.negative / sum) * 100 : 0,
      data: [
        { name: 'Positive (4-5★)', value: sentiment.positive, color: colors.positive },
        { name: 'Neutral (3★)', value: sentiment.neutral, color: colors.neutral },
        { name: 'Negative (1-2★)', value: sentiment.negative, color: colors.negative },
      ].filter((slice) => slice.value > 0),
    };
  }, [sentiment, colors]);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {compactNumber(total)} reviews analysed
      </Typography>

      <Box sx={{ position: 'relative', width: '100%', height, mt: 1.5 }}>
        {total > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="92%"
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive
                >
                  {data.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0]?.payload as (typeof data)[number] | undefined;
                    if (!point) return null;
                    return (
                      <ChartTooltipCard
                        rows={[
                          { label: point.name, value: compactNumber(point.value), color: point.color },
                          { label: 'Share', value: percent((point.value / total) * 100, 1) },
                        ]}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Hero figure in the hole. `pointer-events: none` keeps the
                underlying slices hoverable straight through it. */}
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', textAlign: 'center' }}
            >
              <Typography
                component="span"
                sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}
              >
                {percent(negativeShare)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                negative
              </Typography>
            </Stack>
          </>
        ) : (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              No reviews to analyse
            </Typography>
          </Stack>
        )}
      </Box>

      {total > 0 ? (
        <Box sx={{ mt: 1.5 }}>
          <ChartLegend items={data.map((slice) => ({ label: slice.name, color: slice.color }))} />
        </Box>
      ) : null}
    </Box>
  );
}
