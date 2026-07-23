# Evolutiva tecnica: scheda personaggio D&D 5e con cataloghi controllati e statistiche derivate

Data analisi: 2026-07-23

## Obiettivo

Introdurre una evoluzione della scheda personaggio per campagne con sistema di gioco D&D 5e, con questi vincoli:

- `razza` e `classe` non devono essere testo libero
- i valori disponibili devono essere gestiti lato sistema, idealmente via DB e ruoli `SYSTEM`/admin
- il FE deve mostrare selezioni controllate, non input arbitrari
- il BE deve validare i codici ricevuti e non fidarsi mai del payload del client
- devono essere gestite le 6 caratteristiche base di D&D
- i modificatori (`-1`, `+0`, `+1`, `+2`, ecc.) devono essere derivati dal punteggio, non inseriti manualmente

Questa analisi copre:

- FE: `/home/diego/octo/GATE_frontend_starter/gate/fe`
- BE: `/home/diego/octo/GATE_backend_starter/gate`

## Stato attuale FE

La scheda personaggio oggi e' generica e schema-driven.

Riferimenti principali:

- [src/features/characters/pages/CharacterDetailPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/characters/pages/CharacterDetailPage.tsx:1)
- [src/shared/utils.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/shared/utils.ts:175)
- [src/types/domain.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/types/domain.ts:25)

Comportamento attuale:

- il FE legge `schemaJson.blocks`
- ogni blocco contiene una lista di `fields`
- ogni campo viene renderizzato in base al tipo (`text`, `textarea`, `number`, `boolean`, `select`, `tags`)
- i dati vengono salvati in `dataJson`
- il modello attuale usa path flat del tipo `blocco.campo`

Esempio attuale coerente con quanto si vede anche da UI:

- `identity.race`
- `identity.class`
- `progression.level`
- `combat.hitPoints`

Limiti attuali FE:

- manca un concetto di `readOnly`
- mancano metadati come `min`, `max`, `step`
- manca un concetto di `optionsSource` per agganciare un catalogo lato sistema
- non esiste un renderer dedicato per blocchi con campi derivati, come le 6 caratteristiche con modificatori
- il FE puo' gia' mostrare `select`, ma oggi le opzioni sono solo quelle incluse direttamente nello `schemaJson`

## Stato attuale BE dedotto dal contratto FE

Dal contratto FE si ricava che il backend oggi espone:

- `CharacterSheetResponse.schemaJson`
- `CharacterSheetResponse.dataJson`
- `CharacterSheetResponse.sheetTypeCode`
- `CharacterSheetResponse.schemaVersion`
- cataloghi di `sheet types` lato admin

Riferimenti FE che implicano questo contratto:

- [src/types/domain.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/types/domain.ts:144)
- [src/services/gateApi.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/services/gateApi.ts:686)
- [src/services/gateApi.ts](/home/diego/octo/GATE_frontend_starter/gate/fe/src/services/gateApi.ts:690)

Il BE quindi sembra gia' avere una base adatta a:

- definire template scheda per game system
- versionare gli schemi
- salvare valori dinamici per personaggio

Il gap probabile non e' l'esistenza della scheda, ma la mancanza di:

- cataloghi tipizzati e governati per D&D 5e
- validazione forte dei campi D&D
- supporto esplicito a campi derivati

## Requisiti funzionali

### 1. Razza e classe come cataloghi controllati

Per D&D 5e i campi `razza` e `classe` devono:

- essere obbligatori
- essere scelti da una lista chiusa
- essere modificabili solo scegliendo un codice esistente
- non accettare testo libero inviato dal client

Esempi:

- razze: `HUMAN`, `ELF`, `DWARF`, `HALFLING`
- classi: `FIGHTER`, `WIZARD`, `ROGUE`, `CLERIC`

### 2. Sei caratteristiche base

La scheda deve prevedere:

- `strength`
- `dexterity`
- `constitution`
- `intelligence`
- `wisdom`
- `charisma`

Per ciascuna:

- input numerico
- range validato lato BE
- visualizzazione del modificatore derivato

### 3. Modificatori derivati

Il modificatore va calcolato con formula standard D&D:

```text
modifier = floor((score - 10) / 2)
```

Esempi:

- `8 -> -1`
- `10 -> 0`
- `12 -> +1`
- `14 -> +2`
- `18 -> +4`

Il modificatore non deve essere persistito come campo editabile dal client.

### 4. Estendibilita' controllata

Il sistema deve poter aggiungere in futuro:

- nuove razze
- nuove classi
- eventuali sottoclassi
- cataloghi custom di ambientazione

senza richiedere testo libero inserito dall'utente.

## Proposta backend

## Principio guida

Il backend deve restare source of truth di:

- schema effettivo
- cataloghi disponibili
- validazione dei valori
- campi derivati

Il FE deve solo:

- rendere il form
- inviare codici e numeri ammessi
- mostrare i derivati ricevuti o calcolati localmente a scopo preview

## Modello dati consigliato

### Opzione minima

Mantenere `schemaJson` + `dataJson`, introducendo un catalogo governato lato sistema.

Nuove entita' consigliate:

- `game_system_field_catalogs`
- `game_system_field_catalog_items`

Schema concettuale:

- catalogo
  - `id`
  - `game_system_code`
  - `catalog_code`
  - `label`
  - `active`
- item catalogo
  - `id`
  - `catalog_id`
  - `item_code`
  - `label`
  - `description`
  - `sort_order`
  - `active`

Cataloghi iniziali:

- `DND5E_RACES`
- `DND5E_CLASSES`

### Opzione piu' strutturata

Se volete supportare regole di compatibilita' in futuro:

- tabella `game_system_taxonomies`
- tabella `game_system_taxonomy_items`
- tabella `game_system_taxonomy_relations`

Esempio futuro:

- collegare `subclass` a `class`
- filtrare razze o opzioni per ambientazione

Per la richiesta attuale, l'opzione minima e' sufficiente.

## Contratto API consigliato

### 1. Recupero scheda personaggio

L'endpoint esistente puo' continuare a restituire:

- `schemaJson`
- `dataJson`

ma lo `schemaJson` va esteso.

Esempio:

```json
{
  "blocks": [
    {
      "key": "identity",
      "label": "Identita",
      "fields": [
        {
          "key": "race",
          "label": "Razza",
          "type": "select",
          "required": true,
          "optionsSource": "DND5E_RACES"
        },
        {
          "key": "class",
          "label": "Classe",
          "type": "select",
          "required": true,
          "optionsSource": "DND5E_CLASSES"
        }
      ]
    },
    {
      "key": "abilities",
      "label": "Caratteristiche",
      "fields": [
        { "key": "strength", "label": "Forza", "type": "number", "required": true, "min": 1, "max": 30 },
        { "key": "dexterity", "label": "Destrezza", "type": "number", "required": true, "min": 1, "max": 30 },
        { "key": "constitution", "label": "Costituzione", "type": "number", "required": true, "min": 1, "max": 30 },
        { "key": "intelligence", "label": "Intelligenza", "type": "number", "required": true, "min": 1, "max": 30 },
        { "key": "wisdom", "label": "Saggezza", "type": "number", "required": true, "min": 1, "max": 30 },
        { "key": "charisma", "label": "Carisma", "type": "number", "required": true, "min": 1, "max": 30 }
      ]
    }
  ],
  "catalogOptions": {
    "DND5E_RACES": [
      { "value": "HUMAN", "label": "Umano" },
      { "value": "ELF", "label": "Elfo" }
    ],
    "DND5E_CLASSES": [
      { "value": "FIGHTER", "label": "Guerriero" },
      { "value": "WIZARD", "label": "Mago" }
    ]
  }
}
```

