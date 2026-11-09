-- Phase 1 database tests: tenant isolation, RBAC, RLS, RPC guards, audit.
-- Run with: npm run test:db   (see scripts/test-db.sh)
\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser)
-- ---------------------------------------------------------------------------
select tests.create_user('owner.a@test.local', 'Ani Pemilik') as owner_a \gset
select tests.create_user('owner.b@test.local', 'Budi Pemilik') as owner_b \gset
select tests.create_user('manager.a@test.local', 'Maya Manajer') as manager_a \gset
select tests.create_user('cashier.a@test.local', 'Citra Kasir') as cashier_a \gset
select tests.create_user('staff.a@test.local', 'Sari Staf') as staff_a \gset
select tests.create_user('outsider@test.local', 'Odi Luar') as outsider \gset
select tests.create_user('admin@test.local', 'Super Admin') as admin \gset
insert into public.platform_admins (user_id, note) values (:'admin', 'test');

-- ---------------------------------------------------------------------------
-- Signup trigger
-- ---------------------------------------------------------------------------
select tests.ok(
  (select full_name from public.profiles where id = :'owner_a') = 'Ani Pemilik',
  'signup trigger creates profile with full_name');

-- ---------------------------------------------------------------------------
-- Anonymous access is denied everywhere
-- ---------------------------------------------------------------------------
set role anon;
select tests.throws('select * from public.stores', 'permission denied', 'anon cannot read stores');
select tests.throws('select * from public.profiles', 'permission denied', 'anon cannot read profiles');
select tests.throws('select * from public.store_memberships', 'permission denied', 'anon cannot read memberships');
select tests.throws('select * from public.audit_logs', 'permission denied', 'anon cannot read audit logs');
select tests.throws($$select public.create_store('Toko', 'toko-anon')$$, 'permission denied', 'anon cannot call create_store');
reset role;

-- ---------------------------------------------------------------------------
-- Store creation
-- ---------------------------------------------------------------------------
set role authenticated;
select tests.as_user(:'owner_a');
select public.create_store('Martabak Ani', 'martabak-ani', 'Kuliner') as store_a \gset
select tests.ok(public.current_store_role(:'store_a') = 'owner', 'creator becomes owner of new store');

select tests.throws($$select public.create_store('A', 'toko-a1')$$, 'INVALID_STORE_NAME', 'store name too short rejected');
select tests.throws($$select public.create_store('Toko Valid', 'Bad Slug!')$$, 'INVALID_SLUG', 'invalid slug rejected');
select tests.throws($$select public.create_store('Toko Valid', '-ab')$$, 'INVALID_SLUG', 'slug starting with dash rejected');
select tests.throws($$select public.create_store('Toko Kembar', 'martabak-ani')$$, 'SLUG_TAKEN', 'duplicate slug rejected');

select tests.as_user(:'owner_b');
select public.create_store('Kopi Budi', 'kopi-budi', 'Kafe') as store_b \gset

select tests.clear_user();
select tests.throws($$select public.create_store('Tanpa Login', 'tanpa-login')$$, 'NOT_AUTHENTICATED', 'authenticated role without user id rejected');

-- ---------------------------------------------------------------------------
-- Tenant isolation
-- ---------------------------------------------------------------------------
select tests.as_user(:'owner_a');
select tests.ok((select count(*) from public.stores) = 1, 'owner A sees exactly one store');
select tests.ok((select count(*) from public.stores where id = :'store_b') = 0, 'owner A cannot see store B');
select tests.ok((select count(*) from public.store_memberships where store_id = :'store_b') = 0, 'owner A cannot see store B memberships');
select tests.ok((select count(*) from public.audit_logs where store_id = :'store_b') = 0, 'owner A cannot see store B audit logs');
select tests.ok((select count(*) from public.profiles) = 1, 'user sees only own profile');
select tests.throws(format('select * from public.list_store_members(%L)', :'store_b'), 'FORBIDDEN', 'owner A cannot list store B members');

with u as (update public.stores set name = 'Diretas' where id = :'store_b' returning 1)
select tests.ok(count(*) = 0, 'owner A cannot update store B') from u;

with u as (update public.profiles set full_name = 'Diretas' where id = :'owner_b' returning 1)
select tests.ok(count(*) = 0, 'user cannot update another profile') from u;

-- ---------------------------------------------------------------------------
-- Privilege escalation via direct writes is impossible
-- ---------------------------------------------------------------------------
select tests.as_user(:'outsider');
select tests.throws(format($$insert into public.store_memberships (store_id, user_id, role) values (%L, %L, 'owner')$$, :'store_a', :'outsider'),
  'permission denied', 'cannot insert own membership directly');
