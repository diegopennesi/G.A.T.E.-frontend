# Analisi tecnica: vera registrazione con email verification e reset password via email

Data analisi: 2026-07-21

## Obiettivo

Portare il sistema da una registrazione "solo BE con login immediato" a un flusso account reale:

- registrazione con `username + password + email`
- attivazione account tramite email
- reset password con seed inviato via email, non più mostrato a schermo
- enforcement reale della robustezza password
- possibilità di disattivare l'enforcement solo tramite env var esplicita in ambienti non production

Questa analisi copre:

- FE: `/home/diego/octo/GATE_frontend_starter/gate/fe`
- BE: `/home/diego/octo/GATE_backend_starter/gate`

## Stato attuale

### Frontend

Il FE oggi espone tre modalità auth: `login`, `register`, `recover`.

Riferimenti:

- [src/features/auth/pages/AuthScreen.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/auth/pages/AuthScreen.tsx:4)
- [src/services/gateApi.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/services/gateApi.ts:37)
- [src/shared/routing.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/shared/routing.ts:14)

Comportamento attuale:

- `register` invia solo `username`, `password`, `profileName`, `bio`
- dopo `register`, il FE tratta la risposta come sessione autenticata e fa login immediato
- `recover` è pubblico in due step:
  - richiesta seed
  - conferma reset con seed + nuova password
- il seed oggi viene mostrato nel FE

Gap FE rispetto alla richiesta:

- manca il campo `email`
- manca una view di conferma email
- manca una route di callback per attivazione account
- il reset password è ancora basato su seed mostrato in UI
- nessuna validazione password robusta lato FE, a parte match conferma reset

### Backend

Riferimenti principali:

- [AuthController.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthController.kt:9)
- [AuthService.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthService.kt:15)
- [AuthDtos.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthDtos.kt:9)
- [User.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/user/User.kt:10)
- [UserRepository.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/user/UserRepository.kt:9)
- [V1__create_users.sql](/home/diego/octo/GATE_backend_starter/gate/src/main/resources/db/migration/V1__create_users.sql:6)
- [V15__password_reset_tokens.sql](/home/diego/octo/GATE_backend_starter/gate/src/main/resources/db/migration/V15__password_reset_tokens.sql:6)
- [application.properties](/home/diego/octo/GATE_backend_starter/gate/src/main/resources/application.properties:1)

Comportamento attuale:

- `POST /api/v1/auth/register` crea subito l'utente e restituisce `accessToken + refreshToken`
- `POST /api/v1/auth/login` autentica solo con `username + password`
- `POST /api/v1/auth/password/reset/request` genera un seed e lo restituisce al client
- `POST /api/v1/auth/password/reset/confirm` cambia password usando il seed
- `PATCH /api/v1/auth/password` richiede password corrente e ruota le sessioni

Osservazioni tecniche importanti:

- il backend oggi non ha campo `email` su `users`
- il backend oggi non ha alcun token di verifica email
- non c'è nessuna infrastruttura mail configurata: nessun sender, nessuna proprietà `spring.mail`, nessun service di invio
- la policy password lato BE è solo `@Size(min = 8)` su `RegisterRequest`, `ChangePasswordRequest`, `PasswordResetConfirmRequest`
- il reset pubblico oggi espone il seed al chiamante

### Duplicati utente: stato reale

Qui serve precisione: il rischio "forse permettiamo user duplicati" oggi non sembra reale per `username`.

Motivi:

- `users.username` è `UNIQUE` a DB in [V1__create_users.sql](/home/diego/octo/GATE_backend_starter/gate/src/main/resources/db/migration/V1__create_users.sql:10)
- `AuthService.register(...)` fa anche `existsByUsername(username)` prima del save in [AuthService.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthService.kt:28)
- esiste migration di normalizzazione lowercase in [V32__normalize_usernames_lowercase.sql](/home/diego/octo/GATE_backend_starter/gate/src/main/resources/db/migration/V32__normalize_usernames_lowercase.sql:6)

Quindi:

- duplicati `username`: già bloccati
- duplicati `profileName`: possibili, ma non è una credenziale
- duplicati `email`: oggi non gestibili, perché il campo non esiste

## Rischi attuali

### 1. Registrazione senza verifica email

Impatto:

- account creati con email non possedute
- impossibile considerare attendibile il canale di recupero account
- impossibile usare l'email come identity proof minima

### 2. Reset password con seed esposto al client

Impatto:

- il seed è trattato come segreto ma viene mostrato direttamente in UI
- il canale di reset non è legato al possesso di una mailbox
- il flusso assomiglia a un self-service token issuer pubblico

