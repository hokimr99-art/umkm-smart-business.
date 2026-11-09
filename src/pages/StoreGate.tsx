import { useState } from 'react';
import { Button, Card, EmptyState, ErrorState, LoadingBlock, Badge } from '../components/ui';
import { useApi } from '../data/ApiContext';
import type { AuthUser, MyStore } from '../data/types';
import { readPref, writePref } from '../lib/storage';
import { ROLE_LABELS } from '../lib/roles';
import { useAsync } from '../lib/useAsync';
import { AppShell } from './AppShell';
import { CreateStore } from './CreateStore';

const ACTIVE_STORE_KEY = 'usb.activeStoreId';

export function StoreGate({ user }: { user: AuthUser }) {
  const api = useApi();
  const [stores, reload] = useAsync(() => api.listMyStores(user.id), [api, user.id]);
  const [activeId, setActiveId] = useState<string | null>(() => readPref(ACTIVE_STORE_KEY));
  const [creating, setCreating] = useState(false);

  const choose = (id: string | null) => {
    writePref(ACTIVE_STORE_KEY, id);
    setActiveId(id);
  };

  if (stores.status === 'loading') return <LoadingBlock label="Memuat toko…" />;
  if (stores.status === 'error') return <ErrorState message={stores.message} onRetry={reload} />;

  const list = stores.data;
  if (creating || list.length === 0) {
    return (
      <CreateStore
        onCreated={(id) => {
          setCreating(false);
          choose(id);
          reload();
        }}
        onCancel={list.length ? () => setCreating(false) : undefined}
      />
    );
  }

  // A stale or revoked id falls back to the picker (or the only store).
  const active: MyStore | undefined = list.find((s) => s.id === activeId) ?? (list.length === 1 ? list[0] : undefined);
  if (active) {
    return (
      <AppShell
        user={user}
        store={active}
        storeCount={list.length}
        onSwitchStore={() => choose(null)}
        onStoreChanged={reload}
      />
    );
  }

  return <StorePicker stores={list} onChoose={choose} onCreate={() => setCreating(true)} />;
}

function StorePicker({ stores, onChoose, onCreate }: { stores: MyStore[]; onChoose: (id: string) => void; onCreate: () => void }) {
  return (
    <main className="mx-auto max-w-md p-4 pt-8">
      <h1 className="mb-3 text-lg font-bold">Pilih toko</h1>
      <Card>
        {stores.length === 0 ? (
          <EmptyState title="Belum ada toko." />
        ) : (
          <ul className="divide-y divide-line">
            {stores.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onChoose(s.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left">
                  <span>
                    <strong className="block">{s.name}</strong>
                    <small className="text-muted">{s.businessType ?? 'Usaha'}</small>
                  </span>
                  <Badge>{ROLE_LABELS[s.role]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Button variant="light" className="mt-3 w-full" onClick={onCreate}>+ Buat toko baru</Button>
    </main>
  );
}
