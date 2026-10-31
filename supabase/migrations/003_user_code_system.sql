-- SunnyPlast user code & ID system.
-- Provides short user codes (e.g. USR10001) for up to 90,000+ staff users.

-- 1. Create a sequence for user codes starting at 10001
create sequence if not exists public.user_code_seq start with 10001;

-- 2. Add user_code column to profiles
alter table public.profiles
  add column if not exists user_code text unique;

-- 3. Function to get the next user code
create or replace function public.next_user_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq bigint;
begin
  seq := nextval('public.user_code_seq');
  return 'USR' || seq::text;
end;
$$;

-- 4. Update handle_new_user trigger function to populate user_code
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_code text;
begin
  if (coalesce(new.raw_user_meta_data->>'role', 'user') = 'user') then
    assigned_code := coalesce(
      new.raw_user_meta_data->>'user_code',
      case
        when new.email like '%@gmail.com' and new.email not like '%+%' then upper(replace(new.email, '@gmail.com', ''))
        else public.next_user_code()
      end
    );
  else
    assigned_code := coalesce(new.raw_user_meta_data->>'user_code', null);
  end if;

  insert into public.profiles (id, email, full_name, role, user_code)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when new.raw_user_meta_data->>'role' = 'admin' then 'admin'
      else 'user'
    end,
    assigned_code
  )
  on conflict (id) do update set
    user_code = coalesce(public.profiles.user_code, excluded.user_code),
    email = excluded.email;
  return new;
end;
$$;

-- 5. Backfill existing user profiles if they don't have a user_code yet
update public.profiles
set user_code = case
  when email like '%@gmail.com' and email not like '%+%' then upper(replace(email, '@gmail.com', ''))
  else 'USR' || nextval('public.user_code_seq')::text
end
where user_code is null and role = 'user';
