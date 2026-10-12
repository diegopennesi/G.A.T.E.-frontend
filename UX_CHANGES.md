# Campagne: ingresso e creazione

L'ingresso mette in evidenza il ritorno alla campagna. La creazione di un nuovo tavolo resta disponibile come azione secondaria quando ci sono campagne; senza campagne torna primaria. Le note di versione sono consultabili dal pulsante Novità, con indicazione di lettura, e non interrompono più automaticamente l'accesso. Il login usa modalità compatte e testi rivolti al giocatore.

La creazione separa nome e sistema obbligatori, accesso al gruppo, storia facoltativa e moduli opzionali. Tutte le impostazioni precedenti restano disponibili; i dettagli si espandono nello stesso form. Il nome parte vuoto, è obbligatorio e rispetta il limite backend di 200 caratteri. Il riassunto mantiene il limite di 280 caratteri.

La bozza viene conservata in sessionStorage, separata per utente e reame, durante la sessione del browser e rimossa dopo una creazione riuscita. Uscita e reload mantengono i valori, compresa la disattivazione di tutti i moduli opzionali. Nessuna password o credenziale entra nella bozza. Se il browser impedisce il salvataggio, l'uscita segnala il problema e consente di copiare i testi o uscire comunque.

Una richiesta fallita mantiene il form con errore locale. Una creazione riuscita conduce alla scheda campagna anche se il refresh degli elenchi fallisce, evitando che un errore di lettura suggerisca una seconda creazione.

L'intervento conserva palette e componenti dell'app. Copre i punti 4 e 5 dell'audit: semplificazione della creazione e gerarchia/copy dell'ingresso.

## Navigazione e missioni

Il menu distingue tavolo, gestione e account. Creazione campagna, creazione personaggio e modifica profilo restano accessibili in Altre azioni, espandibile da tastiera e aperto quando contiene la schermata corrente. Permessi e moduli continuano a determinare le voci disponibili. Cambia campagna usa lo stile delle azioni secondarie.

Il form missione separa avventura, date e gruppo. Capienza e quorum hanno controlli numerici con valore vuoto consentito; livelli e automatismi restano nelle opzioni espandibili. Titolo obbligatorio, limiti numerici, ordine delle date e coerenza di livelli/quorum vengono verificati prima dell'invio. Ricerca e risultati sono nascosti durante la creazione. Tornare all'elenco e riaprire il form conserva la bozza finché si rimane nella schermata Missioni; non è una persistenza dopo reload o cambio schermata.

Verifica: suite UI locale con risposte API controllate, test cache, compilazione TypeScript e build Vite. Il collaudo completo con PostgreSQL, Redis e backend reali resta distinto dai test UI.

## Scheda campagna: orientamento del tavolo

La scheda porta in primo piano personaggi, gestione, fino a tre prossime missioni ordinate per data e gruppo. Esclude missioni annullate, completate e sessioni passate; le missioni senza data arrivano dopo quelle programmate. Le date includono l'ora locale del browser. Il modulo Missioni deve essere attivo e l'utente approvato nella campagna attiva per vedere il riepilogo. La lettura usa le API esistenti e la cache condivisa, con aggiornamento e riprova locali; un errore di refresh conserva le righe già disponibili.

Il gruppo è consultabile dai membri approvati; le azioni sui singoli membri restano vincolate al permesso di gestione. Sono inclusi anche master e giocatori senza personaggio, prima esclusi dal filtro. Ricerca e filtri sono espandibili da tastiera. Storia, regole e strumenti restano sotto, in una sezione espandibile. Adesione e chiusura sono separate dalle azioni quotidiane: la disattivazione conserva la conferma del nome e usa un dialogo con focus protetto, stato di invio e recupero dall'errore.

Verifica aggiuntiva: missioni ordinate e filtrate, gruppo senza personaggi, ricerca, link a missioni/personaggi, permessi giocatore, modulo disabilitato, refresh fallito e riprova, conferma di disattivazione e tastiera. Layout controllato a 320, 390 e 1280 px nei temi chiaro e scuro. I test usano API simulate su localhost; nessuna modifica backend in questo step.

## Personaggi: elenco e apertura scheda

L’elenco dà priorità a ricerca e filtro Solo i miei. Tipo e stato restano selezionabili insieme nei filtri espandibili; l’ordinamento per nome/campagna è disponibile anche su mobile. Gli stati sono in italiano e i personaggi senza stato non spariscono dall’elenco. I propri personaggi sono riconoscibili dal profilo. L’apertura della scheda usa un’unica azione: nome cliccabile nella tabella, pulsante esplicito su mobile; spariscono le matite duplicate e il testo segnaposto no nickname.

Crea personaggio rispetta la campagna attiva, il limite di un PG attivo e i permessi NPC. Lo stato vuoto distingue assenza di personaggi da filtri senza risultati. L’aggiornamento blocca invii ripetuti, conserva risultati e filtri se una campagna non risponde, mostra l’errore e consente di riprovare. I risultati dell’elenco sono separati dal caricamento della campagna e identificati per utente, reame e ruoli, evitando che letture parallele sovrascrivano la selezione dei personaggi consultabili. La prima lettura fallita mostra recupero dall’errore, non un falso elenco vuoto.

Verifica: ricerca/possessore/ordinamento, apertura della scheda corretta, limiti giocatore, filtro stato da tastiera, refresh fallito e riprova, prima lettura fallita, layout con nomi lunghi a 320/390/1280 px nei temi chiaro e scuro. API simulate su localhost; backend e editor della scheda non modificati in questo step.

## Creazione personaggio con Taste

