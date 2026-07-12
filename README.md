# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Campaign UX flows

### Aggiornamento 2026-07-12

- La sidebar è stata semplificata: rimosso il profilo in alto a sinistra e rimosso il blocco del realm nella parte alta.
- Le informazioni del realm di login sono state spostate in basso, sopra il toggle tema, con icona dedicata.
- Il vecchio `Exit` è stato trasformato in `Cambia campagna`.
- Il cambio campagna ora segue un flusso unico: si esce dal contesto corrente, si atterra su `Ingresso`, poi la selezione della nuova campagna completa l'uscita dalla precedente e l'ingresso nella nuova.
- Il flusso di landing continua a distinguere tra campagne già approvate, campagne ad accesso automatico e campagne con richiesta manuale.
- I pulsanti principali della landing sono pieni, con icone esplicite e coerenza visiva tra le azioni.
- Il dropdown delle campagne è stato reso più compatto e leggibile, con padding corretto sul testo selezionato.
- Il refresh dinamico della landing via SSE è stato rimosso: l'aggiornamento della lista campagne avviene su ricarica esplicita della pagina o su azioni deliberate dell'utente.

### Regole di navigazione

- Una campagna è sempre o inattiva oppure attiva in modo esplicito nella shell.
- `Scheda Campagna` e `Gestione Campagna` possono aprire il selettore campagne quando non esiste una campagna attiva.
- `Stanze` segue la stessa regola: se non esiste una campagna attiva, viene aperto il selettore invece di mostrare una pagina vuota.
- `Missioni` è una vista globale di ricerca/ingresso sulle campagne approvate; la creazione resta disponibile solo dentro la campagna attiva quando il ruolo lo consente.
- In `Lista Campagne`, `Apri e attiva` appare solo per le campagne dove la membership è già approvata; altrimenti l'azione primaria è `Richiedi accesso`, che invia una richiesta gestita poi in `Accessi`.
- Selezionare una campagna attiva porta alla schermata richiesta.
- La campagna attiva è visibile nella shell e può essere cambiata da lì.
- L'uscita campagna apre un modal di conferma.
- L'uscita disattiva il contesto della campagna corrente e ritira l'eventuale personaggio attivo collegato a quella membership.
- Dopo l'uscita, l'app torna alla landing di ingresso e pulisce il workspace della campagna.
- La creazione stanze è disponibile solo a `MASTER` e `SUPER_MASTER`, in linea con la matrice permessi del backend per `CREATE_ROOM`.
- `Approvazione Accessi` carica automaticamente le richieste pending all'ingresso; il menu laterale mostra il badge quando esistono richieste in attesa per la campagna attiva.

### Bug Conosciuti

- Se si tenta di cambiare campagna e si seleziona la medesima campagna, non accade nulla.
- Il numero di chiamate verso il BE resta anomalo in alcuni flussi e può introdurre rallentamenti fisiologici nell'app.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
