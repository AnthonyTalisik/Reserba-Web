import { useState } from 'react'
import Modal from './Modal.jsx'

const OTHER = 'Other (type your own)'

/**
 * Suggested reasons plus "Other". Picking a suggestion is one click; the note box adds detail
 * and is required when "Other" is chosen.
 */
export default function ReasonDialog({ title, reasons, onSubmit, onClose }) {
  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function submit() {
    const text = note.trim()
    if (!reason) return setError('Choose a reason first.')
    if (reason === OTHER && !text) return setError('Please type your reason.')
    onSubmit(reason === OTHER ? text : text ? `${reason} - ${text}` : reason)
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Back</button>
          <button type="button" className="btn btn-primary" onClick={submit}>Submit</button>
        </>
      )}
    >
      <p className="muted">Choose a reason</p>
      <div className="radio-list">
        {[...reasons, OTHER].map((r) => (
          <label key={r} className="radio-row">
            <input
              type="radio"
              name="reason"
              checked={reason === r}
              onChange={() => { setReason(r); setError('') }}
            />
            <span>{r}</span>
          </label>
        ))}
      </div>
      <label className="field">
        <span className="field-label">
          {reason === OTHER ? 'Type your reason (required)' : 'Additional note (optional)'}
        </span>
        <textarea rows={2} value={note} onChange={(e) => { setNote(e.target.value); setError('') }} />
      </label>
      {error && <div className="alert alert-red">{error}</div>}
    </Modal>
  )
}
