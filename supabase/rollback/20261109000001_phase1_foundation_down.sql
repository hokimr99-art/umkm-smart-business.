-- ROLLBACK for 20261109000001_phase1_foundation.sql
-- DESTRUCTIVE: drops all Phase 1 tables and their data.
-- Use ONLY before real customer data exists, and only after a backup
-- (Supabase Dashboard -> Database -> Backups, or pg_dump).

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.remove_store_member(uuid);
drop function if exists public.update_member_role(uuid, public.store_role);
drop function if exists public.add_store_member(uuid, text, public.store_role);
drop function if exists public.list_store_members(uuid);
drop function if exists public.create_store(text, text, text);

drop table if exists public.audit_logs;
drop table if exists public.store_memberships;
drop table if exists public.stores;
drop table if exists public.platform_admins;
drop table if exists public.profiles;

drop function if exists public.audit_row_change();
drop function if exists public.handle_new_user();
drop function if exists public.validate_store_timezone();
drop function if exists public.set_updated_at();
drop function if exists public.has_store_role(uuid, public.store_role[]);
drop function if exists public.is_store_member(uuid);
drop function if exists public.current_store_role(uuid);
drop function if exists public.is_super_admin();

drop type if exists public.store_role;
