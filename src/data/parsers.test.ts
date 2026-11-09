import { describe, expect, it } from 'vitest';
import { ParseError, parseMembers, parseMyStores, parseProfile } from './parsers';

const store = {
  id: 's1', name: 'Kopi Budi', slug: 'kopi-budi', business_type: null,
  currency: 'IDR', timezone: 'Asia/Jakarta', created_at: '2026-11-09T00:00:00Z',
};

describe('parsers', () => {
  it('parses memberships with embedded store, sorted by name', () => {
    const out = parseMyStores([
      { role: 'cashier', stores: { ...store, id: 's2', name: 'Warung Z' } },
      { role: 'owner', stores: store },
    ]);
    expect(out.map((s) => [s.name, s.role])).toEqual([['Kopi Budi', 'owner'], ['Warung Z', 'cashier']]);
    expect(out[0]?.businessType).toBeNull();
  });
  it('rejects unknown roles (no privilege from bad data)', () => {
    expect(() => parseMyStores([{ role: 'super_admin', stores: store }])).toThrow(ParseError);
  });
  it('rejects malformed rows', () => {
    expect(() => parseMyStores({})).toThrow(ParseError);
    expect(() => parseMembers([{ role: 'staff' }])).toThrow(ParseError);
    expect(() => parseProfile({ id: 1 })).toThrow(ParseError);
  });
  it('parses members', () => {
    expect(parseMembers([{ membership_id: 'm', user_id: 'u', role: 'staff', full_name: 'Sari', email: 's@x.id', created_at: 't' }]))
      .toEqual([{ membershipId: 'm', userId: 'u', role: 'staff', fullName: 'Sari', email: 's@x.id', createdAt: 't' }]);
  });
});
