import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { homeFor } from '../context/routes.js'
import { PasswordField, TextField } from '../components/Fields.jsx'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const notice = location.state?.notice

  if (user) return <Navigate to={homeFor(user)} replace />

  function submit(e) {
    e.preventDefault()
    setError('')
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address'
    if (password.length < 6) next.password = 'Password must be at least 6 characters'
    setErrors(next)
    if (Object.keys(next).length) return

    const result = login(email, password)
    if (!result.user) return setError(result.error)
    navigate(homeFor(result.user), { replace: true })
  }

  return (
    <div>
      <header className="auth-hero">
        <div className="logo-ring"><img src="/logo.svg" alt="Reserba logo" /></div>
        <h1>Reserba</h1>
        <p>Campus room reservation, made simple</p>
      </header>

      <form className="card auth-card" onSubmit={submit} noValidate>
        <h2>Welcome back</h2>
        <p className="muted">Log in to book a room</p>

        {notice && <div className="alert alert-green">{notice}</div>}

        <TextField
          label="Email" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} error={errors.email}
        />
        <PasswordField
          label="Password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} error={errors.password}
        />

        {error && <div className="alert alert-red">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>Log in</button>
        <p className="muted center" style={{ marginTop: 14 }}>
          New accounts are checked by the room administrator before they can sign in.
        </p>
      </form>

      <p className="auth-foot">New here? <Link to="/register">Create an account</Link></p>
      <p className="auth-demo">
        Demo accounts (mock data)<br />
        student@school.edu / 123456<br />
        faculty@school.edu / 123456<br />
        admin@reserba.edu / admin123
      </p>
    </div>
  )
}
