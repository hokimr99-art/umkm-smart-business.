import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ApiProvider } from './data/ApiContext';
import { createSupabaseApi } from './data/supabaseApi';
import './index.css';
import { readSupabaseConfig } from './lib/config';
import { SetupNeeded } from './pages/SetupNeeded';

const root = createRoot(document.getElementById('root') as HTMLElement);
const config = readSupabaseConfig(import.meta.env);

root.render(
  <StrictMode>
    {config.ok ? (
      <ApiProvider api={createSupabaseApi(config.url, config.anonKey)}>
        <App />
      </ApiProvider>
    ) : (
      <SetupNeeded missing={config.missing} />
    )}
  </StrictMode>,
);
