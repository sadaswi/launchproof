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
import { evidenceSchema } from '../lib/experiment'
import type { Evidence } from '../lib/experiment'

export function EvidenceForm({
  experimentId,
  initial,
  onClose,
  onSave,
}: {
  experimentId: string
  initial?: Partial<Evidence>
  onClose: () => void
  onSave: (value: Evidence) => Promise<void>
}) {
  const [draft, setDraft] = useState<Evidence>({
    experimentId,
    title: '',
    body: '',
    url: '',
    kind: 'observation',
    source: 'manual',
    ...initial,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = evidenceSchema.safeParse(draft)
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
      size="lg"
    >
      <Modal.Header>
        <Modal.Title>Add evidence</Modal.Title>
        <Modal.Description>
          Say what you observed, where it came from, and what remains uncertain.
        </Modal.Description>
      </Modal.Header>
      <form onSubmit={submit} className="form-scroll">
        <Modal.Body className="space-y-4">
          <div>
            <Label htmlFor="e-title">Short title</Label>
            <Input
              id="e-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={160}
            />
          </div>
          <div>
            <Label htmlFor="e-body">Evidence or interpretation</Label>
            <Textarea
              id="e-body"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={6}
              maxLength={4000}
            />
          </div>
          <div>
            <Label htmlFor="e-url">Source link (optional)</Label>
            <Input
              id="e-url"
              type="url"
              placeholder="https://…"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="e-kind">How should we treat this?</Label>
            <Select
              value={draft.kind}
              onValueChange={(v) =>
                setDraft({ ...draft, kind: v as Evidence['kind'] })
              }
              disabled={draft.source === 'anthropic'}
            >
              <SelectTrigger id="e-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="observation">
                  Observation — something seen or measured
                </SelectItem>
                <SelectItem value="assumption">
                  Interpretation — something to investigate
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="small-muted mt-2">
              Public research provides context. It does not prove your
              experiment caused an outcome.
            </p>
          </div>
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
            Save evidence
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
