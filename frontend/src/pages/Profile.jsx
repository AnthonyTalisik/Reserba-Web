import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Badge from '../components/Badge.jsx'
import { fullName } from '../data/mockStore.js'

const ROLE_LABEL = {
  STUDENT: 'Student / Organization Representative',
  FACULTY: 'Faculty / Staff',
  ADMIN: 'Room Administrator',
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-narrow">
      <h1>Profile</h1>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title" style={{ fontSize: 18 }}>{fullName(user)}</div>
        <div style={{ marginTop: 6 }}><Badge tone="blue">{ROLE_LABEL[user.role]}</Badge></div>
        <dl className="detail-grid">
          <dt>Email</dt><dd>{user.email}</dd>
          <dt>ID number</dt><dd>{user.idNumber}</dd>
          <dt>Organization</dt><dd>{user.organization}</dd>
        </dl>
      </div>
      <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 16 }} onClick={signOut}>
        Log out
      </button>
    </div>
  )
}
