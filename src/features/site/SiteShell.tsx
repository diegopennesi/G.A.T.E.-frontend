import { useMemo, useState } from 'react'
import heroImage from '../../assets/hero.png'
import { Icon } from '../../shared/components'
import './site-shell.css'

type SiteShellProps = {
  brandTitle: string
  brandLogoUrl: string | null
  profileName: string
  routeSegments: string[]
  onNavigate: (...segments: string[]) => void
  onLogout: () => void
}

type SiteCampaign = {
  slug: string
  name: string
  summary: string
  missionCount: number
  missions: SiteMission[]
}

type SiteMission = {
  id: string
  title: string
  dateLabel: string
  slotLabel: string
  filterBucket: 'today' | 'week' | 'next-week'
  summary: string
  location: string
  tier: string
  booked: string[]
  bench: string[]
  chat: Array<{ id: string; author: string; text: string; ts: string }>
}

const SITE_CAMPAIGNS: SiteCampaign[] = [
  {
    slug: 'nido-retold',
    name: 'D&D Nido Retold',
    summary: 'Campagna principale del negozio con missioni attive e prenotazione rapida.',
    missionCount: 3,
    missions: [
      {
        id: 'fabula-piratica-4',
        title: 'Fabula Piratica #4 [Pomeridiana]',
        dateLabel: 'Sab 11 Lug 15:30',
        slotLabel: 'Oggi',
        filterBucket: 'today',
        summary: 'Sessione one-shot con accesso rapido alla prenotazione e chat missione.',
        location: 'Sala Mare',
        tier: 'Tier Misto',
        booked: ['Fabio Marchetti', 'Tommaso Corciulo', 'Luca Girotti'],
        bench: ['Andrea Montozzi'],
        chat: [
          { id: 'm1', author: 'Andrea Montozzi', text: 'Presente, porto il mio ladro.', ts: '10/07 10:00' },
          { id: 'm2', author: 'Luca Girotti', text: 'Io confermo il posto titolare.', ts: '10/07 10:12' },
          { id: 'm3', author: 'Beto', text: 'Perfetto, inizio ore 15:30 puntuali.', ts: '10/07 10:30' },
        ],
      },
      {
        id: 'notte-lira',
        title: 'La Notte di Lira e l’Ospite Assente',
        dateLabel: 'Dom 13 Lug 18:00',
        slotLabel: 'Questa Settimana',
        filterBucket: 'week',
        summary: 'Missione taverniera con posti aperti e panchina disponibile.',
        location: 'Sala Taverna',
        tier: 'AFL',
        booked: ['Gianluca Orlandi', 'Elena M.'],
        bench: ['Alice A.'],
        chat: [
          { id: 'm4', author: 'Gianluca Orlandi', text: 'Porto il bardo.', ts: '09/07 19:16' },
          { id: 'm5', author: 'Elena M.', text: 'Io resto disponibile per un cambio party.', ts: '09/07 19:20' },
        ],
      },
      {
        id: 'isola-vetri',
        title: 'L’Isola dei Vetri Neri',
        dateLabel: 'Sab 19 Lug 16:00',
        slotLabel: 'Prossima Settimana',
        filterBucket: 'next-week',
        summary: 'Missione esplorativa con onboarding rapido e briefing visuale.',
        location: 'Sala Faro',
        tier: 'Op Tier',
        booked: ['Sara Valli'],
        bench: [],
        chat: [{ id: 'm6', author: 'Master Nido', text: 'Posti ancora aperti.', ts: '10/07 09:40' }],
      },
    ],
  },
  {
    slug: 'dragon-heist',
    name: 'D&D Dragon Heist',
    summary: 'Campagna urbana secondaria con missioni evento e serate speciali.',
    missionCount: 2,
    missions: [
      {
        id: 'heist-mercato',
        title: 'Il Furto del Mercato Alto',
        dateLabel: 'Ven 18 Lug 21:00',
        slotLabel: 'Prossima Settimana',
        filterBucket: 'next-week',
        summary: 'Serata cittadina con supporto panchina e recap rapido.',
        location: 'Sala Citta',
        tier: 'Urban',
        booked: ['Paola Rizzi', 'Mirko T.'],
        bench: ['Chiara D.'],
        chat: [{ id: 'm7', author: 'Paola Rizzi', text: 'Mi prenoto come titolare.', ts: '10/07 08:15' }],
      },
      {
        id: 'cripta-nebbia',
        title: 'La Cripta nella Nebbia',
        dateLabel: 'Sab 12 Lug 11:00',
        slotLabel: 'Questa Settimana',
        filterBucket: 'week',
        summary: 'Missione dungeon breve con pochi slot e briefing sintetico.',
        location: 'Sala Nord',
        tier: 'Low Tier',
        booked: ['Giorgio P.'],
        bench: [],
        chat: [{ id: 'm8', author: 'Giorgio P.', text: 'Se arriva un healer meglio.', ts: '10/07 11:00' }],
      },
    ],
  },
]

