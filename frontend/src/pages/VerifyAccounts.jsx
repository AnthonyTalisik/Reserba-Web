import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useStore } from '../hooks/useStore.js'
import Badge from '../components/Badge.jsx'
import ReasonDialog from '../components/ReasonDialog.jsx'
import { approveAccount, fullName, pendingAccounts, rejectAccount } from '../data/mockStore.js'
import { REJECT_ACCOUNT } from '../data/remarkSuggestions.js'

/** Verify Accounts (Admin): approve or reject new registrations after checking the ID (FR-11). */
export default function VerifyAccounts() {
  useStore()
  const { user } = useAuth()
  const toast = useToast()
  const [rejecting, setRejecting] = useState(null)
  const list = pendingAccounts()

  function approve(u) {
    approveAccount(u.uid, user)
    toast(`${fullName(u)}'s account was approved.`)
  }

  function reject(remarks) {
    const error = rejectAccount(rejecting.uid, remarks, user)
    toast(error || `${fullName(rejecting)}'s account was rejected.`)
    setRejecting(null)
  }

  return (
    <div>
      <h1>Verify accounts</h1>
      <p className="muted" style={{ marginTop: 4 }}>{list.length} new registration(s) to check</p>
      <div className="alert alert-blue">Check each name and ID number against school records before approving.</div>

      {list.length === 0 ? (
        <p className="empty">No accounts are waiting for verification.</p>
      ) : (
        <div className="grid-cards">
          {list.map((u) => {
            const initials = [u.firstName, u.lastName].map((s) => s.charAt(0).toUpperCase()).join('')
            return (
              <div key={u.uid} className="card">
                <div className="row">
                  <span className="avatar">{initials}</span>
                  <div style={{ flex: 1 }}>
                    <strong>{fullName(u)}</strong>
                    <div className="muted">ID: {u.idNumber}</div>
                  </div>
                  <Badge tone="green">{u.role === 'FACULTY' ? 'Faculty' : 'Student'}</Badge>
                </div>
                <p className="muted" style={{ marginTop: 8 }}>Organization / department: {u.organization}</p>
                <div className="actions">
                  <button type="button" className="btn btn-danger" onClick={() => setRejecting(u)}>Reject</button>
                  <button type="button" className="btn btn-primary" onClick={() => approve(u)}>Approve</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rejecting && (
        <ReasonDialog title="Reject account" reasons={REJECT_ACCOUNT} onSubmit={reject} onClose={() => setRejecting(null)} />
      )}
    </div>
  )
}
