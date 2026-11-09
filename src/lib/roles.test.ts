import { describe, expect, it } from 'vitest';
import { assignableRoles, canChangeRoles, canManageMembers, canRemoveMember, isStoreRole } from './roles';

describe('roles', () => {
  it('recognises valid roles only', () => {
    expect(isStoreRole('cashier')).toBe(true);
    expect(isStoreRole('super_admin')).toBe(false);
    expect(isStoreRole(1)).toBe(false);
  });
  it('owner can never be assigned', () => {
    for (const r of ['owner', 'manager', 'cashier', 'staff'] as const) {
      expect(assignableRoles(r)).not.toContain('owner');
    }
  });
  it('manager can only grant cashier and staff', () => {
    expect(assignableRoles('manager')).toEqual(['cashier', 'staff']);
    expect(assignableRoles('cashier')).toEqual([]);
  });
  it('only owner changes roles; owner and manager manage members', () => {
    expect(canChangeRoles('owner')).toBe(true);
    expect(canChangeRoles('manager')).toBe(false);
    expect(canManageMembers('manager')).toBe(true);
    expect(canManageMembers('staff')).toBe(false);
  });
  it('removal rules match the database', () => {
    expect(canRemoveMember('owner', 'manager', false)).toBe(true);
    expect(canRemoveMember('owner', 'owner', true)).toBe(false);
    expect(canRemoveMember('manager', 'manager', false)).toBe(false);
    expect(canRemoveMember('manager', 'staff', false)).toBe(true);
    expect(canRemoveMember('cashier', 'cashier', true)).toBe(true);
    expect(canRemoveMember('cashier', 'staff', false)).toBe(false);
  });
});
