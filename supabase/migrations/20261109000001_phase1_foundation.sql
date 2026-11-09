-- =============================================================================
-- UMKM SMART BUSINESS — Phase 1 Foundation
-- Profiles, stores (tenant), store memberships (role), platform admins,
-- audit log, Row Level Security, and guarded RPCs.
--
-- Design rules:
--   * Every tenant-owned row carries store_id; access is decided by membership.
--   * Clients never write memberships or stores directly: all writes that can
--     change who has access go through SECURITY DEFINER functions below that
--     enforce role rules server-side.
--   * Helper functions used inside policies are SECURITY DEFINER with an empty
--     search_path to avoid RLS recursion and search_path hijacking.
--   * Migration is additive only. Rollback: supabase/rollback/ (destructive,
--     only before real data exists).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.store_role as enum ('owner', 'manager', 'cashier', 'staff');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 100),
  phone       text check (phone is null or phone ~ '^\+?[0-9]{8,15}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Platform-level Super Admin. Rows are granted only by the project owner via
-- the Supabase SQL editor (service role); no client can write this table.
create table public.platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  note        text check (note is null or char_length(note) <= 200),
  created_at  timestamptz not null default now()
);

-- A store is the tenant (toko / organisasi).
create table public.stores (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(btrim(name)) between 2 and 100),
  -- Stable public identifier, reserved for Universal QR / catalog URLs.
  slug           text not null unique
                 check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  business_type  text check (business_type is null or char_length(business_type) <= 50),
  currency       text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  timezone       text not null default 'Asia/Jakarta' check (char_length(timezone) <= 64),
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.store_memberships (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.store_role not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, user_id)
);
create index store_memberships_user_id_idx on public.store_memberships (user_id);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  store_id    uuid references public.stores (id) on delete set null,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_store_created_idx on public.audit_logs (store_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Access helper functions (used by RLS policies and RPCs)
-- ---------------------------------------------------------------------------
create function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create function public.current_store_role(p_store_id uuid)
returns public.store_role
language sql stable security definer set search_path = ''
as $$
  select role from public.store_memberships
  where store_id = p_store_id and user_id = auth.uid();
$$;

create function public.is_store_member(p_store_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.store_memberships
    where store_id = p_store_id and user_id = auth.uid()
  );
$$;

create function public.has_store_role(p_store_id uuid, p_roles public.store_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_store_role(p_store_id) = any (p_roles), false);
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
create trigger store_memberships_set_updated_at before update on public.store_memberships
  for each row execute function public.set_updated_at();

-- Reject unknown IANA time zones (stores may later operate outside Indonesia).
create function public.validate_store_timezone()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using message = 'INVALID_TIMEZONE', errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger stores_validate_timezone before insert or update of timezone on public.stores
  for each row execute function public.validate_store_timezone();

-- Create a profile for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit trail for tenant and access changes.
create function public.audit_row_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row      jsonb;
  v_old      jsonb;
  v_store_id uuid;
  v_details  jsonb;
begin
  v_row := to_jsonb(coalesce(new, old));
  v_old := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;

  if tg_table_name = 'stores' then
    v_store_id := (v_row ->> 'id')::uuid;
    v_details := case
      when tg_op = 'UPDATE' then jsonb_build_object(
        'before', jsonb_build_object('name', v_old ->> 'name', 'business_type', v_old ->> 'business_type', 'timezone', v_old ->> 'timezone'),
        'after',  jsonb_build_object('name', v_row ->> 'name', 'business_type', v_row ->> 'business_type', 'timezone', v_row ->> 'timezone'))
      else jsonb_build_object('name', v_row ->> 'name', 'slug', v_row ->> 'slug')
    end;
  else -- store_memberships
    v_store_id := (v_row ->> 'store_id')::uuid;
    v_details := jsonb_build_object('user_id', v_row ->> 'user_id', 'role', v_row ->> 'role')
      || case when tg_op = 'UPDATE' then jsonb_build_object('previous_role', v_old ->> 'role') else '{}'::jsonb end;
  end if;

  -- When a whole store is deleted the cascade removes memberships; skip those
  -- rows because the parent store no longer exists.
  if tg_op = 'DELETE' and tg_table_name = 'store_memberships'
     and not exists (select 1 from public.stores where id = v_store_id) then
    return old;
  end if;

  insert into public.audit_logs (store_id, actor_id, action, entity, entity_id, details)
  values (v_store_id, auth.uid(), lower(tg_op), tg_table_name, (v_row ->> 'id')::uuid, v_details);

  return coalesce(new, old);
end;
$$;

create trigger stores_audit after insert or update on public.stores
  for each row execute function public.audit_row_change();
create trigger store_memberships_audit after insert or update or delete on public.store_memberships
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- RPCs (the only write path for stores and memberships)
-- ---------------------------------------------------------------------------
create function public.create_store(p_name text, p_slug text, p_business_type text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_name  text := btrim(coalesce(p_name, ''));
  v_slug  text := lower(btrim(coalesce(p_slug, '')));
  v_type  text := nullif(btrim(coalesce(p_business_type, '')), '');
begin
  if v_uid is null then
    raise exception using message = 'NOT_AUTHENTICATED', errcode = '28000';
  end if;
  if char_length(v_name) not between 2 and 100 then
    raise exception using message = 'INVALID_STORE_NAME', errcode = '22023';
  end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$' then
    raise exception using message = 'INVALID_SLUG', errcode = '22023';
  end if;
  if v_type is not null and char_length(v_type) > 50 then
    raise exception using message = 'INVALID_BUSINESS_TYPE', errcode = '22023';
  end if;

  -- Serialize per user so the limit check cannot be raced.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 0));
  if (select count(*) from public.store_memberships where user_id = v_uid and role = 'owner') >= 10 then
    raise exception using message = 'STORE_LIMIT_REACHED', errcode = 'P0001';
  end if;

  begin
    insert into public.stores (name, slug, business_type, created_by)
    values (v_name, v_slug, v_type, v_uid)
    returning id into v_id;
  exception when unique_violation then
    raise exception using message = 'SLUG_TAKEN', errcode = '23505';
  end;

  insert into public.store_memberships (store_id, user_id, role)
  values (v_id, v_uid, 'owner');

  return v_id;
