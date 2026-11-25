import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Modal from '../components/Modal.jsx'
import { SelectField, TextField } from '../components/Fields.jsx'
import { MAX_ROOM_NAME, ROOM_TYPES, addRoom, blockWholeDay, setRoomActive } from '../data/mockStore.js'
import { dateOffset, formatDate, formatRange } from '../utils/time.js'

/** Manage Rooms & Blocked Dates (Admin) (FR-10). */
export default function ManageRooms() {
  const db = useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [blocking, setBlocking] = useState(null)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Manage rooms</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 520 }}>
            Deactivate a room or block a date for maintenance or events. Inactive rooms and blocked dates cannot be requested.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>Add room</button>
      </div>

      <div className="grid-cards">
        {db.rooms.map((room) => (
          <div key={room.roomId} className="card">
            <div className="row-between">
              <div>
                <div className="card-title clip" title={room.name}>{room.name}</div>
                <div className="muted">
                  {room.building}  •  {room.capacity} seats  •  {formatRange(room.openTime, room.closeTime)}  •  {room.bufferMinutes}-min gap
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={room.isActive} onChange={(e) => {
                  setRoomActive(room.roomId, e.target.checked)
                  toast(`${room.name} is now ${e.target.checked ? 'active' : 'inactive'}.`)
                }} />
                Active
              </label>
            </div>
            <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => setBlocking(room)}>
              Block a date
            </button>
          </div>
        ))}
      </div>

      {adding && <AddRoomDialog onClose={() => setAdding(false)} onAdded={() => toast('Room added.')} />}
      {blocking && (
        <BlockDialog
          room={blocking} admin={user} onClose={() => setBlocking(null)}
          onBlocked={(date) => toast(`Blocked ${formatDate(date)}. New requests are not allowed that day.`)}
        />
      )}
    </div>
  )
}

function AddRoomDialog({ onClose, onAdded }) {
  const [name, setName] = useState('')
  const [building, setBuilding] = useState('')
  const [capacity, setCapacity] = useState('')
  const [type, setType] = useState('CLASSROOM')
  const [errors, setErrors] = useState({})

  function submit() {
    const next = {}
    if (!name.trim()) next.name = 'Required'
    else if (name.trim().length > MAX_ROOM_NAME) next.name = `At most ${MAX_ROOM_NAME} characters`
    if (!building.trim()) next.building = 'Required'
    if (!(Number(capacity) >= 1)) next.capacity = 'Enter a number of at least 1'
    setErrors(next)
    if (Object.keys(next).length) return
    addRoom({ name: name.trim(), building: building.trim(), type, capacity: Number(capacity) })
    onAdded()
    onClose()
  }

  return (
    <Modal
      title="Add room" onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit}>Add</button>
        </>
      )}
    >
      <TextField label="Room name" maxLength={MAX_ROOM_NAME} hint={`${name.length}/${MAX_ROOM_NAME} characters`} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <TextField label="Building" value={building} onChange={(e) => setBuilding(e.target.value)} error={errors.building} />
      <TextField label="Capacity (seats)" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} error={errors.capacity} />
      <SelectField label="Room type" value={type} onChange={(e) => setType(e.target.value)} options={Object.entries(ROOM_TYPES)} />
    </Modal>
  )
}

function BlockDialog({ room, admin, onClose, onBlocked }) {
  const [date, setDate] = useState(dateOffset(1))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function submit() {
    if (!date) return setError('Choose a date.')
    if (!reason.trim()) return setError('A reason is required, for example Maintenance.')
    blockWholeDay(room, date, reason.trim(), admin)
    onBlocked(date)
    onClose()
  }

  return (
    <Modal
      title={`Block ${room.name}`} onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit}>Block date</button>
        </>
      )}
    >
      <TextField label="Date" type="date" min={dateOffset(0)} value={date} onChange={(e) => { setDate(e.target.value); setError('') }} />
      <TextField label="Reason" placeholder="Maintenance, exams, school event..." value={reason}
        onChange={(e) => { setReason(e.target.value); setError('') }} />
      {error && <div className="alert alert-red">{error}</div>}
    </Modal>
  )
}
