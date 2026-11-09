import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useApi } from '../data/ApiContext';
import type { AuthUser } from '../data/types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'recovery'; user: AuthUser | null }
  | { status: 'signedIn'; user: AuthUser };

interface AuthContextValue {
  state: AuthState;
  finishRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const unsubscribe = api.onAuthChange((event, user) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setState({ status: 'recovery', user });
      else setState((prev) => (prev.status === 'recovery' && user ? prev : user ? { status: 'signedIn', user } : { status: 'signedOut' }));
    });
    api
      .getUser()
      .then((user) => {
        if (!active) return;
        setState((prev) => (prev.status !== 'loading' ? prev : user ? { status: 'signedIn', user } : { status: 'signedOut' }));
      })
      .catch(() => active && setState({ status: 'signedOut' }));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [api]);

  const finishRecovery = () =>
    setState((prev) => (prev.status === 'recovery' && prev.user ? { status: 'signedIn', user: prev.user } : { status: 'signedOut' }));

  return <AuthContext.Provider value={{ state, finishRecovery }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
