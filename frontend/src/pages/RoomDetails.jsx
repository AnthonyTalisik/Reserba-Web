import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Icon from '../components/Icon.jsx'
import { buildSlots, roomById, ROOM_TYPES } from '../data/mockStore.js'
import { dateOffset, dayParts, format12, formatDate, formatRange } from '../utils/time.js'

/** Room Details & Availability: a day timeline of available, pending, taken and blocked slots. */
export default function RoomDetails() {
  useStore()
  const { user } = useAuth()
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [date, setDate] = useState(dateOffset(2)) // first comfortably bookable day (24 h rule)

  const room = roomById(roomId)
  if (!room) return <Navigate to="/" replace />

  const isAdmin = user.role === 'ADMIN'
  const days = Array.from({ length: 15 }, (_, i) => dateOffset(i))
  const slots = buildSlots(room, date)

  return (
    <div>
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <Icon name="back" size={18} /> Back
      </button>
      <h1>{room.name}</h1>
      <p className="muted" style={{ marginTop: 2 }}>{room.building}, {room.floor}</p>
      <p style={{ marginTop: 8 }}>
        {ROOM_TYPES[room.type]}  •  {room.capacity} seats  •  Open {formatRange(room.openTime, room.closeTime)}
      </p>
      <p className="muted" style={{ marginTop: 2 }}>Equipment: {room.equipment.join(', ')}</p>
      {room.description && <p className="muted" style={{ marginTop: 2 }}>{room.description}</p>}

      <div className="date-strip" role="tablist" aria-label="Choose a date">
        {days.map((d) => {
          const { dow, day } = dayParts(d)
          return (
            <button key={d} type="button" className={`day${d === date ? ' on' : ''}`} onClick={() => setDate(d)}>
              <small>{dow}</small>{day}
            </button>
          )
        })}
      </div>

      <h3 style={{ marginTop: 6 }}>{formatDate(date)}</h3>
      <div className="legend">
        <span><i className="dot" style={{ background: 'var(--green)' }} />Available</span>
        <span><i className="dot" style={{ background: 'var(--amber)' }} />Pending</span>
        <span><i className="dot" style={{ background: 'var(--red)' }} />Taken</span>
        <span><i className="dot" style={{ background: 'var(--border)' }} />Blocked</span>
      </div>

      <div>
        {slots.map((s) => (
          <div key={s.startTime} className={`slot slot-${s.status}`}>
            <div className="slot-time">{format12(s.startTime)}</div>
            <div className="slot-body">{s.detail}</div>
          </div>
        ))}
      </div>

      <p className="muted center" style={{ marginTop: 14 }}>
        Pending requests don't lock a room. Only approved reservations do.
      </p>
      <div className="sticky-action">
        <button
          type="button" className="btn btn-primary btn-block" disabled={isAdmin || !room.isActive}
          onClick={() => navigate(`/rooms/${room.roomId}/request?date=${date}`)}
        >
          {isAdmin ? "Administrators don't request rooms" : room.isActive ? 'Request this room' : 'Room is inactive'}
        </button>
      </div>
    </div>
  )
}
