import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.12',
  eyebrow: 'What\'s new',
  title: 'Novita applicativo',
  summary: 'Aggiornamenti introdotti sulla condivisione WhatsApp delle missioni e conferma delle novita rilasciate ieri su ingresso post-login e comunicazione applicativa.',
  sections: [
    {
      title: 'Condivisione WhatsApp',
      items: [
        {
          label: 'Nuova azione WhatsApp nelle missioni.',
          details: [
            'Dalla scheda missione e ora disponibile il comando per aprire la condivisione diretta su WhatsApp.',
          ],
        },
        {
          label: 'Messaggio condiviso con dati missione.',
          details: [
            'Il testo include titolo, descrizione e link di accesso alla missione.',
          ],
        },
        {
          label: 'Supporto immagine realm quando disponibile.',
          details: [
            'Sui dispositivi compatibili la condivisione prova ad allegare il logo del realm.',
            'Se il logo non e disponibile viene generata un immagine fallback coerente con il realm corrente.',
          ],
        },
      ],
    },
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