select tests.throws($$insert into public.stores (name, slug) values ('Langsung', 'langsung')$$,
  'permission denied', 'cannot insert store directly');
select tests.throws(format($$insert into public.platform_admins (user_id) values (%L)$$, :'outsider'),
  'permission denied', 'cannot grant self super admin');
select tests.ok(public.is_super_admin() = false, 'outsider is not super admin');

select tests.as_user(:'owner_a');
select tests.throws(format($$update public.store_memberships set role = 'staff' where store_id = %L$$, :'store_a'),
  'permission denied', 'cannot update membership role directly');
select tests.throws(format($$delete from public.store_memberships where store_id = %L$$, :'store_a'),
  'permission denied', 'cannot delete memberships directly');
select tests.throws(format($$update public.stores set slug = 'slug-baru' where id = %L$$, :'store_a'),
  'permission denied', 'store slug is not updatable');
select tests.throws(format($$delete from public.stores where id = %L$$, :'store_a'),
  'permission denied', 'stores cannot be deleted by clients');
select tests.throws($$delete from public.audit_logs$$, 'permission denied', 'audit logs cannot be deleted');
select tests.throws($$insert into public.audit_logs (action, entity) values ('x', 'y')$$, 'permission denied', 'audit logs cannot be forged');

-- ---------------------------------------------------------------------------
-- Adding members (role rules)
-- ---------------------------------------------------------------------------
select public.add_store_member(:'store_a', 'MANAGER.A@test.local', 'manager') as m_manager \gset
select tests.ok(true, 'owner adds manager (email match is case-insensitive)');
select public.add_store_member(:'store_a', 'cashier.a@test.local', 'cashier') as m_cashier \gset
select tests.throws(format($$select public.add_store_member(%L, 'outsider@test.local', 'owner')$$, :'store_a'),
  'CANNOT_ASSIGN_OWNER', 'owner role cannot be assigned');
select tests.throws(format($$select public.add_store_member(%L, 'nobody@test.local', 'staff')$$, :'store_a'),
  'USER_NOT_FOUND', 'unknown email rejected');
select tests.throws(format($$select public.add_store_member(%L, 'cashier.a@test.local', 'staff')$$, :'store_a'),
  'ALREADY_MEMBER', 'duplicate member rejected');

select tests.as_user(:'manager_a');
select public.add_store_member(:'store_a', 'staff.a@test.local', 'staff') as m_staff \gset
select tests.ok(true, 'manager adds staff');
select tests.throws(format($$select public.add_store_member(%L, 'outsider@test.local', 'manager')$$, :'store_a'),
  'FORBIDDEN', 'manager cannot add another manager');

select tests.as_user(:'cashier_a');
select tests.throws(format($$select public.add_store_member(%L, 'outsider@test.local', 'staff')$$, :'store_a'),
  'FORBIDDEN', 'cashier cannot add members');

select tests.as_user(:'owner_b');
select tests.throws(format($$select public.add_store_member(%L, 'outsider@test.local', 'staff')$$, :'store_a'),
  'FORBIDDEN', 'owner of another store cannot add members to store A');

-- ---------------------------------------------------------------------------
-- What each role can see
-- ---------------------------------------------------------------------------
select tests.as_user(:'cashier_a');
select tests.ok((select count(*) from public.stores where id = :'store_a') = 1, 'cashier sees own store');
select tests.ok((select count(*) from public.store_memberships) = 1, 'cashier sees only own membership');
select tests.ok((select count(*) from public.audit_logs) = 0, 'cashier cannot read audit logs');
select tests.throws(format('select * from public.list_store_members(%L)', :'store_a'), 'FORBIDDEN', 'cashier cannot list members');
with u as (update public.stores set name = 'Diganti Kasir' where id = :'store_a' returning 1)
select tests.ok(count(*) = 0, 'cashier cannot update store settings') from u;

select tests.as_user(:'manager_a');
select tests.ok((select count(*) from public.list_store_members(:'store_a')) = 4, 'manager lists all 4 members');
select tests.ok((select role from public.list_store_members(:'store_a') limit 1) = 'owner', 'member list is ordered owner first');
with u as (update public.stores set name = 'Martabak Ani Jaya' where id = :'store_a' returning 1)
select tests.ok(count(*) = 1, 'manager can rename store') from u;
select tests.throws(format($$update public.stores set timezone = 'Mars/Olympus' where id = %L$$, :'store_a'),
  'INVALID_TIMEZONE', 'invalid timezone rejected');

