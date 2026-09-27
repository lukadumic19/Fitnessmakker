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
