import { useAuth } from '../context/AuthContext.jsx'
import { useStore } from '../hooks/useStore.js'
import { markAllRead, markNotificationRead, notificationsFor } from '../data/mockStore.js'
import { formatDateTime } from '../utils/time.js'

/** Notifications (FR-12): in-app updates that can be marked as read. */
export default function Notifications() {
  useStore()
  const { user } = useAuth()
  const list = notificationsFor(user.uid)

  return (
    <div className="page-narrow">
      <div className="row-between">
        <h1>Notifications</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => markAllRead(user.uid)}>
          Mark all read
        </button>
      </div>

      {list.length === 0 ? (
        <p className="empty">You're all caught up.</p>
      ) : (
        <div className="list">
          {list.map((n) => (
            <button
              key={n.notificationId} type="button"
              className={`card card-click notif${n.isRead ? ' read' : ''}`}
              onClick={() => markNotificationRead(n.notificationId)}
            >
              <i className="dot" />
              <div>
                <div className="card-title" style={{ fontSize: 14 }}>{n.title}</div>
                <p style={{ marginTop: 2 }}>{n.message}</p>
                <p className="muted" style={{ marginTop: 4 }}>{formatDateTime(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
