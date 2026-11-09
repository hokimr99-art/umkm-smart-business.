import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useId } from 'react';

type Variant = 'primary' | 'light' | 'dark' | 'danger' | 'ghost';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand/90',
  light: 'bg-brand-soft text-brand hover:bg-brand-soft/70',
  dark: 'bg-deep text-white hover:bg-deep/90',
  danger: 'bg-danger-soft text-danger hover:bg-danger-soft/70',
  ghost: 'bg-transparent text-muted hover:text-ink',
};

export function Button({
  variant = 'primary',
  small = false,
  busy = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
      } ${VARIANTS[variant]} ${className}`}
    >
      {busy && <Spinner small />}
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white p-4 shadow-[0_3px_14px_#173b2910] ${className}`}>{children}</div>;
}

export function Field({
  label,
  error,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: string }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="my-3 grid gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
        className={`w-full rounded-xl border bg-white px-3 py-2.5 text-ink outline-brand ${error ? 'border-danger' : 'border-line'}`}
      />
      {error ? (
        <p id={`${id}-err`} className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({ label, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="my-3 grid gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      <select id={id} {...rest} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink outline-brand">
        {children}
      </select>
    </div>
  );
}

export function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'error' | 'success'; children: ReactNode }) {
  const cls =
    tone === 'error'
      ? 'border-danger/30 bg-danger-soft text-danger'
      : tone === 'success'
        ? 'border-brand/20 bg-brand-soft text-brand'
        : 'border-[#f1dfb5] bg-warn-soft text-warn';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`my-3 rounded-xl border p-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Spinner({ small = false, label }: { small?: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2" role={label ? 'status' : undefined}>
      <span
        aria-hidden="true"
        className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${small ? 'h-3.5 w-3.5' : 'h-6 w-6'}`}
      />
      {label && <span className="text-sm text-muted">{label}</span>}
    </span>
  );
}

export function LoadingBlock({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-12 text-brand">
      <Spinner label={label} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-3 py-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="px-3 py-8 text-center">
      <p className="font-semibold text-danger">{message}</p>
      {onRetry && (
        <Button variant="light" small className="mt-3" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded-full bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand">{children}</span>;
}
