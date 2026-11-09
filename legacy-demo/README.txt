UMKM SMART BUSINESS — PWA v0.1

CARA MENJALANKAN
1. Ekstrak ZIP ini.
2. Unggah semua isi folder ke sebuah repository GitHub (branch main, folder root).
3. Buka Settings > Pages, pilih Deploy from a branch, branch main, folder /(root), lalu Save.
4. Setelah GitHub Pages aktif, buka URL yang diberikan GitHub lewat Chrome Android.
5. Dari menu Chrome (⋮), pilih "Tambahkan ke layar utama" atau "Install app" jika tersedia.

FITUR YANG SUDAH BERFUNGSI DI VERSI DEMO
- Dashboard ringkasan.
- Kasir/POS: keranjang, checkout, pengurangan stok, catatan pemasukan.
- Produk: tambah produk dan ubah stok.
- Keuangan: ringkasan pemasukan/pengeluaran dan catat biaya.
- Marketing: rencana konten multi-kanal, status persetujuan semiotomatis.
- Penyimpanan lokal melalui browser (localStorage).

BATASAN PENTING
- Data hanya tersimpan di browser/perangkat yang digunakan. Hapus data browser dapat menghapus data aplikasi.
- Belum ada login, database cloud, multi-tenant, sinkronisasi antarperangkat, backup server, AI generation, pembayaran langganan, atau publikasi media sosial.
- Tombol Setujui hanya menyimpan persetujuan di aplikasi. Belum mengirim konten ke Facebook, Instagram, TikTok, YouTube, atau WhatsApp.
- Integrasi produksi harus memakai backend aman, autentikasi, database, dan API resmi masing-masing platform. Jangan pernah menaruh token rahasia API di index.html.
