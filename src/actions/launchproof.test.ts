import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionContext, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { demoExperiment, revisionOf } from '../lib/experiment'
import { launchproofActions } from './launchproof'
const { role } = vi.hoisted(() => ({ role: vi.fn() }))
vi.mock('deepspace/worker', () => ({ resolveAppRole: role }))

function context(userId = 'alice') {
  const row = {
    recordId: 'experiment-1',
    data: demoExperiment(),
    createdBy: 'alice',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  }
  const create = vi.fn(async () => ({
    success: true,
    data: { recordId: 'created-1' },
  }))
  const update = vi.fn(async () => ({
    success: true,
    data: { recordId: 'experiment-1' },
  }))
  const tools = {
    get: vi.fn(async () => ({ success: true, data: { record: row } })),
    query: vi.fn(async () => ({
      success: true,
      data: { records: [], count: 0 },
    })),
    create,
    update,
    remove: vi.fn(),
  } as unknown as ActionTools
  const ctx = {
    userId,
    params: {},
    tools,
    env: { OWNER_USER_ID: 'owner' },
    callerJwt: 'test-token-not-a-real-credential',
  } as ActionContext<Env>
  return { ctx, row, create, update }
}
beforeEach(() => role.mockResolvedValue('member'))
describe('server action authorization and snapshots', () => {
  it('denies editing another contributor’s experiment', async () => {
    const { ctx, row, update } = context('bob')
    ctx.params = { id: row.recordId, experiment: row.data }
    const result = await launchproofActions.saveExperiment(ctx)
    expect(result.success).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })
  it('denies a viewer even with a valid-looking request', async () => {
    role.mockResolvedValue('viewer')
    const { ctx, row, create } = context()
    ctx.params = { experiment: row.data }
    expect((await launchproofActions.saveExperiment(ctx)).success).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })
  it('validates cohort counts on the server, not only in the form', async () => {
    const { ctx, row, create } = context()
    row.data.counts.realUse = 500
    ctx.params = { experiment: row.data }
    expect((await launchproofActions.saveExperiment(ctx)).success).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })
  it('uses the verified owner and denies a forged decision snapshot', async () => {
    const { ctx, create } = context()
    ctx.params = {
      experimentId: 'experiment-1',
      verdict: 'continue',
      reviewedRevision: revisionOf(demoExperiment(), []),
      rationale: 'There is enough evidence to run one more small test.',
      snapshot: { madeUp: true },
    }
    expect((await launchproofActions.recordDecision(ctx)).success).toBe(false)
    expect(create).not.toHaveBeenCalled()
  })
  it('captures the server’s data in one immutable decision write', async () => {
    const { ctx, row, create, update } = context()
    ctx.params = {
      experimentId: 'experiment-1',
      verdict: 'change',
      reviewedRevision: revisionOf(demoExperiment(), []),
      rationale:
        'We will test a follow-up checklist before increasing distribution.',
    }
    expect((await launchproofActions.recordDecision(ctx)).success).toBe(true)
    const payload = (
      create.mock.calls as unknown as Array<
        [
          string,
          { snapshot: { experiment: ReturnType<typeof demoExperiment> } },
        ]
      >
    )[0][1]
    expect(payload.snapshot.experiment.counts.realUse).toBe(14)
    row.data.counts.realUse = 2
    expect(payload.snapshot.experiment.counts.realUse).toBe(14)
    expect(update).not.toHaveBeenCalled()
  })
  it('does not let a contributor remove another person’s evidence', async () => {
    const { ctx } = context('bob')
    ctx.params = { id: 'evidence-1' }
    expect((await launchproofActions.removeEvidence(ctx)).success).toBe(false)
    expect(ctx.tools.remove).not.toHaveBeenCalled()
  })
  it('lets a verified admin manage an experiment owned by someone else', async () => {
    role.mockResolvedValue('admin')
    const { ctx, row, update } = context('admin-2')
    ctx.params = { id: row.recordId, experiment: row.data }
    expect((await launchproofActions.saveExperiment(ctx)).success).toBe(true)
    expect(update).toHaveBeenCalledOnce()
  })
  it('refuses a decision if evidence changed after the human opened the form', async () => {
    const { ctx, row, create } = context()
    const reviewedRevision = revisionOf(row.data, [])
    row.data.counts.realUse = 10
    ctx.params = {
      experimentId: 'experiment-1',
      verdict: 'change',
      reviewedRevision,
      rationale:
        'Review the workshop follow-up before increasing the next budget.',
    }
    const result = await launchproofActions.recordDecision(ctx)
    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining('changed while you were reviewing'),
    })
    expect(create).not.toHaveBeenCalled()
  })
})
