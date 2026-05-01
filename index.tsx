
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runAllTests } from './services/backendTests';

// Enregistrer le Service Worker pour le mode PWA hors ligne
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker enregistré:', registration.scope);
        
        // Écouter les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouvelle version disponible
                console.log('Nouvelle version disponible');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Erreur Service Worker:', error);
      });
  });
}


// Test backend connection on app startup (catch errors to avoid unhandled rejections)
runAllTests().catch(err => console.error('runAllTests error:', err));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
