import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Icon from '../components/Icon.jsx'
import { SelectField, TextField } from '../components/Fields.jsx'
import { orgsForRole } from '../data/organizations.js'
import {
  MAX_ADVANCE_DAYS, createRequest, findApprovedConflict, findBlockConflict, roomById, suggestRooms, validateRequest,
} from '../data/mockStore.js'
import {
  dateOffset, format12, formatRange, minutesToTime, roundUp30, timeToMinutes, toMillis,
} from '../utils/time.js'

const EQUIPMENT = ['Projector', 'Whiteboard', 'Microphone']

/** Reservation Request Form: runs the conflict check (BR-01) and offers other free rooms (FR-05). */
export default function RequestForm() {
  useStore()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { roomId: routeRoomId } = useParams()
  const [params] = useSearchParams()

  const orgOptions = orgsForRole(user.role)
  const [roomId, setRoomId] = useState(routeRoomId)
  const [date, setDate] = useState(params.get('date') || dateOffset(2))
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [attendees, setAttendees] = useState('')
  const [purpose, setPurpose] = useState('')
  const [organization, setOrganization] = useState(
    orgOptions.find((o) => o.toLowerCase() === (user.organization || '').toLowerCase()) || '',
  )
  const [equipment, setEquipment] = useState([])
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(null)

  const room = roomById(roomId)
  if (!room) return <Navigate to="/" replace />

  // BR-02: 30-minute steps inside the room's operating hours.
  const open = timeToMinutes(room.openTime)
  const close = timeToMinutes(room.closeTime)
  const startOptions = []
  for (let m = open; m < close; m += 30) startOptions.push(minutesToTime(m))
  const endOptions = []
  for (let m = open + 30; m <= close; m += 30) endOptions.push(minutesToTime(m))
  const startValue = startOptions.includes(start) ? start : startOptions[0]
  const endValue = endOptions.includes(end) ? end : endOptions[0]
  const timesOk = timeToMinutes(endValue) > timeToMinutes(startValue)

  const clear = () => { setConflict(null); setError('') }
  const toggleEquipment = (item) => {
    clear()
    setEquipment((list) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]))
  }

  function showConflict(message, people) {
    setConflict({ message, suggestions: suggestRooms(room, date, startValue, endValue, people, equipment) })
  }

  function submit(e) {
    e.preventDefault()
    clear()
    const people = attendees === '' ? null : Number(attendees)

    if (!organization) return setError('Choose your college or organization from the list.')
    // BR-02, 03, 04, 05, 10, 11, 12
    const problem = validateRequest(room, date, startValue, endValue, people, purpose, user.uid)
    if (problem) return setError(problem)

    const s = toMillis(date, startValue)
    const en = toMillis(date, endValue)

    // BR-10 blocked dates
    const block = findBlockConflict(room.roomId, s, en)
    if (block) return showConflict(`The room is blocked at that time (${block.reason}).`, people)

    // BR-01 overlap + 20-minute gap against approved reservations
    const clash = findApprovedConflict(room.roomId, s, en)
    if (clash) {
      const next = roundUp30(timeToMinutes(clash.endTime) + room.bufferMinutes)
      const hint = next < close ? ` Earliest start after it: ${format12(minutesToTime(next))}.` : ''
      return showConflict(
        `${clash.organization} has this room ${formatRange(clash.startTime, clash.endTime)} ` +
        `(a ${room.bufferMinutes}-minute gap is kept between reservations).${hint}`,
        people,
      )
    }

    createRequest({
      room, user, organization, date, start: startValue, end: endValue,
      attendees: people, purpose, equipment,
    })
    toast('Request sent. The administrator will review it.')
    navigate('/bookings')
  }

  function switchRoom(next) {
    setRoomId(next.roomId)
    setConflict(null)
    toast(`Switched to ${next.name}. Review and send.`)
  }

  return (
    <div className="page-narrow">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <Icon name="back" size={18} /> Back
      </button>
      <h1>Request a room</h1>
      <p className="muted" style={{ marginTop: 2 }}>
        {room.name}  •  {room.building}{room.floor ? `, ${room.floor}` : ''}
      </p>

      <form className="card" style={{ marginTop: 14 }} onSubmit={submit} noValidate>
        <TextField
          label="Date" type="date" value={date} min={dateOffset(0)} max={dateOffset(MAX_ADVANCE_DAYS)}
          onChange={(e) => { setDate(e.target.value); clear() }}
          style={{ marginTop: 0 }}
        />

        <div className="form-row">
          <SelectField
            label="Start" value={startValue} options={startOptions.map((t) => [t, format12(t)])}
            onChange={(e) => { setStart(e.target.value); clear() }}
          />
          <SelectField
            label="End" value={endValue} options={endOptions.map((t) => [t, format12(t)])}
            onChange={(e) => { setEnd(e.target.value); clear() }}
          />
        </div>
        {!timesOk && <span className="field-error">End time must be later than start time.</span>}

        <TextField
          label="Attendees" type="number" min="1" inputMode="numeric" value={attendees}
          onChange={(e) => { setAttendees(e.target.value.slice(0, 4)); clear() }}
          hint={`Maximum ${room.capacity} attendees`}
        />
        <label className="field">
          <span className="field-label">Purpose (at least 10 characters)</span>
          <textarea rows={2} value={purpose} onChange={(e) => { setPurpose(e.target.value); clear() }} />
        </label>
        <SelectField
          label={user.role === 'FACULTY' ? 'Organization / meeting type' : 'College / department'}
          placeholder="Select..." options={orgOptions} value={organization}
          onChange={(e) => { setOrganization(e.target.value); clear() }}
        />

        <span className="field-label" style={{ marginTop: 14, display: 'block' }}>Equipment needed (optional)</span>
        <div className="chips" style={{ marginTop: 0 }}>
          {EQUIPMENT.map((item) => (
            <button
              key={item} type="button" className={`chip${equipment.includes(item) ? ' on' : ''}`}
              aria-pressed={equipment.includes(item)} onClick={() => toggleEquipment(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {conflict && (
          <div className="conflict" role="alert">
            <h4>This room isn't free then</h4>
            <p style={{ marginTop: 4 }}>{conflict.message}</p>
            <p style={{ marginTop: 12, fontWeight: 700 }}>Free at your time</p>
            {conflict.suggestions.length === 0 && (
              <p className="muted" style={{ marginTop: 4 }}>
                No other room matches your needs at that time. Try a different time.
              </p>
            )}
            {conflict.suggestions.map((s) => (
              <div key={s.roomId} className="suggest">
                <div className="suggest-info">
                  <strong>{s.name}</strong>
                  <div className="muted">{s.capacity} seats  •  {s.equipment.join(', ')}  •  {s.building}</div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => switchRoom(s)}>Switch</button>
              </div>
            ))}
          </div>
        )}

        {error && <div className="alert alert-red">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={!timesOk}>
          Send request
        </button>
        <p className="muted center" style={{ marginTop: 8 }}>
          Requests are checked against approved bookings, then reviewed by the administrator.
        </p>
      </form>
    </div>
  )
}
