import { vi } from 'vitest';
import type { Api, Member, MyStore } from '../data/types';

export const sampleStore: MyStore = {
  id: 'store-1', name: 'Martabak Ani', slug: 'martabak-ani', businessType: 'Kuliner',
  currency: 'IDR', timezone: 'Asia/Jakarta', createdAt: '2026-11-09T01:00:00Z', role: 'owner',
};

export const sampleMembers: Member[] = [
  { membershipId: 'm-owner', userId: 'u-owner', role: 'owner', fullName: 'Ani', email: 'ani@test.id', createdAt: 't' },
  { membershipId: 'm-mgr', userId: 'u-mgr', role: 'manager', fullName: 'Maya', email: 'maya@test.id', createdAt: 't' },
  { membershipId: 'm-cash', userId: 'u-cash', role: 'cashier', fullName: 'Citra', email: 'citra@test.id', createdAt: 't' },
];

/** In-memory Api with vi.fn spies; override any method per test. */
export function fakeApi(overrides: Partial<Api> = {}): Api {
  const base: Api = {
    getUser: vi.fn(async () => null),
    onAuthChange: vi.fn(() => () => {}),
    signIn: vi.fn(async () => {}),
    signUp: vi.fn(async () => ({ needsEmailConfirmation: true })),
    requestPasswordReset: vi.fn(async () => {}),
    updatePassword: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    getProfile: vi.fn(async (id: string) => ({ id, fullName: 'Ani', phone: null })),
    updateProfile: vi.fn(async () => {}),
    isSuperAdmin: vi.fn(async () => false),
    listMyStores: vi.fn(async () => [sampleStore]),
    createStore: vi.fn(async () => 'store-new'),
    updateStore: vi.fn(async () => {}),
    listMembers: vi.fn(async () => sampleMembers),
    addMember: vi.fn(async () => {}),
    updateMemberRole: vi.fn(async () => {}),
    removeMember: vi.fn(async () => {}),
  };
  return { ...base, ...overrides };
}
