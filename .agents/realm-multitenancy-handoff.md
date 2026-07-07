# G.A.T.E. Realm / Multi-Tenancy Handoff

Questo file e' un promemoria operativo per agenti futuri. Non implementare questo lavoro finche' non sono chiusi i tweak chat e il ramo corrente non e' stato mergiato su master.

## Stato

- Siamo ancora in sviluppo, nessun rilascio pubblico.
- Le campagne/missioni esistenti sono dati di test/dev.
- Prima sequenza richiesta:
  1. finire tweak chat;
  2. mergiare su master;
  3. aprire una nuova branch/fork di lavoro per realm/multi-tenancy;
  4. affrontare FE e BE insieme, perche' l'impatto e' alto su entrambi.

## Obiettivo

G.A.T.E. deve supportare due modalita':

- realm open G.A.T.E., per l'esperienza piattaforma globale;
- realm cliente/struttura, per esempio Dragon Legend o Avalon, dove l'utente vede solo campagne, missioni, stanze e chat di quella struttura.

L'utente resta un profilo G.A.T.E. globale. Il realm non e' "proprietario" dell'utente: e' il contesto in cui l'utente sta usando il prodotto.

## Decisioni gia' fissate

### Realm G.A.T.E. esplicito

Creare un realm esplicito per G.A.T.E. Open.

Non usare `realm_id NULL` come ambiente open.

Esempio:

```text
realms
- gate
- dragonlegend
- avalon
```

Ogni campagna dovra' avere `campaigns.realm_id NOT NULL`.

Le campagne attuali/dev devono essere migrate sul realm `gate`.

### Header e contesto realm

Il FE potra' passare il realm corrente via header, per esempio:

```http
X-GATE-Realm-Code: dragonlegend
```

Questo header identifica il contesto richiesto, ma non concede permessi.

Il BE deve sempre validare:

- realm esistente;
- realm attivo;
- campagna appartenente al realm corrente;
- invito appartenente al realm corrente;
- missione/stanza/chat compatibili con la campagna e quindi con il realm;
- autorizzazioni utente gia' esistenti: membership campagna, ruolo, partecipazione missione, master/co-master/super-master.

### Host/domain vs header

Il dominio custom o subdomain e' una variante futura/cliente, ma va progettata.

Esempi:

```text
dragonlegend.gate.app
app.dragonlegend.it
```

Il BE puo' risolvere il realm dal valore `Host` cercando in `realm_domains`.

Se host e header non coincidono, la request deve fallire.

Esempio KO:

```http
Host: app.dragonlegend.it
X-GATE-Realm-Code: avalon
```

Risposta consigliata: `403 Forbidden`.

### API esterne

Per siti esterni clienti, prevedere in futuro una API key o client key.

Per ora la funzionalita' va solo predisposta a livello di disegno, non integrata nel progetto attuale.

Non esporre endpoint esterni attivi in questa fase.

## Rotte FE previste

Caso interno G.A.T.E.:

```text
/homepage/dragonlegend/login
/homepage/avalon/login
```

Il FE estrae `dragonlegend` o `avalon` dalla route e lo usa come realm code corrente.

Per richieste senza realm esplicito:

```text
realm = gate
```

## Algoritmo Realm Resolver BE

Proposta:

```text
1. Leggi Host della request.
2. Se Host e' mappato a un realm:
   - currentRealm = realm da Host;
   - se esiste X-GATE-Realm-Code e non coincide: KO.
3. Se Host non e' mappato:
   - se esiste X-GATE-Realm-Code: currentRealm = quel realm, se attivo;
   - altrimenti currentRealm = gate.
4. Se realm non esiste o non e' attivo: KO.
```

Esempi:

```text
gate.app senza header -> gate
gate.app + X-GATE-Realm-Code: dragonlegend -> dragonlegend
app.dragonlegend.it senza header -> dragonlegend
app.dragonlegend.it + X-GATE-Realm-Code: dragonlegend -> dragonlegend
app.dragonlegend.it + X-GATE-Realm-Code: avalon -> KO
```

