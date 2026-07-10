# Sitemap e Wireflow FE Store

Documento operativo per trasformare la bozza prodotto del frontend `STORE` in una struttura di schermate e flussi navigabili.

Riferimento principale: [store-frontend-product-outline.md](/home/diego/octo/GATE_frontend_starter/gate/fe/docs/store-frontend-product-outline.md)

## 1. Obiettivo del documento

Definire:

- schermate principali;
- relazioni tra schermate;
- flussi di ingresso;
- stati principali lato utente;
- prima ipotesi di navigazione mobile-first.

Questo documento non decide ancora stile grafico finale, palette o componentistica visuale dettagliata.

## 2. Assunzioni di lavoro

Per questa fase assumiamo che:

- il frontend serva solo realm di tipo `STORE`;
- il modulo iniziale sia `D&D`;
- il login avvenga gia' nel contesto di uno specifico realm;
- il path base realm-aware resti `homepage/:realmCode/...`;
- il nuovo frontend utenza viva in un albero separato `homepage/:realmCode/site/...`;
- il gestionale completo continui a vivere in `homepage/:realmCode/app/...`;
- la navigazione principale sia dinamica e guidata dalle campagne disponibili;
- il join campagna possa essere `auto-join` oppure `join request`;
- le campagne visibili siano solo quelle attive, aperte e ricercabili;
- l'utente standard sia il target principale di UX.

## 3. Modello di navigazione proposto

Prima proposta mobile-first:

- shell principale con header compatto;
- area centrale contenuto;
- tab orizzontali scrollabili per:
  - pagine statiche opzionali del modulo `SITO`;
  - campagne visibili;
- navigazione account sempre accessibile per:
  - profilo;
  - personaggi;
  - logout.

Per ora la soluzione piu' pragmatica e':

- tab orizzontali in alto per contenuti realm/campagne;
- entry account persistente in alto a destra o in bottom utility bar;
- dentro la campagna, navigazione secondaria locale per:
  - missioni;
  - info campagna;
  - personaggi.

Indicazione emersa dalle reference:

- la fascia alta deve assomigliare piu' a una barra di navigazione orizzontale di contenuti che a un menu tecnico da gestionale.

## 4. Sitemap ad alto livello

```text
Realm Login
 -> Realm Register
 -> Realm Recover
 -> Post-login Entry

Post-login Entry
 -> Store Home / Campaign Hub

Store Home / Campaign Hub
 -> Optional Static Tab: Landing
 -> Optional Static Tab: Shop Info
 -> Dynamic Campaign Tab: Campaign A
 -> Dynamic Campaign Tab: Campaign B
 -> Dynamic Campaign Tab: Campaign N
 -> Profile
 -> My Characters

Dynamic Campaign Tab
 -> Join Request State
 -> Auto Join State
 -> Campaign Mission Board
 -> Campaign Info
 -> Character Selection / Character Creation

Campaign Mission Board
 -> Mission Detail
 -> Mission Chat

My Characters
 -> Character Create
 -> Character Sheet
 -> Character Edit

Profile
 -> Edit Profile
```

## 5. Elenco schermate

### 5.1 Accesso realm

Schermate:

- `Login`
- `Registrazione`
- `Recupero credenziali`

Scopo:

- autenticare l'utente nel realm del negozio;
- mantenere l'esperienza brandizzata sul negozio;
- portare rapidamente al contenuto disponibile.

Route di riferimento attuali:

- `homepage/:realmCode/login`
- `homepage/:realmCode/register`
- `homepage/:realmCode/recover`

Branch separati:

- gestionale esistente: `homepage/:realmCode/app/...`
- frontend store: `homepage/:realmCode/site/...`
- auth frontend store: `homepage/:realmCode/site/login`

Output atteso:

- sessione attiva;
- profilo realm-aware caricato;
- lista campagne visibili caricata o pronta da caricare.

### 5.2 Post-login entry

Schermata ponte molto leggera, opzionale a livello visuale.

Scopo:

- risolvere realm corrente;
- caricare branding del negozio;
- caricare moduli attivi;
- caricare tab statiche e campagne visibili;
- portare l'utente nel contenitore principale.

Nota:

questa puo' anche non esistere come schermata vera e propria. Puo' essere solo uno stato loading del shell principale.

