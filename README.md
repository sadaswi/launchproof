# LaunchProof

An experiment notebook for developer growth teams, built with the DeepSpace SDK by Sadaswi Talluru with coding-agent assistance.

**Current status:** the core source is implemented. TypeScript, lint, and 28 focused calculation, authorization, request-dispatch, and provider-parsing tests pass. DeepSpace registration and the production build have now passed. Browser tests, live provider calls, and deployment remain pending. The current test environment could not download Chromium, and its local Worker cannot resolve the auth service. There is no live URL yet.

## The useful path

1. **Plan** a small experiment: audience, hypothesis, dates, a definition of real use, and a success threshold.
2. **Measure** one cohort from visitors to signups, deployment, real use, and returning to improve the app. Track paid developers separately.
3. **Collect evidence**: distinguish observations from interpretations, retain source links, and collaborate through DeepSpace realtime records.
4. **Decide** to continue, change, or stop, with a written rationale.
5. **Preserve the reasoning** in an immutable snapshot. Later edits mark the previous decision as out of date. A decision is rejected if the reviewed data changed while its form was open.
6. **Export** the plan, counts, evidence, and decision history as Markdown.

The landing page contains a synthetic cohort and an interactive small-sample demonstration. No actual employer or DeepSpace results are included.

## Why this scope

Deployment alone does not show lasting product value. LaunchProof makes the post-deployment questions visible: did another person use the app, and did its builder return to improve it?

The main tradeoff is **manual, explicitly defined cohort counts rather than an automatic analytics ingestion pipeline**. This keeps the assignment focused on interpretation, permissions, collaboration, and a complete decision flow. It also avoids connecting confidential workplace data. Counts are descriptive; a threshold check is not a causal claim or a significance test.

This is one shared evaluation workspace, visible to all signed-in users. It is not a private multi-tenant analytics product. Use public or synthetic data only.

## Three optional integrations

| DeepSpace integration       | Product purpose                                 | User control                                        |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `exa/search`                | Find relevant public sources                    | Explicit search, three results                      |
| `firecrawl/scrape`          | Read one source into a reviewable excerpt       | Explicit public HTTPS URL                           |
| `anthropic/chat-completion` | Challenge the reasoning and suggest a next test | Explicit request; AI text remains an interpretation |

All three use **caller billing** and the UI explains that they consume the caller's DeepSpace credits. No research runs automatically. Provider errors do not create fabricated fallback results. Users review returned text before saving it. Numbered AI citations carry a frozen source map so later evidence changes cannot silently relabel them.

These are implemented integrations, not yet live-verified integrations. The core workflow works without buying research credits. Additional outbound, CRM, payment, and notification integrations were omitted because they do not improve this focused decision workflow.

## Architecture and permissions

- **Frontend:** React, Vite, TypeScript, Tailwind, the scaffold's accessible Base UI primitives, and a custom paper/green visual theme.
- **Backend:** scaffolded Hono/Cloudflare worker; DeepSpace authentication, RecordRoom storage, realtime queries, and integration proxy.
- **Data:** `experiments`, `evidence`, and `decisions`, plus required SDK collections.
- **Writes:** authenticated server actions validate input and authorize ownership. Direct writes to business collections are denied, including admin writes; no client can rewrite a saved snapshot.
- **Roles:** viewers read; members create experiments and contribute evidence; experiment owners or admins edit results and record decisions; note authors or admins remove notes. All signed-in roles can read shared records.
- **Identity:** verified JWTs and SDK-managed metadata. No user identity is accepted from form fields or client-controlled internal headers.

An independent source review identified an inherited-property action lookup in the scaffold. Dispatch now requires a registered own property, with regression tests for `constructor`, `__proto__`, `toString`, and `valueOf`.

### Code map

| File                               | What to understand                                                  |
| ---------------------------------- | ------------------------------------------------------------------- |
| `src/lib/experiment.ts`            | Cohort validation, conversion math, thresholds, revision comparison |
| `src/actions/launchproof.ts`       | Authorization and snapshot creation                                 |
| `src/schemas/launchproof.ts`       | DeepSpace collections and direct-write permissions                  |
| `src/components/Workspace.tsx`     | Realtime experiment/evidence/decision interface                     |
| `src/components/ResearchPanel.tsx` | Explicit provider requests and failure states                       |
| `src/lib/research.ts`              | Provider parsing, AI prompt, frozen citation map                    |
| `src/server/action-routes.ts`      | Authenticated action dispatch boundary                              |

## Run locally

Use a supported Node version (the scaffold accepts Node 22.15+, 24, or 26 within their major lines) and npm 11.6+.

```bash
npm ci
npx deepspace auth login
npx deepspace auth whoami --json
```

Confirm the login is the intended app owner before registration. Then:

```bash
npx deepspace app init
npx deepspace dev start
```

DeepSpace must mint the app ID. Do not replace the `__APP_ID__` placeholder yourself or remove the registration guard. Login is required for the real runtime; the isolated logic tests below do not require it.

## Verify

```bash
npm run type-check
npm run test:logic
npm run lint
```

After app registration and local runtime setup:

```bash
npm run build
npx deepspace test run all
```

The collaboration suite requires two usable DeepSpace test accounts. A skipped suite is **not** evidence that collaboration passed. Provider parsing tests use representative responses; they do not verify credentials, billing, or live providers.

Before submission, run the real browser path, two-user collaboration, a denied cross-user edit, refresh persistence, export, mobile layout, and one intentional call per selected integration. Do not claim the applicant personally verified anything until Sadaswi has performed it.

## Publish

Create the intended GitHub repository and configure its remote **before the first deployment**. DeepSpace permanently selects the source authority on its first source-producing action. Do not run `deepspace push` when choosing GitHub as the source.

```bash
npx deepspace auth whoami --json
npm run build
npx deepspace deploy
```

Use the actual URL returned by the CLI, verify the live app, and submit that URL together with the repository and a short, accurate writeup.

## Known limits

- Manual aggregate counts cannot prove event ordering or independent attribution; the entered cohort must obey the documented definitions.
- The workspace currently shows up to 250 recent experiments, 100 evidence notes per experiment, and 50 recent decisions per experiment. The note cap is an application guard, not a transactional quota guarantee.
- An existing decision is immutable; it can be superseded by a new decision, not edited in place.
- Research output is untrusted context. It does not automatically change counts, observations, or decisions.
- Real browser and provider verification remain required before this is submission-ready. If your checkout uses a filesystem unsuitable for SQLite, set `LAUNCHPROOF_STATE_PATH` to a local directory before starting the development server.