### 3. Password policy debole

Stato attuale:

- minimo 8 caratteri, nessun controllo di complessità, nessun blocco sulle password banali

Impatto:

- account deboli
- minore resistenza a credential stuffing o password guessing

### 4. Enumerazione utenti

Oggi il reset request ritorna errore se l'utente non esiste o non è attivo in [AuthService.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthService.kt:102).

Impatto:

- endpoint pubblico che permette di inferire l'esistenza di username validi

## Target funzionale proposto

### Registrazione

Nuovo flusso:

1. utente compila `username`, `email`, `password`
2. BE valida formato, unicità e password policy
3. BE crea account in stato `email non verificata`
4. BE genera token di verifica email
5. BE invia email con link verso FE
6. FE mostra esito: account creato, verifica email richiesta
7. click sul link email apre FE
8. FE chiama endpoint BE di conferma
9. BE attiva account
10. FE mostra pagina di conferma e porta al login

Decisione consigliata:

- niente login automatico dopo `register`
- sessione rilasciata solo dopo email verificata

Questo è più coerente del modello attuale, dove `register` equivale già a `register + login`.

### Reset password

Nuovo flusso:

1. utente apre `recover`
2. inserisce `username` oppure, meglio, `username/email`
3. BE genera seed/token monouso
4. BE invia email
5. FE mostra messaggio generico: "Se l'account esiste, abbiamo inviato le istruzioni"
6. email contiene:
   - seed da copiare, oppure
   - link diretto a FE con seed/token già precompilato
7. FE apre la view `recover/confirm`
8. utente imposta la nuova password
9. BE applica gli stessi controlli robustezza usati in registrazione e cambio password

Decisione consigliata:

- supportare il redirect diretto con token in URL
- mantenere anche il copy/paste manuale come fallback

## Modello dati proposto

### Estensione `users`

Da aggiungere:

- `email` `VARCHAR(...) NOT NULL`
- `email_normalized` oppure uso diretto di `LOWER(email)` lato applicativo
- `email_verified` `BOOLEAN NOT NULL DEFAULT FALSE`
- `email_verified_at` `TIMESTAMPTZ NULL`

Vincoli consigliati:

- unique su email normalizzata
- validazione formato lato DTO

Nota importante:

`is_active` oggi è già usato per account disabilitato. Non conviene riusarlo per "non verificato", perché confonde due stati diversi:

- account amministrativamente disabilitato
- account non ancora verificato

Quindi il modello corretto è:

- `is_active` = account abilitato/disabilitato
- `email_verified` = account confermato o meno

### Tabella token verifica email

Nuova tabella consigliata, simile a `password_reset_tokens`:

- `email_verification_tokens`
  - `id`
  - `user_id`
  - `token_hash`
  - `expires_at`
  - `used`
  - `created_at`

Note:

- token monouso
- solo hash persistito a DB
- invalidazione dei token attivi precedenti quando si rigenera

### Password reset token

La tabella attuale può restare. Va cambiato il comportamento:

- il seed non va più restituito nella response pubblica
- il seed va solo inviato per email

## API target proposta

### Registrazione e verifica email

Proposta BE:

- `POST /api/v1/auth/register`
  - request: `username`, `email`, `password`, opzionale `profileName`, `bio`
  - response: niente sessione
  - response suggerita: `202 Accepted` o `201 Created` con payload informativo

- `POST /api/v1/auth/email/verify/resend`
  - request: `usernameOrEmail`
  - response sempre generica

- `POST /api/v1/auth/email/verify/confirm`
  - request: `token`
  - in alternativa `GET` se si vuole callback diretto, ma `POST` è più pulito per FE-driven flow

Decisione consigliata:

- tenere il link email puntato al FE, non direttamente al BE
- il FE legge il token dalla query string e chiama il BE

Questo rispetta la richiesta "Email avrà bottone di conferma che chiamerà FE per attivare utenza".

### Login

Opzioni:

1. login solo via `username + password`
2. login via `usernameOrEmail + password`

Consiglio:

- breve termine: mantenere `username + password`
- medio termine: passare a `identifier + password`, dove `identifier` accetta username o email

Motivo:

- l'email entra come dato obbligatorio; prima o poi l'utente si aspetterà di usarla anche per login

### Password reset

Proposta BE:

- `POST /api/v1/auth/password/reset/request`
  - request: `usernameOrEmail`
  - response: sempre generica
  - non restituire mai il seed

