# Status Proyek — UMKM SMART BUSINESS (nama kerja)

Terakhir diperbarui: 9 November 2026. Dokumen ini membedakan tegas: **dirancang**, **ditulis dalam kode**,
**terhubung**, **teruji**, dan **siap produksi**.

## Keputusan arsitektur (disetujui Founder, 9 Nov 2026)

- Frontend: **Vite + React + TypeScript strict + Tailwind** (SPA, cocok untuk kasir offline dan Android via
  Capacitor nanti). Next.js tidak dipakai karena menambah lapisan server yang perannya sudah diambil Supabase.
- Backend: **Supabase** (PostgreSQL, Auth, RLS, RPC; Edge Functions untuk AI Gateway di Phase 4).
- Pengembangan di repo ini; prototipe lama dipindah ke `legacy-demo/` (tidak dihapus).

## Status per fase

| Fase | Dirancang | Kode | Terhubung ke Supabase nyata | Teruji | Produksi |
|---|---|---|---|---|---|
| 1 Foundation | ✅ | ✅ | ❌ (belum ada akses proyek) | ✅ lokal (lihat bawah) | ❌ |
| 2 Core Business | ✅ | ❌ (hanya demo lama di `legacy-demo/`) | ❌ | ❌ | ❌ |
| 3 Operations | ✅ | ❌ | ❌ | ❌ | ❌ |
| 4 AI Backend | ✅ | ❌ | ❌ | ❌ | ❌ |
| 5 AI Agents | ✅ | ❌ | ❌ | ❌ | ❌ |
| 6 Integrations | ✅ | ❌ | ❌ | ❌ | ❌ |
| 7 Monetization | ✅ | ❌ | ❌ | ❌ | ❌ |
| 8 Hardening | ✅ | ❌ | ❌ | ❌ | ❌ |
| 9 Release | ✅ | ❌ | ❌ | ❌ | ❌ |

### Phase 1 — yang sudah ada

| Komponen | Kode | Bukti pengujian |
|---|---|---|
| Profiles (auto-dibuat saat daftar) | `supabase/migrations/…phase1_foundation.sql` | tes SQL |
| Stores (tenant) + slug untuk Universal QR | migrasi + `CreateStore`, `StoreSettings` | tes SQL + komponen |
| Store memberships + role (owner/manager/cashier/staff) | migrasi + `Members` | tes SQL + komponen |
| Super Admin (`platform_admins`, baca semua) | migrasi | tes SQL |
| RLS + hak akses kolom + RPC terjaga | migrasi | 67 asersi SQL; *mutation test*: 4 pelemahan sengaja semuanya tertangkap |
| Audit log (toko & keanggotaan) | migrasi | tes SQL |
| Auth UI: daftar, masuk, keluar, lupa/atur ulang sandi | `src/pages/AuthPage.tsx`, `PasswordRecovery.tsx` | tes komponen; *belum diuji terhadap Supabase Auth nyata* |
| UI foundation: mobile-first, Bahasa Indonesia, Rupiah, zona waktu toko | `src/components`, `src/lib/format.ts` | tes unit + smoke test browser ukuran HP |

**Catatan jujur:** tes database dijalankan di PostgreSQL 16 lokal dengan *shim* yang meniru `auth.users`,
`auth.uid()`, dan peran Supabase (`supabase/tests/setup/`). Ini menguji logika RLS secara nyata, tetapi
**bukan** pengganti verifikasi di proyek Supabase sungguhan.

### Belum dikerjakan di Phase 1

- Menjalankan migrasi di proyek Supabase nyata + uji alur login end-to-end.
- Transfer kepemilikan toko, undangan via email (saat ini anggota harus sudah punya akun).
- Pembatasan laju (rate limiting) khusus aplikasi — saat ini mengandalkan bawaan Supabase Auth.
- PWA (manifest + service worker) untuk aplikasi baru — dijadwalkan bersama kasir offline.
- Konsol Super Admin (UI) — Phase berikutnya; saat ini hanya fondasi database.

## Temuan audit prototipe lama (`legacy-demo/`)

| # | Temuan | Risiko | Status |
|---|---|---|---|
| T1 | `sw.js` diawali kata `JavaScript` → service worker gagal, offline tidak jalan | Tinggi | Tidak diperbaiki (demo dipensiunkan) |
| T2 | `manifest.webmanifest` diawali `JSON` → manifest invalid, tidak bisa di-install | Tinggi | Sama |
| T3 | Keranjang bisa melebihi stok → stok negatif | Tinggi | Dicatat untuk desain kasir Phase 2 (validasi di server) |
| T4 | Tanggal "hari ini" memakai UTC | Sedang | Sudah dicegah di kode baru (`localDateKey`, tes regresi) |
| T5 | Data hanya di localStorage | Tinggi | Diganti Supabase |

Demo di GitHub Pages (branch `main`) **belum diubah** dan masih berjalan seperti semula.

## Usulan nama merek (belum diputuskan)

Lumbra (rekomendasi), Orvanta, Torana, Saguna, Rangka, Kalpa, Ventara, Opsira, Gunara, Ekora.
Belum ada pemeriksaan resmi merek/domain — wajib dicek di PDKI DJKI sebelum dipilih. Nama di kode tidak diubah.

## Langkah berikutnya

1. Founder: siapkan proyek Supabase (atau beri tahu nama proyek yang sudah ada), jalankan migrasi Phase 1.
2. Verifikasi end-to-end di Supabase nyata: daftar → buat toko → tambah anggota → cek isolasi.
3. Phase 2: Produk, Kategori, Kasir (dengan validasi stok di server + antrean offline), Transaksi,
   Inventaris, Pengeluaran, Laporan, Pelanggan.
4. Deploy (preview) hanya setelah izin Founder.
