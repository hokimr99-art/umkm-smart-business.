import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoadingBlock } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { PasswordRecovery } from './pages/PasswordRecovery';
import { StoreGate } from './pages/StoreGate';

function Router() {
  const { state, finishRecovery } = useAuth();
  switch (state.status) {
    case 'loading':
      return <LoadingBlock />;
    case 'signedOut':
      return <AuthPage />;
    case 'recovery':
      return <PasswordRecovery onDone={finishRecovery} />;
    case 'signedIn':
      // key: reset all per-user state when the account changes.
      return <StoreGate key={state.user.id} user={state.user} />;
  }
}

export function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
