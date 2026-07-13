import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import 'primereact/resources/themes/lara-light-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import './index.css'
import App from './App.tsx'
import { GlobalApiLoader } from './shared/components'
import { queryClient } from './services/queryClient'

const initialTheme = localStorage.getItem('gate_theme')
document.documentElement.dataset.theme = initialTheme === 'dark' ? 'dark' : 'light'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <GlobalApiLoader />
    </QueryClientProvider>
  </StrictMode>,
)
