import { useRef, useSyncExternalStore } from 'react'
import type { ErrorLike, IFormularLike } from './FormProvider.js'

export interface FieldSnapshot<T = unknown> {
  value:     T
  errors:    ErrorLike[]
  isDirty:   boolean
  isTouched: boolean
}

/**
 * Subscribes a React component to a single formular.dev field signal via
 * `useSyncExternalStore`. Re-renders only when that specific field's value
 * or validation state changes — no render on unrelated fields.
 *
 * formular.dev uses a channel-based NotificationManager:
 *   field.notificationManager.observers.subscribe(channel, cb, weakRef)
 *
 * Falls back to a no-op subscription when the field has no
 * notificationManager (e.g. during SSR / test stubs).
 */
export function useFormularField<T = unknown>(
  form:      IFormularLike,
  fieldName: string,
): FieldSnapshot<T> {
  // Stable ref so subscribe/getSnapshot capture the latest form instance
  // without triggering re-subscription on every render.
  const formRef = useRef(form)
  formRef.current = form

  const subscribe = (onStoreChange: () => void) => {
    const field = formRef.current.getField(fieldName)
    const obs   = field?.notificationManager?.observers

    if (obs) {
      obs.subscribe(fieldName, onStoreChange, true /* weakRef */)
      return () => obs.unsubscribe?.(fieldName, onStoreChange)
    }

    // No observable available (test stub, readonly field, etc.)
    return () => { /* no-op cleanup */ }
  }

  const getSnapshot = (): FieldSnapshot<T> => {
    const field  = formRef.current.getField(fieldName)
    const errors = formRef.current.getErrors()[fieldName] ?? []
    return {
      value:     (field?.value ?? undefined) as T,
      errors,
      isDirty:   field?.isDirty   ?? false,
      isTouched: field?.isTouched ?? false,
    }
  }

  // Third argument = server snapshot (same as client — no SSR in dag-editor,
  // but showcase-web may use Next.js so we keep this safe).
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