Workflow usato: Taste entry-taste, con frontend-ui-engineering per la schermata operativa; si conserva il sistema visivo già approvato. Nome vuoto e obbligatorio in primo piano, campagna indicata, scelta PG/NPC con radio native e spiegazioni dei limiti. Soprannome e indirizzo del ritratto sono facoltativi ed espandibili. I campi rispettano i limiti backend esistenti (120/120/500 caratteri); l’indirizzo immagine usa validazione URL nativa, anche quando la sezione è chiusa.

La bozza in sessionStorage è separata per reame, utente e campagna; ritorno e reload conservano i valori, la creazione riuscita la rimuove. L’invio è asincrono: campi e pulsanti si bloccano durante la richiesta, una richiesta fallita mantiene il form e rende possibile riprovare. Una creazione riuscita porta all’elenco anche se la sua rilettura fallisce. Se il browser impedisce il salvataggio della bozza, l’uscita mantiene il form con istruzione di copia e azione esplicita per uscire senza salvare.

Test UI su localhost con API simulate: bozza, validazione, errori e invio, PG/NPC per master e giocatori, tastiera, separazione delle bozze e memoria browser non disponibile. Layout verificato nei temi chiaro/scuro a 320, 390, 768, 1024 e 1440 px. Nessuna dipendenza o modifica backend aggiunta.

## Scheda personaggio con Taste

Identità, soprannome, proprietario e campagna aprono la scheda. I dati di gioco hanno priorità rispetto al cambio di stato, spostato in una sezione espandibile con stati in italiano e permessi di riattivazione/decesso invariati. Una sola azione aggiorna la scheda tramite una lettura effettiva delle API. Template mancanti, sola lettura, personaggio non attivo e approvazione in attesa hanno testi specifici.

I campi dei template hanno etichette collegate, istruzioni accessibili e validazione nativa dei campi obbligatori e dei limiti numerici. I modificatori DND continuano a seguire la bozza delle caratteristiche. L'editor segnala modifiche non salvate, blocca richieste parallele e conserva la bozza durante gli errori. Il ritorno tramite Torna ai personaggi e lo scarto della bozza richiedono una conferma quando ci sono modifiche; il browser segnala anche uscita/reload. La bozza vive nella pagina aperta, senza persistenza dopo reload o navigazione dalle altre voci del menu.

Le riletture conservano le modifiche in corso; se arriva una versione server diversa, il salvataggio si blocca per evitare di sovrascriverla e offre lo scarto esplicito della bozza. Il salvataggio già accettato dal backend rimane un successo anche se la rilettura fallisce. Revisioni in attesa visibili, note conservate durante gli errori, azioni in italiano e storico espandibile; una revisione confermata non offre un secondo invio quando la rilettura successiva non è disponibile.

Verifica: template con testo, selezioni, numeri, checkbox e tag; validazione numerica, modificatori, errori di salvataggio/rilettura, conferma di scarto, ruoli e sola lettura, approvazione con nota, cambio stato e tastiera. Layout a 320/390/768/1024/1440 px nei temi chiaro/scuro. Test su localhost con API simulate; backend non modificato.

## Gestione, profilo e flussi restanti — 12 ottobre 2026

Gestione campagna separa impostazioni, storia, moduli/regole, inviti e trasferimento della proprietà. Il form indica le modifiche in attesa, conserva i valori dopo errori e rimane aperto dopo il salvataggio. La modifica di un modulo mantiene anche quelli già attivi che il catalogo non mostra. Gli inviti hanno validazione di scadenza/utilizzi, copia del codice e recupero dagli errori.

Accessi e profilo membro mostrano azioni asincrone, conferme per rifiuto/sospensione/ban, motivo della moderazione e risultati leggibili. Una scrittura confermata resta riuscita quando fallisce soltanto la rilettura. Le protezioni frontend aspettano che appartenenze e contesto campagna siano caricati prima di reindirizzare; le autorizzazioni restano verificate dalle API.

Profilo e password usano form distinti: campi facoltativi espandibili, conferma della password, blocco delle richieste parallele e valori conservati durante gli errori. Le stanze hanno nome vuoto obbligatorio, tipo in italiano e limiti numerici per durata/attesa. Attività recenti filtra gli esiti e spiega che il registro vive nella sessione della pagina.

Il dettaglio missione mette in evidenza titolo, date, partecipanti e scelta titolare/panchina. Chat, autori e descrizione usano colori coerenti e leggibili nei due temi. I link diretti aprono il riepilogo; una notifica realtime aggiorna la missione senza chiudere riepilogo o chat.

La protezione delle modifiche non salvate ora copre menu, breadcrumb, cambio campagna e logout per editor scheda, gestione, profilo, missione e messaggio chat. Durante una richiesta attende il completamento. Uscita/reload mantengono l'avviso del browser; i dati non salvati non diventano bozze persistenti.

Questo intervento modifica presentazione, flussi e codice frontend. Nel backend corregge il wrapper Maven Windows e il suo bootstrap, per eseguire il progetto anche da una nuova copia senza Maven globale. Nessuna modifica alle regole di gioco o agli endpoint backend.

Verifica: 49 test UI, 27 contratti cache/realtime, build TypeScript/Vite; 133 test backend. Aggiunto un collaudo browser con API reali e PostgreSQL isolato: campagne, inviti, approvazione, sospensione/ripristino, divieto di modifica per giocatore, stanze, PG, iscrizione missione, chat, profilo e cambio password. Layout dei nuovi flussi a 320/390/768/1440 px nei due temi, più schermate reali di missione mobile/chat desktop. Dettagli e comandi in LOCAL_VALIDATION.md.
