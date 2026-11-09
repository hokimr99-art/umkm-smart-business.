# Lumbra

Platform bisnis multi-tenant untuk UMKM hingga perusahaan: satu fondasi, modular, aman, AI opsional.

> Nama merek **Lumbra** dipilih Founder pada 9 Nov 2026 (sebelumnya nama kerja: UMKM SMART BUSINESS).
> Pemeriksaan resmi merek (PDKI DJKI), domain, dan nama aplikasi di Play Store **belum dilakukan**.

> **Status: Phase 1 — Foundation (kode + tes lokal).** Belum terhubung ke proyek Supabase nyata dan belum
> di-deploy. Lihat [`docs/STATUS.md`](docs/STATUS.md) untuk status jujur setiap fase.

## Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React 19 + TypeScript (strict) + Vite + Tailwind CSS 4 — mobile-first, PWA-ready |
| Backend | Supabase: PostgreSQL, Auth, Row Level Security, RPC (fungsi SQL) |
| Tes | Vitest + Testing Library (UI & logika), tes SQL untuk RLS di PostgreSQL lokal |
| CI | GitHub Actions: typecheck, unit test, build, migrasi + tes RLS |

## Struktur

```
src/lib/        logika murni: validasi, role, format Rupiah/tanggal, pesan error (+ tes)
src/data/       antarmuka Api, implementasi Supabase, parser respons (+ tes)
src/auth/       status sesi (login, logout, pemulihan kata sandi)
src/pages/      layar aplikasi (+ tes komponen)
supabase/migrations/  skema database (aditif, dapat ditinjau)
supabase/rollback/    skrip pembatalan migrasi (destruktif, hanya sebelum ada data nyata)
supabase/tests/       tes RLS & isolasi tenant
legacy-demo/    prototipe PWA v0.1 (localStorage) — disimpan sebagai acuan UI, tidak dipakai lagi
```

## Perintah

```bash
npm ci              # instal dependensi (persis sesuai package-lock.json)
npm run dev         # server pengembangan
npm run typecheck   # tsc --noEmit
npm test            # unit + komponen
npm run build       # build produksi ke dist/
npm run test:db     # migrasi + tes RLS di PostgreSQL lokal sementara (butuh PostgreSQL terinstal)
```

## Menghubungkan Supabase

> ⚠️ **Proyek Supabase lama sudah ada** (dibuat sebelumnya, berisi `profiles`, `stores`, `store_members`, fungsi
> `is_store_member` / `is_store_owner`, dan trigger profil/pemilik otomatis). Migrasi
> `supabase/migrations/20261109000001_phase1_foundation.sql` **BELUM BOLEH dijalankan di proyek itu** —
> nama tabel, fungsi, dan trigger akan bentrok (risiko: migrasi gagal setengah jalan atau pendaftaran pengguna
> gagal karena profil dibuat dua kali). Migrasi akan disesuaikan dengan skema asli setelah skema itu diperiksa.

Langkah aman (hanya membaca, tidak mengubah apa pun):

1. Supabase Dashboard → proyek → **SQL Editor** → **New query**.
2. Tempel isi `supabase/inspect/schema_snapshot.sql` → **Run**. Query ini hanya membaca katalog sistem
   (struktur tabel, policy, fungsi, trigger, jumlah baris) — tidak membaca isi data dan tidak memuat secret.
3. Salin hasilnya untuk ditinjau.

Setelah migrasi penyesuaian siap dan disetujui:

- **Authentication → URL Configuration**: isi *Site URL* dengan alamat aplikasi.
- Salin `.env.example` menjadi `.env.local`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
  (Project Settings → API). Keduanya publik dan dilindungi RLS. **Jangan pernah** memakai `service_role` key
  di frontend.

## Model akses (Phase 1)

| Peran | Lihat toko | Ubah pengaturan toko | Lihat daftar tim | Tambah anggota | Ubah peran | Keluarkan anggota |
|---|---|---|---|---|---|---|
| Pemilik (owner) | ✅ | ✅ | ✅ | Manajer, Kasir, Staf | ✅ (bukan diri sendiri) | Semua kecuali pemilik |
| Manajer | ✅ | ✅ | ✅ | Kasir, Staf | ❌ | Kasir, Staf |
| Kasir / Staf | ✅ | ❌ | ❌ | ❌ | ❌ | Hanya keluar sendiri |
| Super Admin (platform) | Semua toko (baca saja) | ❌ | ✅ | ❌ | ❌ | ❌ |

Semua aturan ditegakkan di database (RLS + fungsi `SECURITY DEFINER`), bukan hanya di tampilan.
Perubahan toko dan keanggotaan tercatat di `audit_logs`.
