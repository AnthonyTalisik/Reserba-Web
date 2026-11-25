// Mock data + business rules (BR-01 .. BR-15).
//
// Phase 1 of the web app: everything lives in memory, like MockData.kt did in the mobile app.
// Every function here maps to a future Spring Boot endpoint, so when the API is ready only this
// file is replaced by axios calls and the pages stay the same.

import {
  toMillis, timeToMinutes, minutesToTime, dateOffset, conflicts, overlaps,
  formatDate, formatRange, format12,
} from '../utils/time.js'
import { isValidId } from '../utils/idNumber.js'

export const MAX_PENDING = 3 // BR-11
export const MAX_DURATION_HOURS = 4 // BR-04
export const MIN_ADVANCE_HOURS = 24 // BR-03
export const MAX_ADVANCE_DAYS = 30 // BR-03
export const MAX_ROOM_NAME = 80

const HOUR = 3_600_000
const DAY = 86_400_000

export const ROOM_TYPES = {
  CLASSROOM: 'Classroom',
  MEETING: 'Meeting room',
  ACTIVITY: 'Activity space',
}

export const db = { users: [], rooms: [], reservations: [], blocks: [], notifications: [] }

// ---------------------------------------------------------------- change notifications
let version = 0
const listeners = new Set()
const emit = () => {
  version += 1
  listeners.forEach((l) => l())
}
export const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const getVersion = () => version

// ---------------------------------------------------------------------------- lookups
let seq = 1000
export const nextId = (prefix) => `${prefix}${seq++}`

export const fullName = (u) => [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ')
export const roomById = (id) => db.rooms.find((r) => r.roomId === id)
export const reservationById = (id) => db.reservations.find((r) => r.reservationId === id)
export const userById = (id) => db.users.find((u) => u.uid === id)
const adminIds = () => db.users.filter((u) => u.role === 'ADMIN').map((u) => u.uid)

// ----------------------------------------------------------------- notifications (FR-12)
export function pushNotification(userId, title, message, reservationId = '') {
  db.notifications.push({
    notificationId: nextId('n'), userId, title, message, reservationId,
    isRead: false, createdAt: Date.now(),
  })
}

export const notificationsFor = (userId) =>
  db.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt)

export function markNotificationRead(id) {
  const n = db.notifications.find((x) => x.notificationId === id)
  if (n) { n.isRead = true; emit() }
}

export function markAllRead(userId) {
  db.notifications.filter((n) => n.userId === userId).forEach((n) => { n.isRead = true })
  emit()
}

// ----------------------------------------------------------------------- auth (FR-01)
export function login(email, password) {
  const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
  if (!u) return { user: null, error: 'No account found for that email.' }
  if (u.password !== password) return { user: null, error: 'Incorrect password.' }
  if (u.accountStatus === 'PENDING') {
    return { user: null, error: 'Your account is still waiting for administrator verification.' }
  }
  if (u.accountStatus === 'REJECTED') {
    const why = u.adminRemarks ? ` Reason: ${u.adminRemarks}.` : ''
    return {
      user: null,
      error: `Your registration was rejected.${why} Please register again with corrected information.`,
    }
  }
  return { user: u, error: null }
}

/** Returns an error message, or null when the account was created as Pending. BR-12, 13, 15. */
export function register({ firstName, middleName, lastName, idNumber, organization, email, password, role }) {
  if (role === 'ADMIN') return 'Administrator accounts cannot be self-registered.'
  const id = idNumber.trim()
  const mail = email.trim()
  if (!isValidId(id)) return 'ID number must be in the format 000-00000.'

  // A rejected account may register again with corrected information.
  db.users = db.users.filter(
    (u) => !(u.accountStatus === 'REJECTED' &&
      (u.email.toLowerCase() === mail.toLowerCase() || u.idNumber === id)),
  )
  if (db.users.some((u) => u.email.toLowerCase() === mail.toLowerCase())) return 'That email is already registered.'
  if (db.users.some((u) => u.idNumber === id)) return 'That ID number is already linked to another account.'

  const user = {
    uid: nextId('u'),
    firstName: firstName.trim(), middleName: middleName.trim(), lastName: lastName.trim(),
    email: mail, password, role, idNumber: id, organization: organization.trim(),
    accountStatus: 'PENDING', verifiedBy: '', adminRemarks: '', createdAt: Date.now(),
  }
  db.users.push(user)
  adminIds().forEach((a) =>
    pushNotification(a, 'New account to verify', `${fullName(user)} (${user.idNumber}) registered.`))
  emit()
  return null
}