### 5.3 Store Home / Campaign Hub

Questa e' la schermata principale del nuovo frontend.

Contenuti:

- header compatto con logo realm e accesso account;
- eventuale tab `Landing`;
- eventuale tab `Shop Info`;
- tab dinamiche per ogni campagna disponibile;
- stato vuoto se non esistono campagne visibili.

Funzione:

- fare da porta di ingresso unica ai contenuti del negozio;
- mostrare subito all'utente dove puo' entrare;
- minimizzare la navigazione inutile.

Route base di riferimento attuale:

- `homepage/:realmCode/site`

Nota di layout:

- in alto resta la barra/tab orizzontale delle sezioni;
- il contenuto della tab selezionata occupa il pannello centrale principale.

### 5.3.b Shop Info

Schermata editoriale leggera, disponibile quando il modulo `SITO` e' attivo.

Route attesa:

- `homepage/:realmCode/site/shop-info`

Layout target derivato dalla reference:

- barra superiore con tab/sezioni del realm;
- sfondo eventualmente configurabile;
- card o pannello centrale con testo informativo;
- contenuto amministrabile da admin;
- enfasi sulla leggibilita', non su interazioni complesse.

### 5.4 Campaign Access State

Non e' necessariamente una schermata autonoma. Puo' essere uno stato della tab campagna.

Stati possibili:

- `non joined`
- `join pending`
- `joined`
- `auto joining`
- `access denied`

Azioni:

- invia richiesta di join;
- esegue auto-join;
- mostra stato pending;
- consente accesso al contenuto se membership approvata.

### 5.5 Campaign Mission Board

Prima schermata operativa dopo l'accesso a una campagna.

Contenuti minimi:

- nome campagna;
- stato accesso utente;
- elenco o griglia missioni visibili;
- CTA per entrare in una missione;
- accesso a `Info Campagna`;
- accesso a `I miei personaggi` nel contesto della campagna.

Scopo:

- essere il vero centro operativo dell'utente standard.

Layout target derivato dalla reference:

- parte alta con titolo sezione e controlli filtro;
- filtri rapidi per finestra temporale:
  - `Oggi`
  - `Settimana`
  - `Prossima Settimana`
  - `Tutte`
- flusso verticale di missioni in cascata;
- ogni item missione mostra contenuti visuali e informazioni base;
- il contenuto informativo della missione deve rimanere leggibile anche se in una seconda iterazione cambiano le grafiche.

Route candidata:

- `homepage/:realmCode/site/campaigns/:campaignSlug`

### 5.6 Mission Detail

Schermata di dettaglio missione.

Contenuti attesi, da confermare:

- titolo missione;
- stato missione;
- descrizione breve;
- eventuali metadati essenziali;
- accesso alla chat;
- eventuale personaggio attivo o selezione personaggio.

Layout target derivato dalla reference:

- hero/immagine missione in posizione dominante;
- box prenotazioni ben visibile;
- elenco posti o prenotati separato dal contenuto descrittivo;
- CTA di prenotazione per:
  - titolare
  - panchina
- chat persistente nella parte bassa della schermata.

Route candidata:

- `homepage/:realmCode/site/campaigns/:campaignSlug/missions/:missionId`

### 5.7 Mission Chat

Schermata o pannello dedicato alla comunicazione della missione.

Per ora resta nel perimetro della sitemap, ma non viene specificata in dettaglio in questa fase.

Assunzione iniziale:

- la chat non e' una pagina isolata di primo livello;
- nel dettaglio missione vive come pannello inferiore o sezione dedicata sotto il contenuto principale.

### 5.8 Campaign Info

Schermata dedicata alle informazioni della campagna.

Contenuti:

- descrizione campagna;
- regolamento o note;
- eventuali informazioni pubbliche sul contesto di gioco;
- eventuali admin/master visibili.

### 5.9 My Characters

Area dedicata ai personaggi dell'utente.

Contenuti:

- elenco personaggi propri;
- stato del personaggio;
- campagna di appartenenza, se utile;
- CTA crea personaggio.

### 5.10 Character Create

Schermata di creazione personaggio.

Per la prima release:

- guidata;
- ridotta all'essenziale;
- pensata per il modulo `D&D`.

