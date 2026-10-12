/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Dialog } from 'primereact/dialog'

type GuardContext = { requestNavigation: (action: () => void) => void; register: (id: string, blocking: boolean) => () => void }
const Context = createContext<GuardContext | null>(null)
export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const guards = useRef(new Map<string, boolean>())
  const action = useRef<(() => void) | null>(null)
  const [dialog, setDialog] = useState<'discard' | 'waiting' | null>(null)
  const register = useCallback((id: string, blocking: boolean) => {
    guards.current.set(id, blocking)
    return () => { guards.current.delete(id) }
  }, [])
  const requestNavigation = useCallback((next: () => void) => {
    if (!guards.current.size) { next(); return }
    const blocked = [...guards.current.values()].some(Boolean)
    action.current = blocked ? null : next
    setDialog(blocked ? 'waiting' : 'discard')
  }, [])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (guards.current.size) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  const cancel = () => { action.current = null; setDialog(null) }
  const value = useMemo(() => ({ requestNavigation, register }), [requestNavigation, register])
  return <Context.Provider value={value}>{children}<Dialog visible={Boolean(dialog)} modal draggable={false} resizable={false} className="confirm-action-dialog" header={dialog === 'waiting' ? 'Operazione in corso' : 'Modifiche non salvate'} onHide={cancel} footer={<div className="confirm-action-footer"><button type="button" className="secondary-btn" onClick={cancel}>{dialog === 'waiting' ? 'Ho capito' : 'Resta qui'}</button>{dialog === 'discard' && <button type="button" className="danger-btn" onClick={() => { const next = action.current; cancel(); next?.() }}>Scarta e continua</button>}</div>}><p>{dialog === 'waiting' ? 'Attendi la fine della richiesta prima di cambiare pagina.' : 'Cambiando pagina perderai le modifiche non salvate. Puoi restare qui per salvarle.'}</p></Dialog></Context.Provider>
}
export function useNavigationGuard() {
  const context = useContext(Context)
  if (!context) throw new Error('NavigationGuardProvider non disponibile')
  return context
}
export function useUnsavedChanges(dirty: boolean, pending = false) {
  const { register } = useNavigationGuard()
  const id = useId()
  useEffect(() => {
    if (dirty || pending) return register(id, pending)
  }, [dirty, pending, id, register])
}
