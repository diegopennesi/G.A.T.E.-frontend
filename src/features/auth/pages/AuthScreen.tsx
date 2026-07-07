import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { confirmPasswordReset, login, register, requestPasswordReset } from '../../../services/gateApi'
import type { AuthSession } from '../../../types/domain'
import { toMessage } from '../../../shared/utils'

const normalizeUsernameInput = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
const USERNAME_PATTERN = '^[a-z0-9._-]+$'

export function AuthScreen({
  onAuth,
  initialMode = 'login',
  onModeChange,
  realmCode = 'gate',
  realmName = 'Taverna del Codice',
  logoUrl = null,
}: {
  onAuth: (session: AuthSession) => Promise<void>
  initialMode?: 'login' | 'register' | 'recover'
  onModeChange?: (mode: 'login' | 'register' | 'recover') => void
  realmCode?: string
  realmName?: string
  logoUrl?: string | null
}) {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profileName, setProfileName] = useState('')
  const [bio, setBio] = useState('')
  const [resetSeed, setResetSeed] = useState('')
  const [resetExpiresAt, setResetExpiresAt] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const resetRecoveryState = () => {
    setResetSeed('')
    setResetExpiresAt('')
    setNewPassword('')
    setConfirmPassword('')
    setRecoveryStep('request')
    setInfo('')
  }

  const switchMode = (nextMode: typeof mode) => {
    setMode(nextMode)
    onModeChange?.(nextMode)
    setError('')
    if (nextMode !== 'recover') {
      resetRecoveryState()
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      const normalizedUsername = normalizeUsernameInput(username)
      if ((mode === 'login' || mode === 'register' || recoveryStep === 'request') && normalizedUsername !== username) {
        setUsername(normalizedUsername)
      }
      if ((mode === 'login' || mode === 'register' || recoveryStep === 'request') && normalizedUsername.length < 3) {
        throw new Error('Username minimo 3 caratteri')
      }

      if (mode === 'login') {
        await onAuth(await login(normalizedUsername, password))
        return
      }

      if (mode === 'register') {
        await onAuth(await register({ username: normalizedUsername, password, profileName, bio }))
        return
      }

      if (recoveryStep === 'request') {
        const response = await requestPasswordReset(normalizedUsername)
        setResetSeed(response.resetSeed)
        setResetExpiresAt(response.expiresAt)
        setRecoveryStep('confirm')
        setInfo('Seed di reset generato. Usa il seed ricevuto per confermare il reset.')
        return
      }

      if (newPassword !== confirmPassword) {
        throw new Error('La nuova password e la conferma non coincidono')
      }

      await onAuth(
        await confirmPasswordReset({
          resetSeed,
          newPassword,
        }),
      )
    } catch (err) {
      setError(toMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-side">
        {logoUrl ? (
          <img className="auth-brand-logo" src={logoUrl} alt={realmName} />
        ) : (
          <h1>{realmName}</h1>
        )}
        <p>Accesso realm-aware su API backend.</p>
        <p className="auth-note">Realm attivo: {realmCode}</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-mode-picker" role="tablist" aria-label="Accesso e password">
            {[
              { key: 'login' as const, label: 'Login', hint: 'Entra con username e password.' },
              { key: 'register' as const, label: 'Registrazione', hint: 'Crea un nuovo account con profilo base.' },
              { key: 'recover' as const, label: 'Recupero password', hint: 'Richiedi un seed e conferma il reset in due passi.' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`auth-mode-pill ${mode === item.key ? 'is-active' : ''}`}
                onClick={() => switchMode(item.key)}
                title={item.hint}
                aria-label={`${item.label}. ${item.hint}`}
              >
                <span>{item.label}</span>
                <span className="auth-mode-hint" aria-hidden="true">
                  {item.hint}
                </span>
              </button>
            ))}
          </div>
          <h2>{mode === 'login' ? 'Login' : mode === 'register' ? 'Registrazione' : 'Recupero password'}</h2>
          {mode === 'recover' && (
            <p className="auth-note">
              Il reset è pubblico e avviene in due passaggi. Prima richiedi un seed, poi confermi il reset con il seed e la nuova password.
            </p>
          )}
          {mode !== 'recover' && (
            <label>
              Username
              <input
                required
                minLength={3}
                maxLength={50}
                pattern={USERNAME_PATTERN}
                value={username}
                placeholder="username"
                onChange={(event) => setUsername(normalizeUsernameInput(event.target.value))}
              />
            </label>
          )}
          {mode === 'login' && (
            <label>
              Password
              <input required type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          )}
          {mode === 'register' && (
            <>
              <label>
                Password
                <input required type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <label>
                Profile Name
                <input value={profileName} placeholder="Nome profilo" onChange={(event) => setProfileName(event.target.value)} />
              </label>
              <label>
                Bio
                <textarea rows={3} placeholder="Breve presentazione del tuo profilo" value={bio} onChange={(event) => setBio(event.target.value)} />
              </label>
            </>
          )}
          {mode === 'recover' && (
            <>
              {recoveryStep === 'request' ? (
                <label>
                  Username
                  <input
                    required
                    minLength={3}
                    maxLength={50}
                    pattern={USERNAME_PATTERN}
                    value={username}
                    placeholder="username"
                    onChange={(event) => setUsername(normalizeUsernameInput(event.target.value))}
                  />
                </label>
              ) : (
                <>
                  <div className="auth-result-box">
                    <p className="auth-result-label">Seed di reset</p>
                    <p className="auth-result-value">{resetSeed}</p>
                    <p className="auth-result-meta">Scadenza: {resetExpiresAt || 'n/d'}</p>
                  </div>
                  <label>
                    Reset seed
                    <input required value={resetSeed} placeholder="Seed ricevuto dal request" onChange={(event) => setResetSeed(event.target.value)} />
                  </label>
                  <label>
                    Nuova password
                    <input required type="password" placeholder="Nuova password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                  </label>
                  <label>
                    Conferma nuova password
                    <input required type="password" placeholder="Ripeti la nuova password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </label>
                </>
              )}
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          {info && <p className="auth-note">{info}</p>}
          {mode === 'recover' ? (
            <button className="primary-btn" disabled={busy} type="submit">
              {busy ? 'Attendere...' : recoveryStep === 'request' ? 'Richiedi seed' : 'Conferma reset'}
            </button>
          ) : (
            <button className="primary-btn" disabled={busy} type="submit">
              {busy ? 'Attendere...' : mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          )}
        </form>
      </section>
    </div>
  )
}
