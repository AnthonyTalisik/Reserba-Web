import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Modal from '../components/Modal.jsx'
import { StatusBadge } from '../components/Badge.jsx'
import { cancel } from '../data/mockStore.js'
import { formatDate, formatRange } from '../utils/time.js'

const TABS = [['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['HISTORY', 'History']]
const HISTORY = ['REJECTED', 'CANCELLED', 'COMPLETED']

/** My Reservations: Pending / Approved / History with cancellation (FR-08, FR-09). */
export default function MyReservations() {
  const db = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('PENDING')
  const [toCancel, setToCancel] = useState(null)

  const mine = db.reservations.filter((r) => r.requesterId === user.uid)
  const list = (tab === 'HISTORY' ? mine.filter((r) => HISTORY.includes(r.status)) : mine.filter((r) => r.status === tab))
    .sort((a, b) => (tab === 'HISTORY' ? b.startMillis - a.startMillis : a.startMillis - b.startMillis))

  function confirmCancel() {
    const error = cancel(toCancel.reservationId, user, null)
    toast(error || 'Reservation cancelled.')
    setToCancel(null)
  }

  return (
    <div className="page-narrow">
      <h1>My reservations</h1>
      <div className="tabs" role="tablist">
        {TABS.map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value}
            className={`tab${tab === value ? ' on' : ''}`} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="empty">Nothing here yet.</p>
      ) : (
        <div className="list">
          {list.map((r) => {
            const cancellable = (r.status === 'PENDING' || r.status === 'APPROVED') && Date.now() < r.startMillis
            return (
              <div key={r.reservationId} className="card">
                <StatusBadge status={r.status} />
                <div className="card-title clip" style={{ marginTop: 8 }}>{r.roomName}</div>
                <div className="muted" style={{ marginTop: 2 }}>
                  {formatDate(r.date)}  •  {formatRange(r.startTime, r.endTime)}
                </div>
                <p style={{ marginTop: 6 }}>{r.purpose}</p>
                {r.adminRemarks && <p className="muted" style={{ marginTop: 4 }}>Administrator remarks: {r.adminRemarks}</p>}
                {cancellable && (
                  <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 12, minHeight: 44 }}
                    onClick={() => setToCancel(r)}>
                    {r.status === 'PENDING' ? 'Cancel request' : 'Cancel reservation'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {toCancel && (
        <Modal
          title="Cancel reservation?"
          onClose={() => setToCancel(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline" onClick={() => setToCancel(null)}>Keep it</button>
              <button type="button" className="btn btn-danger" onClick={confirmCancel}>Cancel reservation</button>
            </>
          )}
        >
          <p>
            {toCancel.roomName} on {formatDate(toCancel.date)}. The slot will become available to others right away.
          </p>
        </Modal>
      )}
    </div>
  )
}
