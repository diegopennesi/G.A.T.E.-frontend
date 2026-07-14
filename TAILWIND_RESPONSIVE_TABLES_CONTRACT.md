# Tailwind Responsive Tables Contract

## Obiettivo

Ridurre i problemi di usabilita mobile nelle liste/tabella dell'applicativo, eliminando:

- scroll orizzontale per raggiungere azioni o dettagli
- gruppi di bottoni che escono dal contenitore
- badge e pill che lasciano spazi vuoti incoerenti
- comportamenti diversi pagina per pagina senza una regola comune

Il risultato atteso e un pattern unico:

- desktop: tabella classica
- mobile: card/lista verticale
- stessa sorgente dati
- stesse azioni
- stessa logica applicativa

## Perimetro

Questo contratto copre:

- l'inventario delle 13 liste/tabella attuali
- il pattern shared da costruire
- le regole di adozione Tailwind
- l'ordine di migrazione

Non copre:

- refactor completo di tutto `App.css`
- redesign globale dell'app
- migrazione immediata di tutta la UI legacy a Tailwind

## Decisione tecnica

Tailwind diventa lo standard per i nuovi componenti responsive condivisi legati a liste, card, badge group e action row.

Regola di adozione:

- usare Tailwind nei nuovi shared component
- usare Tailwind nelle pagine migrate a quel pattern
- non introdurre utility class sparse su pagine legacy non migrate
- lasciare `App.css` in piedi finche una vista non e davvero migrata

Questa scelta evita un ibrido casuale meta utility e meta CSS globale.

## Stato attuale

Stato blocchi:

- [x] Blocco 1 - Fondazione shared/Tailwind completato
- [x] Blocco 2 - Tabelle ad alto impatto migrate
- [x] Blocco 3 - Tabelle medie migrate
- [x] Blocco 4 - Area admin e chiusura migrate

Nota:

- il Blocco 1 e ora marcato come migrato perche `ResponsiveDataList`, `MobileDataCard`, `KeyValueGrid`, `ActionStack` e `BadgeGroup` sono stati estratti come componenti shared dedicati
- il Blocco 3 e ora marcato come migrato perche i tavoli medi previsti nel perimetro corrente sono stati portati sul pattern responsive shared

Stato avanzamento:

- [x] `Stanze` escluse dal perimetro corrente e modulo `STANZE` non configurabile lato campagne
- [x] setup Tailwind su Vite
- [x] primo componente shared creato: `ResponsiveDataList`
- [x] `Lista Campagne` migrata al pattern responsive shared
- [x] `Missioni - lista principale` riallineata al pattern responsive shared
- [x] `Approvazione accessi` migrata al pattern responsive shared
- [x] `Lista personaggi` migrata al pattern responsive shared
- [x] `Log / notifiche locali` migrata al pattern responsive shared
- [x] `Membri campagna` migrata al pattern responsive shared
- [x] `Sysadmin - utenti piattaforma` migrata al pattern responsive shared
- [x] `Sysadmin - admin realm attivi` migrata al pattern responsive shared
- [x] `Sysadmin - risultati ricerca accesso realm` migrata al pattern responsive shared

## Inventario tabelle

Nota di perimetro aggiornata:

- [x] `Stanze` e fuori scope per questa fase
- [x] il modulo `STANZE` resta disattivato e non configurabile
- [x] la relativa tabella non rientra nella migrazione corrente

### 1. Lista campagne

- File: [src/features/campaigns/pages/CampaignListPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/campaigns/pages/CampaignListPage.tsx)
- Dati: campagna, stato, accesso, avvisi, azioni
- Azioni: ingresso, richiesta accesso, eventuali CTA condizionali
- Complessita: alta
- Target mobile: card con header campagna, stato/accesso in badge, summary breve, action stack in basso
- Stato: [x] migrata

### 2. Gestione campagna - impostazioni

- File: [src/features/campaigns/pages/CampaignManagementPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/campaigns/pages/CampaignManagementPage.tsx)
- Dati: impostazione, descrizione, stato, toggle
- Azioni: toggle
- Complessita: media
- Target mobile: card con descrizione e toggle sempre visibile
- Stato: [x] migrata

### 3. Gestione campagna - moduli

- File: [src/features/campaigns/pages/CampaignManagementPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/campaigns/pages/CampaignManagementPage.tsx)
- Dati: modulo, descrizione, stato, toggle
- Azioni: toggle
- Complessita: media
- Target mobile: stesso pattern della precedente
- Stato: [x] migrata

