import { useState } from 'react'
import type { FormEvent } from 'react'
import { useProfileContext, useRealmContext } from '../../../context'
import { confirmPasswordReset, login, register, requestPasswordReset } from '../../../services/gateApi'
import { toMessage } from '../../../shared/utils'

const normalizeUsernameInput = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
const USERNAME_PATTERN = '^[a-z0-9._-]+$'

export function AuthScreen() {
  const { handleAuth } = useProfileContext()
  const { authMode: initialMode, setAuthMode: onModeChange, realmCode, realmName, logoUrl } = useRealmContext()
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
        await handleAuth(await login(normalizedUsername, password))
        return
      }

      if (mode === 'register') {
        await handleAuth(await register({ username: normalizedUsername, password, profileName, bio }))
        return
      }

      if (recoveryStep === 'request') {
        const response = await requestPasswordReset(normalizedUsername)
        setResetSeed(response.resetSeed)
        setResetExpiresAt(response.expiresAt)
        setRecoveryStep('confirm')
        setInfo('Codice di recupero generato. Scegli la nuova password per completare il recupero.')
        return
      }

      if (newPassword !== confirmPassword) {
        throw new Error('La nuova password e la conferma non coincidono')
      }

      const response = await confirmPasswordReset({
        resetSeed,
        newPassword,
      })
      setPassword('')
      resetRecoveryState()
      setInfo(`${response.message}. Ora puoi accedere con la nuova password.`)
      setMode('login')
      onModeChange?.('login')
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
        <p>Il tuo gruppo, le tue campagne, le prossime avventure.</p>
        <p className="auth-note">Reame: {realmCode}</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} aria-busy={busy}>
          <div className="auth-mobile-brand">
            {logoUrl ? <img className="auth-brand-logo" src={logoUrl} alt={realmName} /> : <h1>{realmName}</h1>}
            <p className="auth-note">Reame: {realmCode}</p>
          </div>
          <div className="auth-mode-picker" role="group" aria-label="Accesso e password">
            {[
              { key: 'login' as const, label: 'Accedi', hint: 'Entra con username e password.' },
              { key: 'register' as const, label: 'Registrati', hint: 'Crea il tuo account.' },
              { key: 'recover' as const, label: 'Recupera', hint: 'Imposta una nuova password.' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={mode === item.key}
                disabled={busy}
                className={`auth-mode-pill ${mode === item.key ? 'is-active' : ''}`}
                onClick={() => switchMode(item.key)}
                title={item.hint}
                aria-label={`${item.label}. ${item.hint}`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <h2>{mode === 'login' ? 'Bentornato al tavolo' : mode === 'register' ? 'Crea il tuo account' : 'Recupera la password'}</h2>
          {mode === 'login' && <p className="auth-note">Accedi per ritrovare le tue campagne e il gruppo.</p>}
          {mode === 'recover' && (
            <p className="auth-note">
              {recoveryStep === 'request' ? 'Inserisci il tuo username per generare un codice di recupero.' : 'Il codice è già inserito. Scegli e conferma la nuova password.'}
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
                autoComplete="username"
                value={username}
                placeholder="username"
                onChange={(event) => setUsername(normalizeUsernameInput(event.target.value))}
              />
            </label>
          )}
          {mode === 'login' && (
            <label>
              Password
              <input required type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          )}
          {mode === 'register' && (
            <>
              <label>
                Password
                <input required type="password" autoComplete="new-password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <label>
                Nome del profilo
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
                    autoComplete="username"
                    value={username}
                    placeholder="username"
                    onChange={(event) => setUsername(normalizeUsernameInput(event.target.value))}
                  />
                </label>
              ) : (
                <>
                  <div className="auth-result-box">
                    <p className="auth-result-label">Codice di recupero</p>
                    <p className="auth-result-value">{resetSeed}</p>
                    <p className="auth-result-meta">Scadenza: {resetExpiresAt || 'n/d'}</p>
                  </div>
                  <label>
                    Codice di recupero
                    <input required value={resetSeed} placeholder="Codice generato" onChange={(event) => setResetSeed(event.target.value)} />
                  </label>
                  <label>
                    Nuova password
                    <input required type="password" autoComplete="new-password" placeholder="Nuova password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                  </label>
                  <label>
                    Conferma nuova password
                    <input required type="password" autoComplete="new-password" placeholder="Ripeti la nuova password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </label>
                </>
              )}
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          {info && <p className="auth-note" role="status">{info}</p>}
          {mode === 'recover' ? (
            <button className="primary-btn" disabled={busy} type="submit">
              {busy ? 'Attendere...' : recoveryStep === 'request' ? 'Genera codice di recupero' : 'Salva nuova password'}
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
