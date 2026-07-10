# Low-Fi Wireframes FE Store

Blueprint testuale delle schermate chiave del frontend `STORE`.

Questo documento serve come ponte tra:

- visione prodotto;
- sitemap e wireflow;
- futura implementazione dello scaffold UI.

Riferimenti:

- [store-frontend-product-outline.md](/home/diego/octo/GATE_frontend_starter/gate/fe/docs/store-frontend-product-outline.md)
- [store-frontend-sitemap-wireflow.md](/home/diego/octo/GATE_frontend_starter/gate/fe/docs/store-frontend-sitemap-wireflow.md)

## 1. Regole generali

Valgono per tutte le schermate:

- esperienza mobile-first;
- shell unica realm-aware;
- fascia alta con navigazione orizzontale dei contenuti;
- contenuto principale in un blocco centrale leggibile;
- account sempre raggiungibile;
- CTA poche e molto chiare;
- priorita' ai contenuti operativi rispetto ai controlli secondari.

## 2. Shell base

Struttura comune proposta:

```text
+--------------------------------------------------+
| Top Utility Bar                                  |
| [Realm Logo] [Tab Scroll Area...............] [U]|
+--------------------------------------------------+
| Page Content                                     |
|                                                  |
|  contenuto pagina / campagna / missione          |
|                                                  |
+--------------------------------------------------+
| Bottom Safe Area / Utility Space                 |
+--------------------------------------------------+
```

Elementi:

- `Realm Logo`: identita' del negozio o struttura
- `Tab Scroll Area`: contiene `Landing`, `Shop Info` e `N` campagne
- `U`: accesso account/profilo

Comportamento mobile:

- le tab scorrono orizzontalmente;
- il logo resta compatto;
- l'accesso account non deve sparire sotto overflow.

## 3. Wireframe: Shop Info

Route:

- `homepage/:realmCode/site/shop-info`

Scopo:

- mostrare informazioni statiche/editoriali del negozio;
- offrire un contenuto semplice, leggibile e amministrabile.

### Desktop / tablet largo

```text
+--------------------------------------------------------------+
| [Logo] [Landing] [Shop Info] [Campagna 1] [Campagna 2] [U]  |
+--------------------------------------------------------------+
| Background visual opzionale                                  |
|                                                              |
|   +----------------------------------------------+           |
|   | SHOP INFO                                    |           |
|   |                                              |           |
|   | Titolo sezione                               |           |
|   |                                              |           |
|   | Testo lungo editabile da admin               |           |
|   | con paragrafi, link, richiami brevi          |           |
|   |                                              |           |
|   | Eventuale CTA secondaria opzionale           |           |
|   +----------------------------------------------+           |
|                                                              |
+--------------------------------------------------------------+
```

### Mobile

```text
+----------------------------------------------+
| [Logo] [Tab Scroll Area.................] [U]|
+----------------------------------------------+
| Background visual opzionale                  |
|                                              |
| +------------------------------------------+ |
| | SHOP INFO                                | |
| |                                          | |
| | Titolo                                   | |
| |                                          | |
| | Testo informativo editabile              | |
| | su singola colonna                       | |
| |                                          | |
| | Link / CTA opzionale                     | |
| +------------------------------------------+ |
+----------------------------------------------+
```

Regole UI:

- una sola colonna di lettura;
- niente doppie card annidate;
- lo sfondo non deve disturbare la lettura;
- la card centrale e' il contenuto dominante;
- testo e titolo vengono configurati da admin.

Stati da prevedere:

- loading contenuto;
- contenuto assente;
- contenuto presente;
- immagine di sfondo assente;
- contenuto non pubblicato.

## 4. Wireframe: Campaign Mission Board

Route candidata:

- `homepage/:realmCode/site/campaigns/:campaignSlug`

Scopo:

- essere la vista principale della campagna `D&D`;
- mostrare missioni accessibili;
- permettere filtro temporale rapido.

### Desktop / tablet largo

```text
+-----------------------------------------------------------------------+
| [Logo] [Landing] [Shop Info] [Campagna 1] [Campagna 2] [U]           |
+-----------------------------------------------------------------------+
| Campaign Header                                                       |
| [Nome campagna] [stato accesso]                                       |
+-----------------------------------------------------------------------+
| Filters                                                               |
| [Search......................] [Oggi] [Settimana] [Prossima Sett.]    |
| [Tutte]                                                               |
+-----------------------------------------------------------------------+
| Mission Cascade                                                       |
|                                                                       |
| +-----------------------------+  +----------------------------------+ |
| | mission cover               |  | badge data/ora                   | |
| |                             |  | titolo missione                  | |
| | immagine / hero             |  | sottotitolo / tier / luogo       | |
| |                             |  | descrizione breve                | |
| +-----------------------------+  | meta sintetici                   | |
|                                  +----------------------------------+ |
|                                                                       |
| +-----------------------------+  +----------------------------------+ |
| | mission cover               |  | badge data/ora                   | |
| | ...                         |  | titolo missione                  | |
| +-----------------------------+  | descrizione breve                | |
|                                  +----------------------------------+ |
+-----------------------------------------------------------------------+
```

### Mobile

