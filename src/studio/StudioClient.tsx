import { StrictMode } from 'react';
import { AuthProvider } from './auth';
import { I18nProvider } from './i18n';
import App from './App';

export default function StudioClient() {
  return (
    <StrictMode>
      <AuthProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </AuthProvider>
    </StrictMode>
  );
}