type MissionFilter = 'today' | 'week' | 'next-week' | 'all'

export function SiteShell({
  brandTitle,
  brandLogoUrl,
  profileName,
  routeSegments,
  onNavigate,
  onLogout,
}: SiteShellProps) {
  const [missionFilter, setMissionFilter] = useState<MissionFilter>('today')
  const [bookingStateByMissionId, setBookingStateByMissionId] = useState<Record<string, 'booked' | 'bench' | null>>({})
  const [accountPanelOpen, setAccountPanelOpen] = useState(false)

  const currentView = routeSegments[0] || 'landing'
  const campaignSlug = routeSegments[0] === 'campaigns' ? routeSegments[1] || '' : ''
  const missionId = routeSegments[0] === 'campaigns' && routeSegments[2] === 'missions' ? routeSegments[3] || '' : ''

  const activeCampaign = useMemo(
    () => SITE_CAMPAIGNS.find((campaign) => campaign.slug === campaignSlug) || SITE_CAMPAIGNS[0],
    [campaignSlug],
  )

  const activeMission = useMemo(
    () => activeCampaign.missions.find((mission) => mission.id === missionId) || activeCampaign.missions[0],
    [activeCampaign, missionId],
  )

  const filteredMissions = useMemo(() => {
    if (!activeCampaign) return []
    if (missionFilter === 'all') return activeCampaign.missions
    return activeCampaign.missions.filter((mission) => mission.filterBucket === missionFilter)
  }, [activeCampaign, missionFilter])

  const pageTitle =
    currentView === 'shop-info'
      ? 'Shop Info'
      : currentView === 'campaigns' && routeSegments[2] === 'missions'
        ? activeMission.title
        : currentView === 'campaigns'
          ? activeCampaign.name
          : 'Landing'

  const setBooking = (value: 'booked' | 'bench') => {
    setBookingStateByMissionId((prev) => ({ ...prev, [activeMission.id]: value }))
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <button type="button" className="site-brand" onClick={() => onNavigate('landing')}>
          <div className="site-brand-mark">
            {brandLogoUrl ? <img src={brandLogoUrl} alt={brandTitle} /> : <Icon name="fa-solid fa-dungeon" />}
          </div>
          <div className="site-brand-copy">
            <strong>{brandTitle}</strong>
            <span>Realm Store</span>
          </div>
        </button>

        <nav className="site-tabs" aria-label="Navigazione store">
          <button
            type="button"
            className={`site-tab ${currentView === 'landing' ? 'is-active' : ''}`}
            onClick={() => onNavigate('landing')}
          >
            Landing
          </button>
          <button
            type="button"
            className={`site-tab ${currentView === 'shop-info' ? 'is-active' : ''}`}
            onClick={() => onNavigate('shop-info')}
          >
            Shop Info
          </button>
          {SITE_CAMPAIGNS.map((campaign) => (
            <button
              key={campaign.slug}
              type="button"
              className={`site-tab ${campaign.slug === activeCampaign.slug && currentView === 'campaigns' ? 'is-active' : ''}`}
              onClick={() => onNavigate('campaigns', campaign.slug)}
            >
              {campaign.name}
            </button>
          ))}
        </nav>

        <div className="site-account">
          <button type="button" className="site-account-btn" onClick={() => setAccountPanelOpen((value) => !value)}>
            <span className="site-account-avatar">{profileName.slice(0, 1).toUpperCase()}</span>
            <span className="site-account-copy">
              <strong>{profileName}</strong>
              <span>Area utente</span>
            </span>
          </button>
          {accountPanelOpen && (
            <div className="site-account-panel">
              <button type="button" onClick={() => setAccountPanelOpen(false)}>
                Profilo
              </button>
              <button type="button" onClick={() => setAccountPanelOpen(false)}>
                I miei personaggi
              </button>
              <button type="button" className="is-danger" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="site-main">
        <div className="site-page-head">
          <div>
            <p className="site-kicker">Frontend parallelo store</p>
            <h1>{pageTitle}</h1>
          </div>
        </div>

        {currentView === 'landing' && (
          <section className="site-landing">
            <div className="site-landing-hero" style={{ backgroundImage: `linear-gradient(135deg, rgba(8,20,29,.72), rgba(10,55,74,.54)), url(${heroImage})` }}>
              <div className="site-landing-hero-copy">
                <span className="site-chip">Modulo sito</span>
                <h2>{brandTitle}</h2>
                <p>
                  Accesso rapido alle campagne attive del negozio, missioni della settimana e strumenti essenziali per l’utenza.
                </p>
              </div>
            </div>

            <section className="site-highlight-grid">
              {SITE_CAMPAIGNS.map((campaign) => (
                <button key={campaign.slug} type="button" className="site-highlight-card" onClick={() => onNavigate('campaigns', campaign.slug)}>
                  <span className="site-chip">Campagna</span>
                  <strong>{campaign.name}</strong>
                  <p>{campaign.summary}</p>
                  <span>{campaign.missionCount} missioni attive</span>
                </button>
              ))}
            </section>
          </section>
        )}

        {currentView === 'shop-info' && (
          <section className="site-shop-info">
            <div className="site-shop-info-backdrop" style={{ backgroundImage: `linear-gradient(180deg, rgba(250,247,240,.88), rgba(250,247,240,.98)), url(${heroImage})` }} />
            <article className="site-editorial-card">
              <span className="site-chip">Contenuto admin</span>
              <h2>Info Page</h2>
              <p>
                Questa sezione raccoglie le informazioni del negozio in una singola colonna leggibile. Il contenuto viene gestito da admin e puo'
                includere presentazione, regole locali, orari, contatti e istruzioni rapide per chi entra nel realm.
              </p>
              <p>
                Lo sfondo resta configurabile ma secondario. La priorita' e' il testo centrale: pochi blocchi, nessuna dispersione, lettura chiara
                da mobile e desktop.
              </p>
              <p>
                Qui possiamo poi agganciare moduli informativi aggiuntivi, menu, vetrina o contenuti editoriali, senza usare la dashboard generica.
              </p>
            </article>
          </section>
        )}

        {currentView === 'campaigns' && routeSegments[2] !== 'missions' && (
          <section className="site-campaign-board">
            <div className="site-campaign-head">
              <div>
                <span className="site-chip">Campagna D&D</span>
                <h2>{activeCampaign.name}</h2>
                <p>{activeCampaign.summary}</p>
              </div>
              <div className="site-campaign-state">Accesso attivo</div>
            </div>

            <div className="site-filter-bar">
              <input className="site-search" value="" placeholder="Cerca missioni..." readOnly />
              <div className="site-filter-group">
                <FilterButton label="Oggi" active={missionFilter === 'today'} onClick={() => setMissionFilter('today')} />
                <FilterButton label="Settimana" active={missionFilter === 'week'} onClick={() => setMissionFilter('week')} />
                <FilterButton label="Prossima Sett." active={missionFilter === 'next-week'} onClick={() => setMissionFilter('next-week')} />
                <FilterButton label="Tutte" active={missionFilter === 'all'} onClick={() => setMissionFilter('all')} />
              </div>
            </div>

            <div className="site-mission-list">
              {filteredMissions.map((mission) => (
                <button
                  key={mission.id}
                  type="button"
                  className="site-mission-card"
                  onClick={() => onNavigate('campaigns', activeCampaign.slug, 'missions', mission.id)}
                >
                  <div className="site-mission-cover" style={{ backgroundImage: `linear-gradient(135deg, rgba(10,17,23,.24), rgba(8,77,93,.18)), url(${heroImage})` }} />
                  <div className="site-mission-copy">
                    <span className="site-mission-date">{mission.dateLabel}</span>
                    <strong>{mission.title}</strong>
                    <span className="site-mission-meta">
                      {mission.location} · {mission.tier} · {mission.slotLabel}
                    </span>
                    <p>{mission.summary}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {currentView === 'campaigns' && routeSegments[2] === 'missions' && (
          <section className="site-mission-detail">
            <div className="site-mission-detail-grid">
              <article className="site-mission-hero-card">
                <div className="site-mission-hero" style={{ backgroundImage: `linear-gradient(135deg, rgba(10,17,23,.22), rgba(8,77,93,.12)), url(${heroImage})` }} />
                <div className="site-mission-hero-copy">
                  <span className="site-chip">{activeMission.dateLabel}</span>
                  <h2>{activeMission.title}</h2>
                  <p>
                    {activeCampaign.name} · {activeMission.tier} · {activeMission.location}
                  </p>
                  <p>{activeMission.summary}</p>
                </div>
              </article>

              <aside className="site-booking-card">
                <h3>Prenotati / Posti</h3>
                <div className="site-booking-actions">
                  <button type="button" className={bookingStateByMissionId[activeMission.id] === 'booked' ? 'is-active' : ''} onClick={() => setBooking('booked')}>
                    Prenota posto
                  </button>
                  <button type="button" className={bookingStateByMissionId[activeMission.id] === 'bench' ? 'is-active' : ''} onClick={() => setBooking('bench')}>
                    Vai in panchina
                  </button>
                </div>

                <div className="site-booking-list">
                  <strong>Titolari</strong>
                  <ul>
                    {activeMission.booked.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="site-booking-list">
                  <strong>Panchina</strong>
                  <ul>
                    {activeMission.bench.length > 0 ? activeMission.bench.map((item) => <li key={item}>{item}</li>) : <li>Nessuno</li>}
                  </ul>
                </div>
              </aside>
            </div>

            <section className="site-chat-card">
              <div className="site-chat-head">
                <h3>Chat missione</h3>
                <button type="button" className="site-inline-link" onClick={() => onNavigate('campaigns', activeCampaign.slug)}>
                  Torna alle missioni
                </button>
              </div>
              <div className="site-chat-input-row">
                <input value="" placeholder="Scrivi un messaggio..." readOnly />
                <button type="button" aria-label="Invia messaggio">
                  <Icon name="fa-solid fa-paper-plane" />
                </button>
              </div>
              <div className="site-chat-feed">
                {activeMission.chat.map((message) => (
                  <article key={message.id} className="site-chat-message">
                    <div className="site-chat-message-head">
                      <strong>{message.author}</strong>
                      <span>{message.ts}</span>
                    </div>
                    <p>{message.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  )
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`site-filter-btn ${active ? 'is-active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}
