// ID number format: 3 digits, a hyphen, then 5 digits (for example 240-00124).

export const ID_PATTERN = /^\d{3}-\d{5}$/

export const isValidId = (id) => ID_PATTERN.test(id)

/** Keeps only digits (max 8) and puts the hyphen after the third digit while typing. */
export function formatId(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return digits.length <= 3 ? digits : `${digits.slice(0, 3)}-${digits.slice(3)}`
}