// ------------------------------------------------------- availability and conflicts
export function findApprovedConflict(roomId, startMillis, endMillis, excludeId = null) {
  const room = roomById(roomId)
  if (!room) return null
  return db.reservations.find((r) =>
    r.roomId === roomId && r.status === 'APPROVED' && r.reservationId !== excludeId &&
    conflicts(startMillis, endMillis, r.startMillis, r.endMillis, room.bufferMinutes),
  ) || null
}

export function findBlockConflict(roomId, startMillis, endMillis) {
  return db.blocks.find((b) =>
    b.roomId === roomId &&
    overlaps(startMillis, endMillis, toMillis(b.date, b.startTime), toMillis(b.date, b.endTime)),
  ) || null
}

/** Other pending requests that clash with this one (flagged for the admin, BR-08). */
export function overlappingPending(res) {
  const room = roomById(res.roomId)
  if (!room) return []
  return db.reservations.filter((r) =>
    r.status === 'PENDING' && r.reservationId !== res.reservationId && r.roomId === res.roomId &&
    conflicts(res.startMillis, res.endMillis, r.startMillis, r.endMillis, room.bufferMinutes),
  )
}

/** Badge text for the room list: { label, free } */
export function availabilityLabel(room) {
  if (!room.isActive) return { label: 'Unavailable', free: false }
  const now = Date.now()
  const blocked = db.blocks.find((b) =>
    b.roomId === room.roomId && now >= toMillis(b.date, b.startTime) && now <= toMillis(b.date, b.endTime))
  if (blocked) return { label: 'Blocked', free: false }
  const inUse = db.reservations.find((r) =>
    r.roomId === room.roomId && r.status === 'APPROVED' && now >= r.startMillis && now <= r.endMillis)
  if (inUse) return { label: `In use until ${format12(inUse.endTime)}`, free: false }
  return { label: 'Free now', free: true }
}

/** Hourly day timeline for one room: AVAILABLE / PENDING / TAKEN / BLOCKED. */
export function buildSlots(room, date) {
  const open = timeToMinutes(room.openTime)
  const close = timeToMinutes(room.closeTime)
  const slots = []
  for (let m = open; m < close; m += 60) {
    const startTime = minutesToTime(m)
    const endTime = minutesToTime(Math.min(m + 60, close))
    const s = toMillis(date, startTime)
    const e = toMillis(date, endTime)

    const block = db.blocks.find((b) => b.roomId === room.roomId &&
      overlaps(s, e, toMillis(b.date, b.startTime), toMillis(b.date, b.endTime)))
    const taken = db.reservations.find((r) => r.roomId === room.roomId && r.status === 'APPROVED' &&
      overlaps(s, e, r.startMillis, r.endMillis))
    const pending = db.reservations.find((r) => r.roomId === room.roomId && r.status === 'PENDING' &&
      overlaps(s, e, r.startMillis, r.endMillis))

    if (block) slots.push({ startTime, endTime, status: 'BLOCKED', detail: `Blocked - ${block.reason}` })
    else if (taken) slots.push({ startTime, endTime, status: 'TAKEN', detail: `Taken - ${taken.organization}` })
    else if (pending) slots.push({ startTime, endTime, status: 'PENDING', detail: `Pending - ${pending.organization}` })
    else slots.push({ startTime, endTime, status: 'AVAILABLE', detail: 'Available' })
  }
  return slots
}

