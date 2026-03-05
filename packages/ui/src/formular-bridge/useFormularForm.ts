'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { IFormularLike } from './FormProvider.js'

export interface FormSnapshot {
  isValid:     boolean
  isDirty:     boolean
  isBusy:      boolean
  submitCount: number
}

/**
 * Subscribes to whole-form state (isValid, isDirty, isBusy, submitCount).
 * Use this for submit-button disabled state, dirty indicators, etc.
 *
 * Both `subscribe` and `getSnapshot` are stabilised with useCallback / ref
 * caching — useSyncExternalStore requires stable references and cached snapshots
 * to avoid infinite re-render loops.
 */
export function useFormularForm(form: IFormularLike): FormSnapshot {
  const formRef = useRef(form)
  formRef.current = form

  // Stable — [] means the subscription never needs to be re-registered.
  const subscribe = useCallback((onStoreChange: () => void) => {
    // Try subscribing to a '__form__' channel that formular may emit on
    // submit, validate, or reset.  If not available, no-op.
    const field = formRef.current.getField('__form__')
    const obs   = field?.notificationManager?.observers
    if (obs) {
      obs.subscribe('__form__', onStoreChange, true)
      return () => obs.unsubscribe?.('__form__', onStoreChange)
    }
    return () => { /* no-op */ }
  }, [])

  // Cache the last snapshot and only allocate a new object when a primitive
  // value actually changed — prevents the infinite loop from Object.is() always
  // returning false on freshly created objects.
  const snapshotRef = useRef<FormSnapshot | null>(null)

  const getSnapshot = useCallback((): FormSnapshot => {
    const isValid     = formRef.current.isValid
    const isDirty     = formRef.current.isDirty
    const isBusy      = formRef.current.isBusy
    const submitCount = formRef.current.submitCount

    const prev = snapshotRef.current
    if (
      prev !== null &&
      prev.isValid     === isValid     &&
      prev.isDirty     === isDirty     &&
      prev.isBusy      === isBusy      &&
      prev.submitCount === submitCount
    ) {
      return prev
    }

    const next: FormSnapshot = { isValid, isDirty, isBusy, submitCount }
    snapshotRef.current = next
    return next
  }, [])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
