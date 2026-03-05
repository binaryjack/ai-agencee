import type { ReactNode } from 'react'

/**
 * Generic form-field wrapper used in showcase-web forms (contact, newsletter).
 * NOT used in dag-editor panels — those use the formular-bridge atoms directly.
 */
interface FormFieldProps {
  label:      string
  htmlFor:    string
  error?:     string
  required?:  boolean
  children:   ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  error,
  required  = false,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        {label}
        {required && <span className="text-danger-500 ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-danger-700 dark:text-danger-500">
          {error}
        </p>
      )}
    </div>
  )
}