/** BR-14: active, free (incl. buffer and blocked dates), enough seats, same type and equipment. */
export function suggestRooms(original, date, start, end, attendees, equipmentNeeded) {
  const s = toMillis(date, start)
  const e = toMillis(date, end)
  const sMin = timeToMinutes(start)
  const eMin = timeToMinutes(end)
  const seats = Math.max(attendees || 0, 1)
  return db.rooms
    .filter((r) =>
      r.roomId !== original.roomId && r.isActive && r.type === original.type &&
      r.capacity >= seats && equipmentNeeded.every((x) => r.equipment.includes(x)) &&
      sMin >= timeToMinutes(r.openTime) && eMin <= timeToMinutes(r.closeTime) &&
      !findBlockConflict(r.roomId, s, e) && !findApprovedConflict(r.roomId, s, e))
    .sort((a, b) =>
      (a.capacity - seats) - (b.capacity - seats) ||
      (a.building === original.building ? 0 : 1) - (b.building === original.building ? 0 : 1))
}

// ------------------------------------------------------------- request validation
export const pendingCount = (userId) =>
  db.reservations.filter((r) => r.requesterId === userId && r.status === 'PENDING').length

/** BR-02, 03, 04, 05, 10, 11, 12. Returns an error message or null when valid. */
export function validateRequest(room, date, startTime, endTime, attendees, purpose, userId) {
  if (!room.isActive) return 'This room is inactive and cannot be requested.'
  const s = toMillis(date, startTime)
  const e = toMillis(date, endTime)
  if (e <= s) return 'End time must be later than start time.'

  const sMin = timeToMinutes(startTime)
  const eMin = timeToMinutes(endTime)
  if (sMin < timeToMinutes(room.openTime) || eMin > timeToMinutes(room.closeTime)) {
    return `Time must fall within the room's operating hours (${formatRange(room.openTime, room.closeTime)}).`
  }
  if (e - s > MAX_DURATION_HOURS * HOUR) return `A single reservation may not exceed ${MAX_DURATION_HOURS} hours.`

  const now = Date.now()
  if (s < now) return 'The reservation date cannot be in the past.'
  if (s < now + MIN_ADVANCE_HOURS * HOUR) return `Requests must be made at least ${MIN_ADVANCE_HOURS} hours ahead.`
  if (s > now + MAX_ADVANCE_DAYS * DAY) return `Requests may be made at most ${MAX_ADVANCE_DAYS} days ahead.`

  if (!attendees || attendees < 1) return 'Enter at least 1 attendee.'
  if (attendees > room.capacity) return `Attendees exceed the room capacity (${room.capacity}).`
  if (purpose.trim().length < 10) return 'Purpose must be at least 10 characters.'
  if (pendingCount(userId) >= MAX_PENDING) {
    return `You already have ${MAX_PENDING} pending requests. Wait for a decision or cancel one.`
  }
  return null
}

export function createRequest({ room, user, organization, date, start, end, attendees, purpose, equipment }) {
  const res = {
    reservationId: nextId('res'),
    roomId: room.roomId, roomName: room.name,
    requesterId: user.uid, requesterName: fullName(user), organization,
    date, startTime: start, endTime: end,
    startMillis: toMillis(date, start), endMillis: toMillis(date, end),
    purpose: purpose.trim(), equipmentNeeded: equipment, attendees,
    status: 'PENDING', adminRemarks: '', reviewedBy: '',
    createdAt: Date.now(), updatedAt: Date.now(),
  }
  db.reservations.push(res)
  pushNotification(user.uid, 'Request submitted',
    `${room.name} on ${formatDate(date)} is waiting for approval.`, res.reservationId)
  adminIds().forEach((a) =>
    pushNotification(a, 'New reservation request',
      `${fullName(user)} requested ${room.name} on ${formatDate(date)}.`, res.reservationId))
  emit()
  return res
}

