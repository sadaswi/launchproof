// Pure logic and action-boundary tests can run before app registration.
// This config does not run, fake, or substitute for the DeepSpace runtime.
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['src/lib/*.test.ts','src/actions/*.test.ts','src/server/*.test.ts'], environment: 'node' } })
