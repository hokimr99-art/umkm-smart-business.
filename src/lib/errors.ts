// Maps server error codes (raised by our RPCs) and Supabase Auth messages to
// clear Indonesian messages. Unknown errors get a generic message so internal
// details are not shown to users.

const CODE_MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Sesi Anda berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki izin untuk tindakan ini.',
  NOT_FOUND: 'Data tidak ditemukan.',
  INVALID_STORE_NAME: 'Nama usaha tidak valid.',
  INVALID_SLUG: 'Alamat toko tidak valid.',
  INVALID_BUSINESS_TYPE: 'Jenis usaha tidak valid.',
  INVALID_TIMEZONE: 'Zona waktu tidak valid.',
  INVALID_ROLE: 'Peran tidak valid.',
  SLUG_TAKEN: 'Alamat toko sudah dipakai. Coba alamat lain.',
  STORE_LIMIT_REACHED: 'Batas jumlah toko untuk akun ini sudah tercapai.',
  MEMBER_LIMIT_REACHED: 'Batas jumlah anggota toko sudah tercapai.',
  USER_NOT_FOUND: 'Email belum terdaftar. Minta orang tersebut membuat akun terlebih dahulu.',
  ALREADY_MEMBER: 'Orang ini sudah menjadi anggota toko.',
  CANNOT_ASSIGN_OWNER: 'Peran Pemilik tidak dapat diberikan dari sini.',
  CANNOT_CHANGE_OWN_ROLE: 'Anda tidak dapat mengubah peran Anda sendiri.',
  CANNOT_MODIFY_OWNER: 'Pemilik toko tidak dapat diubah atau dikeluarkan.',
  LAST_OWNER: 'Pemilik terakhir tidak dapat keluar dari toko.',
};

const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email atau kata sandi salah.'],
  [/user already registered/i, 'Email ini sudah terdaftar. Silakan masuk.'],
  [/email not confirmed/i, 'Email belum dikonfirmasi. Cek kotak masuk email Anda.'],
  [/rate limit|too many requests/i, 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'],
  [/password should be|weak password/i, 'Kata sandi terlalu lemah.'],
  [/failed to fetch|network|load failed/i, 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'],
];

export const GENERIC_ERROR = 'Terjadi kesalahan. Silakan coba lagi.';

function messageOf(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') return err.message;
  return '';
}

export function toUserMessage(err: unknown): string {
  const msg = messageOf(err);
  const code = msg.trim();
  if (code in CODE_MESSAGES) return CODE_MESSAGES[code] ?? GENERIC_ERROR;
  for (const [re, text] of AUTH_MESSAGES) {
    if (re.test(msg)) return text;
  }
  if (/permission denied|row-level security/i.test(msg)) return CODE_MESSAGES.FORBIDDEN ?? GENERIC_ERROR;
  return GENERIC_ERROR;
}
