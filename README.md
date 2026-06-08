# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Campaign UX flows

- A campaign is always either inactive or explicitly active in the shell.
- `Scheda Campagna` and `Gestione Campagna` can open a campaign picker when no campaign is active.
- `Stanze` follows the same rule: if no campaign is active, the picker opens instead of showing a dead page.
- `Missioni` is a global search/join view across all approved campaigns; creation stays available only inside the active campaign when the role allows it.
- In `Lista Campagne`, `Apri e attiva` appears only for campaigns where membership is already approved; otherwise the primary action is `Richiedi accesso`, which submits a join request that an admin will later handle in `Accessi`.
- Picking a campaign activates it and redirects to the requested screen.
- The active campaign is visible in the toolbar and can be changed from there.
- Leaving a campaign opens a confirmation modal.
- Leaving detaches the current campaign context from the profile and retires the active character tied to that membership.
- After leave, the app returns to `Lista Campagne` and clears the campaign workspace.
- Room creation is available only to `MASTER` and `SUPER_MASTER`, matching the backend permission matrix for `CREATE_ROOM`.
- `Approvazione Accessi` loads the pending requests automatically on entry; the sidebar menu shows a badge when there are pending requests for the active campaign.

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
