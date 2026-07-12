# Fix Deploy - emnapi

## Problema
Il `package-lock.json` è fuori sync con il `package.json`. Railway non riesce a installare le dipendenze e il deploy fallisce.

Mancano queste dipendenze nel lock file:
- `@emnapi/core@1.11.2` e `1.11.1`
- `@emnapi/runtime@1.11.2` e `1.11.1`

## Soluzione

### Step 1: Clona la repo
```bash
git clone https://github.com/diegopennesi/G.A.T.E.-frontend.git
cd G.A.T.E.-frontend
```

### Step 2: Checkout del branch
```bash
git checkout Fix-deploy-emnapi
```

### Step 3: Esegui npm install (IMPORTANTE!)
```bash
npm install
```

Questo aggiornerà il `package-lock.json` e sincronizzerà le dipendenze.

### Step 4: Verifica che il lock file sia cambiato
```bash
git status
```

Dovresti vedere `package-lock.json` come modificato.

### Step 5: Fai push
```bash
git add package-lock.json
git commit -m "Update lock file - fix emnapi deps"
git push origin Fix-deploy-emnapi
```

### Step 6: Merge su dev (opzionale)
Puoi fare un PR da `Fix-deploy-emnapi` a `dev`, o fare direttamente:
```bash
git checkout dev
git merge Fix-deploy-emnapi
git push origin dev
```

## Risultato
Railway leggerà il `package-lock.json` aggiornato e potrà deployare correttamente! 🚀
