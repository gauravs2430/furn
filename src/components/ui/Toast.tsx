import { useAppStore } from '../../store/useAppStore.ts'

export function Toasts() {
  const toasts = useAppStore((state) => state.toasts)
  const dismiss = useAppStore((state) => state.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" className={`toast toast-${toast.tone}`} onClick={() => dismiss(toast.id)}>
          {toast.message}
        </button>
      ))}
    </div>
  )
}
