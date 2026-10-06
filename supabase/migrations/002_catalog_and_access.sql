-- SunnyPlast plan 2. Run once on the project that already has schema.sql applied.

alter table public.profiles
  add column if not exists access_expires_on date,
  add column if not exists locked boolean not null default false,
  add column if not exists password_set_at timestamptz not null default now();

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  password_max_age_days integer not null default 90 check (password_max_age_days between 1 and 365),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.products (
  id text primary key,
  name text not null,
  family text not null check (family in ('window', 'door', 'patio', 'bifold', 'accessory')),
  summary text not null default '',
  factor numeric not null default 1 check (factor >= 0),
  default_width_mm integer not null default 1000 check (default_width_mm > 0),
  default_height_mm integer not null default 1000 check (default_height_mm > 0),
  default_preset text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parts (
  id text primary key,
  name text not null,
  unit text not null,
  price numeric not null default 0 check (price >= 0),
  quantity_rule text not null default 'one' check (quantity_rule in (
    'builtin', 'perimeter', 'area', 'width', 'per-opening', 'per-sash', 'per-panel', 'one', 'fixed'
  )),
  applies_material_factor boolean not null default false,
  applies_product_factor boolean not null default false,
  applies_glazing_addon boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_parts (
  product_id text not null references public.products (id) on delete cascade,
  part_id text not null references public.parts (id) on delete restrict,
  price_override numeric check (price_override is null or price_override >= 0),
  fixed_qty numeric check (fixed_qty is null or fixed_qty >= 0),
  included boolean not null default true,
  primary key (product_id, part_id)
);

create table if not exists public.materials (
  id text primary key,
  name text not null,
  factor numeric not null default 1 check (factor >= 0),
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.colours (
  id text primary key,
  name text not null,
  hex text not null,
  finish text not null default 'solid' check (finish in ('solid', 'oak')),
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.glazing_options (
  id text primary key,
  name text not null,
  addon_per_m2 numeric not null default 0 check (addon_per_m2 >= 0),
  description text not null default '',
  glass_type text not null default '',
  gas_fill text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.products (id, name, family, summary, factor, default_width_mm, default_height_mm, default_preset, sort_order)
values
  ('window', 'Window', 'window', 'Casement, fixed and sliding lights', 1, 1815, 1130, 'casement-fixed-casement', 1),
  ('door', 'Door', 'door', 'Single leaf or French pair', 1.35, 900, 2100, 'single-half', 2),
  ('patio', 'Patio Door', 'patio', 'In-line sliding panels', 1.6, 2400, 2100, 'sliding-2', 3),
  ('bifold', 'Bi-fold Door', 'bifold', 'Folding door sets', 2.2, 3000, 2100, 'bifold-3', 4)
on conflict (id) do nothing;

insert into public.parts (id, name, unit, price, quantity_rule, applies_material_factor, applies_product_factor, applies_glazing_addon, sort_order)
values
  ('frame', 'Frame profile', 'm', 15, 'builtin', true, true, false, 1),
  ('glass', 'Sealed glass unit', 'm²', 55, 'builtin', false, false, true, 2),
  ('leaf', 'Door leaf panel', 'm²', 70, 'builtin', false, false, false, 3),
  ('french', 'French door leaf', 'each', 120, 'builtin', false, false, false, 4),
  ('panel', 'Sliding or folding panel frame', 'each', 85, 'builtin', false, false, false, 5),
  ('track', 'Track and runner set', 'each', 95, 'builtin', false, false, false, 6),
  ('sash', 'Opening sash', 'each', 38, 'builtin', false, false, false, 7),
  ('hinge', 'Hinge', 'each', 9, 'builtin', false, false, false, 8),
  ('lock', 'Multi-point lock', 'each', 35, 'builtin', false, false, false, 9),
  ('handle', 'Handle set', 'each', 18, 'builtin', false, false, false, 10),
  ('cylinder', 'Euro cylinder', 'each', 16, 'builtin', false, false, false, 11),
  ('threshold', 'Threshold', 'm', 22, 'builtin', false, false, false, 12),
  ('cill', 'Cill', 'm', 12, 'builtin', false, false, false, 13),
  ('seal', 'Weather seals', 'm', 1.6, 'builtin', false, false, false, 14),
  ('bead', 'Glazing beads', 'm', 2.5, 'builtin', false, false, false, 15),
  ('fixings', 'Fixings and sundries', 'each', 8, 'builtin', false, false, false, 16),
  ('labour', 'Fabrication labour', 'hr', 28, 'builtin', false, true, false, 17)
on conflict (id) do nothing;

insert into public.materials (id, name, factor, sort_order) values
  ('upvc', 'uPVC', 1, 1),
  ('aluminium', 'Aluminium', 1.8, 2),
  ('timber', 'Timber', 2.3, 3)
on conflict (id) do nothing;

insert into public.colours (id, name, hex, finish, sort_order) values
  ('white', 'White', '#F4F1EA', 'solid', 1),
  ('anthracite', 'Anthracite Grey', '#3A4146', 'solid', 2),
  ('black', 'Black', '#1C1C1C', 'solid', 3),
  ('oak', 'Woodgrain Oak', '#A56E3C', 'oak', 4),
  ('cream', 'Cream', '#E7DCC0', 'solid', 5)
on conflict (id) do nothing;

insert into public.glazing_options (id, name, addon_per_m2, description, glass_type, gas_fill, sort_order) values
  ('double', 'Double', 0, '4-20-4 clear low-E, argon', '4-20-4 Clear Low E', 'Argon', 1),
  ('triple', 'Triple', 45, '4-12-4-12-4 clear low-E, argon', '4-12-4-12-4 Clear Low E', 'Argon', 2),
  ('acoustic', 'Acoustic', 60, 'Laminated acoustic unit', '6.8 Acoustic Laminate', 'Air', 3)
on conflict (id) do nothing;

insert into public.product_parts (product_id, part_id, included)
select p.id, part.id, true
from public.products p
cross join public.parts part
where p.family <> 'accessory'
on conflict (product_id, part_id) do nothing;

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
    where id = auth.uid()
      and active = true
      and (
        role = 'admin'
        or (
          locked = false
          and (access_expires_on is null or access_expires_on >= current_date)
        )
      )
  );
$$;

create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    if new.role = 'admin' then
      new.locked := false;
      new.access_expires_on := null;
    end if;
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
  new.locked := old.locked;
  new.access_expires_on := old.access_expires_on;
  new.password_set_at := old.password_set_at;
  return new;
end;
$$;

create or replace function public.mark_password_set()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set password_set_at = now()
  where id = auth.uid();
end;
$$;

alter table public.app_settings enable row level security;
alter table public.products enable row level security;
alter table public.parts enable row level security;
alter table public.product_parts enable row level security;
alter table public.materials enable row level security;
alter table public.colours enable row level security;
alter table public.glazing_options enable row level security;

create policy app_settings_select on public.app_settings
  for select to authenticated using (public.is_active_user() or public.is_admin());
create policy app_settings_update on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy products_select on public.products
  for select to authenticated using (public.is_active_user() or public.is_admin());
create policy products_write on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy parts_select on public.parts
  for select to authenticated using (public.is_active_user() or public.is_admin());
create policy parts_write on public.parts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy product_parts_select on public.product_parts
  for select to authenticated using (public.is_active_user() or public.is_admin());
create policy product_parts_write on public.product_parts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy materials_select on public.materials
  for select to authenticated using (public.is_active_user() or public.is_admin());
create policy materials_write on public.materials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy colours_select on public.colours
  for select to authenticated using (public.is_active_user() or public.is_admin());
create policy colours_write on public.colours
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy glazing_select on public.glazing_options
  for select to authenticated using (public.is_active_user() or public.is_admin());
create policy glazing_write on public.glazing_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, update on public.app_settings to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.parts to authenticated;
grant select, insert, update, delete on public.product_parts to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.colours to authenticated;
grant select, insert, update, delete on public.glazing_options to authenticated;
grant execute on function public.mark_password_set() to authenticated;
