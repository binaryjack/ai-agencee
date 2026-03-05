'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'
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
 * Two rules required by useSyncExternalStore:
 *   1. `subscribe` must be stable (same reference across renders) so the store
 *      is not re-subscribed on every render. We use useCallback with [fieldName].
 *   2. `getSnapshot` must return the *same object reference* when the data has
 *      not changed. We cache the last snapshot in a ref and compare primitives
 *      before allocating a new object — otherwise Object.is() always returns
 *      false and React loops infinitely.
 */
export function useFormularField<T = unknown>(
  form:      IFormularLike,
  fieldName: string,
): FieldSnapshot<T> {
  // Stable ref so callbacks always read the latest form without re-subscribing.
  const formRef = useRef(form)
  formRef.current = form

  // Stable subscribe — identity only changes when fieldName changes.
  const subscribe = useCallback((onStoreChange: () => void) => {
    const field = formRef.current.getField(fieldName)
    const obs   = field?.notificationManager?.observers

    if (obs) {
      obs.subscribe(fieldName, onStoreChange, true /* weakRef */)
      return () => obs.unsubscribe?.(fieldName, onStoreChange)
    }

    // No observable available (test stub, readonly field, etc.)
    return () => { /* no-op cleanup */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName])

  // Cache the previous snapshot. useSyncExternalStore uses Object.is() to
  // detect changes — a freshly allocated object on every call causes React to
  // think the store changed on every render, producing an infinite loop.
  const snapshotRef = useRef<FieldSnapshot<T> | null>(null)

  const getSnapshot = useCallback((): FieldSnapshot<T> => {
    const field     = formRef.current.getField(fieldName)
    const errors    = formRef.current.getErrors()[fieldName] ?? []
    const value     = (field?.value ?? undefined) as T
    const isDirty   = field?.isDirty   ?? false
    const isTouched = field?.isTouched ?? false

    const prev = snapshotRef.current
    if (
      prev !== null &&
      Object.is(prev.value, value) &&
      prev.isDirty   === isDirty   &&
      prev.isTouched === isTouched &&
      prev.errors.length === errors.length &&
      prev.errors.every((e, i) => Object.is(e, errors[i]))
    ) {
      return prev
    }

    const next: FieldSnapshot<T> = { value, errors, isDirty, isTouched }
    snapshotRef.current = next
    return next
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldName])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
