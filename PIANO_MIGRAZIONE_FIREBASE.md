# Piano Migrazione a Firebase

Data: 2026-07-21

## Obiettivo

Preparare una migrazione rapida dell'applicativo verso l'ecosistema Firebase / Google Cloud con questi risultati:

- login con Google
- registrazione email/password gestita da Firebase
- email verification gestita da Firebase
- reset password via email gestito da Firebase
- frontend deployabile su Firebase
- backend deployabile su Google Cloud
- PostgreSQL mantenuto, ma spostabile su Google Cloud

## Chiarimento iniziale

Per il nostro stack attuale, "migrare tutto su Firebase" non significa mettere tutto dentro un unico prodotto Firebase.

La forma corretta della piattaforma target e':

- **Firebase Authentication** per identita', Google login, email verification e password reset
- **Firebase Hosting** oppure **Firebase App Hosting** per il frontend
- **Google Cloud Run** per il backend Spring/Kotlin
- **Cloud SQL for PostgreSQL** per il database PostgreSQL

Fonti ufficiali:

- Firebase Authentication overview: https://firebase.google.com/docs/auth
- Firebase Hosting: https://firebase.google.com/docs/hosting
- Firebase App Hosting: https://firebase.google.com/docs/app-hosting
- Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- Cloud SQL for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres

## Stato attuale

### Frontend

Repo FE:

- [src/features/auth/pages/AuthScreen.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/auth/pages/AuthScreen.tsx:1)

Oggi il FE:

- gestisce login custom
- gestisce register custom
- gestisce recover password custom
- chiama direttamente il backend per token/sessione

### Backend

Repo BE:

- [AuthController.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthController.kt:1)
- [AuthService.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/auth/AuthService.kt:1)
- [User.kt](/home/diego/octo/GATE_backend_starter/gate/src/main/kotlin/com/gate/user/User.kt:1)

Oggi il backend:

- emette JWT propri
- gestisce register/login/refresh
- gestisce password reset custom con seed
- usa PostgreSQL come source of truth applicativa

## Perche' Firebase qui ha senso

Firebase Authentication fornisce gia' il backend auth per:

- email/password
- Google Sign-In
- email verification
- password reset emails

Fonti:

- Password auth web: https://firebase.google.com/docs/auth/web/password-auth
- Google Sign-In web: https://firebase.google.com/docs/auth/web/google-signin
- Manage users / verification / reset: https://firebase.google.com/docs/auth/web/manage-users

Inoltre Firebase Authentication si integra con backend custom: il backend puo' verificare i Firebase ID token con Admin SDK.

Fonte:

- Verify ID tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens

## Architettura target consigliata

### Versione target "domani"

Per una migrazione rapida e con rischio contenuto, la soluzione consigliata e':

- FE su Firebase Hosting
- Auth su Firebase Authentication
- BE ancora separato ma spostabile su Cloud Run
- DB ancora PostgreSQL, spostabile su Cloud SQL

Schema:

1. utente apre FE
2. FE usa Firebase Auth per login Google o email/password
3. FE ottiene Firebase ID token
4. FE invia il token al backend
5. backend verifica il token con Firebase Admin SDK
6. backend cerca o crea il profilo locale
7. ruoli, campagne, missioni, personaggi restano nel DB applicativo

Questa e' la migrazione piu' sana. Non rifacciamo il dominio applicativo: cambiamo il dominio auth.

## Cosa spostare dove

### In Firebase Authentication

Va spostato:

- registrazione email/password
- login email/password
- login Google
- email verification
- password reset email
- stato email verified

Opzionale:

- custom domain per le email auth

Fonte:

- Custom domain for auth emails: https://firebase.google.com/docs/auth/email-custom-domain

### Nel backend applicativo

Deve restare:

- profilo utente applicativo
- ruoli piattaforma
- membership campagne
- personaggi
- missioni
- rooms/chat
- autorizzazioni di business

