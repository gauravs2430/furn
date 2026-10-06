# SunnyPlast — plan 2

This file is the next build script after `Plan.md`. Paste one prompt at a time. Finish the “Done when” checks before the next prompt.

`Plan.md` already shipped login, each person’s quotes in Supabase, the admin people page, the company price list, and the all-orders print list. This plan adds the product catalogue, account expiry and lock, password ageing, staff emails, split people tables, and search. It does not rebuild those earlier screens.

Super admin (notes item 4) is skipped. Inactivity sign-out (notes item 5) is out of this plan. Two-factor login is Prompt 8 and is not part of the required work. Prompt 9 is required: on a quote, the person building the job can take parts off that opening and add parts from inventory.

---

## How the catalogue works

The app today is a measure-and-price tool, not a shop of 300 fixed photos. A job is a sized opening. The total is the sum of the parts on that opening (frame, glass, hinges, labour, and so on), then markup, discount, and VAT. Those rules live in `src/domain/parts.ts` and `src/domain/pricing.ts`. The picture on the quote is an SVG drawing built from the width, height, and panels. It is not a stored image. There is no product photo in the repo apart from the favicon.

A catalogue of 300 products cannot each grow its own drawing engine. The drawing, the panel kinds, and the quantity maths for the current parts stay in the frontend, because they depend on millimetres and on how a window or door is built. Everything an admin should be able to add, rename, price, or retire moves into Supabase.

The split is:

| Lives in the database | Stays in the frontend |
| --- | --- |
| Product rows (name, family, defaults, factor, on or off) | How a window, door, patio, or bi-fold is drawn |
| Parts (name, unit, price, which factors apply) | The quantity formula for the parts that already exist |
| Which parts belong to which product, and any price override | Panel kinds and layout presets |
| Materials, colours, glazing options and their prices or factors | Validation limits that keep a drawing inside a buildable size |
| Markup and VAT (already in `pricing_config`) | Print layout |

An admin adds a product by giving it a name and a **family**:

- `window`, `door`, `patio`, or `bifold` — uses that existing drawing and the existing quantity rules.
- `accessory` — a side line with no drawing. Price is quantity times the part prices attached to it.

“Associated products” in the notes are the **parts** that make up the product, plus optional accessory lines. The admin attaches parts, removes them, and sets each price. The line total is still parts cost, then markup. That maths does not change.

A new part needs a **quantity rule** chosen from a fixed list the code already understands. The admin does not type a free formula. The list is:

- `perimeter` — metres around the opening (frame, seals)
- `area` — square metres (glass, leaf)
- `width` — width in metres (cill, threshold)
- `per-opening` — one for each opening panel
- `per-sash` — one for each casement or tilt-turn
- `per-panel` — one for each panel
- `one` — a single unit on the line
- `fixed` — the quantity typed on the product-part link (for accessories)

The sixteen parts already in `src/data/pricingDefaults.ts` keep their current formulas in `partQuantities`. New parts use the rule above. Removing a part from a product means that part is left off that product’s bill. An override price on the link replaces the part’s company price for that product only.

Three hundred rows is a normal database list. The browser loads one page at a time (25 rows) plus a search box. The JavaScript bundle does not contain the catalogue. Saved quotes keep the product id and the family they were priced with, so a later catalogue edit does not rewrite an old job.

The current files `src/data/productCatalog.ts` and `src/data/pricingDefaults.ts` become the **seed**, not the live list. After the seed has run, the quote screen reads Supabase. If the catalogue tables are empty, the app still falls back to those files so a quote can be priced before the SQL is applied.

---

## What stays as it is

Leave this behaviour in place unless a prompt below names the file:

- Routes, header, login, logout, and “no public sign-up”.
- A staff member sees and edits only their own quotes. Admin prints every order and does not open the configurator to edit someone else’s job.
- Quote form, opening drawing, validation, duplicate, delete, draft / quoted / booked.
- Both print sheets in `src/features/print/`.
- Price maths in `src/domain/pricing.ts`: parts cost, markup, discount, VAT, pounds (`en-GB`).
- The quantity formulas already in `partQuantities` for the current part ids.
- The four families `window`, `door`, `patio`, `bifold` on quotes that are already saved. Old jobs still open and still print.
- Passwords stay hashed in Supabase Auth. There is still no “view password” column. A password is shown once on screen when an admin sets it, and it is emailed in that same moment. It is not written into a table.
- Look from `Plan.md`: white and gray, 2px corners, Roboto and Roboto Slab, the existing dialog styles in `src/components/ui/Dialog.tsx`.
- `supabase/schema.sql` is the original database. Do not run it again. New SQL is a separate migration.

