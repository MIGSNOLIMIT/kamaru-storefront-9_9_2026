import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui'

type Options = {
  title: string
  message: string
  confirmLabel?: string
  tone?: 'default' | 'danger'
}

type Pending = Options & { resolve: (value: boolean) => void }

const ConfirmContext = createContext<((options: Options) => Promise<boolean>) | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const pendingRef = useRef<Pending | null>(null)
  pendingRef.current = pending

  const close = (value: boolean) => {
    pendingRef.current?.resolve(value)
    setPending(null)
  }

  const confirm = useCallback((options: Options) => new Promise<boolean>((resolve) => {
    setPending({ ...options, resolve })
  }), [])

  useEffect(() => {
    if (!pending) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/40 p-4 transition" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-xl font-extrabold">{pending.title}</h2>
            <p className="mt-3 text-sm leading-6 text-ink/70">{pending.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button type="button" onClick={() => close(true)}>{pending.confirmLabel ?? 'Confirm'}</Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider')
  return confirm
}
