# Verifica frontend in localhost

Prerequisiti: versione Node indicata in `.nvmrc`, dipendenze con `npm ci`, Google Chrome installato (usato dalla suite UI). Nessun ambiente remoto è necessario.

```powershell
npm ci
npm run build
npm run test:ui
```

`test:ui` avvia e arresta Vite su `http://127.0.0.1:5176`. Usa il frontend reale e risposte API controllate: non crea account, campagne o messaggi nel backend. Copre login desktop/mobile, landing a 320/390/768/1280 px in tema chiaro/scuro, focus del menu, selettore reami e conservazione delle bozze dopo errori di creazione/modifica missione e invio chat. Verifica anche il caso POST chat riuscito e successivo aggiornamento GET fallito, per evitare un invio duplicato. Trace degli errori e schermate in `ui-test-results/`.

Per verificare manualmente con il backend reale, avvia PostgreSQL e Redis della configurazione locale del backend, poi dalla sua repository:

```powershell
./mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
```

Dal frontend:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

Apri `http://127.0.0.1:5173/homepage/gate/login`. Il frontend usa per default `http://localhost:8080/api/v1`; il profilo locale del backend accetta gli origin localhost. I test UI automatici non sostituiscono un collaudo completo con il database reale.