// ------------------------------------------------------------------ admin decisions
/**
 * BR-01, 06, 07, 08. Re-runs the conflict check at the moment of approval (Phase 2: inside a
 * transaction on the server), locks the slot and auto-rejects overlapping pending requests.
 */
export function approve(reservationId, remarks, admin) {
  const r = reservationById(reservationId)
  if (!r) return 'Reservation not found.'
  if (r.status !== 'PENDING') return 'Only pending requests can be approved.'
  const room = roomById(r.roomId)
  if (!room) return 'Room not found.'
  if (!room.isActive) return 'This room is inactive.'

  const block = findBlockConflict(r.roomId, r.startMillis, r.endMillis)
  if (block) return `The room is blocked at that time (${block.reason}).`
  const clash = findApprovedConflict(r.roomId, r.startMillis, r.endMillis, r.reservationId)
  if (clash) {
    return `Conflicts with an approved reservation by ${clash.organization} ` +
      `(${formatRange(clash.startTime, clash.endTime)}, ${room.bufferMinutes}-minute gap included).`
  }

  r.status = 'APPROVED'
  r.adminRemarks = remarks.trim()
  r.reviewedBy = admin.uid
  r.updatedAt = Date.now()
  pushNotification(r.requesterId, 'Reservation approved',
    `${r.roomName} on ${formatDate(r.date)}, ${formatRange(r.startTime, r.endTime)}.` +
    (r.adminRemarks ? ` Remarks: ${r.adminRemarks}` : ''), r.reservationId)

  // BR-08: auto-reject the other pending requests that overlap the slot just locked.
  overlappingPending(r).forEach((o) => {
    o.status = 'REJECTED'
    o.adminRemarks = 'Slot no longer available'
    o.reviewedBy = admin.uid
    o.updatedAt = Date.now()
    pushNotification(o.requesterId, 'Reservation rejected',
      `${o.roomName} on ${formatDate(o.date)}: Slot no longer available.`, o.reservationId)
  })
  emit()
  return null
}

export function reject(reservationId, remarks, admin) {
  if (!remarks || !remarks.trim()) return 'Remarks are required when rejecting a request.' // BR-07
  const r = reservationById(reservationId)
  if (!r) return 'Reservation not found.'
  if (r.status !== 'PENDING') return 'Only pending requests can be rejected.'
  r.status = 'REJECTED'
  r.adminRemarks = remarks.trim()
  r.reviewedBy = admin.uid
  r.updatedAt = Date.now()
  pushNotification(r.requesterId, 'Reservation rejected',
    `${r.roomName} on ${formatDate(r.date)}. Reason: ${r.adminRemarks}`, r.reservationId)
  emit()
  return null
}

/** BR-09: owners cancel their own reservations before the start time; admins need a reason. */
export function cancel(reservationId, by, reason) {
  const r = reservationById(reservationId)
  if (!r) return 'Reservation not found.'
  const isAdmin = by.role === 'ADMIN'
  if (!isAdmin && r.requesterId !== by.uid) return 'You can only cancel your own reservations.'
  if (r.status !== 'PENDING' && r.status !== 'APPROVED') return 'This reservation can no longer be cancelled.'
  if (Date.now() >= r.startMillis) return 'A reservation that has started cannot be cancelled.'
  if (isAdmin && !(reason && reason.trim())) return 'A reason is required to cancel a reservation.'

  r.status = 'CANCELLED'
  if (isAdmin) { r.adminRemarks = reason.trim(); r.reviewedBy = by.uid }
  r.updatedAt = Date.now()

  if (isAdmin) {
    pushNotification(r.requesterId, 'Reservation cancelled',
      `${r.roomName} on ${formatDate(r.date)} was cancelled by the administrator. Reason: ${r.adminRemarks}`,
      r.reservationId)
  } else {
    adminIds().forEach((a) =>
      pushNotification(a, 'Reservation cancelled',
        `${r.requesterName} cancelled ${r.roomName} on ${formatDate(r.date)}.`, r.reservationId))
  }
  emit()
  return null
}

