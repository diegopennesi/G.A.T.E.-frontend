import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ApiError } from '../../services/apiClient'
import { deleteMyAccount, login } from '../../services/gateApi'
import './public-legal.css'

const CONTACT = (import.meta.env.VITE_PRIVACY_CONTACT_EMAIL as string | undefined)?.trim()

function LegalShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <main className="legal-page"><article className="legal-card">
    <header className="legal-header"><a className="legal-brand" href="/">G.A.T.E.</a><p>{eyebrow}</p><h1>{title}</h1></header>
    {children}
    <footer className="legal-footer"><a href="/privacy">Privacy</a><a href="/account-deletion">Elimina account</a><a href="/">Accedi a G.A.T.E.</a></footer>
  </article></main>
}

function PrivacyPolicy() {
  return <LegalShell eyebrow="Informativa per sito e app" title="Privacy e controllo dei dati">
    <p className="legal-lead">G.A.T.E. usa i dati necessari per creare l’account, entrare nei reami e partecipare a campagne, missioni e conversazioni.</p>
    <section><h2>Dati trattati</h2><p>Account e profilo: username, nome visibile, email facoltativa, bio, avatar e contatti scelti dall’utente. Attività di gioco: reami visitati, campagne, personaggi, missioni, candidature e messaggi. Dati tecnici: token di accesso, preferenze, dispositivi e token per le notifiche push.</p></section>
    <section><h2>Perché vengono usati</h2><p>Per autenticare l’utente, mantenere la sessione, mostrare i contenuti del reame, coordinare il gioco, inviare notifiche richieste, moderare segnalazioni e proteggere la piattaforma. G.A.T.E. non usa pubblicità comportamentale e non vende dati personali.</p></section>
    <section><h2>Fotocamera e notifiche</h2><p>La fotocamera viene usata solo sul dispositivo per leggere QR di reami e inviti, quando concedi il permesso. Le notifiche sono facoltative e possono essere disattivate dalle impostazioni dell’app o del telefono.</p></section>
    <section><h2>Condivisione e visibilità</h2><p>Nome visibile, avatar e contenuti di gioco sono condivisi con le persone autorizzate nello stesso reame o nella stessa campagna. I contatti facoltativi sono mostrati soltanto nei contesti previsti dal prodotto. I fornitori tecnici di hosting, email e notifiche trattano i dati necessari a erogare questi servizi.</p></section>
    <section><h2>Conservazione e cancellazione</h2><p>I dati restano finché l’account è attivo o quanto serve per sicurezza e funzionamento. Eliminando l’account vengono rimossi profilo, contatti, dispositivi, ruoli e accessi. I riferimenti indispensabili allo storico delle partite e alla moderazione restano anonimizzati. Prima della cancellazione, il fondatore deve trasferire o chiudere le campagne attive.</p></section>
    <section><h2>Le tue scelte</h2><p>Puoi modificare profilo, email, password, notifiche e utenti bloccati nelle impostazioni. Puoi eliminare l’account dall’app o dalla <a href="/account-deletion">pagina web dedicata</a>, accessibile anche dopo la disinstallazione.</p></section>
    <section><h2>Contatti</h2>{CONTACT ? <p>Per richieste sui dati: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p> : <p>Il contatto privacy sarà pubblicato qui prima della distribuzione sugli store.</p>}</section>
    <p className="legal-date">Ultimo aggiornamento: 13 ottobre 2026.</p>
  </LegalShell>
}

function AccountDeletion() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      await login(username, password)
      await deleteMyAccount({ currentPassword: password, confirmation })
      setDone(true); setPassword(''); setConfirmation('')
    } catch (cause) {
      setMessage(cause instanceof ApiError && cause.status === 409
        ? 'Prima trasferisci o chiudi le campagne attive che hai fondato.'
        : cause instanceof Error ? cause.message : 'Non è stato possibile eliminare l’account.')
    } finally { setBusy(false) }
  }

  return <LegalShell eyebrow="Gestione account" title="Elimina il tuo account G.A.T.E.">
    {done ? <div className="legal-success" role="status"><h2>Account eliminato</h2><p>I dati personali e gli accessi sono stati rimossi. I riferimenti storici necessari sono ora anonimi.</p></div> : <>
      <p className="legal-lead">Questa pagina funziona anche senza l’app installata. L’eliminazione è definitiva.</p>
      <section><h2>Cosa viene eliminato</h2><p>Email, profilo, contatti, dispositivi, preferenze, ruoli e sessioni. I personaggi ancora attivi vengono ritirati. I contenuti storici necessari restano attribuiti a “Utente eliminato”.</p></section>
      <form className="legal-form" onSubmit={submit} aria-busy={busy}>
        <label>Username<input required minLength={3} autoCapitalize="none" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} /></label>
        <label>Password attuale<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label>Scrivi ELIMINA per confermare<input required autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value.toUpperCase())} /></label>
        <button type="submit" disabled={busy || confirmation !== 'ELIMINA'}>{busy ? 'Eliminazione…' : 'Elimina definitivamente'}</button>
        {message && <p className="legal-error" role="alert">{message}</p>}
      </form>
    </>}
  </LegalShell>
}

export function PublicLegalApp() {
  return window.location.pathname.replace(/\/+$/, '') === '/account-deletion' ? <AccountDeletion /> : <PrivacyPolicy />
}
