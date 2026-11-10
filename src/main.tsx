import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA offline capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Tactical PWA ServiceWorker registered successfully:', registration.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Also register in dev preview if supported
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('PWA ServiceWorker ready:', registration.scope);
      })
      .catch(() => {});
  });
}

