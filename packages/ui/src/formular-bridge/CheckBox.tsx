import { useId, useState } from 'react'
import { useForm } from './FormProvider.js'
import { useFormularField } from './useFormularField.js'
import { ValidationResult } from './ValidationResult.js'

interface CheckBoxProps {
  name:      string
  label?:    string
  disabled?: boolean
  className?: string
}

export function CheckBox({
  name,
  label,
  disabled  = false,
  className = '',
}: Readonly<CheckBoxProps>) {
  const form  = useForm()
  const field = useFormularField<boolean>(form, name)
  const id    = useId()

  const [isFocused, setIsFocused] = useState(false)

  const hasError = field.errors.length > 0

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={id}
        className={[
          'flex items-center gap-2 text-sm cursor-pointer select-none',
          'text-neutral-700 dark:text-neutral-300',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input
          id={id}
          type="checkbox"
          name={name}
          checked={!!(field.value)}
          disabled={disabled}
          onChange={(e) => {
            form.updateField(name, e.target.checked)
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            void form.validate(name)
          }}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? `${id}-validation` : undefined}
          className={[
            'h-4 w-4 rounded border accent-brand-500',
            'focus:ring-2 focus:ring-brand-500 focus:ring-offset-1',
            hasError ? 'border-danger-500' : 'border-neutral-300 dark:border-neutral-600',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {label}
      </label>
      <ValidationResult id={`${id}-validation`} isFocused={isFocused} errors={field.errors} />
    </div>
  )
}
