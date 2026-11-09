import { useState } from 'react';
import { Brand } from '../components/Brand';
import { Button } from '../components/ui';
import { useApi } from '../data/ApiContext';
import type { AuthUser, MyStore } from '../data/types';
import { canEditStore, canManageMembers, ROLE_LABELS } from '../lib/roles';
import { Home } from './Home';
import { Members } from './Members';
import { ProfilePage } from './ProfilePage';
import { StoreSettings } from './StoreSettings';

type Tab = 'home' | 'members' | 'settings' | 'profile';

export function AppShell({
  user,
  store,
  storeCount,
  onSwitchStore,
  onStoreChanged,
}: {
  user: AuthUser;
  store: MyStore;
  storeCount: number;
  onSwitchStore: () => void;
  onStoreChanged: () => void;
}) {
  const api = useApi();
  const [tab, setTab] = useState<Tab>('home');
  const tabs: Array<{ id: Tab; label: string; icon: string; show: boolean }> = [
    { id: 'home', label: 'Beranda', icon: '⌂', show: true },
    { id: 'members', label: 'Tim', icon: '👥', show: canManageMembers(store.role) },
    { id: 'settings', label: 'Toko', icon: '⚙', show: canEditStore(store.role) },
    { id: 'profile', label: 'Akun', icon: '◉', show: true },
  ];
  const visible = tabs.filter((t) => t.show);

  return (
    <div className="mx-auto min-h-screen max-w-5xl">
      <header className="rounded-b-3xl bg-deep px-5 pb-6 pt-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <Button variant="dark" small className="border border-[#496259]" onClick={() => void api.signOut()}>Keluar</Button>
        </div>
        <div className="mt-5">
          <small className="text-[#b9c9c1]">TOKO AKTIF</small>
          <h1 className="text-xl font-extrabold">{store.name}</h1>
          <p className="text-sm text-[#c2d1ca]">
            Peran Anda: {ROLE_LABELS[store.role]}
            {storeCount > 1 && (
              <>
                {' · '}
                <button type="button" className="underline" onClick={onSwitchStore}>Ganti toko</button>
              </>
            )}
          </p>
        </div>
      </header>

      <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:border-0 md:bg-transparent md:px-6 md:pt-3">
        <div className="mx-auto flex max-w-3xl justify-around md:rounded-2xl md:border md:border-line md:bg-white md:p-1">
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
              className={`min-w-16 px-2 py-2 text-[11px] md:text-sm ${tab === t.id ? 'font-extrabold text-brand' : 'text-muted'}`}
            >
              <span aria-hidden="true" className="block text-lg md:mr-1 md:inline md:text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="px-4 pb-28 pt-4 md:px-6 md:pb-10">
        {tab === 'home' && <Home store={store} />}
        {tab === 'members' && canManageMembers(store.role) && <Members store={store} currentUserId={user.id} />}
        {tab === 'settings' && canEditStore(store.role) && <StoreSettings store={store} onSaved={onStoreChanged} />}
        {tab === 'profile' && <ProfilePage user={user} />}
      </main>
    </div>
  );
}
