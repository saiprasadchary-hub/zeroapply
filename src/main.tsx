import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserGoogleLogin } from './auth/BrowserGoogleLogin'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { GlobalErrorMonitor } from './components/GlobalErrorMonitor.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <GlobalErrorMonitor />
      {new URLSearchParams(window.location.search).get('desktop-google-login') === '1'
        ? <BrowserGoogleLogin /> : <App />}
    </AppErrorBoundary>
  </StrictMode>,
)