end;
$$;

-- Owners and managers see the roster (with email); cashiers/staff do not,
-- to limit exposure of personal data (UU PDP).
create function public.list_store_members(p_store_id uuid)
returns table (
  membership_id uuid,
  user_id       uuid,
  role          public.store_role,
  full_name     text,
  email         text,
  created_at    timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (public.has_store_role(p_store_id, array['owner', 'manager']::public.store_role[])
          or public.is_super_admin()) then
    raise exception using message = 'FORBIDDEN', errcode = '42501';
  end if;

  return query
    select m.id, m.user_id, m.role, coalesce(p.full_name, ''), u.email::text, m.created_at
    from public.store_memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.store_id = p_store_id
    order by array_position(array['owner', 'manager', 'cashier', 'staff']::public.store_role[], m.role),
             m.created_at;
end;
$$;

create function public.add_store_member(p_store_id uuid, p_email text, p_role public.store_role)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor_role public.store_role := public.current_store_role(p_store_id);
  v_user_id    uuid;
  v_id         uuid;
begin
  if auth.uid() is null then
    raise exception using message = 'NOT_AUTHENTICATED', errcode = '28000';
  end if;
  if v_actor_role is null or v_actor_role not in ('owner', 'manager') then
    raise exception using message = 'FORBIDDEN', errcode = '42501';
  end if;
  if p_role is null then
    raise exception using message = 'INVALID_ROLE', errcode = '22023';
  end if;
  -- Ownership transfer is a separate, future flow.
  if p_role = 'owner' then
    raise exception using message = 'CANNOT_ASSIGN_OWNER', errcode = '42501';
  end if;
  if v_actor_role = 'manager' and p_role not in ('cashier', 'staff') then
    raise exception using message = 'FORBIDDEN', errcode = '42501';
  end if;

  select id into v_user_id from auth.users
  where lower(email) = lower(btrim(coalesce(p_email, '')));
  if v_user_id is null then
    raise exception using message = 'USER_NOT_FOUND', errcode = 'P0002';
  end if;

  if exists (select 1 from public.store_memberships where store_id = p_store_id and user_id = v_user_id) then
    raise exception using message = 'ALREADY_MEMBER', errcode = '23505';
  end if;

  if (select count(*) from public.store_memberships where store_id = p_store_id) >= 50 then
    raise exception using message = 'MEMBER_LIMIT_REACHED', errcode = 'P0001';
  end if;

  insert into public.store_memberships (store_id, user_id, role)
  values (p_store_id, v_user_id, p_role)
  returning id into v_id;

  return v_id;
end;
$$;

create function public.update_member_role(p_membership_id uuid, p_role public.store_role)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_m          public.store_memberships%rowtype;
  v_actor_role public.store_role;
begin
  if auth.uid() is null then
    raise exception using message = 'NOT_AUTHENTICATED', errcode = '28000';
  end if;
  select * into v_m from public.store_memberships where id = p_membership_id;
  v_actor_role := case when v_m.id is null then null else public.current_store_role(v_m.store_id) end;
  -- Do not reveal memberships of stores the caller does not belong to.
  if v_actor_role is null then
    raise exception using message = 'NOT_FOUND', errcode = 'P0002';
  end if;
  if v_actor_role <> 'owner' then
    raise exception using message = 'FORBIDDEN', errcode = '42501';
  end if;
  if v_m.user_id = auth.uid() then
    raise exception using message = 'CANNOT_CHANGE_OWN_ROLE', errcode = '42501';
  end if;
  if v_m.role = 'owner' then
    raise exception using message = 'CANNOT_MODIFY_OWNER', errcode = '42501';
  end if;
  if p_role is null then
    raise exception using message = 'INVALID_ROLE', errcode = '22023';
  end if;
  if p_role = 'owner' then
    raise exception using message = 'CANNOT_ASSIGN_OWNER', errcode = '42501';
  end if;

  update public.store_memberships set role = p_role where id = p_membership_id;
end;
$$;

create function public.remove_store_member(p_membership_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_m          public.store_memberships%rowtype;
  v_actor_role public.store_role;
begin
  if auth.uid() is null then
    raise exception using message = 'NOT_AUTHENTICATED', errcode = '28000';
  end if;
  select * into v_m from public.store_memberships where id = p_membership_id;
  v_actor_role := case when v_m.id is null then null else public.current_store_role(v_m.store_id) end;
  if v_actor_role is null then
    raise exception using message = 'NOT_FOUND', errcode = 'P0002';
  end if;

  if v_m.user_id = auth.uid() then
    -- Leaving a store. The last owner may not leave (store would be orphaned).
    if v_m.role = 'owner' and (
      select count(*) from public.store_memberships
      where store_id = v_m.store_id and role = 'owner'
    ) <= 1 then
      raise exception using message = 'LAST_OWNER', errcode = '42501';
    end if;
  elsif v_actor_role = 'owner' then
    if v_m.role = 'owner' then
      raise exception using message = 'CANNOT_MODIFY_OWNER', errcode = '42501';
    end if;
  elsif v_actor_role = 'manager' then
    if v_m.role not in ('cashier', 'staff') then
      raise exception using message = 'FORBIDDEN', errcode = '42501';
    end if;
  else
    raise exception using message = 'FORBIDDEN', errcode = '42501';
  end if;

  delete from public.store_memberships where id = p_membership_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.platform_admins   enable row level security;
alter table public.stores            enable row level security;
alter table public.store_memberships enable row level security;
alter table public.audit_logs        enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy platform_admins_select_own on public.platform_admins
  for select to authenticated
  using (user_id = auth.uid());

create policy stores_select_member on public.stores
  for select to authenticated
  using (public.is_store_member(id) or public.is_super_admin());
create policy stores_update_owner_manager on public.stores
  for update to authenticated
  using (public.has_store_role(id, array['owner', 'manager']::public.store_role[]))
  with check (public.has_store_role(id, array['owner', 'manager']::public.store_role[]));

create policy store_memberships_select on public.store_memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_store_role(store_id, array['owner', 'manager']::public.store_role[])
    or public.is_super_admin()
  );

create policy audit_logs_select_owner_manager on public.audit_logs
  for select to authenticated
  using (
    public.has_store_role(store_id, array['owner', 'manager']::public.store_role[])
    or public.is_super_admin()
  );

-- ---------------------------------------------------------------------------
-- Privileges (Supabase grants broad defaults; narrow them explicitly)
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.platform_admins, public.stores,
              public.store_memberships, public.audit_logs
  from anon, authenticated;

grant select on public.profiles, public.platform_admins, public.stores,
                public.store_memberships, public.audit_logs
  to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
-- slug is intentionally not updatable: it backs printed QR codes.
grant update (name, business_type, timezone) on public.stores to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_super_admin(),
  public.current_store_role(uuid),
  public.is_store_member(uuid),
  public.has_store_role(uuid, public.store_role[]),
  public.create_store(text, text, text),
  public.list_store_members(uuid),
  public.add_store_member(uuid, text, public.store_role),
  public.update_member_role(uuid, public.store_role),
  public.remove_store_member(uuid)
  to authenticated;
