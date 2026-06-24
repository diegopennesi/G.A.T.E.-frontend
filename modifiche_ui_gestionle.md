# Piano di Ottimizzazione UI e UX - Gestionale Campagne

Questo documento mappa in modo dettagliato tutte le modifiche strutturali, funzionali ed estetiche concordate per ottimizzare l'interfaccia utente (UI) e l'esperienza utente (UX) del gestionale, prendendo come riferimento la schermata intera dell'applicazione.

---

## 1. Architettura dell'Informazione e Navigazione (Sidebar Sinistra)

### Problema Attuale
* **Ridondanza dei controlli:** Molte voci della sidebar ("Missioni", "Stanze", "Notifiche", "Seleziona PG") sono duplicate all'interno del corpo della pagina centrale.
* **Layout asimmetrico e ingombrante:** La sezione "Strumenti" in basso utilizza pulsanti molto alti disposti su due colonne asimmetriche, che rubano spazio prezioso e limitano la scalabilità futura dell'applicazione.

### Modifiche da Effettuare
1. **Unificazione in Colonna Singola:** Trasformare l'intera sidebar in un elenco verticale a colonna singola e pulita.
2. **Standardizzazione dei Pulsanti:** Tutti i pulsanti (sia in "Essenziali" che in "Strumenti") devono avere la stessa altezza, un'allineatura geometrica a sinistra e un'icona coerente accanto al testo.
3. **Rimozione dei Pulsanti Doppi nel Contenuto:** Sfruttare la sidebar come unico punto di navigazione globale dell'app, eliminando i bottoni di reindirizzamento dal corpo centrale.
4. **Badge di Notifica Integrato:** Sostituire il testo o i blocchi separati per le notifiche con un micro-badge numerico o un punto colorato (es. rosso o arancione) direttamente accanto alla voce "Notifiche" nella sidebar.

---

## 2. Unificazione della Topbar e degli Header

### Problema Attuale
* **Frammentazione verticale:** Sono presenti 3 livelli verticali di intestazioni (Breadcrumb in alto, Titolo principale "Scheda Campagna" subito sotto, e una terza fascia contenente il tasto "Reload" e lo stato "ATTIVA"). Questo spinge il contenuto utile verso il basso.

### Modifiche da Effettuare
1. **Unificazione della Barra Superiore:** Creare una sola Topbar orizzontale che attraversa l'intera larghezza della pagina (escludendo la sidebar).
2. **Spostamento della Navigazione e Titolo:** Posizionare a sinistra della Topbar il percorso di navigazione (Breadcrumb) nella forma compatta `Campagne / Nuova Campagna`, seguito dal titolo della vista corrente (`Scheda Campagna`) e dal relativo tag `GENERIC_TABLE`.
3. **Raggruppamento delle Azioni Globali:** Spostare sul lato destro della Topbar, in un'unica riga orizzontale, i seguenti elementi:
   * Pulsante **Reload** (icona + testo compatto, stile desaturato).
   * Badge di stato **Stato campagna: ATTIVA** (sfondo verde scuro, testo verde brillante).
   * Pulsante di uscita **Exit / Nuova Campagna** (allineato all'estrema destra).

---

## 3. Ottimizzazione del Corpo Centrale (Rimozione Ridondanze)

### Problema Attuale
* **Spreco di spazio verticale:** Le sezioni "Addon campagna" e "Gestione Campagna" occupano circa il 35% dello schermo per ospitare pulsanti che sono già presenti (o dovrebbero risiedere) nella sidebar.

### Modifiche da Effettuare
1. **Eliminazione dei Blocchi "Addon" e "Gestione":** Rimuovere interamente queste due righe di pulsanti dal corpo della pagina.
2. **Focalizzazione sul Contenuto Principale:** Il corpo della pagina deve aprirsi direttamente con la sezione **Membri Campagna**, portando i dati core visibili all'utente senza necessità di fare scrolling.

---

## 4. Ristrutturazione della Sezione Filtri

### Problema Attuale
* **Affollamento visivo causato dai tag espansi:** Tutti gli stati membro (`APPROVED`, `PENDING`, `BLOCKED`, ecc.) e tutti i gradi (`GIOCATORE`, `CO_MASTER`, ecc.) sono mostrati come bottoni gialli separati ed espansi sul layout. Questo genera disordine visivo e non è scalabile se si aggiungono nuovi ruoli o stati.
* **Testo descrittivo prolisso:** Il testo di aiuto occupa spazio senza aggiungere reale valore operativo continuo.

### Modifiche da Effettuare
1. **Sostituzione con Dropdown Multi-selezione:** Sostituire la riga dei tag gialli di "Stato membro" e "Grado" con due menu a tendina (dropdown) compatti, posizionati sulla stessa linea orizzontale della barra di ricerca.
2. **Layout in Linea Singola:** La sezione filtri deve diventare un'unica riga super compatta contenente:
   * Campo di ricerca testuale (`Cerca membro per nome... es. Sandro`).
   * Menu a tendina per lo **Stato** (con placeholder es. `Stato: Tutti`).
   * Menu a tendina per il **Grado** (con placeholder es. `Grado: Tutti`).
3. **Semplificazione dei Testi:** Ridurre o eliminare la descrizione ("Un solo pannello per ricerca..."), lasciando solo una label o un placeholder intuitivo nel campo di ricerca.
4. **Rimozione Informazioni Ridondanti:** Eliminare i piccoli badge fissi "Stato: 5" e "Gradi: 4" posizionati a destra, in quanto l'informazione numerica è implicita nei dropdown.

---

## 5. Visualizzazione Dati (Tabella Membri)

### Problema Attuale
* **Mancanza di struttura:** I membri sono elencati in blocchi orizzontali minimalisti che mancano di una vera e propria griglia o struttura tabellare leggibile a colpo d'occhio.

### Modifiche da Effettuare
1. **Implementazione di una Tabella Standard:** Creare una struttura tabellare pulita con intestazioni di colonna chiare: `Nome Membro`, `Grado`, `Stato`, `Azioni`.
2. **Allineamento e Spazi:** * Il nome del membro va allineato a sinistra.
   * I badge relativi a Grado e Stato vanno posizionati nelle rispettive colonne centrali/destre per mantenere l'allineamento verticale tra le diverse righe.
3. **Design dei Badge (Coerenza Cromatica):**
   * **Grado:** Utilizzare badge con tonalità neutre e desaturate (es. grigio scuro o blu notte) per non appesantire l'interfaccia (es. `SUPER_MASTER`, `CO_MASTER`, `GIOCATORE`).
   * **Stato:** Utilizzare colori semantici chiari e brillanti per lo stato operativo (es. Verde brillante per `ACTIVE` / `APPROVED`, Giallo/Ambra per `PENDING`, Rosso per `BLOCKED` / `BANNED`).
4. **Aggiunta della Colonna Azioni:** Inserire un'ultima colonna a destra con micro-icone (es. tre puntini per il menu contestuale, o icone di modifica/ban) per permettere la gestione rapida del singolo utente senza uscire dalla schermata.
