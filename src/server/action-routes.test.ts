import { describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { VerifyResult } from 'deepspace/worker'
import type { AppContext, Env } from '../../worker'
import { registerActionRoutes } from './action-routes'

vi.mock('deepspace/worker', () => ({
  apiWorkerFetch: vi.fn(),
  normalizeApiError: vi.fn(),
  resolveAppRole: vi.fn(),
}))
vi.mock('../actions/index.js', () => ({ actions: { saveExperiment: vi.fn() } }))

function setup(authenticated = true) {
  const app = new Hono<AppContext>()
  registerActionRoutes(app, async () =>
    authenticated ? ({ userId: 'alice' } as VerifyResult) : null,
  )
  const env = { APP_OWNER_JWT: 'FAKE_SENTINEL_NEVER_A_REAL_SECRET' } as Env
  return { app, env }
}

describe('server action dispatch boundary', () => {
  it.each(['constructor', '__proto__', 'toString', 'valueOf'])(
    'rejects inherited action %s without exposing the worker context',
    async (name) => {
      const { app, env } = setup()
      const response = await app.request(
        `/api/actions/${name}`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer fake-test-only',
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
        env,
      )
      expect(response.status).toBe(404)
      const body = await response.text()
      expect(body).toContain('Action not found')
      expect(body).not.toContain('FAKE_SENTINEL')
    },
  )
  it('rejects anonymous action requests', async () => {
    const { app, env } = setup(false)
    const response = await app.request(
      '/api/actions/saveExperiment',
      { method: 'POST', body: '{}' },
      env,
    )
    expect(response.status).toBe(401)
  })
  it('returns a useful error for invalid JSON before creating tools', async () => {
    const { app, env } = setup()
    const response = await app.request(
      '/api/actions/saveExperiment',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer fake-test-only' },
        body: '{',
      },
      env,
    )
    expect(response.status).toBe(400)
  })
})
