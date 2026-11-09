import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, EmptyState, ErrorState, Field, LoadingBlock, Notice, Select } from '../components/ui';
import { useApi } from '../data/ApiContext';
import type { Member, MyStore } from '../data/types';
import { toUserMessage } from '../lib/errors';
import { assignableRoles, canChangeRoles, canRemoveMember, ROLE_LABELS, type StoreRole } from '../lib/roles';
import { useAsync } from '../lib/useAsync';
import { validateEmail } from '../lib/validation';

export function Members({ store, currentUserId }: { store: MyStore; currentUserId: string }) {
  const api = useApi();
  const [members, reload] = useAsync(() => api.listMembers(store.id), [api, store.id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, fn: () => Promise<void>) {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (err) {
      setActionError(toUserMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="members-title">
      <h2 id="members-title" className="my-3 text-lg font-bold">Tim toko</h2>
      <AddMemberForm store={store} onAdded={reload} />
      {actionError && <Notice tone="error">{actionError}</Notice>}
      <Card className="mt-3">
        {members.status === 'loading' && <LoadingBlock label="Memuat anggota…" />}
        {members.status === 'error' && <ErrorState message={members.message} onRetry={reload} />}
        {members.status === 'ready' &&
          (members.data.length === 0 ? (
            <EmptyState title="Belum ada anggota." />
          ) : (
            <ul className="divide-y divide-line">
              {members.data.map((m) => (
                <MemberRow
                  key={m.membershipId}
                  member={m}
                  actorRole={store.role}
                  isSelf={m.userId === currentUserId}
                  busy={busyId === m.membershipId}
                  onChangeRole={(role) => act(m.membershipId, () => api.updateMemberRole(m.membershipId, role))}
                  onRemove={() => {
                    if (window.confirm(`Keluarkan ${m.fullName || m.email} dari toko?`)) {
                      void act(m.membershipId, () => api.removeMember(m.membershipId));
                    }
                  }}
                />
              ))}
            </ul>
          ))}
      </Card>
    </section>
  );
}

function MemberRow({
  member,
  actorRole,
  isSelf,
  busy,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  actorRole: StoreRole;
  isSelf: boolean;
  busy: boolean;
  onChangeRole: (role: StoreRole) => void;
  onRemove: () => void;
}) {
  const editable = canChangeRoles(actorRole) && !isSelf && member.role !== 'owner';
  const removable = !isSelf && canRemoveMember(actorRole, member.role, false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <strong className="block truncate">{member.fullName || member.email}{isSelf && ' (Anda)'}</strong>
        <small className="block truncate text-muted">{member.email}</small>
      </div>
      <div className="flex items-center gap-2">
        {editable ? (
          <select
            aria-label={`Peran ${member.fullName || member.email}`}
            value={member.role}
            disabled={busy}
            onChange={(e) => onChangeRole(e.target.value as StoreRole)}
            className="rounded-lg border border-line bg-white px-2 py-1 text-sm"
          >
            {assignableRoles('owner').map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        ) : (
          <Badge>{ROLE_LABELS[member.role]}</Badge>
        )}
        {removable && (
          <Button variant="danger" small busy={busy} onClick={onRemove} aria-label={`Keluarkan ${member.fullName || member.email}`}>
            Keluarkan
          </Button>
        )}
      </div>
    </li>
  );
}

function AddMemberForm({ store, onAdded }: { store: MyStore; onAdded: () => void }) {
  const api = useApi();
  const roles = assignableRoles(store.role);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StoreRole>(roles.includes('cashier') ? 'cashier' : (roles[0] ?? 'staff'));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (roles.length === 0) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    const em = validateEmail(email);
    if (!em.ok) return setError(em.error);
    setBusy(true);
    setError(null);
    try {
      await api.addMember(store.id, em.value, role);
      setSuccess(`${em.value} ditambahkan sebagai ${ROLE_LABELS[role]}.`);
      setEmail('');
      onAdded();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h3 className="font-bold">Tambah anggota</h3>
      <p className="text-sm text-muted">Orang tersebut harus sudah membuat akun dengan email ini.</p>
      <form onSubmit={onSubmit} noValidate className="md:grid md:grid-cols-[1fr_180px_auto] md:items-end md:gap-3">
        <Field label="Email anggota" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select label="Peran" value={role} onChange={(e) => setRole(e.target.value as StoreRole)}>
          {roles.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </Select>
        <Button type="submit" busy={busy} className="my-3 w-full md:w-auto">Tambah</Button>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {success && <Notice tone="success">{success}</Notice>}
    </Card>
  );
}
