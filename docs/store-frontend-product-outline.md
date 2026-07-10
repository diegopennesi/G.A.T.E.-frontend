# Frontend Utenza Realm Negozio

Documento iniziale di prodotto e UX per il frontend semplificato destinato all'utenza finale dei realm di tipo `STORE`.

Questo documento non sostituisce gli handoff tecnici gia' presenti in `.agents/`. Serve a fissare scope, flussi e vincoli del prodotto prima di decidere UI definitiva e implementazione.

## 1. Obiettivo

Realizzare un frontend piu' agile, minimale e mobile-friendly, pensato come esperienza quasi app-like, destinato agli utenti finali che accedono a un realm di tipo `STORE`.

Questo frontend non e' destinato al realm `G.A.T.E.` open. Il realm `G.A.T.E.` avra' un'esperienza separata o un'app dedicata.

Nota di routing:

- il path tecnico `homepage/:realmCode/...` esiste sempre;
- questo non implica che esista sempre una pagina contenutistica di home del negozio;
- la pagina contenutistica del negozio va chiamata `landing page`, non `homepage`.
- il nuovo frontend utenza deve vivere in un albero separato:
  - `homepage/:realmCode/site/...`
- il gestionale esistente resta nel proprio albero:
  - `homepage/:realmCode/app/...`

Per ora il focus e' sul modulo di gioco `D&D`.

## 2. Principio architetturale

Dal punto di vista funzionale i flussi core restano quelli del prodotto G.A.T.E.:

- accesso al realm;
- visione delle campagne disponibili;
- join alla campagna;
- visione delle missioni;
- accesso alle informazioni di campagna;
- gestione profilo;
- creazione e gestione personaggi.

La differenza principale non e' il flusso di dominio, ma il livello di liberta' concesso all'utente e il grado di automazione dell'esperienza.

In sintesi:

- `G.A.T.E.` e' il realm piu' aperto e permissivo;
- gli altri realm guardano principalmente dentro se stessi;
- il nuovo frontend, almeno in prima fase, e' destinato ai realm `STORE`;
- i limiti funzionali di un realm dipendono soprattutto da configurazione, ruolo e policy del realm.

## 3. Tipi di realm

### `G.A.T.E.`

Realm globale e piu' permissivo.

Caratteristiche:

- aperto a una dimensione globale;
- puo' ospitare campagne ed eventi senza il vincolo di una singola struttura locale;
- espone la massima flessibilita' funzionale;
- non e' target del nuovo frontend.

### `STORE`

Realm chiuso o semi-chiuso, centrato su una struttura specifica, ad esempio un negozio.

Caratteristiche:

- l'utente opera solo dentro il contenuto del realm;
- l'utente vede campagne, missioni, eventi ed entita' del solo negozio;
- il livello di apertura non e' fisso: puo' essere piu' o meno permissivo in base alle configurazioni;
- in alcuni casi anche tutti gli iscritti potrebbero avere permessi estesi, ma questa resta una policy configurabile.

### `PRIVATE_GROUP`, `ASSOCIATION`, `EVENT`

Per ora sono concettualmente vicini a `STORE`.

Caratteristiche iniziali:

- stesso principio di isolamento del contenuto nel proprio realm;
- per ora stesso impianto funzionale di base;
- in futuro potranno introdurre limiti o regole aggiuntive, ad esempio:
  - numero massimo campagne;
  - numero massimo stanze;
  - costi aggiuntivi;
  - moduli specifici.

Per questa fase non sono target del nuovo frontend.

## 4. Regola di isolamento

Assunzione di lavoro per questa release:

- ogni realm guarda dentro se stesso;
- `G.A.T.E.` e' funzionalmente aperto;
- gli altri realm possono essere chiusi o parzialmente aperti;
- il nuovo frontend gestisce solo il caso `STORE`.

## 5. Target utenti del nuovo frontend

### Utente standard

L'utente standard:

- vede le campagne aperte e ricercabili del negozio;
- seleziona una campagna;
- effettua join tramite richiesta o auto-join, in base alla configurazione;
- vede le missioni della campagna a cui ha accesso;
- puo' entrare nelle missioni e nei relativi flussi successivi, inclusa la chat;
- gestisce il proprio profilo;
- crea personaggi;
- gestisce i propri personaggi con limitazioni;
- consulta le informazioni della campagna.

L'utente standard non deve vedere la complessita' del gestionale completo.

### Admin di struttura

L'admin di struttura opera nello stesso realm, ma con privilegi estesi.

Puo':

- creare campagne;
- creare missioni;
- gestire missioni e campagne;
- creare NPC;
- creare personaggi, anche se non e' un uso prioritario;
- modificare personaggi e NPC non propri;
- operare con accesso completo sui contenuti della struttura.

Nota: la parte stanze/NPC resta collegata a funzionalita' ancora da definire meglio.

## 6. Esperienza di login e ingresso

Nel nuovo frontend l'utente accede nel contesto di un realm `STORE`.

Il principio e':

- login nel realm del negozio;
- visione immediata delle campagne attive e disponibili;
- ingresso semplificato alla campagna;
- minima frizione prima di arrivare ai contenuti.

Esempi di route attuali:

- `https://gate-frontend-production.up.railway.app/homepage/dlr/login`
- `https://gate-frontend-production.up.railway.app/homepage/dlr/app/campagne`

Decisione nuova:

- il frontend parallelo utenza non deve sovrapporsi al branch `app`;
- deve usare un branch dedicato `site`.
- il branch `site` deve avere anche auth dedicata:
  - `homepage/:realmCode/site/login`
  - `homepage/:realmCode/site/register`
  - `homepage/:realmCode/site/recover`

Il join alla campagna puo' avvenire in due modi:

- richiesta di join;
- auto-join.

La modalita' dipende dalla configurazione lato `SYSTEM`.

## 7. Navigazione principale

La navigazione principale del nuovo frontend e' dinamica.

### Tab campagne

L'utente vede `N` tab, dove `N` e' il numero di campagne:

- attive;
- aperte;
- ricercabili;
- non nascoste;
- non chiuse.

Quando l'utente preme una tab campagna:

- il sistema avvia il flusso di accesso alla campagna;
- se previsto, invia una richiesta di join;
- se previsto, effettua auto-join;
- una volta ottenuto l'accesso, mostra il contenuto della campagna, inizialmente in forma di griglia o lista di missioni.

### Tab modulo sito

Se e solo se il modulo `SITO` e' attivato lato `SYSTEM`, il frontend espone due tab aggiuntive:

- `Landing`
- `Shop Info`

Queste pagine sono configurabili da un admin del realm.

Ipotesi attuale:

- `Landing`: logo centrale, testo breve, contenuto introduttivo essenziale;
- `Shop Info`: contenuto informativo sul negozio o sulla struttura.

Route attese:

- `homepage/:realmCode/site/landing`
- `homepage/:realmCode/site/shop-info`

Indicazioni di layout emerse dalle reference:

- nella parte alta resta una barra/tab orizzontale con le voci principali del realm;
- `Shop Info` deve presentare soprattutto contenuto testuale editoriale;
- il contenuto principale puo' vivere in una card o pannello centrale modificabile da admin;
- e' ammessa una immagine di sfondo configurabile lato admin, ma con ruolo secondario rispetto al testo;
- la priorita' visiva della pagina e' la lettura delle informazioni del negozio, non la promozione di CTA complesse.

La configurazione del modulo `SITO` non e' scope della prima release. L'eventuale integrazione editoriale esterna, ad esempio WordPress, e' decisione futura.

## 8. Contenuti visibili dopo l'accesso alla campagna

Una volta entrato nella campagna, l'utente standard deve poter vedere soprattutto:

- missioni;
- chat della missione o della campagna, quando prevista;
- informazioni generali della campagna;
- propria scheda personaggio;
- elenco e gestione dei propri personaggi;
- proprio profilo.

L'obiettivo UX e' arrivare rapidamente all'azione principale, senza esporre funzioni superflue o amministrative.

Indicazioni di layout emerse dalle reference:

- la campagna `D&D` deve mostrare una vista missioni a cascata;
- la lista missioni deve essere filtrabile almeno per:
  - `Oggi`
  - `Settimana`
  - `Prossima Settimana`
  - `Tutte`
- per ogni missione devono essere sempre leggibili almeno:
  - titolo
  - data
  - informazioni sintetiche
- gli elementi grafici decorativi della missione possono essere raffinati dopo, ma la struttura informativa deve esserci da subito;
- il click sulla missione porta a un dettaglio dove l'utente puo' prenotarsi:
  - come titolare
  - come panchina
- nella parte bassa del dettaglio missione deve restare presente la chat, funzionalita' gia' esistente.

## 9. Scope iniziale del frontend

Per la prima fase il nuovo frontend deve concentrarsi su:

- autenticazione nel realm `STORE`;
- lista/tab campagne disponibili;
- join o auto-join campagna;
- vista missioni della campagna;
- vista informazioni campagna;
- gestione profilo personale;
- creazione personaggio;
- gestione schede personaggio proprie;
- esperienza mobile-first.

Non sono priorita' della prima release:

- configurazione del modulo `SITO`;
- gestione avanzata stanze;
- definizione completa NPC/stanze;
- customizzazioni specifiche per `PRIVATE_GROUP`, `ASSOCIATION`, `EVENT`;
- integrazioni CMS esterne.

## 10. Differenze rispetto al gestionale completo

Il nuovo frontend non cambia il dominio di base. Riduce invece:

- quantita' di funzionalita' esposte;
- complessita' della navigazione;
- numero di decisioni richieste all'utente;
- frizione nei passaggi di accesso alla campagna.

In pratica:

- stesso modello di piattaforma;
- esperienza molto piu' guidata;
- meno flessibilita' lato utenza;
- maggiore automazione lato join/accesso;
- interfaccia piu' adatta al mobile.

## 11. Vincoli UX

Il frontend deve:

- essere mobile-first;
- simulare un'esperienza app-like;
- ridurre i livelli di navigazione;
- presentare CTA chiare e poche;
- mostrare prima i contenuti utili e poi gli strumenti secondari;
- nascondere la complessita' di gestione non rilevante per l'utente standard.

Dalle reference visive emerge anche questo orientamento:

- tab o menu principali in fascia alta;
- grandi blocchi contenuto centrali;
- dettaglio missione costruito con:
  - hero o immagine missione a sinistra/parte alta;
  - box prenotazioni a destra o subito sotto su mobile;
  - chat in un pannello separato nella parte bassa.

## 12. Domande ancora aperte

Questi punti vanno ancora confermati:

- l'ingresso iniziale dopo login mostra subito le tab campagne o una landing page interna del negozio?
- la campagna cliccata apre una vista dedicata o aggiorna un contenitore centrale stile tabbed app?
- come rappresentare il join in pending: badge, stato nella tab, schermata intermedia, toast?
- la griglia missioni deve essere card-based, lista densa o ibrido?
- il profilo e i personaggi stanno in una bottom navigation dedicata o in un menu account?
- l'admin di struttura usa questo stesso frontend oppure una variante piu' ricca dello stesso shell?

## 13. Decisioni operative provvisorie

Finche' non vengono ridefinite:

- il nuovo frontend viene pensato solo per realm `STORE`;
- il modulo iniziale e' `D&D`;
- le tab campagne sono dinamiche;
- il path base realm-aware resta `homepage/:realmCode/...`;
- il nuovo FE utenza usa `homepage/:realmCode/site/...`;
- il gestionale esistente continua a usare `homepage/:realmCode/app/...`;
- il join puo' essere automatico o a richiesta;
- il comportamento dipende dalla configurazione lato `SYSTEM`;
- il realm `G.A.T.E.` resta fuori da questo frontend.

## 14. Prossimi passi suggeriti

Ordine consigliato:

1. chiudere questo documento con i punti aperti minimi;
2. definire sitemap e navigation model mobile;
3. definire capability matrix per `utente standard` e `admin struttura`;
4. disegnare wireframe low-fi delle schermate chiave;
5. passare allo scaffold UI.
