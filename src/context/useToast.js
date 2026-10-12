import { useContext } from 'react'
import { ToastContext } from './toastContext.js'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast должен использоваться внутри ToastProvider')
  return context
}