---

## Decisions locked for this plan

1. One Supabase project remains the backend. Hosting stays the Vite frontend. New SQL is `supabase/migrations/002_catalog_and_access.sql`. You paste that file into the SQL Editor once.
2. Catalogue writes are admin-only. Every logged-in active user can read the active catalogue, because every quote uses it.
3. Role is chosen on the **New login** form only. In both people tables the role is plain text. Nobody changes admin versus user from a table. Changing an existing person’s role waits for the skipped super-admin work.
4. Lock, expiry, and active / inactive apply to **users** only. An admin account is not locked, does not expire, and has no active slider, so an admin can always get in to unlock staff.
5. Password ageing applies to **users** only. After the configured number of days the old password stops working. The app does not invent a new password by itself. An admin sets the next one. The default age is 90 days, and an admin can change that number on the people page.
6. When a user’s expiry date is before today, they are locked. The check runs in the database and again when their session loads. They see a dialog: “Contact the admin to get full access of your account.” They cannot open quotes, orders, or account settings until an admin unlocks them.
7. Unlock is a button on the users table. It opens the existing themed confirm dialog. If the expiry date is today or earlier, the dialog includes a date field and the new date must be in the future. Confirming clears the lock, saves that date, and sends the unlock email.
8. Active / inactive is a slider on the users table, with the same confirm dialog, then an email. Turning someone inactive is the same `active = false` flag that already signs them out.
9. Emails are sent by the existing `admin-users` edge function through [Resend](https://resend.com). The API key lives in Supabase secrets, never in the React app and never in `VITE_` variables.
10. The login link in those emails is the site URL stored as the secret `SITE_URL` (local: `http://localhost:5173`, production: the real Vercel URL).
11. Search filters the list already on screen, or asks Supabase for a page of matches. It does not add a new search engine.
12. The catalogue is the company default for a product. A change on one quote opening does not change that default, and it does not change any other opening. The opening stores which inventory parts were removed and which were added. The price build-up on that opening is the only bill that changes.

---

## Emails this plan sends

| When | Who receives it | What it contains |
| --- | --- | --- |
| Admin creates a login | That person | SunnyPlast login link, their email, the password the admin just typed |
| Admin sets a new password | That person | Login link, their email, the new password |
| Admin unlocks a user | That user | Login link, and that the account is unlocked |
| Admin sets a user active or inactive | That user | Login link, and whether the account is active or inactive |

The on-screen “shown once” password dialog stays. The email is added beside it. If Resend is not configured yet, creating a login still works and the dialog still shows the password; the page shows a clear error that the email was not sent.

Two-factor login is Prompt 8. Skip it until you ask for it. The credential email is the confirmation step for this plan.

---

## Before Prompt 1 — you do this

1. Open the Supabase SQL Editor. Paste the whole migration in the next section. Run it once. You want “Success”.
2. In Table Editor, confirm the new tables exist and that `products` has the four families plus the current parts in `parts`.
3. Create a free Resend account. Verify a sending domain, or use Resend’s onboarding sender if you are only testing.
4. In Supabase, open **Edge Functions → Secrets** (or Project Settings → Edge Functions) and set:
   - `RESEND_API_KEY` — the Resend key
   - `MAIL_FROM` — a from-address Resend will accept, for example `SunnyPlast <orders@your-domain>`
   - `SITE_URL` — `http://localhost:5173` while you are on your machine
5. Do not put those three values in `.env.local`.

Come back to Prompt 1 after the SQL has succeeded. The secrets can wait until Prompt 5, but they must exist before you test an email.

---

## SQL migration

Save this as `supabase/migrations/002_catalog_and_access.sql` during Prompt 1, and run this same text once in the SQL Editor. It only adds columns and tables. It does not drop `profiles`, `quotes`, or `pricing_config`.

```sql
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
```

If a policy name already exists when you re-run a failed attempt, drop that one policy and run the statement again. Do not drop the tables that `schema.sql` created.

---

## Prompt 1 — catalogue tables, app still prices the old way

```text
Read plan2.md, especially “What stays as it is” and “SQL migration”. Do only Prompt 1.

The migration SQL is already applied in Supabase. Save that same SQL as supabase/migrations/002_catalog_and_access.sql. Do not edit supabase/schema.sql and do not run it.

Goal: the repo contains the migration. The running app does not change behaviour yet. Quotes, drawing, print, login, people, and the current Prices page stay as they are. Do not switch the quote screen to the new tables in this prompt.

Done when: the migration file matches the SQL in plan2.md, npm run build and npm test pass, and a quote still shows the same price as before this prompt.
```

**Done when**

- `supabase/migrations/002_catalog_and_access.sql` is in the repo.
- An existing quote still opens, draws, and prices.
- `npm run build` and `npm test` pass.

---

## Prompt 2 — quotes read the catalogue from Supabase

```text
Read plan2.md, “How the catalogue works” and “What stays as it is”. Do only Prompt 2.

Read first: src/data/productCatalog.ts, src/data/pricingDefaults.ts, src/domain/parts.ts, src/domain/pricing.ts, src/domain/models.ts, src/domain/factories.ts, src/repositories/PricingConfigRepository.ts, src/store/useAppStore.ts, src/features/configurator/ConfiguratorPage.tsx.

Goal: the live product list, part list, materials, colours, and glazing come from Supabase. The hardcoded arrays stay in the repo as the fallback when a catalogue table is empty, and as the source of the seed values. They are no longer the list the quote screen trusts once the tables have rows.

Build:
- A catalogue repository that loads products, parts, product_parts, materials, colours, and glazing_options for the signed-in user.
- The quote product picker lists active products from that load. The four seeded families still create the same default opening they create today (same width, height, and preset).
- calculateParts keeps partQuantities for every part whose quantity_rule is builtin. For any other rule, quantity comes from the rule list in plan2.md. A product_parts row with included = false drops that part from that product. price_override, when set, replaces the part price for that product only. Material factor, product factor, and glazing add-on still apply when those flags are set.
- Markup and VAT still come from pricing_config. Keep saving them from the Prices page.
- An accessory product adds a line with no drawing. Its parts use the fixed quantity on the link, or 1 when fixed_qty is null.
- Saved quotes that already have productType window, door, patio, or bifold keep working. New quote items store the product id. The drawing still receives the family (window, door, patio, bifold). An accessory has no SVG.
- Do not change print layout, geometry, or the builtin quantity numbers. A seeded window with the current size and options must produce the same parts and the same money as it does today.

Search on the product picker: a text field filters the loaded products by name. With only four products this is a short list. It must still work when there are hundreds, so the picker is a search field plus results, not a native select that tries to show every row at once.

Done when: with the seed data, a window quote matches the previous price; turning a part’s included flag off in the database removes that part from a new calculation after refresh; npm run build and npm test pass. Add a unit test for price_override and for included = false. The builtin window test still expects the current money.
```

**Done when**

- New quotes use the database catalogue.
- The current window price is unchanged for the seeded parts.
- Old saved quotes still open.
- The drawing still renders for the four families.

---

## Prompt 3 — admin edits products, parts, and prices

```text
Read plan2.md, “How the catalogue works”. Do only Prompt 3.

Read first: src/features/admin/PricesPage.tsx, src/app/router.tsx, src/components/ui/Dialog.tsx, src/components/ui/Field.tsx.

Goal: an admin can add a product, change its factor and its part prices, and add or remove the parts on it. Staff never see this editor. The quote form, drawing, and print stay as Prompt 2 left them.

Keep /admin/prices for markup, default VAT, and a link to the catalogue. Add /admin/catalog as the catalogue editor. Link it from the people page next to Prices and All orders.

Catalog page:
- Search box. Filters name. Asks Supabase, 25 rows per page, with next and previous.
- Table: name, family, factor, active, updated. A row opens an editor.
- New product: name, family (window, door, patio, bifold, accessory), summary, factor, default width, default height, default preset when the family is not accessory, active. Id is a slug generated from the name. Saving inserts the product and copies the included parts from the matching seeded family, except accessory which starts with no parts.
- Editor: change name, factor, defaults, and active. Active off hides it from the quote picker. It does not delete the row, so old quotes still resolve the name.
- Parts on this product: each included part shows name, unit, company price, and an override price. Empty override means “use the company price”. A remove control sets included = false after the existing confirm dialog. An add control attaches an existing part, or creates a new part.
- New part: name, unit, company price, quantity rule from the list in plan2.md (not builtin; builtin is only for the seeded sixteen), and the three factor checkboxes. Builtin parts can have their company price edited. Their quantity rule stays builtin.
- Materials, colours, and glazing each have a short section: add, edit price or factor, and turn active off. Use the same search pattern if a section has more than a few rows.
- Company part price is the parts.price column. Saving it updates future quotes. It does not rewrite documents already saved.
- Only an admin can open /admin/catalog. The writes go through the RLS policies already in the migration.

Do not add a photo upload. The picture on a quote is still the drawing.

Done when: you can add an accessory, attach a part with a price, put it on a new quote, and see that price in the total. You can remove that part and the total drops. You can change a seeded part price and a new window uses the new price. npm run build and npm test pass.
```

**Done when**

- Catalogue search pages through results 25 at a time.
- Add, reprice, and remove a part on a product, and the next quote follows that.
- Existing saved quotes still show the money they had when they were saved.
- Markup and VAT still save from the Prices page.

---

## Prompt 4 — expiry, lock, and password age

```text
Read plan2.md decisions 4, 5, 6, and 7. Do only Prompt 4.

Read first: src/auth/session.ts, src/auth/RequireAuth.tsx, src/features/login/LoginPage.tsx, src/features/account/AccountPage.tsx, src/components/ui/Dialog.tsx, supabase/functions/admin-users/index.ts.

Goal: a standard user is locked after their expiry date, and cannot log in after their password is older than the configured number of days. Admins are unaffected. No people-table redesign in this prompt beyond what is required to set the new fields. The themed dialog is the one already in the app.

Behaviour:
- profiles.access_expires_on, profiles.locked, profiles.password_set_at, and app_settings.password_max_age_days are already in the database.
- On session load, if role is user and (locked is true, or access_expires_on is before today), keep them signed in only long enough to show a modal they cannot dismiss into the app: title “Account locked”, body “Contact the admin to get full access of your account.” The only button is Log out, which signs them out and lands on /login. They must not reach quotes or orders. is_active_user() already blocks their database writes; the modal is the screen they see.
- On session load, if role is user and password_set_at plus password_max_age_days is before now, sign them out and show on the login page: “Your password has expired. Ask an admin to set a new one.”
- Creating a user and setting a password in the admin-users function sets password_set_at to now.
- The account page password change calls mark_password_set() after a successful updateUser, so a user who sets their own password starts a new period.
- Admin accounts skip the lock check and the password-age check.

Leave the people table layout to Prompt 5. If you need a temporary way to set an expiry while testing, a single date field on the user row is acceptable, and Prompt 5 will replace the table around it.

Done when: a user with an expiry of yesterday sees the locked modal and cannot open /orders. A user whose password_set_at is older than the setting cannot stay logged in. An admin with the same dates still uses the app. npm run build and npm test pass.
```

**Done when**

- Expired or locked users see the contact-admin dialog and cannot work.
- An old password blocks a user until an admin sets a new one.
- An admin is never locked by these rules.

---

## Prompt 5 — two people tables, slider, unlock, and their orders

```text
Read plan2.md decisions 3, 4, 7, and 8. Do only Prompt 5.

Read first: src/features/admin/AdminPage.tsx, src/features/admin/OrdersPage.tsx, src/components/ui/Dialog.tsx, src/repositories/SupabaseQuoteRepository.ts.

Goal: admins and users are listed in two tables. Lock, expiry, and active apply only on the users table. Role is text in both tables. From a user row, one button opens that person’s drafts, quotes, and booked jobs.

Users table columns: name, email, user id, role (text “user”), active slider, expiry date, lock state, created, actions.
Admins table columns: name, email, user id, role (text “admin”), created, and Set a new password. No slider, no expiry, no lock, no orders button.

Active slider:
- Shows Active or Inactive.
- Click opens ConfirmDialog. Copy states what will happen and that an email will be sent.
- Confirm updates profiles.active. The existing inactive sign-out stays.
- The signed-in admin cannot set themselves inactive.

Expiry:
- A date input on the user row. Saving writes access_expires_on. Empty means no expiry.
- Use a native date input styled like the other fields. Do not add a date library.

Lock:
- If locked is true or the expiry date is before today, the row shows Locked and an Unlock button.
- Otherwise it shows Unlocked.
- Unlock opens ConfirmDialog. When the current expiry is today or earlier, the dialog contains a required date input and that date must be after today. Confirm sets locked = false and, when a date was entered, saves it as access_expires_on.
- There is no lock control on an admin row.

Orders:
- Each user row has a button “Orders”.
- It opens /admin/users/:id/orders.
- That page lists only that person’s quotes: job number, customer, status (draft, quoted, booked), updated time, total, and the same print links the all-orders page already has.
- A search box filters job number, customer, and reference.
- There is no edit control and the row does not open the configurator.
- The page heading shows the person’s name and email.

Role:
- Remove the role dropdown from the table. The New login form still has the role field, because that is how a new admin is created until super admin exists.

Search:
- One search box above the tables filters both tables by name and email on the loaded rows.

Email sending is Prompt 6. In this prompt the confirm dialogs can say the email will be sent, and the click should call the existing admin-users function with a new action name (set-active, unlock) that updates the row. If the function cannot send mail yet, it still saves the row and returns ok.

The password dialog and “Set a new password” stay as they are.

Done when: users and admins are in separate tables; role is not editable in either table; the slider and unlock use the themed confirm dialog; Orders shows only that user’s jobs and can print them; npm run build and npm test pass.
```

**Done when**

- Two tables. Lock and active exist only on users.
- Unlock asks for a future date when the current expiry has passed.
- “Orders” lists that person’s drafts, quotes, and booked jobs, print only.
- Search filters the people tables and that person’s jobs.

---

## Prompt 6 — emails for new logins, passwords, unlock, and active

```text
Read plan2.md, “Emails this plan sends” and decision 9. Do only Prompt 6.

Read first: supabase/functions/admin-users/index.ts, src/features/admin/AdminPage.tsx.

Goal: the admin-users function sends the four emails through Resend. Secrets RESEND_API_KEY, MAIL_FROM, and SITE_URL are already set in Supabase. Do not read them in the React app.

Extend the function:
- create: after the user is created, send the new-login email (login link from SITE_URL, their email, the password just set), then return the same JSON the page already expects, including temporaryPassword, so the on-screen dialog still works.
- set-password: send the new-password email, set password_set_at to now, return the same JSON as today.
- set-active: body has userId and active. Only allow the target when their role is user. Update profiles.active. Send the active or inactive email. Do not include a password.
- unlock: body has userId and, when required, accessExpiresOn (YYYY-MM-DD, must be after today if the stored date is today or earlier). Only allow role user. Set locked = false and the new date. Send the unlock email. Do not include a password.

If Resend returns an error, still keep the database change for set-active and unlock, and return a clear error string so the admin page can toast “Saved, but the email was not sent” plus the reason. For create and set-password, the Auth user is already updated before the email; return the password to the dialog and the same email-failed message.

The React page:
- Create and set-password toast that the email was sent, or the failure message.
- Slider and unlock call set-active and unlock.
- Emails are plain text. From address is MAIL_FROM. Subject lines: “Your SunnyPlast login”, “Your SunnyPlast password”, “Your SunnyPlast account is active”, “Your SunnyPlast account is inactive”, “Your SunnyPlast account is unlocked”.
- The login link is SITE_URL + “/login”.

Do not add two-factor login in this prompt. Do not store the password in any table.

Done when: creating a user sends one email containing the login link, the email address, and the password, and the on-screen dialog still shows that password once. Unlock and the active slider each send one email and do not include a password. npm run build and npm test pass.
```

**Done when**

- A new login email arrives with the link, email, and password.
- Unlock and active / inactive emails arrive and contain no password.
- A missing Resend key does not roll back the unlock or the active flag.
- The password is still absent from the database.

---

## Prompt 7 — search on the remaining lists

```text
Read plan2.md decision 11. Do only Prompt 7.

Orders (/orders) already searches customer, reference, and job number. Keep that.

Add the same kind of search where it is still missing:
- /admin/orders searches job number, customer, owner email, and status, on the loaded list.
- /admin/prices needs no product search if markup and VAT are the only fields left there.
- /admin/catalog and /admin/users already search from earlier prompts. Leave them.
- On a quote, the openings list gets a search field when there is more than one opening. It filters location and product name. It does not remove an opening.

Match the existing orders search field: label hidden for screen readers, placeholder text, filter as the person types. Empty search shows the full list. No matches shows “Nothing matches that search.”

Do not change quote pricing, drawing, or print.

Done when: each of those pages filters while typing, and clearing the box restores the list. npm run build and npm test pass.
```

**Done when**

- All orders, the catalogue, both people tables, a user’s orders, the staff orders list, and the openings on a quote can be searched.
- Clearing the box shows the full list again.

---

## Prompt 8 — two-factor login (only when you ask)

Skip this until you say to do it. The emails in Prompt 6 are the confirmation step.

When you do ask: turn on Supabase Auth MFA (TOTP) for staff who opt in from the Account page. A new login email does not enrol a phone. The admin still creates the password. The second step is an authenticator app, not a second copy of the password. Do not make MFA required for every user in the first version, or an admin who loses a phone cannot recover the tool.

---

## Prompt 9 — add and remove parts on one opening

```text
Read plan2.md decision 12 and “How the catalogue works”. Do only Prompt 9.

Read first: src/features/configurator/PreviewCard.tsx, src/features/configurator/ConfiguratorPage.tsx, src/domain/models.ts, src/domain/parts.ts, src/domain/pricing.ts, src/features/print/InvoicePrint.tsx, src/features/print/WorkOrderPrint.tsx.

Goal: on the quote screen, a staff member can see what one opening is made of, how its price is calculated, remove a sub-part from that opening, and add a part that already exists in inventory (handles, lining, seals, and anything else an admin has added on /admin/catalog). This edits that opening only. It does not change the product in the catalogue, and it does not change a second opening on the same quote.

The control is the existing “How this price is built” block on the opening preview. Keep the drawing and the Enlarge drawing button as they are.

What the block shows, for the opening currently being edited:
- One row per sub-part that is on the bill: name, quantity, unit, unit price, and the line amount (quantity times unit price).
- Parts cost, markup percent, price for one, quantity of the opening, and the line total. These are the same steps calculateItemPrice already uses.
- A removed part is absent from this table and from the parts cost.
- An added part appears in the table and is included in the parts cost.

Remove:
- Each calculated part has a Remove control.
- It opens the existing ConfirmDialog. Confirming stores that part id on this quote item as removed.
- The part stays in inventory and stays on the product in the catalogue. The next new opening of that product still starts with the catalogue bill.
- Removing the last part is allowed. Parts cost is then 0 and the line total follows that.

Add:
- An “Add from inventory” control opens the existing Modal.
- The modal lists active parts from the catalogue. A search box filters them by name as the person types. It does not list parts already on this bill.
- Choosing a part adds it to this opening only. Quantity follows that part’s quantity rule against this opening’s size (perimeter, area, width, per opening, per sash, per panel, or one). A part whose rule is fixed uses the quantity the person types in the modal, default 1.
- The unit price is the company price, or the product’s price override when this opening’s product has one. The person does not type a price.
- They cannot create a part here. A missing handle or lining is added by an admin on /admin/catalog first, then it shows up in this list.

Storage:
- Save the removed part ids and the added parts on the quote item inside the quote document that is already stored in Supabase. No new table.
- Old quote items that have neither list price exactly as they do today.
- Duplicating an opening copies the removals and the additions. Duplicating a quote copies them too.
- Changing width, height, or panels recalculates quantities for parts that use a size rule. A removed part stays removed. An added part stays added.

Print:
- The quotation line total and the work order use the adjusted bill, because they already call the same pricing function. Do not redesign either sheet. If a sheet lists parts by name, it lists the adjusted bill.

Leave catalogue admin (Prompt 3), markup, VAT, and the builtin quantity formulas alone. A window with nothing removed and nothing added still prices as it did after Prompt 2.

Done when: on one window you can remove the handle, see the parts cost drop by that handle line, add a different inventory part, and see the new line in the build-up and in the opening total. A second opening on the same quote still has its handle. The catalogue product still includes the handle for the next new quote. npm run build and npm test pass. Add a unit test that a removed part is absent from the total and an added part is included.
```

**Done when**

- “How this price is built” shows each sub-part, the quantity, the unit price, and how those add up to the opening total.
- Remove drops that part from this opening only, after the themed confirm dialog.
- Add picks an existing inventory part, with search, and the price follows that part’s rule and company price.
- The catalogue default for the product is unchanged.
- An old quote with no additions or removals still prices as before.

---

## Order of work

1. You run the SQL migration.
2. Prompt 1 saves that SQL in the repo.
3. Prompt 2 points quotes at the database catalogue without moving the price of a current window.
4. Prompt 3 is the admin screen for products, parts, and prices.
5. Prompt 4 locks expired users and expires old passwords.
6. Prompt 5 splits the people tables and adds the orders button.
7. You set the Resend secrets if you have not already.
8. Prompt 6 sends the emails.
9. Prompt 7 fills in search on the lists that still lack it.
10. Prompt 8 is two-factor login. Skip it until you ask for it.
11. Prompt 9 lets the person on a quote remove sub-parts from that opening and add parts from inventory.

After Prompt 3 you can keep adding products in the admin screen up to the hundreds. Nothing in that list is compiled into the frontend. Handles, lining, and the other inventory parts added there are what Prompt 9 offers on a quote.
