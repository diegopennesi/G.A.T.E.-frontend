# Verifica frontend in localhost

Prerequisiti: versione Node indicata in `.nvmrc`, dipendenze con `npm ci`, Google Chrome installato (usato dalla suite UI). Nessun ambiente remoto è necessario.

```powershell
npm ci
npm run build
npm run test:ui
```

`test:ui` avvia e arresta Vite su `http://127.0.0.1:5176`. Usa il frontend reale e risposte API controllate: non crea account, campagne o messaggi nel backend. Copre login desktop/mobile, landing a 320/390/768/1280 px in tema chiaro/scuro, focus del menu, selettore reami e conservazione delle bozze dopo errori di creazione/modifica missione e invio chat. Verifica anche il caso POST chat riuscito e successivo aggiornamento GET fallito, per evitare un invio duplicato. Trace degli errori e schermate in `ui-test-results/`.

La suite copre anche la creazione campagna: campi facoltativi espandibili da tastiera, bozza mantenuta dopo uscita e reload, selezione vuota dei moduli opzionali, validazione nome/URL, errore API e retry. Verifica che la creazione riuscita non richieda un secondo invio se fallisce solo il caricamento degli elenchi. Le novità si aprono su richiesta e restituiscono il focus alla chiusura.

Per le missioni verifica titolo obbligatorio, ordine delle date, quorum rispetto alla capienza, range dei livelli, payload e ritorno alla bozza. Per la navigazione verifica Altre azioni da tastiera, indicazione della schermata corrente e assenza delle voci riservate ai master quando il membro è un giocatore.

Per verificare manualmente con il backend reale, avvia PostgreSQL e Redis della configurazione locale del backend, poi dalla sua repository:

```powershell
./mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

Dal frontend:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

Apri `http://127.0.0.1:5173/homepage/gate/login`. Il frontend usa per default `http://localhost:8080/api/v1`; il profilo locale del backend accetta gli origin localhost. I test UI automatici non sostituiscono un collaudo completo con il database reale.

## Collaudo automatico con API e PostgreSQL reali

`npm run test:local` è separato dalla suite con risposte simulate. Crea utenti/campagne di test e scrive sul backend: avvialo soltanto con il database isolato. Non usa account personali o dati della normale installazione locale.

Configurazione verificata il 12 ottobre 2026:

| Servizio | Indirizzo / configurazione |
|---|---|
| PostgreSQL 18 | `127.0.0.1:55432`, database `gate_ux_validation` |
| Spring Boot | profilo `local`, porta `8081` |
| Frontend Playwright | `127.0.0.1:5180`, avvio/arresto automatici |
| API frontend | `http://127.0.0.1:8081/api/v1` |

Il cluster separato è stato inizializzato nel workspace `../local-validation/postgres-data` e conserva solo dati di collaudo. Le 38 migrazioni Flyway sono state applicate su PostgreSQL reale. Il database preesistente su 5432 non è stato modificato. Redis non era avviato: i flussi verificati non lo richiedono; questo collaudo non verifica funzionalità dipendenti da Redis.

Per riavviare il cluster già preparato su questo PC, dalla directory padre del frontend:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D "$PWD/local-validation/postgres-data" -l "$PWD/local-validation/postgres.log" -o '-h 127.0.0.1 -p 55432' start
```

Poi dalla repository backend (lascia aperto questo terminale):

```powershell
./mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local' '-Dspring-boot.run.arguments=--server.port=8081 --spring.datasource.url=jdbc:postgresql://127.0.0.1:55432/gate_ux_validation'
```

Da un altro terminale, nella repository frontend:

```powershell
npm run test:local
```

Il test usa API reali per predisporre utenti, campagna, PG e missione, poi il browser per salvare impostazioni, generare un invito, approvare il giocatore, sospenderlo/ripristinarlo, creare una stanza, iscriversi alla missione, inviare un messaggio, aggiornare il profilo e cambiare password. Verifica anche un `403` quando il giocatore prova a modificare la campagna e assenza di errori JavaScript. Non simula né intercetta le API. Trace disabilitati per evitare di salvare credenziali e token delle richieste reali. Schermate in `local-test-results/screenshots/`.

Al termine arresta il backend con Ctrl+C; dalla directory padre del frontend arresta solo questo cluster:

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D "$PWD/local-validation/postgres-data" stop
```

Risultati finali: 49 test UI con API controllate, 27 contratti cache/realtime, collaudo reale riuscito, build TypeScript/Vite; backend `./mvnw.cmd test -B -ntp`: 133 test riusciti. Nessun nuovo errore ESLint nei sorgenti modificati; gli errori preesistenti di App e degli hook legacy restano fuori da questa revisione. Rimane il warning Vite preesistente sulla dimensione del bundle.
