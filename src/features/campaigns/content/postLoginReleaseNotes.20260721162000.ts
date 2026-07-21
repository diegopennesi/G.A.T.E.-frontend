import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.21.1',
  eyebrow: 'What\'s new',
  title: 'Novita del 21 luglio',
  summary: 'Missioni piu chiare, regole piu leggibili e console SYSTEM piu ordinata.',
  sections: [
    {
      title: 'Missioni e partecipazioni',
      items: [
        {
          label: 'Le regole missione ora spiegano meglio perche un personaggio finisce in panchina.',
          details: [
            'Se il livello non rientra nel range della missione, l ingresso viene registrato come panchina con motivo dedicato.',
            'La tabella partecipanti mostra il livello del personaggio vicino al nome.',
          ],
        },
        {
          label: 'Il limite titolare settimanale usa una finestra mobile di 7 giorni.',
          details: [
            'Dopo 7 giorni pieni il personaggio puo tornare titolare.',
            'La vecchia regola di titolare attivo concorrente e stata rimossa.',
          ],
        },
      ],
    },
    {
      title: 'Regole campagna',
      items: [
        {
          label: 'Le regole missione sono visibili e configurabili nella gestione campagna.',
          details: [
            'Range livello e limite titolare settimanale possono essere letti e gestiti con messaggi piu espliciti.',
            'Le missioni supportano livello minimo e massimo del personaggio.',
          ],
        },
      ],
    },
    {
      title: 'Console SYSTEM',
      items: [
        {
          label: 'La console e stata riorganizzata in Game system e Game System Rules.',
          details: [
            'Game system mostra solo la lista dei sistemi di gioco.',
            'Game System Rules permette di creare game rule e agganciarle a uno o piu game system con selezione multipla.',
          ],
        },
      ],
    },
  ],
}
