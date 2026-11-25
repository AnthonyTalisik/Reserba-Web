import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Icon from '../components/Icon.jsx'
import ReasonDialog from '../components/ReasonDialog.jsx'
import { StatusBadge } from '../components/Badge.jsx'
import {
  approve, cancel, findApprovedConflict, findBlockConflict, overlappingPending, reject,
  reservationById, roomById,
} from '../data/mockStore.js'
import { CANCEL_RESERVATION, REJECT_REQUEST } from '../data/remarkSuggestions.js'
import { formatDate, formatRange } from '../utils/time.js'

/** Reservation Review (Admin): full details, conflict check result, approve or reject. */
export default function AdminReview() {
  useStore()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null) // 'reject' | 'cancel' | null

  const r = reservationById(reservationId)
  if (!r) return <Navigate to="/admin/requests" replace />
  const room = roomById(r.roomId)

  const pending = r.status === 'PENDING'
  const canCancel = r.status === 'APPROVED' && Date.now() < r.startMillis

  // Conflict check result (BR-01, BR-10)
  let check = null
  if (pending) {
    const block = findBlockConflict(r.roomId, r.startMillis, r.endMillis)
    const clash = findApprovedConflict(r.roomId, r.startMillis, r.endMillis, r.reservationId)
    if (block) {
      check = { ok: false, text: `Blocked date: ${block.reason}. This request cannot be approved.` }
    } else if (clash) {
      check = {
        ok: false,
        text: `Clashes with an approved reservation by ${clash.organization} ` +
          `(${formatRange(clash.startTime, clash.endTime)}). This request cannot be approved.`,
      }
    } else {
      check = {
        ok: true,
        text: `No clash with approved bookings. Checked approved reservations, blocked dates and the ${room?.bufferMinutes ?? 20}-minute gap.`,
      }
    }
  }
  const others = pending ? overlappingPending(r) : []

  function doApprove() {
    const failure = approve(r.reservationId, note, user)
    if (failure) return setError(failure)
    toast('Approved. Overlapping pending requests were rejected.')
    navigate('/admin/requests')
  }

  function doReject(remarks) {
    const failure = reject(r.reservationId, remarks, user)
    if (failure) { setDialog(null); return setError(failure) }
    toast('Request rejected.')
    navigate('/admin/requests')
  }

  function doCancel(reason) {
    const failure = cancel(r.reservationId, user, reason)
    if (failure) { setDialog(null); return setError(failure) }
    toast('Reservation cancelled. The slot is available again.')
    navigate('/admin/requests')
  }

  return (
    <div className="page-narrow">
      <button type="button" className="back-link" onClick={() => navigate('/admin/requests')}>
        <Icon name="back" size={18} /> Back
      </button>
      <h1>Review request</h1>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row-between">
          <div className="card-title" style={{ fontSize: 16 }}>{r.organization}  -  {r.requesterName}</div>
          <StatusBadge status={r.status} />
        </div>
        <dl className="detail-grid">
          <dt>Room</dt><dd>{r.roomName}</dd>
          <dt>When</dt><dd>{formatDate(r.date)}, {formatRange(r.startTime, r.endTime)}</dd>
          <dt>People</dt><dd>{r.attendees} of {room?.capacity ?? '?'} seats</dd>
          <dt>Purpose</dt><dd>{r.purpose}</dd>
          <dt>Equipment</dt><dd>{r.equipmentNeeded.length ? r.equipmentNeeded.join(', ') : 'None'}</dd>
          {r.adminRemarks && (<><dt>Remarks</dt><dd>{r.adminRemarks}</dd></>)}
        </dl>
      </div>

      {check && <div className={`alert ${check.ok ? 'alert-green' : 'alert-red'}`}>{check.text}</div>}
      {others.length > 0 && (
        <div className="alert alert-amber">
          Approving rejects {others.length} other pending request(s) for the same time:{' '}
          {others.map((o) => o.organization).join(', ')}
        </div>
      )}

      {pending && (
        <>
          <label className="field">
            <span className="field-label">Note to the requester (optional, for approval)</span>
            <textarea rows={2} value={note} onChange={(e) => { setNote(e.target.value); setError('') }} />
          </label>
          {error && <div className="alert alert-red">{error}</div>}
          <div className="actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-danger btn-block" onClick={() => setDialog('reject')}>Reject</button>
            <button type="button" className="btn btn-primary btn-block" onClick={doApprove}>Approve</button>
          </div>
        </>
      )}

      {canCancel && (
        <>
          {error && <div className="alert alert-red">{error}</div>}
          <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 16 }} onClick={() => setDialog('cancel')}>
            Cancel this reservation
          </button>
        </>
      )}

      {dialog === 'reject' && (
        <ReasonDialog title="Reject request" reasons={REJECT_REQUEST} onSubmit={doReject} onClose={() => setDialog(null)} />
      )}
      {dialog === 'cancel' && (
        <ReasonDialog title="Cancel reservation" reasons={CANCEL_RESERVATION} onSubmit={doCancel} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}
