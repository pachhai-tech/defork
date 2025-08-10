import { createContext, useContext, useState, ReactNode } from 'react'

type Toast = { message: string, type?: 'info'|'success'|'error' }
type ToastContextType = { show: (t: Toast) => void }

const ToastContext = createContext<ToastContextType>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast|null>(null)

  function show(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className={
          `fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded shadow text-white
          ${toast.type==='error'?'bg-red-600':toast.type==='success'?'bg-green-600':'bg-gray-800'}`
        }>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
