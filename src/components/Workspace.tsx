import { useState } from 'react'
import {
  useAuth,
  useMutations,
  useQuery,
  useUser,
  useUserLookup,
} from 'deepspace'
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  FileText,
  FlaskConical,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Users,
} from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  SearchInput,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from './ui'
import {
  assess,
  demoExperiment,
  formatRate,
  revisionOf,
} from '../lib/experiment'
import type {
  Decision,
  DecisionInput,
  Evidence,
  Experiment,
  Row,
} from '../lib/experiment'
import { runAction } from '../lib/actions-client'
import { Funnel } from './Funnel'
import { ExperimentForm } from './ExperimentForm'
import { EvidenceForm } from './EvidenceForm'
import { DecisionForm } from './DecisionForm'
import { ResearchPanel } from './ResearchPanel'

const dateLabel = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export function Workspace() {
  const { records, status, error } = useQuery<Experiment>('experiments', {
    orderBy: 'updatedAt',
    orderDir: 'desc',
    limit: 250,
  })
  const { ready } = useMutations<Experiment>('experiments')
  const { user } = useUser()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const { success, error: toastError } = useToast()
  const filtered = records.filter((row) =>
    `${row.data.title} ${row.data.audience} ${row.data.channel}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const selected =
    filtered.find((row) => row.recordId === selectedId) ?? filtered[0]
  const canWrite = ready && (user?.role === 'member' || user?.role === 'admin')
  async function create(value: Experiment) {
    const result = await runAction('saveExperiment', { experiment: value })
    setSelectedId(result.recordId)
    success('Experiment saved', 'Your team can now add evidence.')
  }
  async function addExample() {
    setSeeding(true)
    try {
      await create(demoExperiment())
    } catch (e) {
      toastError(
        'Could not add example',
        e instanceof Error ? e.message : 'Try again.',
      )
    } finally {
      setSeeding(false)
    }
  }
  return (
    <div className="workspace-shell">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">THE EXPERIMENT NOTEBOOK</p>
          <h1>Make the next move count.</h1>
          <p>Small tests. Traceable evidence. Decisions you can explain.</p>
        </div>
        <Button onClick={() => setForm(true)} disabled={!canWrite}>
          <Plus size={16} />
          New experiment
        </Button>
      </header>
      <div className="workspace-context">
        <span>
          <Users size={14} />
          Shared workspace · visible to signed-in users
        </span>
        <span>
          <Radio size={13} />
          {ready ? 'Live updates connected' : 'Connecting to live updates…'}
        </span>
        <span>Use public or synthetic data only.</span>
      </div>
      {status === 'error' ? (
        <div role="alert" className="error-note">
          Unable to load experiments: {error}. Check your connection and sign-in
          status.
        </div>
      ) : status === 'loading' ? (
        <div
          className="workspace-skeleton"
          aria-label="Loading experiments"
          aria-busy="true"
        >
          <div className="animate-pulse bg-muted rounded h-64" />
          <div className="animate-pulse bg-muted rounded h-96" />
        </div>
      ) : records.length === 0 ? (
        <div className="empty-workspace">
          <EmptyState
            icon={<FlaskConical />}
            title="Your first useful question starts here."
            description="Write a hypothesis, set a threshold, and collect the evidence that will help you decide."
            action={{
              label: 'Plan an experiment',
              onClick: () => setForm(true),
              disabled: !canWrite,
            }}
          />
          <Button
            variant="outline"
            onClick={addExample}
            disabled={!canWrite}
            loading={seeding}
          >
            Try a clearly labeled synthetic example
          </Button>
        </div>
      ) : (
        <div className="workspace-grid">
          <aside className="experiment-sidebar">
            <div className="list-heading">
              <span className="eyebrow">EXPERIMENTS</span>
              <span className="small-muted">{records.length}</span>
            </div>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find an experiment…"
              aria-label="Find an experiment"
            />
            <div className="experiment-list">
              {filtered.length === 0 ? (
                <p className="small-muted p-4">
                  No experiments match that search.
                </p>
              ) : (
                filtered.map((row) => (
                  <button
                    key={row.recordId}
                    className={`experiment-list-item ${selected?.recordId === row.recordId ? 'selected' : ''}`}
                    onClick={() => setSelectedId(row.recordId)}
                    aria-current={
                      selected?.recordId === row.recordId ? 'true' : undefined
                    }
                  >
                    <div>
                      <span className="eyebrow">{row.data.channel}</span>
                      {row.data.isDemo && (
                        <span className="demo-tag">DEMO</span>
                      )}
                    </div>
                    <strong>{row.data.title}</strong>
                    <div className="item-bottom">
                      <span>{formatRate(assess(row.data).rate)} real use</span>
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))
              )}
            </div>
            <p className="sidebar-footnote">
              A useful result can be a reason to stop.
            </p>
          </aside>
          {selected && (
            <ExperimentDetail
              key={selected.recordId}
              row={selected}
              ready={canWrite}
            />
          )}
        </div>
      )}
      {form && (
        <ExperimentForm onClose={() => setForm(false)} onSave={create} />
      )}
    </div>
  )
}

function ExperimentDetail({
  row,
  ready,
}: {
  row: Row<Experiment>
  ready: boolean
}) {
  const experiment = row.data
  const { userId } = useAuth()
  const { user } = useUser()
  const { getName } = useUserLookup()
  const evidenceQuery = useQuery<Evidence>('evidence', {
    where: { experimentId: row.recordId },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 101,
  })
  const decisionQuery = useQuery<Decision>('decisions', {
    where: { experimentId: row.recordId },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 50,
  })
  const evidence = evidenceQuery.records
  const decisions = decisionQuery.records
  const latest = decisions[0]
  const [editing, setEditing] = useState(false)
  const [evidenceDraft, setEvidenceDraft] = useState<Partial<Evidence> | null>(
    null,
  )
  const [deciding, setDeciding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Row<Evidence> | null>(null)
  const [removingBusy, setRemovingBusy] = useState(false)
  const { success, error: toastError } = useToast()
  const canManage =
    ready && (row.createdBy === userId || user?.role === 'admin')
  const currentRevision = revisionOf(experiment, evidence)
  const stale = !!latest && latest.data.snapshot.revision !== currentRevision
  const dataReady =
    evidenceQuery.status === 'ready' && decisionQuery.status === 'ready'
  async function save(value: Experiment) {
    await runAction('saveExperiment', { id: row.recordId, experiment: value })
    success(
      'Changes saved',
      'Previous decisions keep their original evidence snapshot.',
    )
  }
  async function keep(value: Evidence) {
    await runAction('addEvidence', value)
    success('Evidence saved', 'The note is now visible to your team.')
  }
  async function decide(value: DecisionInput) {
    await runAction('recordDecision', value)
    success(
      'Decision recorded',
      'Its plan, numbers, and evidence are preserved together.',
    )
  }
  async function remove() {
    if (!removing) return
    setRemovingBusy(true)
    try {
      await runAction('removeEvidence', { id: removing.recordId })
      setRemoving(null)
      success('Evidence removed', 'Existing decision snapshots are unchanged.')
    } catch (e) {
      toastError(
        'Could not remove evidence',
        e instanceof Error ? e.message : 'Try again.',
      )
    } finally {
      setRemovingBusy(false)
    }
  }
  function exportNotes() {
    const lines = [
      `# ${experiment.title}`,
      experiment.isDemo
        ? 'SYNTHETIC DEMO — not actual company results.'
        : 'User-entered experiment — results have not been independently verified.',
      `\n## Hypothesis\n${experiment.hypothesis}`,
      `\nAudience: ${experiment.audience}\nChannel: ${experiment.channel}\nWindow: ${experiment.startDate} to ${experiment.endDate}`,
      `\nReal-use definition: ${experiment.activationDefinition}`,
      `\nTarget: ${experiment.targetRate}% of deployed developers reach real use; minimum ${experiment.minSample} deployments.`,
      `\n## Counts\n${Object.entries(experiment.counts)
        .map(
          ([key, value]) => `${key}: ${value === null ? 'unmeasured' : value}`,
        )
        .join('\n')}`,
      `\nObserved deployed-to-real-use rate: ${formatRate(assess(experiment).rate)}. This is a descriptive threshold, not a causal or significance test.`,
      `\n## Evidence\n${evidence.map((item, index) => `[E${index + 1}] ${item.data.title} (${item.data.kind}; ${item.data.source})\n${item.data.body}\n${item.data.url}`).join('\n\n')}`,
      `\n## Decision history\n${decisions.map((item) => `${item.data.verdict.toUpperCase()} — ${item.createdAt}\n${item.data.rationale}\nSnapshot: ${JSON.stringify(item.data.snapshot, null, 2)}`).join('\n\n')}`,
    ]
    const blob = new Blob([lines.join('\n')], {
      type: 'text/markdown;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'launchproof-experiment.md'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    success('Notes exported')
  }
  return (
    <article className="experiment-detail">
      <header className="detail-header">
        <div className="detail-kicker">
          <span className="eyebrow">
            {experiment.channel} / {experiment.startDate} — {experiment.endDate}
          </span>
          <Badge variant={latest && !stale ? 'success' : 'outline'}>
            {latest && !stale
              ? 'Decision recorded'
              : experiment.status === 'active'
                ? 'Running'
                : 'Draft'}
          </Badge>
        </div>
        <h2>{experiment.title}</h2>
        <p>{experiment.audience}</p>
        <div className="detail-actions">
          <span className="small-muted">
            Owned by {getName(row.createdBy) ?? 'a teammate'}
          </span>
          <div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil size={13} />
                Edit plan & results
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={exportNotes}
              disabled={!dataReady}
            >
              <Download size={14} />
              Export notes
            </Button>
          </div>
        </div>
      </header>
      {experiment.isDemo && (
        <div className="demo-notice">
          <FlaskConical size={15} />
          <span>
            <strong>Synthetic example.</strong> These numbers illustrate the
            workflow and are not DeepSpace or employer results.
          </span>
        </div>
      )}
      <div className="hypothesis-block">
        <span className="eyebrow">THE HYPOTHESIS</span>
        <p>{experiment.hypothesis}</p>
        <details>
          <summary>How this experiment defines real use</summary>
          <p>{experiment.activationDefinition}</p>
          <p className="small-muted">
            Came back means returning to improve an app that has reached real
            use. Paid developers are tracked separately because payment does not
            have to happen after that return.
          </p>
        </details>
      </div>
      <Funnel experiment={experiment} />
      <Tabs defaultValue="evidence" className="detail-tabs">
        <TabsList>
          <TabsTrigger value="evidence">
            <BookOpen size={14} />
            Evidence · {evidence.length}
          </TabsTrigger>
          <TabsTrigger value="research">
            <FileText size={14} />
            Research
          </TabsTrigger>
          <TabsTrigger value="decisions">
            <Check size={14} />
            Decisions · {decisions.length}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="evidence">
          <section className="evidence-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">WHAT WE KNOW / WHAT WE THINK</p>
                <h2>Keep the reasoning close.</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!ready}
                onClick={() => setEvidenceDraft({})}
              >
                <Plus size={14} />
                Add evidence
              </Button>
            </div>
            {evidenceQuery.status === 'loading' ? (
              <div className="animate-pulse h-24 bg-muted rounded" />
            ) : evidenceQuery.status === 'error' ? (
              <p className="error-note" role="alert">
                Evidence could not load. {evidenceQuery.error}
              </p>
            ) : evidence.length === 0 ? (
              <div className="evidence-empty">
                <BookOpen size={24} />
                <div>
                  <h3>No evidence yet.</h3>
                  <p>
                    Add a public source, a synthetic observation, or an
                    assumption you want to test.
                  </p>
                </div>
              </div>
            ) : (
              <div className="evidence-list">
                {evidence.map((note) => (
                  <article key={note.recordId}>
                    <div className="evidence-meta">
                      <Badge
                        size="sm"
                        variant={
                          note.data.kind === 'observation'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {note.data.kind === 'observation'
                          ? 'Observation'
                          : 'Interpretation'}
                      </Badge>
                      <span className="small-muted">
                        {note.data.source === 'manual'
                          ? 'Added by a person'
                          : note.data.source}
                      </span>
                      {ready &&
                        (note.createdBy === userId ||
                          user?.role === 'admin') && (
                          <Button
                            aria-label={`Remove ${note.data.title}`}
                            size="icon"
                            variant="ghost"
                            className="ml-auto h-7 w-7"
                            onClick={() => setRemoving(note)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                    </div>
                    <h3>{note.data.title}</h3>
                    <p className="preserve-lines evidence-body">
                      {note.data.body}
                    </p>
                    {note.data.url && (
                      <a
                        className="source-link"
                        href={note.data.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Open original source <ArrowUpRight size={13} />
                      </a>
                    )}
                    <footer>
                      {getName(note.createdBy) ?? 'Teammate'} ·{' '}
                      {dateLabel(note.createdAt)}
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </section>
        </TabsContent>
        <TabsContent value="research">
          <ResearchPanel
            experiment={experiment}
            evidence={evidence}
            evidenceReady={evidenceQuery.status === 'ready'}
            canWrite={ready}
            onKeep={setEvidenceDraft}
          />
        </TabsContent>
        <TabsContent value="decisions">
          <section className="decisions-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DECISION LOG</p>
                <h2>What will you do next?</h2>
              </div>
              <Button
                size="sm"
                disabled={!canManage || !dataReady}
                onClick={() => setDeciding(currentRevision)}
              >
                Record a decision
              </Button>
            </div>
            {stale && dataReady && (
              <div className="assessment assessment-small">
                <strong>New evidence since the last decision.</strong>
                <span>
                  The previous snapshot is preserved. Review again before
                  treating it as the current conclusion.
                </span>
              </div>
            )}
            {!canManage && (
              <p className="small-muted mb-4">
                The experiment owner or an admin records the decision.
              </p>
            )}
            {decisionQuery.status === 'error' ? (
              <p role="alert" className="error-note">
                Decision history could not load.
              </p>
            ) : decisionQuery.status === 'loading' ? (
              <div className="animate-pulse h-24 bg-muted rounded" />
            ) : decisions.length === 0 ? (
              <div className="evidence-empty">
                <Check size={24} />
                <div>
                  <h3>No decision recorded.</h3>
                  <p>
                    Review the observations and unknowns, then choose continue,
                    change, or stop.
                  </p>
                </div>
              </div>
            ) : (
              decisions.map((decision) => (
                <article className="decision-card" key={decision.recordId}>
                  <div className="decision-card-heading">
                    <Badge variant="secondary">{decision.data.verdict}</Badge>
                    <span className="small-muted">
                      {getName(decision.createdBy) ?? 'Experiment owner'} ·{' '}
                      {dateLabel(decision.createdAt)}
                    </span>
                  </div>
                  <p className="preserve-lines">{decision.data.rationale}</p>
                  <details>
                    <summary>View the evidence at this decision</summary>
                    <p className="small-muted">
                      {decision.data.snapshot.experiment.title} ·{' '}
                      {formatRate(
                        assess(decision.data.snapshot.experiment).rate,
                      )}{' '}
                      real use · {decision.data.snapshot.evidence.length}{' '}
                      evidence notes
                    </p>
                    <p>{decision.data.snapshot.experiment.hypothesis}</p>
                    {decision.data.snapshot.evidence.map((note) => (
                      <div className="snapshot-note" key={note.recordId}>
                        <strong>{note.title}</strong>
                        <p className="preserve-lines">{note.body}</p>
                        {note.url && (
                          <a
                            className="source-link"
                            href={note.url}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Source <ArrowUpRight size={13} />
                          </a>
                        )}
                      </div>
                    ))}
                  </details>
                </article>
              ))
            )}
          </section>
        </TabsContent>
      </Tabs>
      {editing && (
        <ExperimentForm
          initial={experiment}
          onClose={() => setEditing(false)}
          onSave={save}
        />
      )}
      {evidenceDraft && (
        <EvidenceForm
          experimentId={row.recordId}
          initial={evidenceDraft}
          onClose={() => setEvidenceDraft(null)}
          onSave={keep}
        />
      )}
      {deciding && (
        <DecisionForm
          experimentId={row.recordId}
          experiment={experiment}
          reviewedRevision={deciding}
          onClose={() => setDeciding(null)}
          onSave={decide}
        />
      )}
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title="Remove evidence?"
        description={`Remove “${removing?.data.title ?? ''}” from this experiment? Existing decision snapshots will retain it.`}
        confirmText="Remove evidence"
        loading={removingBusy}
      />
    </article>
  )
}
