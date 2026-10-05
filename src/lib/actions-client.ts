import { getAuthToken } from 'deepspace'

export async function runAction<T = { recordId: string }>(
  name: string,
  input: unknown,
): Promise<T> {
  const token = await getAuthToken()
  if (!token)
    throw new Error('Your session has ended. Sign in again to save this draft.')
  let response: Response
  try {
    response = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    })
  } catch {
    throw new Error(
      'Connection lost. Your draft has not been cleared. Reconnect and try again.',
    )
  }
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean
    error?: string
    data?: T
  } | null
  if (!response.ok || !payload?.success)
    throw new Error(
      payload?.error || 'The server could not save this change. Try again.',
    )
  return payload.data as T
}
