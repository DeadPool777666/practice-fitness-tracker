import { useCallback, useState } from 'react'
import { ToastContext } from './toastContext.js'

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), [])
  const notify = useCallback((message, kind = 'success') => {
    const id = nextId++
    setToasts((items) => [...items.slice(-3), { id, message, kind }])
    setTimeout(() => dismiss(id), 3500)
  }, [dismiss])

  return <ToastContext.Provider value={{ notify }}>
    {children}
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => <button key={toast.id} type="button" className={`toast toast-${toast.kind}`} onClick={() => dismiss(toast.id)}>{toast.kind === 'error' ? '⚠' : '✓'} {toast.message}</button>)}
    </div>
  </ToastContext.Provider>
}
