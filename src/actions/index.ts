import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { launchproofActions } from './launchproof'

export const actions: Record<string, ActionHandler<Env>> = launchproofActions
