// Dates are "yyyy-MM-dd" strings and times are "HH:mm" strings (same as the mobile app).

export const MINUTE = 60_000

export const pad = (n) => String(n).padStart(2, '0')

export function toMillis(date, time) {
  return new Date(`${date}T${time}:00`).getTime()
}

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** Rounds up to the next 30-minute step. */
export function roundUp30(minutes) {
  return Math.ceil(minutes / 30) * 30
}

/** "13:30" -> "1:30 PM" */
export function format12(time) {
  const m = timeToMinutes(time)
  const h = Math.floor(m / 60)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad(m % 60)} ${ampm}`
}

export const formatRange = (start, end) => `${format12(start)} - ${format12(end)}`

export function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function dayParts(date) {
  const d = new Date(`${date}T00:00:00`)
  return { dow: d.toLocaleDateString('en-US', { weekday: 'short' }), day: d.getDate() }
}

export function formatDateTime(millis) {
  return new Date(millis).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Business rule BR-01.
 * A conflict exists when:  newStart < existingEnd + buffer  AND  newEnd + buffer > existingStart
 * Example: a room approved until 11:00 with a 20-minute buffer can next start at 11:20.
 */
export function conflicts(newStart, newEnd, existingStart, existingEnd, bufferMinutes) {
  const buf = bufferMinutes * MINUTE
  return newStart < existingEnd + buf && newEnd + buf > existingStart
}

/** Plain overlap with no buffer (blocked dates and the availability timeline). */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart
}
