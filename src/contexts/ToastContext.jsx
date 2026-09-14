// src/contexts/ToastContext.jsx
import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react"

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, options = {}) => {
    const { type = "info", duration = 4000 } = options
    const id = ++idCounter
    setToasts((current) => [...current, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onDismiss()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onDismiss])

  const styles = toast.type === "success"
    ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
    : toast.type === "error"
      ? "bg-red-500/15 border-red-400/40 text-red-200"
      : "bg-white/10 border-white/20 text-white"

  return (
    <div className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-2 shadow-lg backdrop-blur-md ${styles}`}>
      <span className="text-sm">{toast.message}</span>
      <button
        type="button"
        className="text-xs uppercase tracking-wide text-white/70 hover:text-white"
        onClick={onDismiss}
      >
        Close
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
