import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('records endpoint refuses anonymous access', async ({ request }) => {
    const response = await request.get('/ws/evaluation-room')
    expect(response.status()).toBe(401)
  })

  test('server actions refuse anonymous writes', async ({ request }) => {
    const response = await request.post('/api/actions/saveExperiment', {
      data: {},
    })
    expect(response.status()).toBe(401)
  })

  test('research proxy refuses anonymous paid calls before contacting providers', async ({
    request,
  }) => {
    const response = await request.post('/api/integrations/exa/search', {
      data: { query: 'test' },
    })
    expect(response.status()).toBe(401)
  })

  test('unused integrations are not exposed', async ({ request }) => {
    const response = await request.post(
      '/api/integrations/unconfigured/endpoint',
      { data: {} },
    )
    expect(response.status()).toBe(404)
  })
})
