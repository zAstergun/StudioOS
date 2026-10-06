import { StrictMode } from 'react';
import { AuthProvider } from './auth';
import App from './App';

export default function StudioClient() {
  return (
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}
