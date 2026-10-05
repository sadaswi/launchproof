import { describe, expect, it } from 'vitest'
import {
  extractedPage,
  reviewPrompt,
  reviewSourceMap,
  reviewText,
  reviewWithSources,
  searchHits,
} from './research'
import { demoExperiment } from './experiment'

describe('provider boundaries', () => {
  it('keeps search empty state distinct from malformed provider data', () => {
    expect(searchHits({ results: [] })).toEqual([])
    expect(() => searchHits({ something: 'unexpected' })).toThrow(
      'unexpected format',
    )
  })
  it('drops unsafe search URLs instead of rendering clickable script links', () => {
    expect(
      searchHits({
        results: [
          { title: 'Unsafe', url: 'javascript:alert(1)' },
          { title: 'Official docs', url: 'https://docs.deep.space/' },
        ],
      }),
    ).toEqual([
      { title: 'Official docs', url: 'https://docs.deep.space/', excerpt: '' },
    ])
  })
  it('extracts a bounded page excerpt and refuses missing text', () => {
    expect(
      extractedPage({
        data: { markdown: 'x'.repeat(3000), metadata: { title: 'Title' } },
      }).body,
    ).toHaveLength(2500)
    expect(() => extractedPage({ data: { markdown: '' } })).toThrow(
      'readable text',
    )
  })
  it('never invents an AI answer when a completion is empty or malformed', () => {
    expect(
      reviewText({ content: [{ type: 'text', text: 'An interpretation.' }] }),
    ).toBe('An interpretation.')
    expect(() => reviewText({ content: [] })).toThrow('empty')
    expect(() => reviewText({ error: 'upstream failed' })).toThrow('unexpected')
  })
  it('gives AI the computed rate and tells it not to invent causality', () => {
    const prompt = reviewPrompt(demoExperiment(), [])
    expect(prompt).toContain('36.8%')
    expect(prompt).toContain('Do not invent URLs, results, causality')
  })
  it('keeps a frozen citation map when later evidence changes its position', () => {
    const first = {
      recordId: 'note-original',
      data: {
        title: 'Original source',
        body: 'A source observation.',
        url: '',
        source: 'manual' as const,
        kind: 'observation' as const,
        experimentId: 'exp',
      },
      createdBy: 'alice',
      createdAt: '2026-09-01',
      updatedAt: '2026-09-01',
    }
    const frozen = reviewSourceMap([first])
    const newer = {
      ...first,
      recordId: 'note-newer',
      data: { ...first.data, title: 'Newer source' },
    }
    expect(reviewSourceMap([newer, first])).not.toBe(frozen)
    expect(reviewWithSources('A claim [E1].', frozen)).toContain(
      '[E1] Original source · record note-original',
    )
    expect(
      reviewWithSources('x'.repeat(4000), frozen).length,
    ).toBeLessThanOrEqual(4000)
  })
})
