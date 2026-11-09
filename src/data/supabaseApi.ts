import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { StoreRole } from '../lib/roles';
import { parseMembers, parseMyStores, parseProfile } from './parsers';
import type { Api, AuthEvent, AuthUser } from './types';

function toAuthUser(u: User | null | undefined): AuthUser | null {
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** Redirect target for email links: the app's own URL without query/hash. */
function appUrl(): string {
  return window.location.origin + window.location.pathname;
}

export function createSupabaseApi(url: string, anonKey: string): Api {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  return {
    async getUser() {
      // getSession reads local storage; good enough for routing. Every data
      // request is still authorized by the database with the JWT.
      const { data, error } = await sb.auth.getSession();
      check(error);
      return toAuthUser(data.session?.user);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        const mapped: AuthEvent =
          event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY' ? event : 'OTHER';
        cb(mapped, toAuthUser(session?.user));
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      check(error);
    },
    async signUp(email, password, fullName) {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: appUrl() },
      });
      check(error);
      return { needsEmailConfirmation: !data.session };
    },
    async requestPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
      check(error);
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      check(error);
    },
    async signOut() {
      const { error } = await sb.auth.signOut();
      check(error);
    },

    async getProfile(userId) {
      const { data, error } = await sb.from('profiles').select('id, full_name, phone').eq('id', userId).single();
      check(error);
      return parseProfile(data);
    },
    async updateProfile(userId, fullName, phone) {
      const { error } = await sb.from('profiles').update({ full_name: fullName, phone }).eq('id', userId);
      check(error);
    },
    async isSuperAdmin() {
      const { data, error } = await sb.rpc('is_super_admin');
      check(error);
      return data === true;
    },

    async listMyStores(userId) {
      const { data, error } = await sb
        .from('store_memberships')
        .select('role, stores(id, name, slug, business_type, currency, timezone, created_at)')
        .eq('user_id', userId);
      check(error);
      return parseMyStores(data);
    },
    async createStore(name, slug, businessType) {
      const { data, error } = await sb.rpc('create_store', {
        p_name: name, p_slug: slug, p_business_type: businessType,
      });
      check(error);
      if (typeof data !== 'string') throw new Error('Unexpected server response: create_store');
      return data;
    },
    async updateStore(storeId, update) {
      const { data, error } = await sb
        .from('stores')
        .update({ name: update.name, business_type: update.businessType })
        .eq('id', storeId)
        .select('id');
      check(error);
      // RLS turns an unauthorized update into "0 rows" rather than an error.
      if (!Array.isArray(data) || data.length === 0) throw new Error('FORBIDDEN');
    },

    async listMembers(storeId) {
      const { data, error } = await sb.rpc('list_store_members', { p_store_id: storeId });
      check(error);
      return parseMembers(data);
    },
    async addMember(storeId, email, role: StoreRole) {
      const { error } = await sb.rpc('add_store_member', { p_store_id: storeId, p_email: email, p_role: role });
      check(error);
    },
    async updateMemberRole(membershipId, role: StoreRole) {
      const { error } = await sb.rpc('update_member_role', { p_membership_id: membershipId, p_role: role });
      check(error);
    },
    async removeMember(membershipId) {
      const { error } = await sb.rpc('remove_store_member', { p_membership_id: membershipId });
      check(error);
    },
  };
}
