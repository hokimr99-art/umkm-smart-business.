-- READ-ONLY schema snapshot. Safe to run in Supabase SQL Editor.
-- Reads only system catalogs (structure), never user data or secrets.
-- Output: one JSON cell describing tables, RLS, policies, functions,
-- triggers, enums, constraints, and row counts per table.
select (jsonb_build_object(
  'postgres_version', current_setting('server_version'),
  'tables', (
    select jsonb_agg(jsonb_build_object(
      'table', c.relname,
      'rls_enabled', c.relrowsecurity,
      'columns', (
        select jsonb_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
               || case when a.attnotnull then ' not null' else '' end
               || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
               order by a.attnum)
        from pg_attribute a
        left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)
    ) order by c.relname)
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')),
  'constraints', (
    select jsonb_agg(conrelid::regclass::text || ': ' || conname || ' ' || pg_get_constraintdef(oid) order by conrelid::regclass::text, conname)
    from pg_constraint where connamespace = 'public'::regnamespace and contype in ('p', 'f', 'u', 'c')),
  'policies', (
    select jsonb_agg(tablename || '.' || policyname || ' [' || cmd || ' to ' || array_to_string(roles, ',') || '] using(' || coalesce(qual, '') || ') check(' || coalesce(with_check, '') || ')' order by tablename, policyname)
    from pg_policies where schemaname = 'public'),
  'enums', (
    select jsonb_agg(t.typname || ': ' || (select string_agg(enumlabel, ', ' order by enumsortorder) from pg_enum e where e.enumtypid = t.oid))
    from pg_type t where t.typnamespace = 'public'::regnamespace and t.typtype = 'e'),
  'triggers', (
    select jsonb_agg(tgrelid::regclass::text || ': ' || tgname || ' -> ' || tgfoid::regprocedure::text || case when tgenabled = 'D' then ' (DISABLED)' else '' end order by tgrelid::regclass::text, tgname)
    from pg_trigger
    where not tgisinternal
      and tgrelid in (select oid from pg_class where relnamespace in (select oid from pg_namespace where nspname in ('public', 'auth', 'storage')))),
  'functions', (
    select jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'security_definer', p.prosecdef,
      'definition', pg_get_functiondef(p.oid)) order by p.proname)
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'),
  'table_grants_to_anon', (
    select jsonb_agg(distinct table_name || ':' || privilege_type)
    from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'),
  'row_counts', (
    select jsonb_object_agg(relname, n_live_tup) from pg_stat_user_tables where schemaname = 'public')
))::text as snapshot;
