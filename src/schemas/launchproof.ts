import type { CollectionSchema } from 'deepspace/schema'

// Shared, signed-in workspace. All domain writes use validated server actions.
// Read permissions are still enforced by the SDK before WebSocket delivery.
const permissions: CollectionSchema['permissions'] = {
  viewer: { read: true, create: false, update: false, delete: false },
  member: { read: true, create: false, update: false, delete: false },
  admin: { read: true, create: false, update: false, delete: false },
}
const text = (name: string) => ({
  name,
  storage: 'text' as const,
  interpretation: 'plain' as const,
})
const json = (name: string) => ({
  name,
  storage: 'text' as const,
  interpretation: { kind: 'json' as const },
})
const number = (name: string) => ({
  name,
  storage: 'number' as const,
  interpretation: 'plain' as const,
})

export const experimentsSchema: CollectionSchema = {
  name: 'experiments',
  permissions,
  columns: [
    text('title'),
    text('hypothesis'),
    text('audience'),
    text('channel'),
    text('startDate'),
    text('endDate'),
    text('activationDefinition'),
    text('status'),
    number('targetRate'),
    number('minSample'),
    json('counts'),
    {
      name: 'isDemo',
      storage: 'number',
      interpretation: { kind: 'boolean' },
      default: false,
    },
  ],
}
export const evidenceSchema: CollectionSchema = {
  name: 'evidence',
  permissions,
  columns: [
    text('experimentId'),
    text('title'),
    text('body'),
    text('url'),
    text('kind'),
    text('source'),
  ],
}
export const decisionsSchema: CollectionSchema = {
  name: 'decisions',
  permissions,
  columns: [
    text('experimentId'),
    text('verdict'),
    text('rationale'),
    json('snapshot'),
  ],
}