Nota: `catalogOptions` puo' stare:

- nello stesso payload scheda
- oppure in un endpoint dedicato di catalogo

Per semplicità operativa, includerlo nello `schemaJson` o nel payload scheda riduce roundtrip FE.

### 2. Salvataggio scheda personaggio

Il FE deve continuare a inviare solo `dataJson`.

Esempio:

```json
{
  "dataJson": {
    "identity.race": "HUMAN",
    "identity.class": "FIGHTER",
    "abilities.strength": 16,
    "abilities.dexterity": 12,
    "abilities.constitution": 14,
    "abilities.intelligence": 10,
    "abilities.wisdom": 8,
    "abilities.charisma": 13
  }
}
```

Validazioni lato BE:

- `identity.race` deve esistere nel catalogo `DND5E_RACES`
- `identity.class` deve esistere nel catalogo `DND5E_CLASSES`
- le caratteristiche devono essere numeri interi
- il range deve essere vincolato
- i campi non previsti dallo schema devono essere:
  - rifiutati
  - oppure ignorati esplicitamente

Raccomandazione: rifiutare i campi fuori schema con `400`.

### 3. Campi derivati in risposta

Il BE dovrebbe restituire anche una struttura di valori derivati.

Esempio:

```json
{
  "derivedJson": {
    "abilities.strengthModifier": 3,
    "abilities.dexterityModifier": 1,
    "abilities.constitutionModifier": 2,
    "abilities.intelligenceModifier": 0,
    "abilities.wisdomModifier": -1,
    "abilities.charismaModifier": 1
  }
}
```

Se non volete toccare il contratto subito, il FE puo' calcolarli localmente.

Comunque, nel medio periodo e' meglio che il BE li calcoli anch'esso.

## Sicurezza backend

La richiesta menziona SQL injection o input arbitrari. La risposta corretta e' architetturale:

- il FE non deve offrire input libero per razza/classe
- il BE non deve mai fidarsi di questo fatto
- il BE deve validare i codici contro cataloghi noti
- l'accesso DB deve usare query parametrizzate / ORM, mai concatenazione stringhe

Quindi:

- niente `VARCHAR` libero per razza/classe se il dominio e' catalogato
- nel `dataJson` deve entrare un `code`, non una label arbitraria
- la label utente e' sempre letta dal catalogo, non dal valore salvato

## Proposta frontend

## Obiettivo FE

Adeguare il renderer generico esistente senza duplicare una pagina D&D custom da zero, salvo un piccolo miglioramento di UX per il blocco caratteristiche.

## Estensioni al modello FE

Oggi `SheetSchemaField` e' troppo povero. Conviene estenderlo con:

```ts
export interface SheetSchemaField {
  key?: string
  label?: string
  type?: string
  required?: boolean
  placeholder?: string | null
  helpText?: string | null
  defaultValue?: unknown
  options?: Array<unknown>
  readOnly?: boolean
  min?: number
  max?: number
  step?: number
  optionsSource?: string | null
}
```

Possibile estensione anche per la response scheda:

```ts
catalogOptions?: Record<string, Array<{ value: string; label: string }>>
derivedJson?: Record<string, unknown>
```

## Adeguamenti FE richiesti

### 1. Supporto a cataloghi sistema

In [src/features/characters/pages/CharacterDetailPage.tsx](/home/diego/octo/GATE_frontend_starter/gate/fe/src/features/characters/pages/CharacterDetailPage.tsx:54):

- se `field.type === 'select'`
- e `field.options` non c'e'
- ma esiste `field.optionsSource`
- il FE deve leggere le opzioni dal payload scheda

### 2. Supporto a campi read-only

Per i campi derivati:

- renderizzare un input disabled o un valore badge/read-only
- impedire modifica e invio come valore editabile

### 3. Supporto a min/max/step

Sugli input `number`:

- passare `min`
- passare `max`
- passare `step`

Questo non sostituisce la validazione BE, ma migliora la UX.

