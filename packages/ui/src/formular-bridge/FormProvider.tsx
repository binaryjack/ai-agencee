import { createContext, useContext, type ReactNode } from 'react'

/**
 * Loose interface matching what formular.dev IFormular exposes at runtime.
 * Typed as `unknown` where we don't need structural checks here — the
 * consuming schema code (e.g. WorkerNodePanel) is fully typed via f.infer<>.
 */
export interface IFormularLike {
  getField(name: string): FieldLike | undefined
  getErrors(): Record<string, ErrorLike[]>
  updateField(name: string, value: unknown): void
  validateField(name: string): unknown
  validateForm(): Promise<boolean>
  submit(): Promise<unknown>
  reset(): void
  clear(): void
  isValid:      boolean
  isDirty:      boolean
  isBusy:       boolean
  submitCount:  number
}

export interface FieldLike {
  value:        unknown
  isDirty:      boolean
  isTouched:    boolean
  /** formular channel-based observer API */
  notificationManager?: {
    observers?: {
      subscribe(channel: string, cb: () => void, weak: boolean): void
      unsubscribe?(channel: string, cb: () => void): void
      trigger(channel: string): void
    }
  }
}

export interface ErrorLike {
  message: string
  code?:   string
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FormContext = createContext<IFormularLike | null>(null)

export function FormProvider({
  form,
  children,
}: {
  form:     IFormularLike
  children: ReactNode
}) {
  return <FormContext.Provider value={form}>{children}</FormContext.Provider>
}

export function useForm(): IFormularLike {
  const form = useContext(FormContext)
  if (!form) throw new Error('useForm must be called inside <FormProvider>')
  return form
}
