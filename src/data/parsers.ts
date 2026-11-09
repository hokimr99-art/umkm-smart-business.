import { isStoreRole } from '../lib/roles';
import type { Member, MyStore, Profile, Store } from './types';

// Responses are typed `unknown` and checked at runtime, so a schema drift
// surfaces as a clear error instead of silently wrong UI.

export class ParseError extends Error {
  constructor(what: string) {
    super(`Unexpected server response: ${what}`);
    this.name = 'ParseError';
  }
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

function str(r: Rec, k: string, what: string): string {
  const v = r[k];
  if (typeof v !== 'string') throw new ParseError(`${what}.${k}`);
  return v;
}
function strOrNull(r: Rec, k: string, what: string): string | null {
  const v = r[k];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new ParseError(`${what}.${k}`);
  return v;
}

export function parseStore(v: unknown): Store {
  if (!isRec(v)) throw new ParseError('store');
  return {
    id: str(v, 'id', 'store'),
    name: str(v, 'name', 'store'),
    slug: str(v, 'slug', 'store'),
    businessType: strOrNull(v, 'business_type', 'store'),
    currency: str(v, 'currency', 'store'),
    timezone: str(v, 'timezone', 'store'),
    createdAt: str(v, 'created_at', 'store'),
  };
}

/** Rows of `store_memberships` with embedded `stores`. */
export function parseMyStores(rows: unknown): MyStore[] {
  if (!Array.isArray(rows)) throw new ParseError('stores list');
  return rows
    .map((row: unknown): MyStore => {
      if (!isRec(row) || !isStoreRole(row.role)) throw new ParseError('membership');
      // PostgREST embeds a to-one relation as an object.
      const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
      return { ...parseStore(store), role: row.role };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export function parseMembers(rows: unknown): Member[] {
  if (!Array.isArray(rows)) throw new ParseError('members list');
  return rows.map((row: unknown): Member => {
    if (!isRec(row) || !isStoreRole(row.role)) throw new ParseError('member');
    return {
      membershipId: str(row, 'membership_id', 'member'),
      userId: str(row, 'user_id', 'member'),
      role: row.role,
      fullName: str(row, 'full_name', 'member'),
      email: str(row, 'email', 'member'),
      createdAt: str(row, 'created_at', 'member'),
    };
  });
}

export function parseProfile(v: unknown): Profile {
  if (!isRec(v)) throw new ParseError('profile');
  return { id: str(v, 'id', 'profile'), fullName: str(v, 'full_name', 'profile'), phone: strOrNull(v, 'phone', 'profile') };
}