Quindi il backend non smette di esistere. Smette di essere l'identity provider.

### Nel database PostgreSQL

Devono restare:

- tutte le tabelle di dominio
- tutte le foreign key applicative
- audit e stati interni

Da rimuovere o declassare:

- password hash locali come fonte primaria
- refresh token custom se non servono piu'
- token reset password custom

## Decisione architetturale chiave

### Nuova source of truth per identita'

La source of truth identitaria deve diventare Firebase Auth.

Il backend deve identificare l'utente tramite:

- `firebase uid`
- email verified
- provider (`password`, `google.com`, ecc.)

### Nuovo mapping utente locale

Il modello utente locale va esteso con almeno:

- `firebase_uid`
- `email`
- `email_verified`
- `auth_provider`

Il `username` non deve piu' essere la credenziale primaria.

Diventa invece:

- alias applicativo
- handle pubblico
- oppure campo legacy opzionale

## Modifiche dati consigliate

### Tabella `users`

Aggiungere:

- `firebase_uid` `VARCHAR(...) UNIQUE`
- `email` `VARCHAR(...)`
- `email_verified` `BOOLEAN NOT NULL DEFAULT FALSE`
- `auth_provider` `VARCHAR(...)`

Valutazione consigliata:

- mantenere `username` per compatibilita' UI e ricerca
- ma non usarlo piu' come chiave auth primaria

### Dati legacy

Per migrazione rapida domani ci sono due strade.

#### Strada A - Greenfield auth

- i nuovi login passano tutti da Firebase
- utenti vecchi vengono ricreati o riallineati al primo accesso

Vantaggi:

- piu' veloce
- meno complessita' iniziale

Svantaggi:

- migrazione utenti meno elegante

#### Strada B - Migrazione utenti esistenti

- importare utenti Firebase
- mantenere continuita' account

Nota importante:

questa strada va verificata contro l'algoritmo di hash password oggi in uso nel backend. La documentazione Firebase prevede gestione e import utenti lato Admin, ma la compatibilita' del formato/hash corrente va validata prima del cutover.

Fonte base:

- Admin manage users / import users: https://firebase.google.com/docs/auth/admin/manage-users

Questa frase e' una **inferenza tecnica**: prima del cutover bisogna verificare che l'hash corrente sia importabile senza reset password forzato.

## Flussi auth target

### 1. Registrazione email/password

Nuovo flusso:

1. FE chiama Firebase `createUserWithEmailAndPassword`
2. Firebase crea account
3. FE invia `sendEmailVerification`
4. utente verifica email
5. al login successivo il FE ottiene ID token Firebase
6. FE passa token al backend
7. backend verifica token e crea/sincronizza utente locale

Fonti:

- Password auth: https://firebase.google.com/docs/auth/web/password-auth
- Manage users: https://firebase.google.com/docs/auth/web/manage-users

### 2. Login con Google

Nuovo flusso:

1. FE abilita Google provider
2. utente clicca "Continua con Google"
3. Firebase gestisce OAuth
4. FE ottiene ID token Firebase
5. backend verifica token
6. backend upsert utente locale

Fonte:

- Google Sign-In web: https://firebase.google.com/docs/auth/web/google-signin

### 3. Reset password

Nuovo flusso:

1. FE chiama `sendPasswordResetEmail`
2. Firebase invia mail
3. utente apre link
4. Firebase conclude il flow

Fonte:

- Manage users: https://firebase.google.com/docs/auth/web/manage-users

### 4. Email verification

Nuovo flusso:

1. FE chiama `sendEmailVerification`
2. Firebase invia mail
3. utente apre link
4. lo stato `emailVerified` viene gestito da Firebase

Fonte:

- Manage users: https://firebase.google.com/docs/auth/web/manage-users

## Scelta FE consigliata

Per il FE attuale, che e' una SPA Vite/React, la scelta piu' lineare e':

- **Firebase Hosting** per il deploy statico
- non Firebase App Hosting come prima opzione

