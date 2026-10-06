import { z } from 'zod'

export const stages = [
  {
    key: 'visitors',
    label: 'Visitors',
    detail: 'Unique people in this cohort',
  },
  {
    key: 'signups',
    label: 'Signed up',
    detail: 'People who created an account',
  },
  {
    key: 'deployed',
    label: 'Deployed',
    detail: 'Developers who shipped a first app',
  },
  {
    key: 'realUse',
    label: 'Real use',
    detail: 'Developers whose app reached another real user',
  },
  {
    key: 'returned',
    label: 'Came back',
    detail: 'Developers who returned to improve that useful app',
  },
] as const
export type StageKey = (typeof stages)[number]['key']
export type Counts = Record<StageKey | 'paid', number | null>
const count = z.number().int().min(0).max(100_000_000).nullable()
export const countsSchema = z
  .object({
    visitors: count,
    signups: count,
    deployed: count,
    realUse: count,
    returned: count,
    paid: count,
  })
  .strict()
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.')
  .refine((value) => {
    const parsed = new Date(value + 'T00:00:00Z')
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    )
  }, 'Choose a valid date.')

export const experimentSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a short experiment title.').max(120),
    hypothesis: z
      .string()
      .trim()
      .min(15, 'Explain what you expect to change and why.')
      .max(1500),
    audience: z.string().trim().min(3, 'Who is this experiment for?').max(300),
    channel: z.enum([
      'Community',
      'Content',
      'Partnership',
      'Event',
      'Outbound',
      'Product',
    ]),
    startDate: date,
    endDate: date,
    activationDefinition: z.string().trim().min(10).max(500),
    targetRate: z.number().min(0).max(100),
    minSample: z.number().int().min(1).max(100_000_000),
    status: z.enum(['draft', 'active']),
    counts: countsSchema,
    // DeepSpace stores boolean-interpreted columns as SQLite 0/1 values. The
    // current SDK preserves that numeric representation when reading records,
    // so normalize it at the app boundary before validation.
    isDemo: z
      .preprocess(
        (value) => (value === 1 ? true : value === 0 ? false : value),
        z.boolean(),
      )
      .default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate)
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'The end date must follow the start date.',
      })
    let previous: { value: number; label: string } | null = null
    for (const stage of stages) {
      const current = value.counts[stage.key]
      if (current === null) continue
      if (previous && current > previous.value)
        ctx.addIssue({
          code: 'custom',
          path: ['counts', stage.key],
          message: `${stage.label} cannot exceed ${previous.label.toLowerCase()} in the same cohort.`,
        })
      previous = { value: current, label: stage.label }
    }
    if (
      value.counts.paid !== null &&
      value.counts.signups !== null &&
      value.counts.paid > value.counts.signups
    )
      ctx.addIssue({
        code: 'custom',
        path: ['counts', 'paid'],
        message: 'Paid developers cannot exceed signups.',
      })
  })
export type Experiment = z.infer<typeof experimentSchema>
export interface Row<T> {
  recordId: string
  data: T
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function publicUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      host.includes('.') &&
      !host.endsWith('.local') &&
      !host.endsWith('.localhost') &&
      !host.endsWith('.internal') &&
      !/^[\d.]+$/.test(host) &&
      !host.includes(':')
    )
  } catch {
    return false
  }
}
export const evidenceSchema = z
  .object({
    experimentId: z.string().min(1).max(150),
    title: z.string().trim().min(3).max(160),
    body: z.string().trim().min(5).max(4000),
    url: z
      .string()
      .max(2000)
      .refine(
        (v) => !v || publicUrl(v),
        'Use a public HTTPS link, without credentials.',
      ),
    kind: z.enum(['observation', 'assumption']),
    source: z.enum(['manual', 'exa', 'firecrawl', 'anthropic']),
  })
  .strict()
  .refine((v) => v.source !== 'anthropic' || v.kind === 'assumption', {
    path: ['kind'],
    message: 'An AI review is an interpretation, not an observation.',
  })
export type Evidence = z.infer<typeof evidenceSchema>
export const decisionSchema = z
  .object({
    experimentId: z.string().min(1).max(150),
    reviewedRevision: z.string().min(1).max(50000),
    verdict: z.enum(['continue', 'change', 'stop']),
    rationale: z
      .string()
      .trim()
      .min(
        20,
        'Explain the evidence behind your decision (at least 20 characters).',
      )
      .max(4000),
  })
  .strict()
export type DecisionInput = z.infer<typeof decisionSchema>
export interface Decision extends Omit<DecisionInput, 'reviewedRevision'> {
  snapshot: {
    experiment: Experiment
    evidence: Array<{
      recordId: string
      title: string
      body: string
      url: string
      kind: string
      source: string
    }>
    revision: string
  }
}

export function percentage(
  numerator: number | null,
  denominator: number | null,
): number | null {
  return numerator === null || denominator === null || denominator <= 0
    ? null
    : (numerator / denominator) * 100
}
export const formatRate = (rate: number | null) =>
  rate === null ? 'N/A' : `${rate.toFixed(1)}%`
export const formatCount = (value: number | null) =>
  value === null ? '—' : value.toLocaleString('en-US')
export function assess(experiment: Experiment) {
  const rate = percentage(experiment.counts.realUse, experiment.counts.deployed)
  if (rate === null)
    return {
      state: 'missing' as const,
      rate,
      label: 'Measurement needed',
      detail: 'Add deployments and real-use counts before assessing this test.',
    }
  if (experiment.counts.deployed! < experiment.minSample)
    return {
      state: 'small' as const,
      rate,
      label: 'Small sample',
      detail: `${experiment.counts.deployed} of ${experiment.minSample} required deployments. Treat the result as early evidence.`,
    }
  return rate >= experiment.targetRate
    ? {
        state: 'met' as const,
        rate,
        label: 'Threshold met',
        detail:
          'The observed rate meets your threshold. This does not establish causality or statistical significance.',
      }
    : {
        state: 'below' as const,
        rate,
        label: 'Below threshold',
        detail:
          'Review the audience, experience, and measurement before deciding what to change.',
      }
}
export function revisionOf(
  experiment: Experiment,
  evidence: Row<Evidence>[],
): string {
  return JSON.stringify({
    experiment: experimentSchema.parse(experiment),
    evidence: evidence
      .map((row) => ({ id: row.recordId, updatedAt: row.updatedAt }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  })
}
export function emptyExperiment(): Experiment {
  const today = new Date().toISOString().slice(0, 10)
  return {
    title: '',
    hypothesis: '',
    audience: '',
    channel: 'Community',
    startDate: today,
    endDate: today,
    activationDefinition:
      'A developer deploys an app that is used by at least one person other than its builder.',
    targetRate: 30,
    minSample: 20,
    status: 'draft',
    isDemo: false,
    counts: {
      visitors: null,
      signups: null,
      deployed: null,
      realUse: null,
      returned: null,
      paid: null,
    },
  }
}
export function demoExperiment(): Experiment {
  return {
    ...emptyExperiment(),
    title: 'From workshop to a useful app',
    hypothesis:
      'A guided developer workshop with a follow-up checklist will help more first-time builders get real users for their deployed app.',
    audience:
      'First-time AI-assisted app builders in a fictional workshop cohort',
    channel: 'Event',
    startDate: '2026-09-01',
    endDate: '2026-09-14',
    status: 'active',
    isDemo: true,
    counts: {
      visitors: 480,
      signups: 92,
      deployed: 38,
      realUse: 14,
      returned: 8,
      paid: 5,
    },
  }
}
