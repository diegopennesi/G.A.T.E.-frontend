import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.14.2',
  eyebrow: 'What\'s new',
  title: 'Novita applicativo',
  summary: 'Migliorata l esperienza da mobile nella consultazione di campagne, missioni, personaggi e liste di gestione.',
  sections: [
    {
      title: 'Uso da mobile',
      items: [
        {
          label: 'Le liste principali sono piu facili da leggere su telefono.',
          details: [
            'Campagne, missioni, personaggi, richieste di accesso e altre liste di gestione ora mostrano le informazioni in un formato piu adatto agli schermi stretti.',
            'Le azioni principali restano visibili senza dover scorrere orizzontalmente per raggiungerle.',
          ],
        },
        {
          label: 'Navigazione nelle campagne piu comoda anche su schermi piccoli.',
          details: [
            'Nella scheda campagna i comandi piu usati sono stati sistemati per restare leggibili e accessibili anche da telefono.',
          ],
        },
      ],
    },
    {
      title: 'Scheda campagna',
      items: [
        {
          label: 'La lista dei membri occupa meno spazio ed e piu chiara da consultare.',
          details: [
            'Le informazioni principali del giocatore sono state riorganizzate per rendere la lettura piu rapida, soprattutto da mobile.',
          ],
        },
      ],
    },
    {
      title: 'Navigazione generale',
      items: [
        {
          label: 'Le sezioni di gestione sono state rese piu uniformi.',
          details: [
            'Le schermate di consultazione e gestione seguono ora un comportamento piu coerente tra desktop e mobile.',
          ],
        },
      ],
    },
  ],
}
