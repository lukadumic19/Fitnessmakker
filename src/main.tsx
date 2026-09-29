import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ConfirmHost } from './components/Modal';
import { StoreProvider } from './store';
import './styles/app.css';
import './styles/figure.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
      <ConfirmHost />
    </StoreProvider>
  </StrictMode>,
);

// Offline support when the app runs on its own address (not inside an embed or dev server).
if ('serviceWorker' in navigator && import.meta.env.PROD && window.top === window.self) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* not available here (e.g. sandboxed preview) */
    });
  });
}
