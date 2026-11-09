import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, ErrorState, Field, LoadingBlock, Notice } from '../components/ui';
import { useApi } from '../data/ApiContext';
import type { AuthUser } from '../data/types';
import { toUserMessage } from '../lib/errors';
import { useAsync } from '../lib/useAsync';
import { validateFullName, validatePhone } from '../lib/validation';

export function ProfilePage({ user }: { user: AuthUser }) {
  const api = useApi();
  const [profile, reload] = useAsync(() => api.getProfile(user.id), [api, user.id]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile.status === 'ready') {
      setFullName(profile.data.fullName);
      setPhone(profile.data.phone ?? '');
    }
  }, [profile]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = validateFullName(fullName);
    const p = validatePhone(phone);
    const errs: Record<string, string> = {};
    if (!n.ok) errs.fullName = n.error;
    if (!p.ok) errs.phone = p.error;
    setErrors(errs);
    if (!n.ok || !p.ok) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.updateProfile(user.id, n.value, p.value);
      setMsg({ tone: 'success', text: 'Profil disimpan.' });
    } catch (err) {
      setMsg({ tone: 'error', text: toUserMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="profile-title">
      <h2 id="profile-title" className="my-3 text-lg font-bold">Akun saya</h2>
      <Card>
        {profile.status === 'loading' && <LoadingBlock />}
        {profile.status === 'error' && <ErrorState message={profile.message} onRetry={reload} />}
        {profile.status === 'ready' && (
          <form onSubmit={onSubmit} noValidate>
            <Field label="Email" value={user.email} readOnly disabled />
            <Field label="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
            <Field label="Nomor telepon (opsional)" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
            {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
            <Button type="submit" busy={busy} className="w-full md:w-auto">Simpan profil</Button>
          </form>
        )}
      </Card>
    </section>
  );
}
