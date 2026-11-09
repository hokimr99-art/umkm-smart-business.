import type { StoreRole } from '../lib/roles';

export interface AuthUser {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  fullName: string;
  phone: string | null;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  currency: string;
  timezone: string;
  createdAt: string;
}

export interface MyStore extends Store {
  role: StoreRole;
}

export interface Member {
  membershipId: string;
  userId: string;
  role: StoreRole;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface StoreUpdate {
  name: string;
  businessType: string | null;
}

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'OTHER';

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

/** Everything the UI needs from the backend. Implemented by supabaseApi; faked in tests. */
export interface Api {
  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (event: AuthEvent, user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName: string): Promise<SignUpResult>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;

  getProfile(userId: string): Promise<Profile>;
  updateProfile(userId: string, fullName: string, phone: string | null): Promise<void>;
  isSuperAdmin(): Promise<boolean>;

  listMyStores(userId: string): Promise<MyStore[]>;
  createStore(name: string, slug: string, businessType: string | null): Promise<string>;
  updateStore(storeId: string, update: StoreUpdate): Promise<void>;

  listMembers(storeId: string): Promise<Member[]>;
  addMember(storeId: string, email: string, role: StoreRole): Promise<void>;
  updateMemberRole(membershipId: string, role: StoreRole): Promise<void>;
  removeMember(membershipId: string): Promise<void>;
}
