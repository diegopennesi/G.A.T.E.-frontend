When changing project dependencies (for example running `npm install <pkg>`), update and commit `package-lock.json` so CI remains reproducible.

Quick steps:

- Run `npm install` or `npm install --package-lock-only` to regenerate the lockfile.
- Commit and push `package-lock.json` to the branch where you changed dependencies.
