import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Notice } from '../components/ui';
import { useApi } from '../data/ApiContext';
import { toUserMessage } from '../lib/errors';
import { slugify, validateBusinessType, validateSlug, validateStoreName } from '../lib/validation';

export function CreateStore({ onCreated, onCancel }: { onCreated: (storeId: string) => void; onCancel?: () => void }) {
  const api = useApi();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [businessType, setBusinessType] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = validateStoreName(name);
    const s = validateSlug(effectiveSlug);
    const t = validateBusinessType(businessType);
    const errs: Record<string, string> = {};
    if (!n.ok) errs.name = n.error;
    if (!s.ok) errs.slug = s.error;
    if (!t.ok) errs.businessType = t.error;
    setErrors(errs);
    if (!n.ok || !s.ok || !t.ok) return;
    setBusy(true);
    setServerError(null);
    try {
      onCreated(await api.createStore(n.value, s.value, t.value));
    } catch (err) {
      setServerError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4 pt-8">
      <Card>
        <h1 className="text-lg font-bold">Buat toko / usaha</h1>
        <p className="mt-1 text-sm text-muted">Anda akan menjadi Pemilik. Anggota tim bisa ditambahkan setelahnya.</p>
        <form onSubmit={onSubmit} noValidate>
          <Field label="Nama usaha" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="Contoh: Martabak Ani" />
          <Field
            label="Alamat toko"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            error={errors.slug}
            hint="Dipakai untuk tautan dan QR toko. Tidak dapat diubah setelah dibuat."
          />
          <Field label="Jenis usaha (opsional)" value={businessType} onChange={(e) => setBusinessType(e.target.value)} error={errors.businessType} placeholder="Contoh: Kuliner" />
          {serverError && <Notice tone="error">{serverError}</Notice>}
          <Button type="submit" busy={busy} className="w-full">Buat toko</Button>
          {onCancel && (
            <Button type="button" variant="ghost" className="mt-2 w-full" onClick={onCancel}>Batal</Button>
          )}
        </form>
      </Card>
    </main>
  );
}
