import { useState, type FormEvent } from 'react';
import { Brand } from '../components/Brand';
import { Button, Card, Field, Notice } from '../components/ui';
import { useApi } from '../data/ApiContext';
import { toUserMessage } from '../lib/errors';
import { validateEmail, validateFullName, validatePassword } from '../lib/validation';

type Mode = 'login' | 'register' | 'reset';

export function AuthPage() {
  const api = useApi();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setServerError(null);
    setInfo(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    setInfo(null);
    const errs: Record<string, string> = {};
    const em = validateEmail(email);
    if (!em.ok) errs.email = em.error;
    const pw = mode === 'reset' ? null : mode === 'register' ? validatePassword(password) : password ? null : { ok: false as const, error: 'Kata sandi wajib diisi.' };
    if (pw && !pw.ok) errs.password = pw.error;
    const nm = mode === 'register' ? validateFullName(fullName) : null;
    if (nm && !nm.ok) errs.fullName = nm.error;
    setErrors(errs);
    if (Object.keys(errs).length || !em.ok) return;

    setBusy(true);
    try {
      if (mode === 'login') {
        await api.signIn(em.value, password);
      } else if (mode === 'register') {
        const res = await api.signUp(em.value, password, nm && nm.ok ? nm.value : '');
        if (res.needsEmailConfirmation) {
          setInfo('Akun dibuat. Cek email Anda dan klik tautan konfirmasi, lalu masuk.');
          setMode('login');
          setPassword('');
        }
      } else {
        await api.requestPasswordReset(em.value);
        // Same message whether or not the email exists (no account enumeration).
        setInfo('Jika email terdaftar, tautan untuk mengatur ulang kata sandi telah dikirim.');
      }
    } catch (err) {
      setServerError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'login' ? 'Masuk' : mode === 'register' ? 'Buat akun' : 'Lupa kata sandi';

  return (
    <div className="min-h-screen">
      <header className="rounded-b-3xl bg-deep px-5 pb-8 pt-5 text-white">
        <Brand />
        <h1 className="mt-6 text-2xl font-extrabold leading-tight">Bisnis lebih teratur,<br />bertumbuh lebih cerdas.</h1>
        <p className="mt-1 text-sm text-[#c2d1ca]">Kelola operasional usaha dari satu tempat.</p>
      </header>
      <main className="mx-auto -mt-4 max-w-md px-4 pb-10">
        <Card>
          <h2 className="text-lg font-bold">{title}</h2>
          <form onSubmit={onSubmit} noValidate>
            {mode === 'register' && (
              <Field label="Nama lengkap" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
            )}
            <Field label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
            {mode !== 'reset' && (
              <Field
                label="Kata sandi"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                hint={mode === 'register' ? 'Minimal 8 karakter, berisi huruf dan angka.' : undefined}
              />
            )}
            {serverError && <Notice tone="error">{serverError}</Notice>}
            {info && <Notice tone="success">{info}</Notice>}
            <Button type="submit" busy={busy} className="mt-2 w-full">
              {mode === 'login' ? 'Masuk' : mode === 'register' ? 'Daftar' : 'Kirim tautan'}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
            {mode === 'login' ? (
              <>
                <button type="button" className="font-semibold text-brand" onClick={() => switchMode('register')}>Belum punya akun? Daftar</button>
                <button type="button" className="text-muted" onClick={() => switchMode('reset')}>Lupa kata sandi?</button>
              </>
            ) : (
              <button type="button" className="font-semibold text-brand" onClick={() => switchMode('login')}>← Kembali ke Masuk</button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