### 5.11 Character Sheet

Scheda del personaggio dell'utente.

Contenuti:

- dati identitari;
- attributi principali;
- elementi chiave utili alla giocata;
- eventuali azioni di modifica consentite.

### 5.12 Profile

Area account personale.

Contenuti:

- dati profilo;
- modifica profilo;
- eventuali preferenze base;
- logout.

## 6. Wireflow principale utente standard

### Flusso A: login e accesso al negozio

```text
Login
 -> autenticazione ok
 -> caricamento shell realm
 -> Store Home / Campaign Hub
```

### Flusso B: utente seleziona una campagna con auto-join

```text
Store Home / Campaign Hub
 -> tap su tab campagna
 -> auto-join
 -> Campaign Mission Board
```

### Flusso C: utente seleziona una campagna con join request

```text
Store Home / Campaign Hub
 -> tap su tab campagna
 -> invio richiesta join
 -> stato pending
 -> accesso sbloccato dopo approvazione
 -> Campaign Mission Board
```

### Flusso D: utente entra in una missione

```text
Campaign Mission Board
 -> tap su missione
 -> Mission Detail
 -> prenotazione come titolare o panchina
 -> Mission Chat
```

### Flusso E: utente crea o gestisce un personaggio

```text
Store Home / Campaign Hub oppure Campaign Mission Board
 -> My Characters
 -> Character Create
 -> Character Sheet
```

### Flusso F: utente aggiorna il profilo

```text
Store Home / Campaign Hub
 -> Profile
 -> Edit Profile
 -> ritorno a Profile
```

## 7. Stati principali da progettare

Ogni schermata chiave deve prevedere almeno questi stati:

- loading iniziale;
- empty state;
- errore di caricamento;
- accesso negato;
- contenuto disponibile.

Stati specifici aggiuntivi:

### Campagna

- join disponibile;
- auto-join in corso;
- join pending;
- join approvato;
- campagna chiusa o non piu' accessibile.

### Missioni

- nessuna missione disponibile;
- missioni disponibili;
- missione bloccata da prerequisiti;
- missione accessibile.

Stati di filtro da prevedere:

- `Oggi`
- `Settimana`
- `Prossima Settimana`
- `Tutte`

### Personaggi

- nessun personaggio creato;
- uno o piu' personaggi presenti;
- limite creazione raggiunto;
- personaggio non modificabile.

## 8. Comportamento dinamico delle tab

Le tab non sono hardcoded.

Ordine proposto:

1. `Landing`, se modulo `SITO` attivo
2. `Shop Info`, se modulo `SITO` attivo
3. campagne ordinate per criterio da definire

Criteri candidati per l'ordinamento campagne:

- manuale lato admin;
- data di apertura;
- priorita' configurata;
- alfabetico.

Per la prima iterazione basta prevedere che l'ordinamento sia configurabile in futuro, senza fissarlo ancora nella UI.

## 9. Schermate minime MVP

Per uno scaffold UI iniziale bastano queste schermate:

- `Login`
- `Store Shell / Campaign Hub`
- `Campaign Mission Board`
- `Campaign Info`
- `My Characters`
- `Character Sheet`
- `Profile`

Con questi elementi si puo' gia' validare:

- struttura generale;
- navigazione mobile;
- comportamento delle tab;
- gerarchia dei contenuti;
- spazio disponibile per i flussi core.

## 10. Punti da chiudere prima del wireframe visuale

Decisioni ancora necessarie:

- scegliere se `Landing` esiste sempre o solo con modulo `SITO`;
- decidere se il click su una campagna cambia pagina o solo contenuto nel medesimo shell;
- decidere dove vive la navigazione account su mobile;
- decidere come mostrare `pending join`;
- decidere se `My Characters` e' globale o contestuale alla campagna;
- decidere se una missione richiede sempre selezione personaggio prima dell'ingresso.

## 11. Prossimo passo consigliato

Da qui il passo corretto e' uno di questi due:

1. definire un wireframe low-fi schermata per schermata;
2. saltare direttamente a uno scaffold UI React mobile-first con dati mock.

Se l'obiettivo e' ridurre il rischio di rifare la UI, conviene fare almeno prima il wireframe low-fi.
