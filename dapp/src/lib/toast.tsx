import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: string; title?: string; message: string; kind?: 'info'|'success'|'error' }
type Ctx = { toasts: Toast[]; push: (t: Omit<Toast,'id'>) => void; remove: (id: string) => void; clear: () => void }

const ToastCtx = createContext<Ctx | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((t: Omit<Toast,'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, ...t }])
    setTimeout(() => { setToasts(prev => prev.filter(x => x.id !== id)) }, 6000)
  }, [])

  const remove = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), [])
  const clear = useCallback(() => setToasts([]), [])

  const value = useMemo(() => ({ toasts, push, remove, clear }), [toasts, push, remove, clear])
  return (
    <ToastCtx.Provider value={value}>
      {children}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastShelf() {
  const { toasts, remove } = useToast()
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 w-[340px]">
      {toasts.map(t => (
        <div key={t.id} className={
          'border rounded p-3 shadow bg-white ' +
          (t.kind === 'success' ? 'border-green-500' : t.kind === 'error' ? 'border-red-500' : 'border-gray-300')
        }>
          {t.title && <div className="font-medium mb-1">{t.title}</div>}
          <div className="text-sm">{t.message}</div>
          <button className="mt-2 text-xs underline" onClick={()=>remove(t.id)}>dismiss</button>
        </div>
      ))}
    </div>
  )
}
