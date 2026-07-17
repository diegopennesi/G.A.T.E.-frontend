import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.17.1',
  eyebrow: 'What\'s new',
  title: 'Novita di oggi',
  summary: 'Da oggi riprendere una campagna e piu semplice: il sistema ricorda meglio dove eri e rende piu immediato arrivare a personaggi, missioni e liste anche da mobile.',
  sections: [
    {
      title: 'Ripresa piu fluida',
      items: [
        {
          label: 'Quando rientri, ritrovi piu facilmente il punto in cui eri rimasto.',
          details: [
            'La campagna attiva viene recuperata in modo piu affidabile, cosi il rientro e piu lineare.',
            'Se stavi lavorando su un personaggio o su una missione, l applicativo prova a riportarti li invece di farti ripartire da zero.',
          ],
        },
        {
          label: 'L accesso ai personaggi e piu immediato.',
          details: [
            'Quando entri in una campagna viene selezionato in automatico il personaggio piu pertinente per te, cosi arrivi prima alle informazioni che ti servono.',
          ],
        },
      ],
    },
    {
      title: 'Missioni piu semplici',
      items: [
        {
          label: 'La vista delle missioni e piu chiara da cambiare.',
          details: [
            'Passare tra missioni attive, concluse o scadute e diventato piu diretto e leggibile.',
          ],
        },
      ],
    },
    {
      title: 'Esperienza piu ordinata',
      items: [
        {
          label: 'Alcune schermate sono state rese piu pulite e uniformi.',
          details: [
            'Liste, filtri, schede e finestre di caricamento hanno ora un aspetto piu coerente, con una lettura piu comoda soprattutto su schermi piccoli.',
          ],
        },
        {
          label: 'Il messaggio delle novita si comporta in modo piu prevedibile.',
          details: [
            'Puoi scegliere di non mostrarlo piu, e la preferenza viene rispettata per questa versione.',
          ],
        },
      ],
    },
  ],
}