### 4. Griglia caratteristiche D&D

Il blocco `abilities` merita una visualizzazione migliore:

- 6 card o righe compatte
- nome caratteristica
- score numerico
- modificatore calcolato

Esempio UX:

- Forza: `16` -> `+3`
- Destrezza: `12` -> `+1`

Questo puo' restare un enhancement FE sopra il renderer generico.

## Strategia FE consigliata

### Fase 1

Adattare il renderer generico per:

- `optionsSource`
- `readOnly`
- `min/max/step`

### Fase 2

Aggiungere un renderer condizionale per `DND5E_CHARACTER` o per block key `abilities`, senza rompere gli altri sistemi di gioco.

## Decisioni architetturali consigliate

### Decisione 1: non usare enum hardcoded nel codice FE come source of truth

Motivo:

- costringe deploy FE per ogni nuova razza/classe
- crea divergenza tra FE e BE
- non scala su piu' game system

Uso accettabile del FE:

- mapping cosmetico temporaneo
- fallback se il catalogo non e' disponibile

Non come fonte principale del dominio.

### Decisione 2: non memorizzare label utente nel `dataJson`

Salvare:

- `identity.race = "HUMAN"`
- `identity.class = "FIGHTER"`

Non:

- `"Umano"`
- `"Guerriero"`

Motivo:

- i codici sono stabili
- le label si possono tradurre o rinominare
- si riducono inconsistenze

### Decisione 3: i modificatori devono essere derivati

Non va lasciato al client il salvataggio di:

- `strengthModifier`
- `dexterityModifier`

come campi autonomi editabili.

## Piano di implementazione

### Backend

1. introdurre cataloghi sistema per D&D 5e
2. popolare cataloghi iniziali razze/classi
3. estendere schema scheda con `optionsSource`, `readOnly`, `min/max/step`
4. validare `dataJson` contro schema e cataloghi
5. opzionalmente restituire `derivedJson`
6. proteggere CRUD cataloghi con ruolo `SYSTEM` o admin forte

### Frontend

1. estendere i type TS della scheda
2. aggiornare il renderer `CharacterDetailPage`
3. risolvere le opzioni da `optionsSource`
4. mostrare i modificatori in tempo reale
5. aggiungere layout migliore per blocco caratteristiche

## Compatibilita' e migrazione

Per non rompere le schede esistenti:

- i nuovi campi metadata devono essere opzionali
- il renderer deve continuare a funzionare con gli schemi vecchi
- se `optionsSource` manca, il FE usa `field.options`
- se `derivedJson` manca, il FE puo' fare calcolo locale solo per D&D

Migrazione dati:

- se oggi `race` e `class` sono stringhe libere, serve mapping a codici
- i record non mappabili devono essere segnalati per correzione manuale o fallback amministrativo

## Criteri di accettazione

### Backend

- un utente non puo' salvare `identity.race = "drop table"`
- un utente non puo' salvare una classe non presente nel catalogo
- un utente non puo' salvare campi extra fuori schema
- il BE accetta solo valori compatibili con schema e cataloghi
- i cataloghi sono modificabili solo da ruoli autorizzati

### Frontend

- `razza` e `classe` sono dropdown, non testo libero
- le 6 caratteristiche sono modificabili come numeri
- i modificatori si aggiornano in UI in modo coerente
- i campi derivati non sono editabili
- la scheda continua a funzionare anche per altri sistemi non D&D

## Raccomandazione finale

La soluzione migliore non e' hardcodare enum FE e salvare stringhe. La soluzione corretta e':

- dominio controllato lato BE
- cataloghi gestiti a DB
- codici stabili nel `dataJson`
- renderer FE che consuma metadata piu' ricchi
- campi derivati calcolati, non editati

Questa strada mantiene il sistema estendibile, evita input arbitrari nei campi di dominio chiuso e resta compatibile con l'architettura schema-driven gia' presente.
