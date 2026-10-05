import { useState } from 'react'
import {
  Button,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from './ui'
import { emptyExperiment, experimentSchema, stages } from '../lib/experiment'
import type { Experiment } from '../lib/experiment'

export function ExperimentForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Experiment
  onClose: () => void
  onSave: (value: Experiment) => Promise<void>
}) {
  const [draft, setDraft] = useState<Experiment>(
    () => initial ?? emptyExperiment(),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const patch = <K extends keyof Experiment>(key: K, value: Experiment[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))
  const issue = (key: string) =>
    errors[key] ? (
      <p className="field-error" role="alert">
        {errors[key]}
      </p>
    ) : null
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaveError('')
    const result = experimentSchema.safeParse(draft)
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((e) => [e.path.join('.'), e.message]),
        ),
      )
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSave(result.data)
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      open
      onClose={() => {
        if (!saving) onClose()
      }}
      size="lg"
    >
      <Modal.Header>
        <Modal.Title>
          {initial ? 'Edit experiment' : 'Plan an experiment'}
        </Modal.Title>
        <Modal.Description>
          Make the question, cohort, and success threshold clear before you run
          the test.
        </Modal.Description>
      </Modal.Header>
      <form onSubmit={submit} className="form-scroll" noValidate>
        <Modal.Body className="space-y-5">
          <div>
            <Label htmlFor="exp-title">Experiment title</Label>
            <Input
              id="exp-title"
              value={draft.title}
              onChange={(e) => patch('title', e.target.value)}
              placeholder="Will a follow-up workshop help builders get real users?"
              maxLength={120}
            />
            {issue('title')}
          </div>
          <div>
            <Label htmlFor="exp-hypothesis">Hypothesis</Label>
            <Textarea
              id="exp-hypothesis"
              value={draft.hypothesis}
              onChange={(e) => patch('hypothesis', e.target.value)}
              placeholder="If we change … for …, we expect … because …"
              rows={3}
            />
            {issue('hypothesis')}
          </div>
          <div className="form-grid">
            <div>
              <Label htmlFor="exp-audience">Audience / cohort</Label>
              <Input
                id="exp-audience"
                value={draft.audience}
                onChange={(e) => patch('audience', e.target.value)}
              />
              {issue('audience')}
            </div>
            <div>
              <Label htmlFor="exp-channel">Channel</Label>
              <Select
                value={draft.channel}
                onValueChange={(value) =>
                  patch('channel', value as Experiment['channel'])
                }
              >
                <SelectTrigger id="exp-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'Community',
                    'Content',
                    'Partnership',
                    'Event',
                    'Outbound',
                    'Product',
                  ].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="form-grid">
            <div>
              <Label htmlFor="exp-start">Cohort starts</Label>
              <Input
                id="exp-start"
                type="date"
                value={draft.startDate}
                onChange={(e) => patch('startDate', e.target.value)}
              />
              {issue('startDate')}
            </div>
            <div>
              <Label htmlFor="exp-end">Measurement ends</Label>
              <Input
                id="exp-end"
                type="date"
                value={draft.endDate}
                onChange={(e) => patch('endDate', e.target.value)}
              />
              {issue('endDate')}
            </div>
          </div>
          <div>
            <Label htmlFor="exp-activation">What counts as real use?</Label>
            <Textarea
              id="exp-activation"
              rows={2}
              value={draft.activationDefinition}
              onChange={(e) => patch('activationDefinition', e.target.value)}
            />
            {issue('activationDefinition')}
            <p className="small-muted mt-2">
              Your experiment's working definition, not an official DeepSpace
              activation metric.
            </p>
          </div>
          <div className="form-grid">
            <div>
              <Label htmlFor="exp-target">
                Target: deployed → real use (%)
              </Label>
              <Input
                id="exp-target"
                type="number"
                min={0}
                max={100}
                step="any"
                value={
                  Number.isFinite(draft.targetRate) ? draft.targetRate : ''
                }
                onChange={(e) =>
                  patch(
                    'targetRate',
                    e.target.value === '' ? NaN : Number(e.target.value),
                  )
                }
              />
              {issue('targetRate')}
            </div>
            <div>
              <Label htmlFor="exp-min">Minimum deployments before review</Label>
              <Input
                id="exp-min"
                type="number"
                min={1}
                step={1}
                value={Number.isFinite(draft.minSample) ? draft.minSample : ''}
                onChange={(e) =>
                  patch(
                    'minSample',
                    e.target.value === '' ? NaN : Number(e.target.value),
                  )
                }
              />
              {issue('minSample')}
            </div>
          </div>
          <fieldset className="count-fields">
            <legend>Results from the same cohort</legend>
            <p className="small-muted mb-4">
              Leave unmeasured counts blank. Count developers, not the end users
              of their apps.
            </p>
            <div className="count-grid">
              {[
                ...stages,
                { key: 'paid' as const, label: 'Paid developers', detail: '' },
              ].map((stage) => (
                <div key={stage.key}>
                  <Label htmlFor={`count-${stage.key}`}>{stage.label}</Label>
                  <Input
                    id={`count-${stage.key}`}
                    type="number"
                    min={0}
                    step={1}
                    value={draft.counts[stage.key] ?? ''}
                    onChange={(e) =>
                      patch('counts', {
                        ...draft.counts,
                        [stage.key]:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                  {issue(`counts.${stage.key}`)}
                </div>
              ))}
            </div>
          </fieldset>
          <div>
            <Label htmlFor="exp-status">Status</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => patch('status', v as Experiment['status'])}
            >
              <SelectTrigger id="exp-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft — not running yet</SelectItem>
                <SelectItem value="active">
                  Running — collecting evidence
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {saveError && (
            <p className="error-note" role="alert">
              {saveError}
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save experiment
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
