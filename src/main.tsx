import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import 'primereact/resources/themes/lara-light-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import './index.css'
import App from './App.tsx'
import { NavigationGuardProvider } from './context/NavigationGuardContext'
import { GlobalApiLoader } from './shared/components'
import { queryClient } from './services/queryClient'
import { PublicLegalApp } from './features/legal/PublicLegalApp'

const initialTheme = localStorage.getItem('gate_theme')
document.documentElement.dataset.theme = initialTheme === 'dark' ? 'dark' : 'light'

const publicPath = window.location.pathname.replace(/\/+$/, '')
const isLegalPath = publicPath === '/privacy' || publicPath === '/account-deletion'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isLegalPath ? <PublicLegalApp /> : <QueryClientProvider client={queryClient}>
      <NavigationGuardProvider><App /></NavigationGuardProvider>
      <GlobalApiLoader />
    </QueryClientProvider>}
  </StrictMode>,
)
