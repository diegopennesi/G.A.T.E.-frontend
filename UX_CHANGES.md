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