## Modello dati da analizzare

### realms

```text
id
code
name
type
status
branding/config
created_at
updated_at
```

Possibili `type`:

```text
GATE_OPEN
STORE
ASSOCIATION
PRIVATE_GROUP
EVENT
```

### realm_domains

```text
id
realm_id
host
is_primary
is_active
verified_at
created_at
updated_at
```

### campaigns

Aggiungere:

```text
realm_id NOT NULL
```

Vincolo consigliato:

```text
campaign.realm_id references realms(id)
```

### invite_tokens

Aggiungere:

```text
realm_id NOT NULL
```

Ogni invito deve essere valido solo dentro il realm in cui e' stato generato.

Validazioni obbligatorie:

```text
invite.realm_id == currentRealm.id
campaign.realm_id == currentRealm.id
```

### realm_api_clients

Solo predisposizione futura, non abilitare ora.

```text
id
realm_id
name
key_hash
status
allowed_origins
scopes
created_at
updated_at
```

Stati possibili:

```text
DISABLED
ACTIVE
REVOKED
```

Per questa fase: non implementare integrazione API esterna.

### realm_staff

Non serve una membership realm per tutti i giocatori.

Valutare invece una tabella staff per chi amministra la struttura.

```text
realm_id
user_id
role
status
```

Possibili ruoli:

```text
OWNER
ADMIN
STAFF
```

Questa tabella non sostituisce membership campagna, ruoli campagna o partecipazioni missione.

## Accesso e visibilita'

Regola base:

```text
La request ha sempre un currentRealm.
Ogni lista o dettaglio deve essere filtrato sul currentRealm.
```

Se currentRealm e' `gate`, l'utente vede solo entita' del realm `gate`.

Se currentRealm e' `dragonlegend`, l'utente vede solo entita' del realm `dragonlegend`.

Un utente G.A.T.E. puo' usare piu' realm con lo stesso profilo, ma non deve vedere dati cross-realm nella stessa sessione contestuale.

## Autojoin realm-aware

Gli inviti/autojoin devono essere scoped al realm.

Casi possibili:

```text
REALM_ENTRY
CAMPAIGN_AUTOJOIN
```

Da valutare piu' avanti:

```text
MISSION_AUTOJOIN
```

Per ora il caso principale e':

```text
utente entra in /homepage/dragonlegend/login
si registra/login
usa codice/link invito dragonlegend
vede solo campagne e missioni dragonlegend
```

Un codice Dragon Legend non deve essere valido in Avalon.

## Punti aperti da analizzare

- Policy campagne pubbliche dentro un realm: visibili a chiunque entri nel realm o solo con invito?
- Realm `gate`: deve comportarsi come una struttura open online.
- Branding: logo/colori/testi login/register per realm.
- Moduli abilitabili per realm.
- PWA/Web Push: probabilmente trasversale, ma configurazione e costi potrebbero essere realm-aware.
- Staff realm: chi puo' creare campagne dentro Dragon Legend/Avalon?
- Master esterni: un co-master non legato alla struttura puo' operare su una campagna del realm se invitato/abilitato?
- Stanze: saranno sempre dentro campagna o potra' esistere una stanza generale di realm?
- Chat/bulletin board generale di realm: da valutare solo dopo chat missione/stanze.

## Impatto atteso

BE: alto.

- nuove entity/repository/migration;
- resolver per current realm;
- propagazione del realm nei service;
- filtri query su campaign/mission/room/chat/invite;
- validazioni anti cross-realm;
- test di sicurezza.

FE: alto.

- realm context globale;
- route realm-aware;
- header su API client;
- fallback `gate`;
- login/register contestuale;
- liste campagne/missioni filtrate;
- possibile branding per realm.

## Note per implementazione futura

Non partire inserendo `realmId` a mano ovunque senza un punto centrale.

Creare prima un concetto BE tipo:

```text
RequestRealmContext
RealmResolver
```

Poi far dipendere i service dal contesto risolto.

L'header realm non e' autorizzazione. Serve solo a selezionare il contenitore dati richiesto.