Motivo:

- il FE e' gia' separato dal backend
- Firebase Hosting e' sufficiente per una SPA
- puo' servire custom domain e SSL

Fonti:

- Firebase Hosting quickstart: https://firebase.google.com/docs/hosting/quickstart
- Firebase Hosting overview: https://firebase.google.com/docs/hosting

### Quando usare App Hosting

Firebase App Hosting ha senso se vogliamo ospitare una web app full-stack supportata direttamente nel suo flusso CI/CD. Inoltre, App Hosting usa Cloud Build, Artifact Registry e Cloud Run dietro le quinte.

Fonte:

- App Hosting overview: https://firebase.google.com/docs/app-hosting

Per il nostro stack split FE/BE, **Hosting + Cloud Run** e' piu' chiaro.

## Scelta backend consigliata

Per il backend Spring/Kotlin:

- **Cloud Run** e' la destinazione corretta

Motivo:

- accetta container
- e' vicino al modello Railway
- non costringe a riscrivere il backend in Functions

Fonti:

- Cloud Run overview: https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- Firebase Hosting + Cloud Run: https://firebase.google.com/docs/hosting/cloud-run

## Scelta database consigliata

Per non cambiare paradigma dati:

- **Cloud SQL for PostgreSQL**

Fonte:

- Cloud SQL PostgreSQL docs: https://docs.cloud.google.com/sql/docs/postgres
- Connect from Cloud Run: https://docs.cloud.google.com/sql/docs/postgres/connect-run

Quindi:

- se vogliamo davvero spostare "tutto" su Google, il DB non va in Firebase Auth/Firestore
- il DB va in **Cloud SQL PostgreSQL**

## Nuovo contratto tra FE e BE

### Oggi

Il FE chiede al backend:

- register
- login
- refresh
- reset

### Dopo migrazione

Il FE chiede a Firebase:

- register
- login
- Google sign-in
- email verification
- reset password

Il FE chiede al backend:

- tutte le API business
- bootstrap profilo locale
- sync claims / ruoli applicativi

Il backend non emette piu' credenziali applicative primarie.

### Header/API target

Il FE invia al backend:

- `Authorization: Bearer <firebase_id_token>`

Il backend:

1. verifica il token con Firebase Admin SDK
2. estrae `uid`, `email`, `email_verified`
3. carica o crea l'utente locale

Fonte:

- Verify ID tokens: https://firebase.google.com/docs/auth/admin/verify-id-tokens

## Impatto sul codice esistente

### Frontend

Da toccare:

- [src/features/auth/pages/AuthScreen.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/auth/pages/AuthScreen.tsx:1)
- client API auth custom
- gestione token locale

Da introdurre:

- Firebase SDK init
- provider Google
- listeners auth state
- recupero ID token Firebase
- logout Firebase

Da eliminare o spegnere:

- chiamate FE a `register/login/password reset` custom backend

### Backend

Da introdurre:

- Firebase Admin SDK
- middleware/filter per validare Firebase ID token
- bootstrap/sync utente locale da Firebase identity

