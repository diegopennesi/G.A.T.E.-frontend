import type { PostLoginReleaseNotes } from './postLoginReleaseNotes.types'

export const POST_LOGIN_RELEASE_NOTES: PostLoginReleaseNotes = {
  version: '2026.07.23.1',
  eyebrow: 'What\'s new',
  title: 'Novita schede personaggio',
  summary: 'Le schede personaggio ora supportano revisione master, storico modifiche e controlli piu chiari per D&D 5e.',
  sections: [
    {
      title: 'Revisione schede',
      items: [
        {
          label: 'Le modifiche dei giocatori possono andare in approvazione.',
          details: [
            'Quando la regola campagna e attiva, il salvataggio della scheda genera una modifica pending.',
            'Master e super master possono confermare o rifiutare la modifica dalla scheda personaggio.',
          ],
        },
        {
          label: 'Le modifiche pending sono mostrate con dettaglio leggibile.',
          details: [
            'La scheda evidenzia campi cambiati, valore precedente e valore proposto.',
            'Esempio: Forza 10 -> 12.',
          ],
        },
      ],
    },
    {
      title: 'Storico modifiche',
      items: [
        {
          label: 'Co-master, master e super master possono consultare lo storico scheda.',
          details: [
            'Ogni modifica registrata conserva stato, data, differenze e nota di revisione quando presente.',
            'Lo storico resta visibile nella scheda personaggio per ricostruire l evoluzione dei campi strutturati.',
          ],
        },
      ],
    },
    {
      title: 'Scheda D&D 5e',
      items: [
        {
          label: 'Razza, classe e statistiche sono piu guidate.',
          details: [
            'I campi configurati da catalogo usano opzioni selezionabili.',
            'Le caratteristiche mostrano anche il modificatore calcolato.',
          ],
        },
      ],
    },
  ],
}
