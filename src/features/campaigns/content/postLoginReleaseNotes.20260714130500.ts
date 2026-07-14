import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.14',
  eyebrow: 'What\'s new',
  title: 'Novita applicativo',
  summary: 'Aggiornamenti su navigazione campagne e consultazione missioni, con particolare attenzione all uso da mobile.',
  sections: [
    {
      title: 'Missioni su mobile',
      items: [
        {
          label: 'Lista missioni piu comoda da leggere su telefono.',
          details: [
            'Nella schermata Missioni la vista mobile mostra le informazioni in card piu leggibili.',
            'Le azioni principali restano visibili senza dover scorrere lateralmente.',
          ],
        },
        {
          label: 'Dettaglio e chat piu facili da raggiungere.',
          details: [
            'I comandi della missione sono stati resi piu accessibili nei layout stretti.',
          ],
        },
      ],
    },
    {
      title: 'Passaggio tra campagne',
      items: [
        {
          label: 'Cambio campagna piu sicuro per chi partecipa a piu campagne.',
          details: [
            'Quando apri una nuova campagna non vieni piu fatto uscire involontariamente da quella precedente.',
          ],
        },
      ],
    },
    {
      title: 'Stabilita della navigazione',
      items: [
        {
          label: 'Rientro alle missioni piu coerente dopo le azioni di partecipazione.',
          details: [
            'Dopo ingresso come titolare, panchina o uscita dalla missione, la schermata torna correttamente alla lista disponibile.',
          ],
        },
      ],
    },
  ],
}
