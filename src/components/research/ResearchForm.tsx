'use client';

import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { SectionCard } from '@/components/common/SectionCard';
import {
  COMPETITOR_MAX,
  COMPETITOR_MIN,
  COUNTRY_OPTIONS,
  DEFAULT_RESEARCH_INPUT,
  EXAMPLE_KEYWORDS,
  LANGUAGE_OPTIONS,
  REVIEW_MAX,
  REVIEW_MIN,
  researchInputSchema,
  type ResearchInputValues,
} from '@/lib/validation';

interface ResearchFormProps {
  onSubmit: (values: ResearchInputValues) => void;
  submitting?: boolean;
  defaultValues?: Partial<ResearchInputValues>;
}

export function ResearchForm({ onSubmit, submitting = false, defaultValues }: ResearchFormProps) {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResearchInputValues>({
    resolver: zodResolver(researchInputSchema),
    defaultValues: { ...DEFAULT_RESEARCH_INPUT, ...defaultValues },
    mode: 'onBlur',
  });

  const competitorCount = watch('competitorCount');
  const reviewCount = watch('reviewCount');

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5}>
        <SectionCard
          title="What do you want to build?"
          subtitle="Give a category, a keyword or a rough idea. AppScout will find who already owns it."
        >
          <Stack spacing={2.5}>
            <Controller
              name="keyword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="App idea or keyword"
                  placeholder="e.g. Expense Manager"
                  fullWidth
                  size="medium"
                  autoFocus
                  error={Boolean(errors.keyword)}
                  helperText={errors.keyword?.message ?? 'This is what gets searched on Google Play.'}
                  slotProps={{ htmlInput: { maxLength: 80, 'aria-label': 'App idea or keyword' } }}
                />
              )}
            />

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Or start from an example
              </Typography>
              <Stack direction="row" spacing={0.875} flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
                {EXAMPLE_KEYWORDS.map((keyword) => (
                  <Chip
                    key={keyword}
                    label={keyword}
                    variant="outlined"
                    onClick={() => setValue('keyword', keyword, { shouldValidate: true })}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </SectionCard>

        <SectionCard
          title="Market"
          subtitle="Reviews are mined in the language you pick, so match it to the market."
        >
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Country"
                  fullWidth
                  size="medium"
                  error={Boolean(errors.country)}
                  helperText={errors.country?.message}
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Review language"
                  fullWidth
                  size="medium"
                  error={Boolean(errors.language)}
                  helperText={errors.language?.message}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
        </SectionCard>

        <SectionCard
          title="Depth"
          subtitle="More depth means a slower run and more tokens used. The defaults are the sweet spot."
        >
          <Stack spacing={3.5}>
            <Controller
              name="competitorCount"
              control={control}
              render={({ field }) => (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 550 }}>
                      Competitor apps
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {competitorCount}
                    </Typography>
                  </Stack>
                  <Slider
                    name={field.name}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(_, value) => field.onChange(value)}
                    min={COMPETITOR_MIN}
                    max={COMPETITOR_MAX}
                    step={1}
                    marks={[
                      { value: COMPETITOR_MIN, label: String(COMPETITOR_MIN) },
                      { value: 10, label: '10' },
                      { value: COMPETITOR_MAX, label: String(COMPETITOR_MAX) },
                    ]}
                    valueLabelDisplay="auto"
                    aria-label="Number of competitor apps"
                  />
                  <Typography variant="caption" color="text.secondary">
                    How many apps to pull full listing detail for.
                  </Typography>
                </Box>
              )}
            />

            <Controller
              name="reviewCount"
              control={control}
              render={({ field }) => (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 550 }}>
                      Reviews to analyse
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {reviewCount}
                    </Typography>
                  </Stack>
                  <Slider
                    name={field.name}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(_, value) => field.onChange(value)}
                    min={REVIEW_MIN}
                    max={REVIEW_MAX}
                    step={10}
                    marks={[
                      { value: REVIEW_MIN, label: String(REVIEW_MIN) },
                      { value: 300, label: '300' },
                      { value: REVIEW_MAX, label: String(REVIEW_MAX) },
                    ]}
                    valueLabelDisplay="auto"
                    aria-label="Number of reviews to analyse"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Spread across the most informative competitors, newest first.
                  </Typography>
                </Box>
              )}
            />
          </Stack>
        </SectionCard>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            startIcon={<RocketLaunchRoundedIcon />}
          >
            {submitting ? 'Researching…' : 'Start Market Research'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            Typically takes 40-90 seconds. Google Play scraping runs first, then the AI analysis.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
