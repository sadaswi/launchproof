import { describe, expect, it } from 'vitest'
import {
  assess,
  demoExperiment,
  evidenceSchema,
  experimentSchema,
  percentage,
  publicUrl,
  revisionOf,
} from './experiment'

describe('cohort math and evidence boundaries', () => {
  it('distinguishes unmeasured, measured-zero, and a valid conversion', () => {
    expect(percentage(null, 10)).toBeNull()
    expect(percentage(0, null)).toBeNull()
    expect(percentage(0, 0)).toBeNull()
    expect(percentage(0, 10)).toBe(0)
    expect(percentage(14, 38)).toBeCloseTo(36.8421)
  })
  it('does not mark a high rate from five deployments as threshold met', () => {
    const experiment = demoExperiment()
    experiment.counts = {
      visitors: 90,
      signups: 21,
      deployed: 5,
      realUse: 3,
      returned: 1,
      paid: 2,
    }
    expect(assess(experiment)).toMatchObject({ state: 'small', rate: 60 })
  })
  it('treats paid use separately from return-to-improve', () => {
    const experiment = demoExperiment()
    experiment.counts.returned = 1
    experiment.counts.paid = 20
    expect(experimentSchema.safeParse(experiment).success).toBe(true)
    experiment.counts.paid = 100
    expect(experimentSchema.safeParse(experiment).success).toBe(false)
  })
  it('rejects impossible cohorts even across an unmeasured stage', () => {
    const experiment = demoExperiment()
    experiment.counts.deployed = null
    experiment.counts.realUse = 100
    expect(experimentSchema.safeParse(experiment).success).toBe(false)
    experiment.counts.realUse = 2.5
    expect(experimentSchema.safeParse(experiment).success).toBe(false)
  })
  it('rejects an impossible calendar date or backwards window', () => {
    const experiment = demoExperiment()
    experiment.endDate = '2026-02-30'
    expect(experimentSchema.safeParse(experiment).success).toBe(false)
    experiment.endDate = '2026-08-30'
    expect(experimentSchema.safeParse(experiment).success).toBe(false)
  })
  it('flags zero measurements as missing and measured underperformance as below', () => {
    const experiment = demoExperiment()
    experiment.counts.deployed = 0
    experiment.counts.realUse = 0
    expect(assess(experiment).state).toBe('missing')
    experiment.counts.deployed = 30
    experiment.counts.realUse = 0
    expect(assess(experiment).state).toBe('below')
  })
  it('changes the decision revision when the goal or an evidence note changes', () => {
    const experiment = demoExperiment()
    const a = revisionOf(experiment, [])
    expect(revisionOf({ ...experiment, targetRate: 40 }, [])).not.toBe(a)
    expect(revisionOf(experiment, [])).toBe(a)
  })
  it('normalizes DeepSpace SQLite booleans when reading a record', () => {
    expect(
      experimentSchema.parse({ ...demoExperiment(), isDemo: 1 }).isDemo,
    ).toBe(true)
    expect(
      experimentSchema.parse({ ...demoExperiment(), isDemo: 0 }).isDemo,
    ).toBe(false)
  })
  it('rejects unsafe source links and mislabeled AI observations', () => {
    expect(publicUrl('https://docs.deep.space/guides/authentication')).toBe(
      true,
    )
    for (const url of [
      'javascript:alert(1)',
      'http://localhost',
      'https://127.0.0.1/',
      'https://user:password@example.com',
      'https://[::1]/',
      'https://example.internal',
    ])
      expect(publicUrl(url)).toBe(false)
    expect(
      evidenceSchema.safeParse({
        experimentId: 'x',
        title: 'AI review',
        body: 'A speculative conclusion.',
        url: '',
        kind: 'observation',
        source: 'anthropic',
      }).success,
    ).toBe(false)
  })
})
