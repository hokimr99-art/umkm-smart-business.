# UMKM SMART BUSINESS (nama kerja)

Platform bisnis multi-tenant untuk UMKM hingga perusahaan: satu fondasi, modular, aman, AI opsional.

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

1. Supabase Dashboard → proyek Anda → **SQL Editor** → tempel isi
   `supabase/migrations/20261109000001_phase1_foundation.sql` → **Run**.
   (Sebaiknya di proyek baru/kosong. Jika proyek sudah berisi tabel, tinjau dulu agar tidak bentrok.)
2. **Authentication → URL Configuration**: isi *Site URL* dengan alamat aplikasi.
3. Salin `.env.example` menjadi `.env.local`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API). Keduanya memang publik dan dilindungi RLS.
   **Jangan pernah** memakai `service_role` key di frontend.
4. Menjadikan akun sebagai Super Admin (sekali, lewat SQL Editor):
   `insert into public.platform_admins (user_id, note) values ('<UUID pengguna>', 'founder');`

## Model akses (Phase 1)

| Peran | Lihat toko | Ubah pengaturan toko | Lihat daftar tim | Tambah anggota | Ubah peran | Keluarkan anggota |
|---|---|---|---|---|---|---|
| Pemilik (owner) | ✅ | ✅ | ✅ | Manajer, Kasir, Staf | ✅ (bukan diri sendiri) | Semua kecuali pemilik |
| Manajer | ✅ | ✅ | ✅ | Kasir, Staf | ❌ | Kasir, Staf |
| Kasir / Staf | ✅ | ❌ | ❌ | ❌ | ❌ | Hanya keluar sendiri |
| Super Admin (platform) | Semua toko (baca saja) | ❌ | ✅ | ❌ | ❌ | ❌ |

Semua aturan ditegakkan di database (RLS + fungsi `SECURITY DEFINER`), bukan hanya di tampilan.
Perubahan toko dan keanggotaan tercatat di `audit_logs`.
