import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Badge, { StatusBadge } from '../components/Badge.jsx'
import ReasonDialog from '../components/ReasonDialog.jsx'
import { overlappingPending, reject } from '../data/mockStore.js'
import { REJECT_REQUEST } from '../data/remarkSuggestions.js'
import { dateOffset, formatDate, formatRange } from '../utils/time.js'

const STATUS_CHIPS = [['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['ALL', 'All']]

/** Pending Requests (Admin): queue with room / date / status filters and overlap flags (FR-06). */
export default function AdminRequests() {
  const db = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState('')
  const [status, setStatus] = useState('PENDING')
  const [today, setToday] = useState(false)
  const [rejecting, setRejecting] = useState(null)

  const pending = db.reservations.filter((r) => r.status === 'PENDING')
  const overlapping = pending.filter((r) => overlappingPending(r).length > 0).length
  const todayDate = dateOffset(0)

  const list = db.reservations
    .filter((r) =>
      (!roomId || r.roomId === roomId) &&
      (status === 'ALL' || r.status === status) &&
      (!today || r.date === todayDate))
    .sort((a, b) => a.startMillis - b.startMillis)

  function doReject(remarks) {
    const error = reject(rejecting.reservationId, remarks, user)
    toast(error || 'Request rejected.')
    setRejecting(null)
  }

  return (
    <div>
      <Badge tone="blue">ROOM ADMINISTRATION</Badge>
      <h1 style={{ marginTop: 8 }}>Requests</h1>

      <div className="stat-row">
        <div className="stat stat-primary"><b>{pending.length}</b>Waiting for you</div>
        <div className="stat stat-amber"><b>{overlapping}</b><span className="muted">Overlapping</span></div>
      </div>

      <div className="form-row" style={{ marginTop: 12 }}>
        <label className="field" style={{ margin: 0 }}>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Filter by room">
            <option value="">All rooms</option>
            {db.rooms.map((r) => <option key={r.roomId} value={r.roomId}>{r.name}</option>)}
          </select>
        </label>
        <div className="chips" style={{ margin: 0 }}>
          {STATUS_CHIPS.map(([value, label]) => (
            <button key={value} type="button" className={`chip${status === value ? ' on' : ''}`} onClick={() => setStatus(value)}>
              {label}
            </button>
          ))}
          <button type="button" className={`chip${today ? ' on' : ''}`} onClick={() => setToday((v) => !v)}>Today</button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="empty">No requests match these filters.</p>
      ) : (
        <div className="grid-cards">
          {list.map((r) => {
            const isPending = r.status === 'PENDING'
            const overlap = isPending && overlappingPending(r).length > 0
            return (
              <div key={r.reservationId} className="card">
                <div className="row-between">
                  <strong className="clip" title={r.requesterName}>{r.requesterName}</strong>
                  <StatusBadge status={r.status} />
                </div>
                <div className="card-title clip" style={{ marginTop: 6, fontSize: 14 }}>{r.roomName}</div>
                <div className="muted" style={{ marginTop: 2 }}>
                  {formatDate(r.date)}  •  {formatRange(r.startTime, r.endTime)}
                </div>
                <div className="muted clip" title={r.organization} style={{ marginTop: 2 }}>
                  {r.attendees} people  •  {r.organization}
                </div>
                {overlap && <div className="alert alert-amber">Overlaps another pending request</div>}
                <div className="actions">
                  {isPending && (
                    <button type="button" className="btn btn-danger" onClick={() => setRejecting(r)}>Reject</button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={() => navigate(`/admin/requests/${r.reservationId}`)}>
                    {isPending ? 'Review' : 'Details'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rejecting && (
        <ReasonDialog title="Reject request" reasons={REJECT_REQUEST} onSubmit={doReject} onClose={() => setRejecting(null)} />
      )}
    </div>
  )
}
