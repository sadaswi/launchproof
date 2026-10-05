import { useState } from 'react'
import {
  Button,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from './ui'
import { assess, decisionSchema } from '../lib/experiment'
import type { DecisionInput, Experiment } from '../lib/experiment'

export function DecisionForm({
  experimentId,
  experiment,
  reviewedRevision,
  onClose,
  onSave,
}: {
  experimentId: string
  experiment: Experiment
  reviewedRevision: string
  onClose: () => void
  onSave: (value: DecisionInput) => Promise<void>
}) {
  const [verdict, setVerdict] = useState<DecisionInput['verdict']>('change')
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const assessment = assess(experiment)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = decisionSchema.safeParse({
      experimentId,
      verdict,
      rationale,
      reviewedRevision,
    })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(result.data)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
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
    >
      <Modal.Header>
        <Modal.Title>Make the call</Modal.Title>
        <Modal.Description>
          A human decision, with the evidence preserved.
        </Modal.Description>
      </Modal.Header>
      <form className="form-scroll" onSubmit={submit}>
        <Modal.Body className="space-y-5">
          <div className={`assessment assessment-${assessment.state}`}>
            <strong>{assessment.label}</strong>
            <span>{assessment.detail}</span>
          </div>
          <div>
            <Label htmlFor="decision-verdict">What happens next?</Label>
            <Select
              value={verdict}
              onValueChange={(v) => setVerdict(v as DecisionInput['verdict'])}
            >
              <SelectTrigger id="decision-verdict">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="continue">
                  Continue — keep testing or expand carefully
                </SelectItem>
                <SelectItem value="change">
                  Change — revise the approach
                </SelectItem>
                <SelectItem value="stop">Stop — end this experiment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="decision-reason">Why this decision?</Label>
            <Textarea
              id="decision-reason"
              rows={6}
              placeholder="What supports this choice? What is uncertain? What is the next specific action?"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              maxLength={4000}
            />
          </div>
          <p className="small-muted">
            Saving creates an immutable snapshot of the current plan, counts,
            and evidence. Later changes will mark this decision as needing
            another review.
          </p>
          {error && (
            <p role="alert" className="error-note">
              {error}
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
            Record decision
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
