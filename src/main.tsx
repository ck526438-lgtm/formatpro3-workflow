import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Version installable (PWA) : Android, iOS, ChromeOS, ou « Installer » dans Chrome/Edge.
// Pas de service worker dans l'app de bureau (Electron) ni en développement.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !navigator.userAgent.includes('Electron')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
