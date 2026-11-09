import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Notice } from '../components/ui';
import { useApi } from '../data/ApiContext';
import type { MyStore } from '../data/types';
import { toUserMessage } from '../lib/errors';
import { validateBusinessType, validateStoreName } from '../lib/validation';

export function StoreSettings({ store, onSaved }: { store: MyStore; onSaved: () => void }) {
  const api = useApi();
  const [name, setName] = useState(store.name);
  const [businessType, setBusinessType] = useState(store.businessType ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = validateStoreName(name);
    const t = validateBusinessType(businessType);
    const errs: Record<string, string> = {};
    if (!n.ok) errs.name = n.error;
    if (!t.ok) errs.businessType = t.error;
    setErrors(errs);
    if (!n.ok || !t.ok) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.updateStore(store.id, { name: n.value, businessType: t.value });
      setMsg({ tone: 'success', text: 'Pengaturan toko disimpan.' });
      onSaved();
    } catch (err) {
      setMsg({ tone: 'error', text: toUserMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="settings-title">
      <h2 id="settings-title" className="my-3 text-lg font-bold">Pengaturan toko</h2>
      <Card>
        <form onSubmit={onSubmit} noValidate>
          <Field label="Nama usaha" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <Field label="Jenis usaha" value={businessType} onChange={(e) => setBusinessType(e.target.value)} error={errors.businessType} />
          <Field label="Alamat toko" value={store.slug} readOnly disabled hint="Alamat toko tidak dapat diubah karena dipakai untuk QR." />
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <Button type="submit" busy={busy} className="w-full md:w-auto">Simpan</Button>
        </form>
      </Card>
    </section>
  );
}