/** Approved reservations whose end time has passed become Completed (BR-06). */
export function refreshStatuses() {
  const now = Date.now()
  let changed = false
  db.reservations.forEach((r) => {
    if (r.status === 'APPROVED' && r.endMillis < now) { r.status = 'COMPLETED'; changed = true }
  })
  if (changed) emit()
}

// ------------------------------------------------------------------ accounts (FR-11)
export const pendingAccounts = () => db.users.filter((u) => u.accountStatus === 'PENDING')

export function approveAccount(uid, admin) {
  const u = userById(uid)
  if (u) { u.accountStatus = 'ACTIVE'; u.verifiedBy = admin.uid; emit() }
}

export function rejectAccount(uid, remarks, admin) {
  if (!remarks || !remarks.trim()) return 'Remarks are required when rejecting an account.'
  const u = userById(uid)
  if (u) { u.accountStatus = 'REJECTED'; u.adminRemarks = remarks.trim(); u.verifiedBy = admin.uid; emit() }
  return null
}

// --------------------------------------------------------- rooms and blocks (FR-10)
export function addRoom({ name, building, type, capacity }) {
  db.rooms.push({
    roomId: nextId('r'), name, building, floor: '', type, capacity,
    equipment: ['Whiteboard'], openTime: '07:00', closeTime: '21:00',
    bufferMinutes: 20, isActive: true, description: '',
  })
  emit()
}

export function setRoomActive(roomId, active) {
  const r = roomById(roomId)
  if (r) { r.isActive = active; emit() }
}

export function blockWholeDay(room, date, reason, admin) {
  db.blocks.push({
    blockId: nextId('blk'), roomId: room.roomId, date,
    startTime: room.openTime, endTime: room.closeTime, reason, createdBy: admin.uid,
  })
  emit()
}

// ------------------------------------------------------------------------ seed data
function seedReservation(id, roomId, requesterId, requesterName, org, dayOffset, start, end,
  purpose, attendees, status, remarks = '') {
  const room = roomById(roomId)
  const date = dateOffset(dayOffset)
  db.reservations.push({
    reservationId: id, roomId, roomName: room.name, requesterId, requesterName, organization: org,
    date, startTime: start, endTime: end,
    startMillis: toMillis(date, start), endMillis: toMillis(date, end),
    purpose, equipmentNeeded: ['Projector'], attendees, status, adminRemarks: remarks,
    reviewedBy: status === 'PENDING' ? '' : 'u_admin', createdAt: Date.now(), updatedAt: Date.now(),
  })
}

