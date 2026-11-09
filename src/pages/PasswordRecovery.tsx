import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Notice } from '../components/ui';
import { useApi } from '../data/ApiContext';
import { toUserMessage } from '../lib/errors';
import { validatePassword } from '../lib/validation';

export function PasswordRecovery({ onDone }: { onDone: () => void }) {
  const api = useApi();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const pw = validatePassword(password);
    if (!pw.ok) return setError(pw.error);
    setBusy(true);
    setError(null);
    try {
      await api.updatePassword(pw.value);
      onDone();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4 pt-10">
      <Card>
        <h1 className="text-lg font-bold">Atur kata sandi baru</h1>
        <form onSubmit={onSubmit} noValidate>
          <Field label="Kata sandi baru" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Minimal 8 karakter, berisi huruf dan angka." />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" busy={busy} className="w-full">Simpan kata sandi</Button>
        </form>
      </Card>
    </main>
  );
}
