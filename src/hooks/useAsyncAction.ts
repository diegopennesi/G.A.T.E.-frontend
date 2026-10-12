import { useCallback, useRef, useState } from 'react'
import { toMessage } from '../shared/utils'

export function useAsyncAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  const execute = useCallback(async (task: () => Promise<unknown>, success = 'Operazione completata.') => {
    if (lock.current) return false
    lock.current = true; setPending(true); setError(''); setNotice('')
    try { await task(); setNotice(success); return true }
    catch (err) { setError(`${toMessage(err)} I dati inseriti restano disponibili: puoi riprovare.`); return false }
    finally { lock.current = false; setPending(false) }
  }, [])
  return { pending, error, notice, execute, setError, setNotice }
}