### 4. Creazione campagna - impostazioni/moduli

- File: [src/features/campaigns/pages/CreateCampaignPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/campaigns/pages/CreateCampaignPage.tsx)
- Dati: impostazione o modulo, descrizione, stato, toggle
- Azioni: toggle
- Complessita: media
- Target mobile: card uniforme con toggle in fondo o a destra, mai fuori contenitore
- Stato: [x] migrata

### 5. Approvazione accessi

- File: [src/features/campaigns/pages/ApprovalPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/campaigns/pages/ApprovalPage.tsx)
- Dati: profilo, username, stato
- Azioni: approva, rifiuta
- Complessita: media
- Target mobile: card con identita in alto e action stack verticale
- Stato: [x] migrata

### 6. Lista personaggi

- File: [src/features/characters/pages/CharacterListPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/characters/pages/CharacterListPage.tsx)
- Dati: personaggio, stato, tipo, campagna, profilo
- Azioni: apertura scheda/modifica
- Complessita: alta
- Target mobile: card con nome, stato, tipo, campagna e CTA primarie visibili
- Stato: [x] migrata

### 7. Log / notifiche locali

- File: [src/features/notifications/pages/NotificationsPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/notifications/pages/NotificationsPage.tsx)
- Dati: ora, livello, messaggio
- Azioni: nessuna
- Complessita: bassa
- Target mobile: card minimale, una per evento
- Stato: [x] migrata

### 8. Membri campagna

- File: [src/features/campaigns/pages/CampaignDetailPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/campaigns/pages/CampaignDetailPage.tsx)
- Dati: membro, ruolo, stato, iscrizione
- Azioni: apertura profilo membro
- Complessita: media
- Target mobile: card con badge ruolo/stato e dettaglio iscrizione
- Stato: [x] migrata

### 9. Missioni - partecipanti

- File: [src/features/missions/pages/MissionsPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/missions/pages/MissionsPage.tsx)
- Dati: giocatore, personaggio, ingresso, iscrizione
- Azioni: nessuna
- Complessita: media
- Target mobile: lista partecipanti compatta dentro il dettaglio missione
- Stato: [x] migrata

### 10. Missioni - lista principale

- File: [src/features/missions/pages/MissionsPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/missions/pages/MissionsPage.tsx)
- Dati: missione, sessione, campagna, modulo, stato, ruolo
- Azioni: chat, dettaglio
- Complessita: alta
- Stato: [x] migrata sul componente shared
- Target finale: refinements visuali e riuso dello stesso pattern sulle altre tabelle

### 11. Sysadmin - utenti piattaforma

- File: [src/App.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/App.tsx)
- Dati: username, profilo, ruolo globale, stato
- Azioni: modifica draft, salva
- Complessita: alta
- Target mobile: card con campi form stacked e CTA salva sempre visibile
- Stato: [x] migrata

### 12. Sysadmin - admin realm attivi

- File: [src/App.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/App.tsx)
- Dati: profilo, username, ruolo realm, update
- Azioni: cambio ruolo, salva
- Complessita: alta
- Target mobile: card con select e bottone salvataggio in basso
- Stato: [x] migrata

### 13. Sysadmin - risultati ricerca accesso realm

- File: [src/App.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/App.tsx)
- Dati: profilo, username, ruolo globale, ruolo realm
- Azioni: assegna/aggiorna privilegi
- Complessita: alta
- Target mobile: card con stato corrente e azione principale ben separata
- Stato: [x] migrata

## Componenti shared da realizzare

### 1. `ResponsiveDataList`

Componente contenitore shared.

Responsabilita:

- render desktop via tabella
- render mobile via lista card
- usare lo stesso array di `rows`
- usare la stessa `getRowKey`
- lasciare alle pagine la definizione dei contenuti

Contratto minimo:

- `rows`
- `columns`
- `getRowKey`
- `emptyMessage`
- `desktopRow`
- `mobileCard`
- `sortBy`
- `sortDirection`
- `onSortChange`

Stato:

- [x] implementato

### 2. `MobileDataCard`

Componente base della card mobile.

Responsabilita:

- header con titolo e badge/pill
- area contenuti in griglia 1 o 2 colonne
- footer azioni

Stato:

- [x] implementato

