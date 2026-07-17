import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.17.1',
  eyebrow: 'What\'s new',
  title: 'Novita di oggi',
  summary: 'Da oggi tornare nella tua campagna e piu semplice, rapido e ordinato.',
  sections: [
    {
      title: 'Accesso piu immediato',
      items: [
        {
          label: 'Quando rientri, ritrovi piu facilmente da dove avevi lasciato.',
          details: [
            'Il rientro nella campagna e piu lineare.',
            'Personaggi e missioni sono piu facili da riprendere senza dover ricominciare ogni volta.',
          ],
        },
        {
          label: 'Arrivi piu velocemente al personaggio giusto.',
          details: [
            'L accesso alle informazioni principali e piu rapido.',
          ],
        },
      ],
    },
    {
      title: 'Missioni piu chiare',
      items: [
        {
          label: 'Consultare le missioni e piu semplice.',
          details: [
            'Passare tra le diverse viste e ora piu immediato.',
          ],
        },
      ],
    },
    {
      title: 'Esperienza piu ordinata',
      items: [
        {
          label: 'Le schermate principali sono piu pulite e leggibili.',
          details: [
            'La navigazione risulta piu comoda, soprattutto su schermi piccoli.',
          ],
        },
      ],
    },
  ],
}