- `POST /api/v1/auth/password/reset/confirm`
  - request: `resetSeed`, `newPassword`
  - enforcement stessa password policy di register/change password

Se si vuole link diretto:

- email con URL FE tipo:
  - `/homepage/{realmCode}/recover?seed=...`
  - oppure `/homepage/{realmCode}/recover?token=...&step=confirm`

Il FE attuale legge solo il path auth mode in [routing.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/shared/routing.ts:14), quindi servirà aggiungere parsing della query string.

## Password policy proposta

### Regola minima consigliata

Applicare la stessa policy a:

- registrazione
- cambio password autenticato
- reset password pubblico

Policy suggerita:

- lunghezza minima: 12
- almeno 1 lettera minuscola
- almeno 1 lettera maiuscola
- almeno 1 numero
- almeno 1 simbolo
- rifiuto di password uguale o troppo vicina a:
  - username
  - email local part
  - blacklist banale (`password`, `12345678`, `qwerty`, ecc.)

### Implementazione BE consigliata

Non spargere regex nei DTO. Meglio introdurre un validator centralizzato, ad esempio:

- `PasswordPolicyService`
- `PasswordPolicyProperties`

Uso:

- `AuthService.register(...)`
- `AuthService.changePassword(...)`
- `AuthService.confirmPasswordReset(...)`

Questo evita divergenze tra i tre flussi.

### Fail-safe richiesto

Richiesta esplicita: env var `SKIPPASSWORDENFORCE=true`, assente = `false`.

Implementazione consigliata:

- property applicativa:
  - `gate.auth.password-policy.skip-enforcement=${SKIPPASSWORDENFORCE:false}`

Comportamento:

- se env assente -> enforcement attivo
- se env `true` -> enforcement saltato

Importante:

- non hardcodare `true` in `application-local.properties`
- lasciare il default a `false`
- in locale o in ambienti di test manuale si abilita solo esportando esplicitamente `SKIPPASSWORDENFORCE=true`

Questo è coerente con la richiesta "dovrà essere assente in produzione".

## Invio email: proposta architetturale

Il backend oggi non ha nessun mail sender.

Serve introdurre almeno:

- dipendenza mail (`spring-boot-starter-mail`) oppure provider HTTP esterno
- config:
  - host/porta/username/password SMTP oppure API key provider
  - mittente
  - base URL FE per costruire i link

Configurazione minima proposta:

- `gate.app.frontend-base-url`
- `gate.mail.from`
- `spring.mail.*` oppure `gate.mail.provider.*`

Astrazione consigliata:

- `EmailService`
  - `sendVerificationEmail(...)`
  - `sendPasswordResetEmail(...)`

Meglio tenere il provider dietro interfaccia, così il dominio auth non dipende dal dettaglio SMTP/provider.

## Modifiche FE richieste

### Auth screen

Su [AuthScreen.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/auth/pages/AuthScreen.tsx:8):

- aggiungere campo `email` in `register`
- aggiungere feedback chiaro "controlla la tua email"
- rimuovere il login automatico dopo `register`
- per `recover/request`, cambiare copy: il seed non viene più mostrato a schermo

### Nuova pagina/verifica email

Serve una schermata dedicata, anche minimale:

- stato loading
- verifica in corso
- verifica completata
- token scaduto/non valido
- pulsante per reinvio email

### Routing

Il routing manuale attuale gestisce il mode dal path ma non sembra gestire query params per token/seed.

Serve aggiungere supporto a:

- `?verificationToken=...`
- `?resetSeed=...`
- eventuale `?step=confirm`

### Reset password

Nuovo comportamento FE:

- step request: messaggio generico
- step confirm:
  - seed precompilato se presente in URL
  - campo password + conferma password
  - validazioni UI allineate al backend

## Modifiche BE richieste

### DTO / Entity / Repository

- estendere `RegisterRequest`
- estendere `User`
- estendere `UserProfileResponse` se l'email deve comparire in `/users/me`
- aggiungere repository search:
  - `findByEmail(...)`
  - `existsByEmail(...)`
  - idealmente su valore normalizzato

### Auth service

Da cambiare in [AuthService.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthService.kt:27):

- `register` non deve più chiamare `buildAuthResponse(...)`
- deve creare account non verificato
- deve generare token verifica email
- deve inviare email

Da aggiungere:

- `confirmEmailVerification(...)`
- `resendEmailVerification(...)`
- validator password riusabile

Da cambiare in reset:

- `requestPasswordReset(...)` non deve più restituire `resetSeed`
- deve inviare email
- deve rispondere in modo non enumerabile

