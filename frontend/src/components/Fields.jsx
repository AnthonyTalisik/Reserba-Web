import { useState } from 'react'

export function TextField({ label, error, hint, ...inputProps }) {
  return (
    <label className={`field${error ? ' field-invalid' : ''}`}>
      <span className="field-label">{label}</span>
      <input {...inputProps} />
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function SelectField({ label, error, placeholder, options, ...selectProps }) {
  return (
    <label className={`field${error ? ' field-invalid' : ''}`}>
      <span className="field-label">{label}</span>
      <select {...selectProps}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const [value, text] = Array.isArray(o) ? o : [o, o]
          return <option key={value} value={value}>{text}</option>
        })}
      </select>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

/** Password input with the "Show / Hide" toggle. */
export function PasswordField({ label, error, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className={`field${error ? ' field-invalid' : ''}`}>
      <span className="field-label">{label}</span>
      <span className="password-wrap">
        <input {...inputProps} type={visible ? 'text' : 'password'} />
        <button type="button" className="show-toggle" onClick={() => setVisible((v) => !v)}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
