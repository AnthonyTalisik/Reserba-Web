import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Badge from '../components/Badge.jsx'
import { availabilityLabel, ROOM_TYPES } from '../data/mockStore.js'

const TYPE_CHIPS = [['ALL', 'All'], ['CLASSROOM', 'Classroom'], ['MEETING', 'Meeting room'], ['ACTIVITY', 'Activity space']]
const CAPACITIES = [[0, 'Any capacity'], [10, '10+ seats'], [30, '30+ seats'], [50, '50+ seats'], [100, '100+ seats']]

/** Room List (Home): search by name/building, filter by type, capacity and "free now". */
export default function RoomsPage() {
  const db = useStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('ALL')
  const [minCapacity, setMinCapacity] = useState(0)
  const [freeNow, setFreeNow] = useState(false)

  const q = query.trim().toLowerCase()
  const rooms = db.rooms.filter((r) =>
    r.isActive &&
    (!q || r.name.toLowerCase().includes(q) || r.building.toLowerCase().includes(q)) &&
    (type === 'ALL' || r.type === type) &&
    r.capacity >= minCapacity &&
    (!freeNow || availabilityLabel(r).free))

  return (
    <div>
      <p className="muted">Hi, {user.firstName}</p>
      <h1>Find a room</h1>

      <div className="form-row" style={{ marginTop: 12 }}>
        <label className="field" style={{ margin: 0 }}>
          <input
            type="search" placeholder="Search room name or building" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search rooms"
          />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <select value={minCapacity} onChange={(e) => setMinCapacity(Number(e.target.value))} aria-label="Minimum capacity">
            {CAPACITIES.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
          </select>
        </label>
      </div>

      <div className="chips">
        {TYPE_CHIPS.map(([value, label]) => (
          <button key={value} type="button" className={`chip${type === value ? ' on' : ''}`} onClick={() => setType(value)}>
            {label}
          </button>
        ))}
        <button type="button" className={`chip${freeNow ? ' on' : ''}`} onClick={() => setFreeNow((v) => !v)}>
          Free now
        </button>
      </div>

      {rooms.length === 0 ? (
        <p className="empty">No rooms match your filters.</p>
      ) : (
        <div className="grid-cards">
          {rooms.map((room) => {
            const { label, free } = availabilityLabel(room)
            return (
              <button key={room.roomId} type="button" className="card card-click" onClick={() => navigate(`/rooms/${room.roomId}`)}>
                <div className="card-title clip" title={room.name}>{room.name}</div>
                <div className="muted" style={{ marginTop: 2 }}>
                  {room.building}{room.floor ? `, ${room.floor}` : ''}
                </div>
                <div className="row" style={{ marginTop: 12 }}>
                  <Badge tone={free ? 'green' : 'amber'}>{label}</Badge>
                  <span className="muted">{room.capacity} seats  •  {ROOM_TYPES[room.type]}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
