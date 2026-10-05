/** Optional research calls are paid by the caller, never anonymous visitors. */
export const integrations: Record<string, { billing: 'developer' | 'user' }> = {
  google: { billing: 'user' },
  exa: { billing: 'user' },
  firecrawl: { billing: 'user' },
  anthropic: { billing: 'user' },
}
