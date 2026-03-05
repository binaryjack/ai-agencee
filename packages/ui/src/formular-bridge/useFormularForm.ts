import { useRef, useSyncExternalStore } from 'react'
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
 * formular.dev does not expose a direct form-level channel by default,
 * so we subscribe to a well-known synthetic '__form__' channel if available,
 * otherwise fall back to a no-op subscription (form state read once on mount).
 */
export function useFormularForm(form: IFormularLike): FormSnapshot {
  const formRef = useRef(form)
  formRef.current = form

  const subscribe = (onStoreChange: () => void) => {
    // Try subscribing to a '__form__' channel that formular may emit on
    // submit, validate, or reset.  If not available, no-op.
    const field = formRef.current.getField('__form__')
    const obs   = field?.notificationManager?.observers
    if (obs) {
      obs.subscribe('__form__', onStoreChange, true)
      return () => obs.unsubscribe?.('__form__', onStoreChange)
    }
    return () => { /* no-op */ }
  }

  const getSnapshot = (): FormSnapshot => ({
    isValid:     formRef.current.isValid,
    isDirty:     formRef.current.isDirty,
    isBusy:      formRef.current.isBusy,
    submitCount: formRef.current.submitCount,
  })

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