### 3. `KeyValueGrid`

Per righe tipo:

- Sessione / valore
- Campagna / valore
- Stato / valore

Regola:

- 2 colonne su telefoni standard
- 1 colonna solo quando lo spazio reale non basta

Stato:

- [x] implementato

### 4. `ActionStack`

Per gestire in modo coerente:

- bottoni in colonna
- bottoni in wrap
- bottoni full width dove serve

Questo componente serve a chiudere il problema gia emerso dei bottoni che escono dal contenitore.

Stato:

- [x] implementato

### 5. `BadgeGroup`

Per raggruppare:

- stato
- count
- ruolo
- pill informative

Regola:

- mai `space-between` su mobile se genera vuoti innaturali
- il gruppo deve riempire da sinistra e andare a capo in modo prevedibile

Stato:

- [x] implementato

## Regole UI obbligatorie

### Mobile

- nessuna tabella con scroll orizzontale come esperienza primaria
- nessuna azione importante fuori viewport
- nessun click implicito sulla riga se c'e gia un bottone esplicito
- bottoni primari e secondari sempre leggibili e tappabili
- i gruppi azioni devono stackare o wrapparsi, mai uscire dal contenitore
- testo e badge non devono schiacciare le CTA

### Desktop

- non cambiare il comportamento attuale se non necessario
- la tabella resta il rendering principale
- la migrazione non deve peggiorare scansione e densita informativa

## Regole Tailwind

### Consentito

- Tailwind nei nuovi shared component responsive
- Tailwind nelle pagine migrate a quel pattern
- utility per layout, spacing, responsive, grid, flex, typography e states

### Non consentito

- utility casuali infilate dentro pagine legacy non migrate
- nuova UI duplicata sia in Tailwind sia in `App.css`
- logiche responsive importanti lasciate a classi globali non riusabili

### Regola di convivenza

- `App.css` resta per il legacy
- il nuovo shared layer nasce in Tailwind
- quando una pagina viene migrata, il mobile di quella pagina deve dipendere dal shared layer, non da CSS ad hoc locale

## Ordine di migrazione

### Fase 1 - fondazione

- [x] setup Tailwind nel progetto
- [x] creazione `ResponsiveDataList`
- [x] creazione `MobileDataCard`
- [x] creazione `KeyValueGrid`
- [x] creazione `ActionStack`
- [x] creazione `BadgeGroup`

### Fase 2 - tavoli ad alto impatto utente

- [x] Lista campagne
- [x] Missioni - lista principale
- [x] Approvazione accessi
- [x] Lista personaggi

### Fase 3 - tavoli medi

- [x] Membri campagna
- [x] Missioni - partecipanti
- [x] Gestione campagna - impostazioni
- [x] Gestione campagna - moduli
- [x] Creazione campagna - impostazioni/moduli

### Fase 4 - area admin e chiusura

- [x] Sysadmin - utenti piattaforma
- [x] Sysadmin - admin realm attivi
- [x] Sysadmin - risultati ricerca accesso realm
- [x] Log / notifiche locali

## Criteri di accettazione

Una tabella si considera migrata solo se:

- desktop invariato o migliorato
- mobile senza scroll orizzontale
- azioni sempre raggiungibili
- nessun bottone esce dal contenitore
- dati principali leggibili senza entrare nel dettaglio
- stessa logica applicativa del desktop
- stessa sorgente dati del desktop
- build verde

## Vincoli di implementazione

- non cambiare contratti BE per questa attivita
- non riscrivere pagine intere se basta estrarre il rendering list/card
- non introdurre effetti collaterali sul layer TanStack/cache
- non mescolare refactor logico e refactor visuale nello stesso passaggio se non necessario

## Deliverable attesi

### Deliverable 1

Setup Tailwind completo e funzionante nel frontend.

### Deliverable 2

Nuovo shared layer responsive per liste/tabella.

### Deliverable 3

Migrazione delle 12 tabelle effettivamente incluse nel perimetro corrente.

### Deliverable 4

Pulizia mirata delle classi legacy che diventano morte dopo la migrazione.

## Nota finale

La pagina Missioni oggi rappresenta il caso piu vicino al comportamento desiderato, ma non e ancora il componente shared finale.

La direzione corretta e:

- non copiare il custom di Missioni in altre pagine
- estrarre il pattern
- migrare tutte le tabelle sullo stesso contratto
