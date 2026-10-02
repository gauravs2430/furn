import { useId, useState } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  type?: string
  hint?: string
}

export function TextField({ label, value, onChange, placeholder, autoComplete, type = 'text', hint }: TextFieldProps) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

interface TextAreaProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function TextArea({ label, value, onChange, placeholder, rows = 3 }: TextAreaProps) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <textarea
        id={id}
        className="input textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  stepper?: boolean
}

export function NumberField({ label, value, onChange, min, max, step = 1, suffix, stepper = false }: NumberFieldProps) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [source, setSource] = useState(value)
  if (value !== source) {
    setSource(value)
    setText(String(value))
  }

  function commit(nextText: string) {
    if (nextText.trim() === '') {
      setText(String(value))
      return
    }
    const parsed = Number(nextText)
    if (!Number.isFinite(parsed)) {
      setText(String(value))
      return
    }
    onChange(parsed)
  }

  function nudge(direction: number) {
    const next = Math.round((value + direction * step) * 1000) / 1000
    const clamped = Math.min(max ?? next, Math.max(min ?? next, next))
    onChange(clamped)
  }

  const input = (
    <input
      id={id}
      className="input"
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        const parsed = Number(event.target.value)
        if (event.target.value.trim() !== '' && Number.isFinite(parsed)) onChange(parsed)
      }}
      onBlur={() => commit(text)}
    />
  )

  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">
        {label}
        {suffix ? <span className="field-suffix"> {suffix}</span> : null}
      </span>
      {stepper ? (
        <span className="stepper">
          <button type="button" className="stepper-btn" onClick={() => nudge(-1)} aria-label={`Decrease ${label}`}>
            −
          </button>
          {input}
          <button type="button" className="stepper-btn" onClick={() => nudge(1)} aria-label={`Increase ${label}`}>
            +
          </button>
        </span>
      ) : (
        input
      )}
    </label>
  )
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}

export function SelectField({ label, value, onChange, children, ...props }: SelectFieldProps) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <select id={id} className="input" value={value} onChange={(event) => onChange(event.target.value)} {...props}>
        {children}
      </select>
    </label>
  )
}
