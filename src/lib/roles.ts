// Mirrors the role rules enforced in the database RPCs. The UI uses these only
// to decide what to show; the server re-checks every action.

export const STORE_ROLES = ['owner', 'manager', 'cashier', 'staff'] as const;
export type StoreRole = (typeof STORE_ROLES)[number];

export const ROLE_LABELS: Record<StoreRole, string> = {
  owner: 'Pemilik',
  manager: 'Manajer',
  cashier: 'Kasir',
  staff: 'Staf',
};

export function isStoreRole(value: unknown): value is StoreRole {
  return typeof value === 'string' && (STORE_ROLES as readonly string[]).includes(value);
}

export function canManageMembers(role: StoreRole): boolean {
  return role === 'owner' || role === 'manager';
}

export function canEditStore(role: StoreRole): boolean {
  return role === 'owner' || role === 'manager';
}

export function canChangeRoles(role: StoreRole): boolean {
  return role === 'owner';
}

/** Roles the actor may grant when adding a member. Owner is never assignable. */
export function assignableRoles(actor: StoreRole): StoreRole[] {
  if (actor === 'owner') return ['manager', 'cashier', 'staff'];
  if (actor === 'manager') return ['cashier', 'staff'];
  return [];
}

export function canRemoveMember(actor: StoreRole, target: StoreRole, isSelf: boolean): boolean {
  if (isSelf) return target !== 'owner';
  if (actor === 'owner') return target !== 'owner';
  if (actor === 'manager') return target === 'cashier' || target === 'staff';
  return false;
}
