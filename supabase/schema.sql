-- SunnyPlast internal tool. Run once in the Supabase SQL editor.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_no text not null unique,
  reference text not null default '',
  customer_name text not null default '',
  status text not null check (status in ('draft', 'quoted', 'booked')),
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_user_updated_idx on public.quotes (user_id, updated_at desc);

create table public.pricing_config (
  id integer primary key default 1 check (id = 1),
  config jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create sequence public.job_no_seq;

insert into public.pricing_config (id, config)
values (
  1,
  '{
    "markupPercent": 30,
    "taxPercent": 20,
    "partPrices": {
      "frame": 15, "glass": 55, "leaf": 70, "french": 120, "panel": 85,
      "track": 95, "sash": 38, "hinge": 9, "lock": 35, "handle": 18,
      "cylinder": 16, "threshold": 22, "cill": 12, "seal": 1.6, "bead": 2.5,
      "fixings": 8, "labour": 28
    },
    "materialFactors": { "upvc": 1, "aluminium": 1.8, "timber": 2.3 },
    "glazingAddons": { "double": 0, "triple": 45, "acoustic": 60 },
    "productFactors": { "window": 1, "door": 1.35, "patio": 1.6, "bifold": 2.2 }
  }'::jsonb
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when new.raw_user_meta_data->>'role' = 'admin' then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.id is distinct from auth.uid() then
    raise exception 'not allowed';
  end if;
  new.role := old.role;
  new.active := old.active;
  new.email := old.email;
  new.id := old.id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile();

create or replace function public.next_job_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  if not public.is_active_user() then
    raise exception 'not allowed';
  end if;
  n := nextval('public.job_no_seq');
  return 'SP-' || lpad(n::text, 4, '0');
end;
$$;

alter table public.profiles enable row level security;
alter table public.quotes enable row level security;
alter table public.pricing_config enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using ((id = auth.uid() and public.is_active_user()) or public.is_admin())
  with check ((id = auth.uid() and public.is_active_user()) or public.is_admin());

create policy quotes_select on public.quotes
  for select to authenticated
  using ((user_id = auth.uid() or public.is_admin()) and public.is_active_user());

create policy quotes_insert on public.quotes
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user());

create policy quotes_update on public.quotes
  for update to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy quotes_delete on public.quotes
  for delete to authenticated
  using (user_id = auth.uid() and public.is_active_user());

create policy pricing_select on public.pricing_config
  for select to authenticated
  using (public.is_active_user());

create policy pricing_update on public.pricing_config
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
grant select, update on public.pricing_config to authenticated;
grant execute on function public.next_job_no() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;
