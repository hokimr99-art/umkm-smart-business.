export function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto max-w-xl p-5">
      <h1 className="text-xl font-extrabold">Koneksi Supabase belum dikonfigurasi</h1>
      <p className="mt-2 text-sm text-muted">
        Aplikasi ini membutuhkan proyek Supabase. Nilai berikut belum diisi atau tidak valid:
      </p>
      <ul className="mt-2 list-disc pl-6 text-sm">
        {missing.map((m) => (
          <li key={m}><code>{m}</code></li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Lihat bagian “Menghubungkan Supabase” di README. Jangan pernah memakai service_role key di aplikasi ini.
      </p>
    </main>
  );
}
