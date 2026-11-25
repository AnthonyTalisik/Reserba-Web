const STATUS_TONE = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'red',
  COMPLETED: 'blue',
}

export default function Badge({ tone = 'blue', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function StatusBadge({ status }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase()
  return <Badge tone={STATUS_TONE[status]}>{label}</Badge>
}