### Sicurezza

Bloccare login se:

- `!user.isActive`
- `!user.emailVerified`

Messaggio consigliato:

- generico lato API oppure specifico ma non troppo informativo

### Enumerazione account

Per endpoint pubblici:

- `register` può restituire `409` su username/email già esistenti
- `password/reset/request` meglio sempre `200/202`
- `email/verify/resend` meglio sempre `200/202`

Motivo:

- reset e resend sono endpoint ideali per enumeration se differenziano troppo le risposte

## Compatibilità e migrazione

### Utenti già esistenti

Qui serve una decisione di prodotto.

Opzioni:

1. migrare tutti gli utenti esistenti come `email_verified = true` solo dopo backfill email
2. lasciare gli utenti attuali utilizzabili e chiedere email/verifica al primo login utile
3. bloccare tutto finché non impostano email

Consiglio pragmatico:

- non bloccare immediatamente gli utenti esistenti
- aggiungere `email` nullable in prima migration per retrocompatibilità
- introdurre un piano di backfill
- rendere `email` obbligatoria solo per nuovi account

Poi, in seconda fase:

- rendere `email` non null quando la base utenti è migrata

Se il sistema è ancora piccolo e controllato, si può fare anche una rottura netta. Ma va deciso esplicitamente.

### Migrazione schema consigliata

Fase 1:

- aggiunta colonne email/verifica nullable-safe
- aggiunta tabella token verifica email
- codice BE compatibile con utenti legacy

Fase 2:

- backfill email utenti esistenti
- unique index definitivo su email normalizzata
- eventuale `NOT NULL`

## Test richiesti

### Backend

Estendere la copertura stile [AuthPasswordIntegrationTest.kt](/home/diego/octo/GATE_backend_starter/gate/src/test/kotlin/com/gate/e2e/AuthPasswordIntegrationTest.kt:1):

- register con email valida
- register con username duplicato
- register con email duplicata
- register con password debole
- register con `SKIPPASSWORDENFORCE=true`
- login negato se email non verificata
- conferma email valida
- conferma email già usata
- conferma email scaduta
- resend email verification
- reset request non espone seed
- reset request sempre generico su utente inesistente
- reset confirm con password debole
- change password con password debole

### Frontend

- registrazione con campo email
- registrazione non logga automaticamente
- recover request non mostra seed
- recover confirm precompila seed da URL
- verify email page gestisce success/error/loading

## Piano di implementazione consigliato

### Fase 1: backend foundation

1. aggiungere modello email e token verifica
2. introdurre password policy centralizzata
3. aggiungere env `SKIPPASSWORDENFORCE`
4. introdurre `EmailService`
5. aggiornare register/reset endpoints

### Fase 2: frontend auth update

1. aggiornare form register con email
2. togliere auto-login dopo register
3. aggiungere view verify-email
4. aggiornare recover con redirect/token query param
5. aggiungere hint password policy

### Fase 3: hardening

1. uniformare risposte pubbliche anti-enumeration
2. audit utenti legacy
3. rollout mail provider reale
4. test e2e completi

## Decisioni consigliate

### Decisione 1

`register` non deve più restituire sessione autenticata.

### Decisione 2

La verifica email deve usare token monouso dedicato, non `isActive`.

### Decisione 3

Il reset password deve inviare il seed via email e non mostrarlo più nel FE.

### Decisione 4

La password policy va centralizzata nel BE; il FE la replica solo per UX.

### Decisione 5

`SKIPPASSWORDENFORCE` deve avere default `false` in ogni ambiente; si abilita solo quando settata esplicitamente a `true`.

## Open question da chiudere prima dell'implementazione

1. Login finale deve accettare solo `username` o anche `email`?
2. Gli utenti legacy senza email come vanno gestiti?
3. Il link email deve aprire una pagina FE dedicata o usare direttamente la view `recover/register` con query params?
4. In produzione si userà SMTP classico o provider esterno tipo transactional mail API?
5. L'email va mostrata e modificata in `/users/me` già in questa fase oppure no?

## Conclusione

Il lavoro non è un semplice refactor del form auth. Richiede:

- evoluzione schema utenti
- nuovi token applicativi
- infrastruttura email
- modifica semantica di `register`
- hardening dei flussi pubblici
- password policy centralizzata

La parte più delicata è separare correttamente:

- account disabilitato
- account non verificato
- reset password pubblico

Se si tiene questa separazione, il flusso resta pulito e non introduce eccezioni difficili da mantenere.