function seed() {
  const u = (uid, firstName, lastName, email, password, role, idNumber, organization, accountStatus) =>
    db.users.push({
      uid, firstName, middleName: '', lastName, email, password, role, idNumber, organization,
      accountStatus, verifiedBy: '', adminRemarks: '', createdAt: Date.now(),
    })

  u('u_admin', 'Room', 'Administrator', 'admin@reserba.edu', 'admin123', 'ADMIN', 'ADMIN-001', 'Facilities Office', 'ACTIVE')
  u('u_student', 'Maria', 'Santos', 'student@school.edu', '123456', 'STUDENT', '240-00124', 'College of Computer Studies', 'ACTIVE')
  u('u_faculty', 'Prof.', 'Reyes', 'faculty@school.edu', '123456', 'FACULTY', '102-00020', 'Faculty meeting - department', 'ACTIVE')
  u('u_p1', 'Juan', 'Cruz', 'juan@school.edu', '123456', 'STUDENT', '240-00311', 'Student Council / Student Government', 'PENDING')
  u('u_p2', 'Ana', 'Lopez', 'ana@school.edu', '123456', 'STUDENT', '231-01180', 'College of Computer Studies', 'PENDING')
  db.users.find((x) => x.uid === 'u_p1').middleName = 'D.'

  const room = (roomId, name, building, floor, type, capacity, equipment, description = '') =>
    db.rooms.push({
      roomId, name, building, floor, type, capacity, equipment, openTime: '07:00', closeTime: '21:00',
      bufferMinutes: 20, isActive: true, description,
    })
  room('r301', 'Room 301 - CCS Lab', 'Main Building', '3rd Floor', 'CLASSROOM', 40, ['Projector', 'Whiteboard'], 'Computer lab with 40 workstations.')
  room('r302', 'Room 302', 'Main Building', '3rd Floor', 'CLASSROOM', 35, ['Projector', 'Whiteboard'])
  room('r305', 'Room 305', 'Main Building', '3rd Floor', 'CLASSROOM', 45, ['Projector', 'Whiteboard', 'Microphone'])
  room('mrA', 'Meeting Room A', 'Main Building', '2nd Floor', 'MEETING', 12, ['Projector', 'Whiteboard'])
  room('mrB', 'Meeting Room B', 'Annex Building', '1st Floor', 'MEETING', 20, ['Projector', 'Whiteboard'])
  room('hall', 'Activity Hall', 'Student Center', 'Ground Floor', 'ACTIVITY', 120, ['Projector', 'Microphone'])

  // A few overlapping cases to demonstrate conflict detection and the status workflow.
  seedReservation('s1', 'r301', 'u_seed', 'Student Council', 'Student Council / Student Government', 2, '11:00', '13:00', 'Officers planning meeting', 30, 'APPROVED', 'Approved. Please tidy up.')
  seedReservation('s2', 'r301', 'u_faculty', 'Prof. Reyes', 'Faculty meeting - department', 2, '14:00', '15:30', 'Review session for midterms', 35, 'PENDING')
  seedReservation('s3', 'r301', 'u_student', 'Maria Santos', 'College of Computer Studies', 2, '14:30', '16:00', 'General meeting of members', 40, 'PENDING')
  seedReservation('s4', 'mrA', 'u_student', 'Maria Santos', 'College of Computer Studies', 3, '09:00', '10:30', "Officers' weekly sync", 8, 'PENDING')
  seedReservation('s5', 'hall', 'u_student', 'Maria Santos', 'College of Computer Studies', 4, '13:00', '16:00', 'Freshmen orientation workshop', 80, 'APPROVED', 'Approved. Sound check at 12:30.')
  seedReservation('s6', 'r302', 'u_student', 'Maria Santos', 'College of Computer Studies', -3, '10:00', '12:00', 'Hackathon planning session', 25, 'COMPLETED')
  seedReservation('s7', 'mrB', 'u_student', 'Maria Santos', 'College of Computer Studies', -2, '15:00', '17:00', 'Alumni talk preparation', 15, 'REJECTED', 'Room reserved for a school event.')

  db.blocks.push({
    blockId: 'b1', roomId: 'r302', date: dateOffset(5), startTime: '07:00', endTime: '21:00',
    reason: 'Maintenance', createdBy: 'u_admin',
  })

  pushNotification('u_student', 'Reservation approved', 'Activity Hall was approved. Remarks: Approved. Sound check at 12:30.', 's5')
  pushNotification('u_student', 'Reservation rejected', 'Meeting Room B was rejected. Reason: Room reserved for a school event.', 's7')
  pushNotification('u_admin', 'New reservation request', 'Prof. Reyes requested Room 301 - CCS Lab.', 's2')
  pushNotification('u_admin', 'New account to verify', 'Juan D. Cruz (240-00311) registered.')
}

seed()
refreshStatuses()

// Completed reservations update on their own while the page stays open.
setInterval(refreshStatuses, 60_000)
