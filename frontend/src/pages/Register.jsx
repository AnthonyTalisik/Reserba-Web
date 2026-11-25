import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homeFor } from '../context/routes.js'
import { PasswordField, SelectField, TextField } from '../components/Fields.jsx'
import { orgsForRole } from '../data/organizations.js'
import { register } from '../data/mockStore.js'
import { formatId, isValidId } from '../utils/idNumber.js'

export default function Register() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('STUDENT')
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '', idNumber: '', organization: '', email: '', password: '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')

  if (user) return <Navigate to={homeFor(user)} replace />

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // The organization list depends on the role, so picking another role clears the choice.
  function changeRole(next) {
    setRole(next)
    setForm((f) => ({ ...f, organization: '' }))
  }

  function submit(e) {
    e.preventDefault()
    setError('')
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'First name is required'
    if (!form.lastName.trim()) next.lastName = 'Last name is required'
    if (!isValidId(form.idNumber)) next.idNumber = 'Use the format 000-00000'
    if (!form.organization) next.organization = 'Please select an organization / department'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address'
    if (form.password.length < 6) next.password = 'Password must be at least 6 characters'
    setErrors(next)
    if (Object.keys(next).length) return

    const failure = register({ ...form, role })
    if (failure) return setError(failure)
    navigate('/login', {
      replace: true,
      state: { notice: 'Registration sent. You can log in once the administrator verifies your ID.' },
    })
  }

  return (
    <div>
      <div className="register-head">
        <img src="/logo.svg" alt="Reserba logo" />
        <h1>Create an account</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          The room administrator will verify your ID number before you can sign in.
        </p>
      </div>

      <form className="card auth-card auth-wide" style={{ marginTop: 20 }} onSubmit={submit} noValidate>
        <div className="segmented" role="radiogroup" aria-label="Account type">
          <label>
            <input type="radio" name="role" checked={role === 'STUDENT'} onChange={() => changeRole('STUDENT')} />
            Student / Org.
          </label>
          <label>
            <input type="radio" name="role" checked={role === 'FACULTY'} onChange={() => changeRole('FACULTY')} />
            Faculty / Staff
          </label>
        </div>

        <TextField label="First name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
        <TextField label="Middle name (optional)" value={form.middleName} onChange={set('middleName')} autoComplete="additional-name" />
        <TextField label="Last name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
        <TextField
          label="ID number" placeholder="000-00000" inputMode="numeric" maxLength={9} value={form.idNumber}
          onChange={(e) => setForm((f) => ({ ...f, idNumber: formatId(e.target.value) }))}
          error={errors.idNumber} hint="3 digits, a hyphen, then 5 digits"
        />
        <SelectField
          label={role === 'FACULTY' ? 'Organization / meeting type' : 'College / department'}
          placeholder="Select..." options={orgsForRole(role)} value={form.organization}
          onChange={set('organization')} error={errors.organization}
        />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField label="Password (min. 6 characters)" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />

        {error && <div className="alert alert-red">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>
          Submit for verification
        </button>
      </form>

      <p className="auth-foot" style={{ paddingBottom: 32 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
