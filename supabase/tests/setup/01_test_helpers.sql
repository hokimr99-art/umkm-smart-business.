-- LOCAL TEST ONLY: assertion helpers.
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is true then
    raise notice 'ok - %', p_name;
  else
    raise exception 'not ok - %', p_name;
  end if;
end;
$$;

-- Runs p_sql as the current role and asserts that it fails with a message
-- containing p_expect.
create function tests.throws(p_sql text, p_expect text, p_name text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_expect in sqlerrm) > 0 then
      raise notice 'ok - %', p_name;
      return;
    end if;
    raise exception 'not ok - % (expected error containing "%", got "%")', p_name, p_expect, sqlerrm;
  end;
  raise exception 'not ok - % (expected error containing "%", but it succeeded)', p_name, p_expect;
end;
$$;

-- Switch the simulated JWT subject (call after SET ROLE authenticated).
create function tests.as_user(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
$$;

create function tests.clear_user() returns void language sql as $$
  select set_config('request.jwt.claims', '', false);
$$;

-- Superuser only: create an auth user (fires the signup trigger).
create function tests.create_user(p_email text, p_name text default '') returns uuid language sql as $$
  insert into auth.users (email, raw_user_meta_data)
  values (p_email, jsonb_build_object('full_name', p_name))
  returning id;
$$;

grant execute on all functions in schema tests to anon, authenticated;