-- ---------------------------------------------------------------------------
-- Changing roles
-- ---------------------------------------------------------------------------
select tests.throws(format($$select public.update_member_role(%L, 'manager')$$, :'m_cashier'),
  'FORBIDDEN', 'manager cannot change roles');

select tests.as_user(:'owner_a');
select public.update_member_role(:'m_cashier', 'staff');
select tests.ok((select role from public.store_memberships where id = :'m_cashier') = 'staff', 'owner changes cashier to staff');
select public.update_member_role(:'m_cashier', 'cashier');
select tests.throws(format($$select public.update_member_role(%L, 'owner')$$, :'m_cashier'),
  'CANNOT_ASSIGN_OWNER', 'cannot promote to owner');
select tests.throws(format($$select public.update_member_role(id, 'staff') from public.store_memberships where user_id = %L and store_id = %L$$, :'owner_a', :'store_a'),
  'CANNOT_CHANGE_OWN_ROLE', 'owner cannot change own role');

select tests.as_user(:'outsider');
select tests.throws(format($$select public.update_member_role(%L, 'manager')$$, :'m_cashier'),
  'NOT_FOUND', 'outsider gets NOT_FOUND (no existence leak)');

-- ---------------------------------------------------------------------------
-- Removing members
-- ---------------------------------------------------------------------------
select tests.as_user(:'manager_a');
select tests.throws(format($$select public.remove_store_member(id) from public.store_memberships where user_id = %L and store_id = %L$$, :'owner_a', :'store_a'),
  'FORBIDDEN', 'manager cannot remove owner');
select public.remove_store_member(:'m_staff');
select tests.ok(not exists (select 1 from public.store_memberships where id = :'m_staff'), 'manager removes staff');

select tests.as_user(:'outsider');
select tests.throws(format($$select public.remove_store_member(%L)$$, :'m_cashier'), 'NOT_FOUND', 'outsider cannot remove members');

select tests.as_user(:'owner_a');
select tests.throws(format($$select public.remove_store_member(id) from public.store_memberships where user_id = %L and store_id = %L$$, :'owner_a', :'store_a'),
  'LAST_OWNER', 'last owner cannot leave store');

select tests.as_user(:'cashier_a');
select public.remove_store_member(:'m_cashier');
select tests.ok(public.is_store_member(:'store_a') = false, 'member can leave store');
select tests.ok((select count(*) from public.stores where id = :'store_a') = 0, 'former member loses access immediately');

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
select tests.as_user(:'owner_a');
select tests.ok(exists (select 1 from public.audit_logs where store_id = :'store_a' and entity = 'stores' and action = 'insert' and actor_id = :'owner_a'),
  'store creation audited with actor');
select tests.ok(exists (select 1 from public.audit_logs where store_id = :'store_a' and entity = 'store_memberships' and action = 'update' and details ->> 'previous_role' = 'cashier'),
  'role change audited with previous role');
select tests.ok(exists (select 1 from public.audit_logs where store_id = :'store_a' and entity = 'store_memberships' and action = 'delete' and actor_id = :'manager_a'),
  'member removal audited with actor');
select tests.ok(exists (select 1 from public.audit_logs where store_id = :'store_a' and entity = 'stores' and action = 'update' and details -> 'after' ->> 'name' = 'Martabak Ani Jaya'),
  'store rename audited');

-- ---------------------------------------------------------------------------
-- Super admin
-- ---------------------------------------------------------------------------
select tests.as_user(:'admin');
select tests.ok(public.is_super_admin(), 'admin recognised as super admin');
select tests.ok((select count(*) from public.stores) = 2, 'super admin sees all stores');
select tests.ok((select count(*) from public.list_store_members(:'store_b')) = 1, 'super admin can list any store members');
with u as (update public.stores set name = 'Diubah Admin' where id = :'store_b' returning 1)
select tests.ok(count(*) = 0, 'super admin is read-only on tenant data in Phase 1') from u;

-- ---------------------------------------------------------------------------
-- Store limit per owner
-- ---------------------------------------------------------------------------
select tests.as_user(:'owner_b');
select public.create_store('Cabang ' || i, 'kopi-budi-' || i) from generate_series(2, 10) as i \g /dev/null
select tests.throws($$select public.create_store('Cabang 11', 'kopi-budi-11')$$, 'STORE_LIMIT_REACHED', 'owner limited to 10 stores');

reset role;
