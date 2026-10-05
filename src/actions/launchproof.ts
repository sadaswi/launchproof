import { resolveAppRole } from 'deepspace/worker'
import type {
  ActionContext,
  ActionHandler,
  ActionTools,
} from 'deepspace/worker'
import { z } from 'zod'
import type { Env } from '../../worker'
import {
  decisionSchema,
  evidenceSchema,
  experimentSchema,
  revisionOf,
} from '../lib/experiment'
import type { Row, Experiment, Evidence } from '../lib/experiment'

const idSchema = z.string().min(1).max(150)
const saveSchema = z
  .object({ id: idSchema.optional(), experiment: experimentSchema })
  .strict()
const fail = (error: string) => ({ success: false as const, error })
async function get<T extends Record<string, unknown>>(
  tools: ActionTools,
  collection: string,
  id: string,
): Promise<Row<T> | null> {
  const result = await tools.get<T>(collection, id)
  if (!result.success) return null
  return result.data.record ?? null
}
type MemberHandler = (
  ctx: ActionContext<Env>,
  role: 'admin' | 'member',
) => ReturnType<ActionHandler<Env>>
const memberOnly =
  (handler: MemberHandler): ActionHandler<Env> =>
  async (ctx) => {
    try {
      const role = await resolveAppRole(ctx.env, ctx.userId)
      if (role !== 'admin' && role !== 'member')
        return fail('You have read-only access to this workspace.')
      return await handler(ctx, role)
    } catch (error) {
      if (error instanceof z.ZodError)
        return fail(error.issues[0]?.message ?? 'Check the form values.')
      console.error(
        '[launchproof] Action failed',
        error instanceof Error ? error.message : 'Unknown error',
      )
      return fail(
        'The change could not be saved. Your draft is still here; try again.',
      )
    }
  }

export const launchproofActions: Record<string, ActionHandler<Env>> = {
  saveExperiment: memberOnly(async ({ userId, params, tools }, role) => {
    const { id, experiment } = saveSchema.parse(params)
    if (!id) return tools.create('experiments', experiment)
    const current = await get<Experiment>(tools, 'experiments', id)
    if (!current || (current.createdBy !== userId && role !== 'admin'))
      return fail(
        'Only the experiment owner or an admin can change its plan or results.',
      )
    return tools.update('experiments', id, experiment)
  }),
  addEvidence: memberOnly(async ({ params, tools }) => {
    const evidence = evidenceSchema.parse(params)
    const experiment = await get<Experiment>(
      tools,
      'experiments',
      evidence.experimentId,
    )
    if (!experiment) return fail('This experiment is no longer available.')
    const existing = await tools.query('evidence', {
      where: { experimentId: evidence.experimentId },
      limit: 101,
    })
    if (!existing.success) return existing
    if (existing.data.records.length >= 100)
      return fail(
        'This experiment already has 100 evidence notes. Remove an outdated note before adding another.',
      )
    return tools.create('evidence', evidence)
  }),
  removeEvidence: memberOnly(async ({ userId, params, tools }, role) => {
    const { id } = z.object({ id: idSchema }).strict().parse(params)
    const evidence = await get<Evidence>(tools, 'evidence', id)
    if (!evidence || (evidence.createdBy !== userId && role !== 'admin'))
      return fail('Only the note author or an admin can remove this evidence.')
    return tools.remove('evidence', id)
  }),
  recordDecision: memberOnly(async ({ userId, params, tools }, role) => {
    const { reviewedRevision, ...input } = decisionSchema.parse(params)
    const experiment = await get<Experiment>(
      tools,
      'experiments',
      input.experimentId,
    )
    if (!experiment || (experiment.createdBy !== userId && role !== 'admin'))
      return fail(
        'Only the experiment owner or an admin can record a decision.',
      )
    const evidenceResult = await tools.query<Evidence>('evidence', {
      where: { experimentId: input.experimentId },
      limit: 101,
    })
    if (!evidenceResult.success) return evidenceResult
    const evidence = evidenceResult.data.records
    if (evidence.length > 100)
      return fail(
        'Reduce this experiment to 100 evidence notes before reviewing it.',
      )
    const revision = revisionOf(experiment.data, evidence)
    if (reviewedRevision !== revision)
      return fail(
        'The plan or evidence changed while you were reviewing. Close this form, review the latest changes, and record your decision again.',
      )
    // The snapshot and verdict are one immutable record. No second write can
    // leave an experiment marked complete without its decision being saved.
    return tools.create('decisions', {
      ...input,
      snapshot: {
        experiment: experimentSchema.parse(experiment.data),
        evidence: evidence.map((row) => ({
          recordId: row.recordId,
          title: row.data.title,
          body: row.data.body,
          url: row.data.url,
          kind: row.data.kind,
          source: row.data.source,
        })),
        revision,
      },
    })
  }),
}
