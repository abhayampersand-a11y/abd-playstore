'use client';

import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useCallback, useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { ErrorState } from '@/components/common/States';
import { useToast } from '@/components/common/ToastProvider';
import { runBuildPlan } from '@/lib/api-client';
import { toAppError, type AppError } from '@/lib/errors';
import type { MvpFeature } from '@/lib/types';
import { GenerateGate } from './GenerateGate';
import { NextStepCard } from './NextStepCard';
import { useResearchWorkspace } from './ResearchWorkspaceProvider';

/** Stage 5 - the plan a small team can actually execute. */
export function BuildPlanStage() {
  const { record, update } = useResearchWorkspace();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const generate = useCallback(async () => {
    if (!record?.analysis) return;
    setLoading(true);
    setError(null);
    try {
      const { plan, usage } = await runBuildPlan({ input: record.input, analysis: record.analysis });
      await update({
        buildPlan: plan,
        stage: 'buildPlan',
        usage: {
          inputTokens: record.usage.inputTokens + usage.inputTokens,
          outputTokens: record.usage.outputTokens + usage.outputTokens,
          calls: record.usage.calls + usage.calls,
        },
      });
      toast.success('Build plan ready');
    } catch (caught) {
      const appError = toAppError(caught);
      setError(appError);
      toast.error(appError.message, 'Could not build the plan');
    } finally {
      setLoading(false);
    }
  }, [record, update, toast]);

  if (!record) return null;

  if (!record.analysis) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="p" sx={{ mb: 1 }}>
          Run the opportunity analysis first
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The build plan is grounded in the opportunity analysis, so that stage has to come first.
        </Typography>
      </Card>
    );
  }

  const plan = record.buildPlan;

  if (!plan) {
    return (
      <GenerateGate
        title="Build This App"
        description={`Turn the "${record.analysis.recommendedApp.name}" concept into a complete product and technical plan.`}
        bullets={[
          'MVP and post-launch feature sets, scoped and prioritised',
          'Full screen inventory, user flow and technical architecture',
          'Database entities, required APIs and a recommended stack',
          'Monetisation, subscription, advertising and launch strategy',
        ]}
        buttonLabel="Build This App"
        runningLabel="Building the plan…"
        estimate="Usually 40-90 seconds"
        icon={<RocketLaunchRoundedIcon />}
        loading={loading}
        error={error}
        onGenerate={() => void generate()}
      />
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        {error ? <ErrorState error={error} onRetry={() => void generate()} /> : null}

        {/* Hero ---------------------------------------------------------- */}
        <Card
          sx={(theme) => ({
            p: { xs: 2.5, sm: 3.5 },
            borderColor: alpha(theme.palette.primary.main, 0.3),
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.09 : 0.04),
          })}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ md: 'flex-start' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h1" component="p" sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' } }}>
                {plan.appName}
              </Typography>
              <Typography variant="h5" component="p" color="primary.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                {plan.tagline}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 2, rowGap: 0.75 }}>
                {plan.targetAudience.map((audience) => (
                  <Chip key={audience} label={audience} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
            <Button
              onClick={() => void generate()}
              variant="outlined"
              disabled={loading}
              startIcon={<RefreshRoundedIcon />}
              sx={{ flexShrink: 0 }}
            >
              {loading ? 'Regenerating…' : 'Regenerate'}
            </Button>
          </Stack>
        </Card>

        {/* Positioning --------------------------------------------------- */}
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          }}
        >
          <SectionCard title="Core problem">
            <Typography variant="body2" sx={{ lineHeight: 1.75 }}>
              {plan.coreProblem}
            </Typography>
          </SectionCard>
          <SectionCard title="Value proposition">
            <Typography variant="body2" sx={{ lineHeight: 1.75 }}>
              {plan.valueProposition}
            </Typography>
          </SectionCard>
          <SectionCard title="Unique selling proposition">
            <Typography variant="body2" sx={{ lineHeight: 1.75 }}>
              {plan.uniqueSellingProposition}
            </Typography>
          </SectionCard>
        </Box>

        {/* Features ------------------------------------------------------ */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard
            title="MVP features"
            subtitle={`${plan.mvpFeatures.length} features · ~${totalWeeks(plan.mvpFeatures)} weeks of work`}
          >
            <Stack spacing={2}>
              {plan.mvpFeatures.map((feature) => (
                <FeatureRow key={feature.feature} feature={feature} />
              ))}
            </Stack>
          </SectionCard>

          <SectionCard title="Advanced features" subtitle="After the MVP has users">
            <Stack spacing={2}>
              {plan.advancedFeatures.map((feature) => (
                <FeatureRow key={feature.feature} feature={feature} muted />
              ))}
            </Stack>
          </SectionCard>
        </Box>

        {/* Flow + screens ------------------------------------------------ */}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1.15fr' } }}>
          <SectionCard title="User flow" icon={<AccountTreeRoundedIcon sx={{ fontSize: 19 }} />}>
            <Stack spacing={0}>
              {plan.userFlow.map((step, index) => (
                <Stack key={step.step} direction="row" spacing={2} alignItems="flex-start">
                  <Stack alignItems="center" sx={{ flexShrink: 0 }}>
                    <Box
                      aria-hidden
                      sx={(theme) => ({
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: theme.palette.primary.main,
                        border: `1.5px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      })}
                    >
                      {step.step}
                    </Box>
                    {index < plan.userFlow.length - 1 ? (
                      <Box sx={{ width: 1.5, flex: 1, minHeight: 22, backgroundColor: 'divider' }} />
                    ) : null}
                  </Stack>
                  <Box sx={{ pb: index < plan.userFlow.length - 1 ? 2 : 0, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                      {step.description}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </SectionCard>

          <SectionCard
            title="Screens"
            subtitle={`${plan.screens.length} screens`}
            icon={<DevicesRoundedIcon sx={{ fontSize: 19 }} />}
          >
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              {plan.screens.map((screen) => (
                <Box
                  key={screen.name}
                  sx={{
                    p: 1.75,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'surface.subtle',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 650, mb: 0.375 }}>
                    {screen.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {screen.purpose}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ rowGap: 0.5 }}>
                    {screen.keyElements.slice(0, 4).map((element) => (
                      <Chip
                        key={element}
                        label={element}
                        size="small"
                        variant="outlined"
                        sx={{ height: 19, fontSize: '0.6875rem' }}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          </SectionCard>
        </Box>

        {/* Monetisation -------------------------------------------------- */}
        <SectionCard
          title="Monetization"
          subtitle={plan.monetization.primaryModel}
          icon={<PaymentsRoundedIcon sx={{ fontSize: 19 }} />}
        >
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
              {plan.monetization.rationale}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: `repeat(${Math.min(plan.monetization.pricingTiers.length, 3)}, 1fr)`,
                },
              }}
            >
              {plan.monetization.pricingTiers.map((tier, index) => (
                <Box
                  key={tier.name}
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: index === 1 ? alpha(theme.palette.primary.main, 0.4) : 'divider',
                    backgroundColor:
                      index === 1 ? alpha(theme.palette.primary.main, 0.05) : theme.palette.surface.subtle,
                  })}
                >
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {tier.name}
                  </Typography>
                  <Typography variant="h4" component="p" sx={{ my: 0.75 }}>
                    {tier.price}
                  </Typography>
                  <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                    {tier.features.map((feature) => (
                      <Typography component="li" key={feature} variant="caption" color="text.secondary">
                        • {feature}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Stack>
        </SectionCard>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard title="Subscription strategy" subtitle={`${plan.subscriptionStrategy.trialDays}-day trial`}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75, lineHeight: 1.75 }}>
              {plan.subscriptionStrategy.summary}
            </Typography>
            <SimpleList items={plan.subscriptionStrategy.tactics} />
          </SectionCard>

          <SectionCard title="Advertising strategy" icon={<CampaignRoundedIcon sx={{ fontSize: 19 }} />}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.75 }}>
              {plan.advertisingStrategy.summary}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.75, rowGap: 0.75 }}>
              {plan.advertisingStrategy.formats.map((format) => (
                <Chip key={format} label={format} size="small" variant="outlined" />
              ))}
            </Stack>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              Placement rules
            </Typography>
            <SimpleList items={plan.advertisingStrategy.placementRules} />
          </SectionCard>
        </Box>

        {/* Technical ----------------------------------------------------- */}
        <SectionCard
          title="Technical architecture"
          icon={<LayersRoundedIcon sx={{ fontSize: 19 }} />}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25, lineHeight: 1.75 }}>
            {plan.technicalArchitecture.summary}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 1.75,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {plan.technicalArchitecture.components.map((component) => (
              <Box
                key={component.name}
                sx={{
                  p: 1.75,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'surface.subtle',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {component.name}
                </Typography>
                <Chip
                  label={component.technology}
                  size="small"
                  variant="outlined"
                  sx={{ my: 0.875, height: 19, fontSize: '0.6875rem' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                  {component.responsibility}
                </Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard title="Recommended technology stack" disablePadding>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Layer</TableCell>
                    <TableCell>Choice</TableCell>
                    <TableCell>Why</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plan.technologyStack.map((tech) => (
                    <TableRow key={`${tech.layer}-${tech.choice}`}>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{tech.layer}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{tech.choice}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{tech.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          <SectionCard title="Required APIs" disablePadding>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>API</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Purpose</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plan.requiredApis.map((api) => (
                    <TableRow key={api.name}>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{api.name}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{api.provider}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{api.purpose}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Box>

        <SectionCard title="Database entities" icon={<StorageRoundedIcon sx={{ fontSize: 19 }} />}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
            }}
          >
            {plan.databaseEntities.map((entity) => (
              <Box
                key={entity.name}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'surface.subtle',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
                  {entity.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.375, mb: 1.25 }}>
                  {entity.description}
                </Typography>
                <Stack component="ul" spacing={0.25} sx={{ m: 0, p: 0, listStyle: 'none' }}>
                  {entity.fields.map((field) => (
                    <Typography
                      component="li"
                      key={field}
                      variant="caption"
                      sx={{ fontFamily: 'ui-monospace, monospace', color: 'text.secondary' }}
                    >
                      {field}
                    </Typography>
                  ))}
                </Stack>
                {entity.relations.length > 0 ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.25, rowGap: 0.5 }}>
                    {entity.relations.map((relation) => (
                      <Chip
                        key={relation}
                        label={relation}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.625rem' }}
                      />
                    ))}
                  </Stack>
                ) : null}
              </Box>
            ))}
          </Box>
        </SectionCard>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <SectionCard title="Notification strategy" icon={<NotificationsActiveRoundedIcon sx={{ fontSize: 19 }} />}>
            <Stack spacing={1.75}>
              {plan.notificationStrategy.map((spec, index) => (
                <Box key={`${spec.trigger}-${index}`}>
                  <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {spec.trigger}
                    </Typography>
                    <Chip label={spec.channel} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.625rem' }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    “{spec.message}”
                  </Typography>
                </Box>
              ))}
            </Stack>
          </SectionCard>

          <SectionCard title="Security considerations" icon={<LockRoundedIcon sx={{ fontSize: 19 }} />}>
            <SimpleList items={plan.securityConsiderations} />
          </SectionCard>
        </Box>

        <SectionCard title="Play Store launch strategy" icon={<RocketLaunchRoundedIcon sx={{ fontSize: 19 }} />}>
          <Stack spacing={2}>
            {plan.launchStrategy.map((step) => (
              <Stack key={step.title} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Chip
                  label={step.timing}
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start', flexShrink: 0, minWidth: 128 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                    {step.description}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </SectionCard>
      </Stack>

      <NextStepCard record={record} />
    </Box>
  );
}

function totalWeeks(features: MvpFeature[]): number {
  return Math.round(features.reduce((sum, feature) => sum + feature.effortWeeks, 0) * 10) / 10;
}

function FeatureRow({ feature, muted = false }: { feature: MvpFeature; muted?: boolean }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 0.375, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {feature.feature}
        </Typography>
        <Chip
          label={feature.priority}
          size="small"
          variant="outlined"
          color={feature.priority === 'must-have' && !muted ? 'primary' : 'default'}
          sx={{ height: 19, fontSize: '0.6875rem' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          ~{feature.effortWeeks}w
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
        {feature.description}
      </Typography>
    </Box>
  );
}

function SimpleList({ items }: { items: string[] }) {
  return (
    <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((item) => (
        <Stack component="li" key={item} direction="row" spacing={1.25} alignItems="flex-start">
          <Box
            aria-hidden
            sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'primary.main', mt: '8px', flexShrink: 0 }}
          />
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
