import { StrictMode, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth';
import { AuthScreen } from './views/AuthScreen';

function LoginRoute() {
  const { user, loading, recovering } = useAuth();

  useEffect(() => {
    if (!loading && user && !recovering) window.location.replace('/');
  }, [loading, recovering, user]);

  return <AuthScreen />;
}

export default function LoginClient() {
  return (
    <StrictMode>
      <AuthProvider>
        <LoginRoute />
      </AuthProvider>
    </StrictMode>
  );
}
