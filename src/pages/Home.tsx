import { Card, Notice } from '../components/ui';
import type { MyStore } from '../data/types';
import { formatDate } from '../lib/format';

// Phase 2+ modules are listed honestly as not yet available.
const UPCOMING: Array<{ icon: string; name: string; phase: string }> = [
  { icon: '🛒', name: 'Kasir / POS', phase: 'Phase 2' },
  { icon: '📦', name: 'Produk & Kategori', phase: 'Phase 2' },
  { icon: '📊', name: 'Inventaris', phase: 'Phase 2' },
  { icon: '💳', name: 'Keuangan', phase: 'Phase 2' },
  { icon: '🧾', name: 'Laporan', phase: 'Phase 2' },
  { icon: '🤝', name: 'Pelanggan', phase: 'Phase 2' },
  { icon: '🏬', name: 'Cabang & Gudang', phase: 'Phase 3' },
  { icon: '🔗', name: 'Universal QR', phase: 'Phase 3' },
];

export function Home({ store }: { store: MyStore }) {
  return (
    <section aria-labelledby="home-title">
      <div className="my-3 flex items-center justify-between">
        <h2 id="home-title" className="text-lg font-bold">Ringkasan</h2>
        <span className="text-sm text-muted">{formatDate(new Date(), store.timezone)}</span>
      </div>
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><dt className="text-muted">Jenis usaha</dt><dd className="font-semibold">{store.businessType ?? '-'}</dd></div>
          <div><dt className="text-muted">Mata uang</dt><dd className="font-semibold">{store.currency}</dd></div>
          <div><dt className="text-muted">Zona waktu</dt><dd className="font-semibold">{store.timezone}</dd></div>
          <div><dt className="text-muted">Dibuat</dt><dd className="font-semibold">{formatDate(store.createdAt, store.timezone)}</dd></div>
        </dl>
      </Card>

      <h2 className="mb-3 mt-6 text-lg font-bold">Modul bisnis</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {UPCOMING.map((m) => (
          <div key={m.name} aria-disabled="true" className="rounded-2xl border border-dashed border-line bg-white/60 p-3">
            <div aria-hidden="true" className="text-xl">{m.icon}</div>
            <div className="mt-1 text-sm font-semibold">{m.name}</div>
            <div className="text-xs text-muted">Belum tersedia · {m.phase}</div>
          </div>
        ))}
      </div>
      <Notice>
        Fondasi (Phase 1) aktif: akun, toko, tim, dan hak akses. Modul operasional di atas sedang dibangun dan belum dapat dipakai.
      </Notice>
    </section>
  );
}