Da spegnere gradualmente:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/password/reset/request`
- `POST /api/v1/auth/password/reset/confirm`

Da mantenere all'inizio:

- endpoint legacy dietro feature flag, solo fino al cutover

## Strategia di migrazione consigliata

### Fase 0 - Preparazione

1. creare progetto Firebase
2. abilitare Authentication
3. abilitare provider:
   - Email/Password
   - Google
4. configurare domini autorizzati
5. preparare progetto Google Cloud collegato

### Fase 1 - FE con Firebase Auth

1. aggiungere SDK Firebase al FE
2. sostituire schermata auth custom con Firebase flows
3. introdurre:
   - login Google
   - register email/password
   - reset password
   - verifica email
4. ottenere ID token Firebase

### Fase 2 - Backend che si fida di Firebase

1. aggiungere verifica ID token via Admin SDK
2. introdurre `firebase_uid` nel DB
3. creare upsert utente locale da token
4. mantenere ruoli/permessi nel DB applicativo

### Fase 3 - Deploy target

1. FE su Firebase Hosting
2. BE su Cloud Run
3. DB su Cloud SQL

### Fase 4 - Cutover

1. disabilitare registrazione/login custom
2. mantenere eventuale bridge utenti legacy
3. pulire token/password reset custom

## Piano "domani"

Se il vincolo e' fare una transizione praticabile da subito, il piano minimo e':

### Domani mattina

1. creare progetto Firebase
2. abilitare Email/Password e Google provider
3. configurare FE con Firebase SDK
4. fare login Google sul FE
5. fare register email/password sul FE
6. fare send verification / send reset via Firebase

### Domani pomeriggio

1. backend verifica Firebase ID token
2. backend crea/sincronizza utente locale
3. prima API business protetta con token Firebase

### Non fare domani

Per tenere basso il rischio, **non** spostare nello stesso giorno:

- backend su Cloud Run
- DB su Cloud SQL
- import utenti legacy complesso

Meglio fare prima il cambio di auth, poi hosting/DB.

## Decisione pratica consigliata

### Opzione consigliata

Fare la migrazione in due mosse:

#### Mossa 1

- tenere backend e DB attuali
- spostare solo auth su Firebase

#### Mossa 2

- spostare hosting e DB su Google Cloud quando il nuovo auth flow e' stabile

Questa e' la soluzione con il miglior rapporto tra velocita' e rischio.

## Rischi principali

### 1. Migrazione utenti legacy

Rischio:

- perdita continuita' login
- reset password forzati

### 2. Doppia identita'

Rischio:

- utente esiste sia localmente sia in Firebase ma senza mapping chiaro

Mitigazione:

- `firebase_uid` come chiave primaria di integrazione

### 3. Ruoli applicativi

Rischio:

- confondere auth identity con autorizzazione business

Mitigazione:

- Firebase decide chi sei
- il backend decide cosa puoi fare

### 4. Costi Google Cloud

Rischio:

- Cloud SQL e Cloud Run non sono equivalenti a "tutto gratis"

Conclusione:

- Firebase Auth e Hosting alleggeriscono molto il problema auth/FE
- ma Cloud SQL resta un servizio gestito da valutare come costo reale

## Checklist tecnica

### Firebase

- [ ] creare progetto Firebase
- [ ] collegare progetto Google Cloud
- [ ] abilitare Authentication
- [ ] abilitare Email/Password
- [ ] abilitare Google
- [ ] configurare domini autorizzati
- [ ] preparare template email

### Frontend

- [ ] aggiungere `firebase/app`
- [ ] aggiungere `firebase/auth`
- [ ] creare init config
- [ ] sostituire auth screen
- [ ] gestire auth state persistence
- [ ] inviare ID token al backend

### Backend

- [ ] aggiungere Firebase Admin SDK
- [ ] configurare service account
- [ ] verificare ID token
- [ ] migrazione DB `firebase_uid/email/provider`
- [ ] upsert utente locale da token
- [ ] proteggere API business con token Firebase

### Google Cloud

- [ ] preparare Cloud Run per backend
- [ ] preparare Cloud SQL PostgreSQL
- [ ] preparare secret/env

## Conclusione

Per questo progetto, Firebase ha senso soprattutto per:

- Google login
- registrazione email/password
- email verification
- reset password

Il backend e il DB non spariscono: cambiano solo responsabilita'.

La migrazione piu' corretta non e':

- "buttiamo via il backend e passiamo a Firebase"

ma:

- "spostiamo l'identita' su Firebase, poi portiamo backend e DB su Google Cloud se conviene"

Questo e' il percorso piu' rapido e difendibile per arrivare gia' domani a:

- login Google
- email verification
- password reset funzionanti

senza dover completare in un solo colpo anche la migrazione infrastrutturale totale.
