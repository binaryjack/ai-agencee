import { useEffect, useId, useState } from 'react'
import { useForm } from './FormProvider.js'
import { useFormularField } from './useFormularField.js'
import { ValidationResult } from './ValidationResult.js'

interface TextAreaProps {
  name:        string
  label?:      string
  rows?:       number
  placeholder?: string
  disabled?:   boolean
  className?:  string
}

export function TextArea({
  name,
  label,
  rows      = 4,
  placeholder,
  disabled  = false,
  className = '',
}: Readonly<TextAreaProps>) {
  const form  = useForm()
  const field = useFormularField<string>(form, name)
  const id    = useId()

  const [isFocused, setIsFocused] = useState(false)
  const [isTouched, setIsTouched] = useState(false)

  // When a submit is attempted, treat all fields as touched so subsequent
  // changes re-validate and errors stay visible.
  useEffect(() => {
    if (form.submitAttemptCount > 0) setIsTouched(true)
  }, [form.submitAttemptCount])

  const hasError = field.errors.length > 0

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={(field.value as string | undefined) ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          form.updateField(name, e.target.value)
          if (isTouched) void form.validate(name)
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          setIsTouched(true)
          void form.validate(name)
        }}
        aria-invalid={hasError ? true : undefined}
        aria-describedby={hasError ? `${id}-validation` : undefined}
        className={[
          'rounded-node border px-3 py-1.5 text-sm bg-white dark:bg-neutral-800',
          'text-neutral-900 dark:text-neutral-100 resize-y',
          'outline-none transition-colors font-mono',
          'focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          hasError
            ? 'border-danger-500'
            : 'border-neutral-300 dark:border-neutral-600',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <ValidationResult id={`${id}-validation`} isFocused={isFocused} errors={field.errors} />
    </div>
  )
}