```text
+--------------------------------------------------+
| [Logo] [Tab Scroll Area.....................] [U]|
+--------------------------------------------------+
| [Nome campagna]                                 |
| [stato accesso]                                 |
+--------------------------------------------------+
| [Search......................................]  |
| [Oggi] [Sett.] [Prossima] [Tutte]              |
+--------------------------------------------------+
| Mission Card                                   |
| +--------------------------------------------+ |
| | cover image                                | |
| +--------------------------------------------+ |
| | data/ora                                   | |
| | titolo missione                            | |
| | info sintetiche                            | |
| | descrizione breve                          | |
| +--------------------------------------------+ |
|                                                |
| Mission Card                                   |
| +--------------------------------------------+ |
| | ...                                        | |
| +--------------------------------------------+ |
+--------------------------------------------------+
```

Regole UI:

- la lista missioni scorre verticalmente;
- il filtro e' rapido, non nascosto in menu profondo;
- data e titolo devono essere leggibili subito;
- l'immagine missione aiuta la scansione ma non puo' nascondere i dati;
- ogni card missione e' tappabile per entrare nel dettaglio.

Stati da prevedere:

- nessuna missione per filtro selezionato;
- missioni presenti;
- utente non ancora joinato;
- join pending;
- accesso negato;
- campagna chiusa.

## 5. Wireframe: Mission Detail + Chat

Route candidata:

- `homepage/:realmCode/site/campaigns/:campaignSlug/missions/:missionId`

Scopo:

- mostrare il dettaglio missione;
- permettere prenotazione;
- mantenere il contesto conversazionale.

### Desktop / tablet largo

```text
+-----------------------------------------------------------------------+
| [Logo] [Landing] [Shop Info] [Campagna 1] [Campagna 2] [U]           |
+-----------------------------------------------------------------------+
| Mission Hero + Booking                                                |
|                                                                       |
| +-----------------------------------------+  +----------------------+ |
| | mission hero image                      |  | PRENOTATI / POSTI    | |
| |                                         |  |                      | |
| | titolo missione                         |  | [Prenota posto]      | |
| | data, tier, luogo                       |  | [Vai in panchina]    | |
| |                                         |  |                      | |
| | descrizione breve                       |  | elenco prenotati     | |
| +-----------------------------------------+  | elenco panchina      | |
|                                              +----------------------+ |
+-----------------------------------------------------------------------+
| Mission Info Strip                                                    |
| [badge data] [titolo breve] [meta] [share opzionale]                 |
+-----------------------------------------------------------------------+
| Chat Panel                                                            |
| +-------------------------------------------------------------------+ |
| | input messaggio............................................. [Inv]| |
| +-------------------------------------------------------------------+ |
| | messaggio 1                                                       | |
| | messaggio 2                                                       | |
| | messaggio 3                                                       | |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

### Mobile

```text
+--------------------------------------------------+
| [Logo] [Tab Scroll Area.....................] [U]|
+--------------------------------------------------+
| Mission Hero                                    |
| +--------------------------------------------+  |
| | cover / hero image                         |  |
| +--------------------------------------------+  |
| | titolo missione                            |  |
| | data / luogo / tier                        |  |
| | descrizione breve                          |  |
| +--------------------------------------------+  |
+--------------------------------------------------+
| Booking Box                                     |
| +--------------------------------------------+  |
| | PRENOTATI / POSTI                          |  |
| | [Prenota posto]                            |  |
| | [Vai in panchina]                          |  |
| | elenco prenotati sintetico                 |  |
| +--------------------------------------------+  |
+--------------------------------------------------+
| Chat Panel                                      |
| +--------------------------------------------+  |
| | input messaggio                        [>] |  |
| +--------------------------------------------+  |
| | feed messaggi                               |  |
| | ...                                         |  |
| +--------------------------------------------+  |
+--------------------------------------------------+
```

Regole UI:

- il blocco prenotazione deve stare above the fold su mobile o comunque molto vicino all'hero;
- i due ingressi principali sono:
  - prenotati
  - panchina
- chat sotto il contenuto missione, non nascosta dietro tab terziaria;
- il feed messaggi puo' diventare alto, quindi va gestito con area scroll dedicata.

Stati da prevedere:

- utente non prenotato;
- utente prenotato come titolare;
- utente prenotato come panchina;
- missione piena;
- prenotazione chiusa;
- chat vuota;
- chat attiva.

## 6. Gerarchia delle informazioni

Ordine di priorita' visiva per schermata:

### Shop Info

1. titolo sezione
2. testo informativo
3. background configurabile
4. CTA secondarie eventuali

### Campaign Mission Board

1. filtri temporali
2. data missione
3. titolo missione
4. info sintetiche
5. cover visuale

### Mission Detail

1. titolo missione
2. data e contesto
3. prenotazione
4. descrizione breve
5. chat

## 7. Decisioni UI già implicite

Da questo wireframe derivano già alcune scelte:

- `Shop Info` non e' una landing marketing classica;
- la tab campagna porta a una vista operativa, non a una pagina vetrina;
- il dettaglio missione unisce contenuto, prenotazione e chat nella stessa esperienza;
- la UI deve reggere bene sia con immagini forti sia con contenuti piu' sobri.

## 8. Prossimo passo

Il prossimo passo naturale e' uno di questi:

1. tradurre questo documento in wireframe grafico statico;
2. implementare direttamente uno scaffold low-fi React con dati mock.

Dato il livello di dettaglio raggiunto, a questo punto lo scaffold React e' gia' fattibile.
