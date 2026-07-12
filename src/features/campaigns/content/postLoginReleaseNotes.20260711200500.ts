import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.11',
  eyebrow: 'What\'s new',
  title: 'Novita applicativo',
  summary: 'Aggiornamenti introdotti su ingresso post-login e sulla comunicazione delle novita applicative.',
  sections: [
    {
      title: 'Ingresso applicativo',
      items: [
        {
          label: 'Nuova landing dedicata prima dell app.',
          details: [
            'Dopo la login l utente non entra subito nel menu operativo.',
            'La schermata iniziale e standalone, separata da sidebar e funzioni interne.',
          ],
        },
        {
          label: 'Realm mostrato in modo esplicito.',
          details: [
            'Prima di proseguire viene indicato chiaramente in quale realm si sta entrando.',
          ],
        },
      ],
    },
    {
      title: 'Comunicazione novita',
      items: [
        {
          label: 'Popup informativo mostrato prima della card centrale.',
          details: [
            'Le novita dell applicativo vengono presentate in overlay nella post-login landing.',
          ],
        },
        {
          label: 'Comando Non mostrare piu disponibile.',
          details: [
            'Il popup puo essere nascosto in modo permanente dal singolo account.',
          ],
        },
      ],
    },
    {
      title: 'Gestione contenuti',
      items: [
        {
          label: 'Preferenza salvata per account su localStorage.',
          details: [
            'Un altro profilo sullo stesso browser continua a vedere le novita.',
          ],
        },
        {
          label: 'Storico whats new esterno al componente.',
          details: [
            'Le note vengono lette da file versionati nel frontend.',
            'Il sistema seleziona automaticamente il file con timestamp piu recente.',
          ],
        },
      ],
    },
  ],
}
