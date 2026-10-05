/**
 * Multi-user collaboration spec — verifies two users sign in into
 * separate browser contexts and the app distinguishes them.
 *
 * `users(2)` takes any two accounts from your pool, so this spec passes on a
 * fresh app with no setup beyond having two test accounts:
 *   npx deepspace test accounts list
 *   npx deepspace test accounts create --email a@deepspace.test --name "A" --password-stdin
 *
 * Ask for accounts *by name* (`users(['Alice', 'Bob'])`) only when the
 * behaviour under test depends on which identity acts — otherwise naming them
 * couples the spec to one machine's pool.
 *
 * The `users` fixture handles sign-in caching (per-account storageState
 * persisted to `~/.deepspace/playwright-states/`), context creation, and
 * cleanup. No need to manage browser contexts manually.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

// A machine that has never created test accounts is the normal state of a
// fresh checkout, and there `users()` throws — turning "you have no pool yet"
// into three red tests about the app, which it is not. Skip the file instead
// and say what creates the pool. The count is of accounts usable HERE: the
// pool is global per developer, but passwords live only on the machine that
// created the account.
const usableTestAccounts = loadAllTestAccounts().length
test.skip(
  usableTestAccounts < 2,
  `Needs 2 usable test accounts, found ${usableTestAccounts}. Create them with ` +
    '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" ' +
    '--password-stdin`, or fetch existing pool accounts with `npx deepspace test accounts recover --all`.',
)

test('each browser renders its own signed-in account', async ({ users }) => {
  const [a, b] = await users(2)

  // /home is dynamic (under src/pages/(app)/), so it mounts the nav shell;
  // '/' is the static landing and has no navigation.
  await Promise.all([a.page.goto('/home'), b.page.goto('/home')])

  // Email, not name. The page renders the *session's* `name || email`, while
  // `user.name` here comes from the LOCAL account registry — and the two are
  // not the same fact: a display name is optional, and an account recovered on
  // another machine has none stored locally at all. The email is the credential
  // the context signed in with, so it is the one identity both sides agree on,
  // and asserting it proves the page is showing THIS browser's account.
  // The two accounts are distinct, so two exact matches is also the proof that
  // the contexts are not sharing one session.
  for (const user of [a, b]) {
    await expect(user.page.getByTestId('app-navigation')).toBeVisible({
      timeout: 15_000,
    })

    // The identity chip shows `name || email`. Its text is not predictable, but
    // its presence is: something must be there once the profile has loaded.
    // (It is `hidden sm:inline` in some templates, so assert text, not
    // visibility.)
    await expect(user.page.getByTestId('nav-user-name')).toHaveText(/\S/, {
      timeout: 15_000,
    })

    await user.page.getByRole('button', { name: 'Account menu' }).click()
    await expect(user.page.getByTestId('nav-user-email')).toHaveText(
      user.email,
      {
        timeout: 15_000,
      },
    )
  }
})

// These are real SDK accounts and real records, not a mocked browser backend.
test('a second contributor sees live evidence but cannot edit the owner’s plan', async ({
  users,
}) => {
  const [owner, contributor] = await users(2)
  const title = `Synthetic browser test ${Date.now()}`
  await Promise.all([owner.page.goto('/home'), contributor.page.goto('/home')])
  const createButton = owner.page.getByRole('button', {
    name: 'New experiment',
    exact: true,
  })
  await expect(createButton).toBeEnabled({ timeout: 15000 })
  await createButton.click()
  const form = owner.page.getByRole('dialog', { name: 'Plan an experiment' })
  await form.getByLabel('Experiment title', { exact: true }).fill(title)
  await form
    .getByLabel('Hypothesis', { exact: true })
    .fill(
      'A short synthetic workshop could help new builders find their first users.',
    )
  await form
    .getByLabel('Audience / cohort', { exact: true })
    .fill('Synthetic browser test cohort')
  await form
    .getByLabel('Minimum deployments before review', { exact: true })
    .fill('10')
  for (const [id, value] of Object.entries({
    visitors: 100,
    signups: 20,
    deployed: 10,
    realUse: 5,
    returned: 3,
    paid: 1,
  })) {
    await form.locator(`#count-${id}`).fill(String(value))
  }
  const createdResponse = owner.page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/actions/saveExperiment') &&
      response.request().method() === 'POST',
  )
  await form
    .getByRole('button', { name: 'Save experiment', exact: true })
    .click()
  const created = await (await createdResponse).json()
  expect(created.success).toBe(true)
  await expect(form).toBeHidden()
  await contributor.page
    .getByRole('button', { name: new RegExp(title) })
    .click()
  await expect(
    contributor.page.getByRole('heading', { name: title, exact: true }),
  ).toBeVisible()
  await expect(
    contributor.page.getByRole('button', {
      name: 'Edit plan & results',
      exact: true,
    }),
  ).toHaveCount(0)

  await contributor.page
    .getByRole('button', { name: 'Add evidence', exact: true })
    .click()
  const noteForm = contributor.page.getByRole('dialog', {
    name: 'Add evidence',
    exact: true,
  })
  await noteForm
    .getByLabel('Short title', { exact: true })
    .fill('Synthetic participant observation')
  await noteForm
    .getByLabel('Evidence or interpretation', { exact: true })
    .fill(
      'This is synthetic evidence created by the browser verification suite.',
    )
  const evidenceRequest = contributor.page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/actions/addEvidence') &&
      request.method() === 'POST',
  )
  await noteForm
    .getByRole('button', { name: 'Save evidence', exact: true })
    .click()
  const callerAuthorization = (await evidenceRequest).headers().authorization
  await expect(noteForm).toBeHidden()
  await expect(
    owner.page.getByRole('heading', {
      name: 'Synthetic participant observation',
      exact: true,
    }),
  ).toBeVisible()

  // Use only the test contributor's own captured bearer; never read app secrets.
  const denied = await contributor.context.request.post(
    '/api/actions/saveExperiment',
    {
      headers: { Authorization: callerAuthorization },
      data: {
        id: created.data.recordId,
        experiment: {
          title,
          hypothesis:
            'A short synthetic workshop could help new builders find their first users.',
          audience: 'Synthetic browser test cohort',
          channel: 'Community',
          startDate: '2026-10-01',
          endDate: '2026-10-02',
          activationDefinition:
            'A developer deploys an app used by another real person.',
          targetRate: 30,
          minSample: 10,
          status: 'draft',
          isDemo: true,
          counts: {
            visitors: 100,
            signups: 20,
            deployed: 10,
            realUse: 5,
            returned: 3,
            paid: 1,
          },
        },
      },
    },
  )
  expect((await denied.json()).success).toBe(false)

  await owner.page.getByRole('tab', { name: /Decisions/ }).click()
  await owner.page
    .getByRole('button', { name: 'Record a decision', exact: true })
    .click()
  const decisionForm = owner.page.getByRole('dialog', {
    name: 'Make the call',
    exact: true,
  })
  await decisionForm
    .getByLabel('Why this decision?', { exact: true })
    .fill(
      'This synthetic cohort supports testing a clearer follow-up checklist before expanding.',
    )
  await decisionForm
    .getByRole('button', { name: 'Record decision', exact: true })
    .click()
  await expect(decisionForm).toBeHidden()
  await expect(
    owner.page.getByText(
      'This synthetic cohort supports testing a clearer follow-up checklist before expanding.',
      { exact: true },
    ),
  ).toBeVisible()
  await owner.page.reload()
  await owner.page.getByRole('button', { name: new RegExp(title) }).click()
  await owner.page.getByRole('tab', { name: /Decisions/ }).click()
  await expect(
    owner.page.getByText(
      'This synthetic cohort supports testing a clearer follow-up checklist before expanding.',
      { exact: true },
    ),
  ).toBeVisible()
  const downloadEvent = owner.page.waitForEvent('download')
  await owner.page
    .getByRole('button', { name: 'Export notes', exact: true })
    .click()
  expect((await downloadEvent).suggestedFilename()).toBe(
    'launchproof-experiment.md',
  )
})
