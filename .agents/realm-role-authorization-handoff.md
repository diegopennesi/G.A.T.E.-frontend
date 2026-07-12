# G.A.T.E. Realm Role / Authorization Handoff

Promemoria operativo per agenti futuri. Questo file descrive le decisioni aggiornate sul modello permessi realm-aware e lo stato attuale FE/BE gia' implementato.

## Stato attuale gia' implementato

- `realms` esiste lato BE.
- `realm_domains` esiste lato BE.
- `campaigns.realm_id` e `invite_tokens.realm_id` esistono gia'.
- resolver realm attivo:
  - da `Host` se mappato;
  - da `X-GATE-Realm-Code` altrimenti;
  - fallback `gate`.
- FE route-based realm context:
  - `/homepage/:realmCode/login`
  - `/homepage/:realmCode/register`
  - `/homepage/:realmCode/recover`
- branding realm attivo:
  - `logoUrl`
  - titolo pagina
  - favicon
  - logo login/sidebar
- dashboard `SYSTEM` per realm:
  - lista
  - creazione
  - modifica
  - campi modificabili ora:
    - `code`
    - `name`
    - `type`
    - `isActive`
    - `logoUrl`
  - campi NON modificati ora:
    - `hosts`

## Decisione ruoli aggiornata

Ridurre il significato del ruolo globale applicativo.

### Ruoli globali piattaforma

Su `users.platformRole` il significato corretto diventa:

- `SYSTEM`: super-admin piattaforma, bypass totale
- `USER`: utente normale

`ADMIN` globale non deve piu' essere la fonte dei privilegi di gestione realm.

Nota: l'enum puo' anche restare temporaneamente a 3 valori per retrocompatibilita', ma semanticamente l'admin operativo deve spostarsi sul realm.

### Ruoli per realm

Serve una tabella esplicita di associazione utente-realm:

```text
realm_user_roles
- id
- realm_id
- user_id
- role          USER | ADMIN
- created_at
- updated_at
- unique(realm_id, user_id)
```

Questa tabella NON esiste ancora nel codice.

## Regola di autorizzazione target

Per ogni request realm-aware:

1. se `platformRole == SYSTEM`:
   - bypass completo
2. altrimenti:
   - risolvi il realm corrente
   - leggi il ruolo utente in `realm_user_roles`
   - applichi le policy del ruolo realm

Quindi:

- stesso utente puo' essere `ADMIN` su `gate`
- e `USER` su `drl`

Esempio atteso:

```text
utente X
- users.platformRole = USER
- realm gate -> ADMIN
- realm drl -> USER
```

## Flusso operativo atteso

Esempio deciso:

1. creo un utente in G.A.T.E.
2. l'utente nasce `USER`
3. un `SYSTEM` puo' elevare un utente a `SYSTEM`
4. un `SYSTEM` assegna ruoli per realm:
   - utente A -> `ADMIN` su `gate`
   - utente A -> `USER` su `drl`
5. quando l'utente entra in `gate`:
   - vede le funzioni admin realm
6. quando lo stesso utente entra in `drl`:
   - e' utente normale realm
   - FE e BE devono inibire le azioni non permesse

## Impatto architetturale atteso

### Backend

Serve introdurre:

```text
RealmUserRole
RealmUserRoleRepository
RealmRole enum
RealmAuthorizationService
```

Serve anche un resolver/cached context per request:

```text
CurrentRealmAccessContext
- userId
- platformRole
- currentRealm
- currentRealmRole
```

Azioni da spostare sotto controllo realm:

- creazione campagna
- eventuale amministrazione campagne del realm
- dashboard realm admin
- gestione utenti/permessi del realm
- branding realm

Gli endpoint `/api/v1/admin/...` oggi protetti da `hasSystemOverride()` vanno rivalutati:

- alcuni resteranno `SYSTEM` puro
- altri dovranno diventare `realm ADMIN` + `SYSTEM`

### Frontend

Serve un endpoint permessi realm correnti, ad esempio:

```text
GET /api/v1/realms/me/permissions
```

Risposta attesa:

```json
{
  "realmCode": "drl",
  "platformRole": "USER",
  "realmRole": "USER",
  "permissions": {
    "createCampaign": false,
    "manageRealm": false,
    "manageRealmUsers": false,
    "viewRealmAdmin": false
  }
}
```

Il FE dovra' usare questi permessi per:

- mostrare/nascondere CTA
- disabilitare bottoni
- cambiare menu e schermate disponibili

La sicurezza vera resta comunque nel BE.

## Host: significato corretto

Gli host registrati su un realm NON sono le route FE interne.

Esempi:

```text
dragonlegend.gate.app
app.dragonlegend.it
```

Servono per permettere al backend di dedurre il realm dal dominio pubblico della request:

```text
Host: dragonlegend.gate.app -> realm dragonlegend
Host: app.dragonlegend.it   -> realm dragonlegend
```

Se oggi il FE usa:

```text
http://localhost:5173/homepage/drl/login
```

gli host registrati non hanno ancora effetto pratico immediato in locale. Sono preparazione per:

- subdomain G.A.T.E.
- custom domain del cliente

## Host NON significa API esterne abilitate

Registrare un host NON abilita automaticamente integrazioni esterne.

Distinzione corretta:

- `host` = risoluzione realm dal dominio
- `api client` = autorizzazione integrazione esterna

Quindi:

- un dominio registrato identifica il realm
- ma non concede di per se' accesso partner/API

Per API esterne vere servira' piu' avanti un modulo separato, per esempio:

```text
realm_api_clients
- id
- realm_id
- name
- key_hash
- scopes
- is_active
```

## Decisioni FE/UX gia' prese

- la tab `Realm` usa:
  - tabella semplice sotto
  - form unico sopra per create/edit
- clic su riga tabella -> il form va in edit
- in edit il `code` ora e' modificabile
- il toggle `isActive` deve mostrare testo esplicito (`Attivo` / `Spento`)

## Ordine consigliato di implementazione

1. introdurre `realm_user_roles`
2. introdurre `RealmAuthorizationService`
3. introdurre endpoint permessi realm correnti
4. spostare la create campaign sotto permesso realm
5. spostare la visibilita' FE di admin/create campaign sui permessi realm
6. rifattorizzare gradualmente gli endpoint admin globali

## Nota importante

Non usare piu' `users.platformRole == ADMIN` come fonte primaria delle autorizzazioni operative realm-aware.

Target corretto:

- `SYSTEM` globale -> super user piattaforma
- `ADMIN` realm -> amministratore del singolo realm
- `USER` realm -> utente normale del singolo realm
