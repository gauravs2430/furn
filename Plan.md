# SunnyPlast — build plan

This file is the build script. It is written so you can paste one prompt at a time into Cursor using **Grok 4.7 High and Fast**. You do the Supabase website clicks. The model does the code.

Do the parts in order. Finish the “Done when” checks before the next prompt. One prompt per chat is the safe way. A fresh chat will not remember the previous one, so each prompt below already repeats the rules that matter.

SunnyPlast here is the internal measure-and-order tool already in this repo (windows, doors, patio doors, bi-fold doors). The public site to copy the *feel* from is [sunnyplast.ro](https://sunnyplast.ro/) (a WordPress site). Staff use this app to build a priced order and print the quotation and the work order.

No screenshots were attached with the request. The printed quotation and work order stay as they are in `src/features/print/`. If you later drop a screenshot in chat, use Prompt 9.

---

## How to talk to the model

Paste the prompt inside the fence. Add nothing else on the first message.

If it starts changing the drawing, the price maths, or the forms, stop it and send:

```text
Stop. Revert the unrelated edits. The quote form, the drawing, and the price calculation stay as they were. Continue only the task in the prompt.
```

If a command fails, paste the error under the same chat and say: “Fix this error. Do not start a different approach.”

---

## Decisions already made

These are locked. Later prompts must follow them.

1. This stays a Vite + React + TypeScript app. Hosting is the frontend only (the existing Vercel setup). Supabase is the backend. There is no second server for you to host.
2. Login is email + password. There is no public sign-up page. An admin creates each staff login.
3. After login the person lands on **Home** (`/`). After logout, and whenever someone opens any app link while logged out, they land on **Login** (`/login`). The back button must not reopen a private page.
4. Each staff member sees and edits only their own quotes, including older ones. They cannot open or change another person’s order.
5. Admin can see every order in a separate list and can print it. Admin does not edit someone else’s order. The owner does that.
6. Prices are one company list. Everyone uses it. Only admin can change it.
7. The quote screen, opening drawing, parts pricing, validation, duplicate, delete, draft / quoted / booked, and both print sheets keep their current behaviour.
8. Money stays in pounds (`en-GB`, GBP), the same as the app today.
9. Look: white and gray, straight blocks, Roboto and Roboto Slab (the fonts on sunnyplast.ro). The public site’s purple (`#903373`) is not used.
10. Passwords are never saved in a table and never shown again after the moment they are set. See the next section.

### Passwords

You asked for an admin screen that shows each person’s password. A production login cannot do that. Supabase stores a hash. Even the admin cannot read the original password back. That is the correct setup.

What admin *can* do:

- See user id, email, name, role (admin or user), active or turned off, and the date they were added.
- Type a password when creating the person. It is shown **once** on screen so you can tell them. It is not saved for later.
- Type a new password later the same way (shown once, then gone).
- Turn a person off so they can no longer get in.

There is no “view password” column. Do not ask the model to add one.

---

## Pages

| URL | Who | What it is |
| --- | --- | --- |
| `/login` | logged out | Email and password. No sign-up link. |
| `/` | logged in | Home. Short welcome and links into the work. |
| `/orders` | logged in | The current quotes list (today’s dashboard), only this person’s jobs. |
| `/quote/:id` | owner | The current configurator. Unchanged job. |
| `/quote/:id/print/quote` | owner, or admin | Quotation / invoice print. |
| `/quote/:id/print/work-order` | owner, or admin | Work order print. |
| `/account` | logged in | This person’s name, email, id, and change-password form. |
| `/admin/users` | admin | People who can log in. |
| `/admin/prices` | admin | The company price list. |
| `/admin/orders` | admin | Every staff order, print only. |

Header after login, left to right: **SunnyPlast** (goes Home), **Home**, **Orders**, **Account**, **Admin** (only if role is admin), **Log out**.

Admin in the header goes to `/admin/users`. That page has plain links to Prices and All orders.

Unknown URLs: logged in → Home. Logged out → Login.

---

## What must keep working

Leave these alone unless a prompt names the file:

- Product types: window, door, patio, bi-fold.
- Size, quantity, location, panels, materials, colours, glazing.
- Technical options and the live drawing (`src/features/drawing/`, `src/features/configurator/`).
- Parts and totals (`src/domain/pricing.ts`, `src/domain/parts.ts`, `src/domain/geometry.ts`).
- Customer block, discount, tax, status draft / quoted / booked.
- Search, duplicate quote, delete quote, duplicate opening, remove opening.
- Print quote and print work order (`src/features/print/`).
- Validation limits in `src/data/pricingDefaults.ts`.

The “Pricing setup” link on the quote page moves to the admin prices page. Staff no longer edit rates.

The line “Saved in this browser” goes away once quotes are in Supabase.

---

## Look

Match a plain WordPress admin-style page, close to sunnyplast.ro’s block layout, in white and gray.

- Page background `#f3f4f6`. Cards `#ffffff` with a 1px border `#d9dde3`. Corner radius `2px`. No large shadows. No pills. No gradient heroes.
- Text `#1f2933`. Secondary text `#5c6770`.
- Buttons are rectangles. Primary button fill `#374151`, white text. Secondary button is white with a gray border.
- Body font **Roboto**. Headings **Roboto Slab**. Load them from Google Fonts in `index.html`.
- Header is a white bar with a bottom border and text links. The active link is darker, with a 2px gray underline.
- Remove the light/dark theme toggle. The app is light only.
- The window drawing may keep a light blue glass fill so the preview stays readable. Printed sheets stay black text on white paper.
- Company name on screen and on printouts: **SunnyPlast**. Details from the public site: Strada Depozitelor Nr.30, Targu Mures, Romania; +40756100649 / +40756103101; office@sunnyplast.ro. Tagline: `Doors and windows`.
- Phone and desktop both work. Under 800px the header links collapse into one **Menu** button that opens a simple stacked list. Tables can scroll sideways. Inputs and buttons stay easy to tap.

---

## Supabase, in the order you will meet it

You have not used Supabase. You only need the website dashboard until Prompt 7. You do not install a database on your computer.

**Project** — one Supabase project is the backend: login, database, and (later) one small function Supabase runs for you.

**Anon key** — a public key baked into the frontend. It is safe to ship *because* the database rules (RLS) decide what that key is allowed to read. It is not a password for admin power.

**Service role key** — full access, ignores the rules. It must never go in the React app, in Vite env vars, or in Vercel. It stays on Supabase. The edge function in Prompt 7 is allowed to use it because that function runs on Supabase, not on Vercel.

**RLS** — row rules. Example: a quote row can be read when `user_id` is the logged-in person, or when that person is an admin.

**Profile** — a row we add next to Supabase’s private login user. It holds name, role, and active. The login password lives only inside Supabase Auth.

### Part 0 — you do this in the browser before Prompt 2

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a project. Pick a region close to Romania. Save the database password somewhere safe (you need it for the dashboard, not for the React app).
2. Wait until the project is ready. Open **Project Settings → API** (or **Data API**). Copy:
   - Project URL, shaped like `https://xxxxxxxx.supabase.co`
   - The `anon` `public` key
3. In this repo, create `.env.local` (this name is already gitignored by `*.local`):

```bash
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=paste-the-anon-key
```

4. Open **SQL Editor → New query**, paste the whole SQL block from the next section, and run it. You want “Success”.
5. Open **Authentication → Sign In / Providers** (Email). Find **Allow new users to sign up** and turn it **off**. Keep Email turned on. Turn **Confirm email** off so a person you create can log in straight away.
6. Open **Authentication → URL Configuration**.
   - Site URL: `http://localhost:5173`
   - Add redirect URL: `http://localhost:5173/**`
7. Open **Authentication → Users → Add user**. Create yourself with your email and a password. Tick confirm email / auto-confirm if you see it.
8. SQL Editor, run this with your email:

```sql
update public.profiles
set role = 'admin', full_name = 'Admin'
where email = 'you@your-email.com';
```

9. Check **Table Editor**. You should see `profiles` (your row, role admin), `quotes` (empty), `pricing_config` (one row).

If step 8 updates 0 rows, the user was created before the SQL in step 4. Delete that user and add them again, then rerun the update.

Come back to Prompt 2 only after step 9 looks right.

---

## SQL to paste in the Supabase SQL Editor

Run this once on an empty project.

```sql
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
```

Save this same SQL as `supabase/schema.sql` during Prompt 2 so the repo has a copy. If you need to run it again, do it on a fresh project. Do not run it twice on a project that already has the tables.

---

## Prompt 1 — name, pages, and the plain look

No login in this step. The app should still open on your machine when this finishes.

```text
Read Plan.md. Do only the “Prompt 1” task. Read these files first and keep their behaviour: src/app/router.tsx, src/components/layout/AppShell.tsx, src/theme/tokens.css, src/theme/globals.css, src/features/dashboard/DashboardPage.tsx, src/features/configurator/ConfiguratorPage.tsx, src/data/company.ts, index.html.

Goal: rebrand this internal app as SunnyPlast and split the screens into separate routes. Keep the quote configurator, drawing, pricing maths, and both print sheets working as they do now.

Routes:
- / is a new Home page. Short internal welcome for SunnyPlast staff. Three plain boxes that link to New quote (create a quote the same way the dashboard does, then go to /quote/:id), Orders (/orders), and Account (/account, placeholder is fine).
- /orders is the current dashboard (move DashboardPage here).
- /quote/:id and both /quote/:id/print/... routes stay.
- /account is a simple placeholder page titled Account.
- /admin/users is a simple placeholder titled Admin. For this prompt only, show the Admin link to everyone. Prompt 2 will hide it.
- Unknown paths redirect to /.

Header: wordmark SunnyPlast (Roboto Slab) linking to /, then text links Home, Orders, Account, Admin. Remove the theme toggle. Active link has a 2px gray underline.

Visual rules from Plan.md “Look”: white and gray, 2px corners, 1px borders, Roboto and Roboto Slab, no purple, no dark mode, no pills, no big shadows. Update tokens.css and the pieces of globals.css that fight those tokens. Leave print.css and the drawing colours readable. Update src/data/company.ts to the SunnyPlast details written in Plan.md.

Quote page: the back button goes to /orders and its label is Orders. Remove nothing else from that page.

Mobile: under 800px, header links sit behind a Menu button that shows a stacked list. The orders list and the quote form must still be usable at 390px wide and at desktop width.

Do not add Supabase. Do not change src/domain. Do not add a new UI library.

Done when: npm run build and npm test pass, Home / Orders / a quote / both print routes are separate pages, and the quote flow still adds an opening and shows a price.
```

**Done when**

- Home, Orders, a quote, and both print pages are different URLs.
- You can still add an opening and see a price.
- The page is white and gray with square corners.
- `npm run build` and `npm test` pass.

---

## Prompt 2 — login and a locked site

Do Part 0 first. `.env.local` must exist.

```text
Read Plan.md, especially “Decisions already made”, “Pages”, and “Passwords”. Do only the Prompt 2 task. The SQL is already applied in Supabase. .env.local already has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

Read first: src/app/App.tsx, src/app/router.tsx, src/components/layout/AppShell.tsx, src/main.tsx, package.json, .gitignore.

Goal: only a logged-in staff member can open any page except /login. Use @supabase/supabase-js. Frontend only.

Build:
- src/lib/supabase.ts creates one client from those two env vars. If either is missing, show a clear full-page message telling the developer to fill .env.local. Never mention or read a service role key.
- Copy the SQL from Plan.md into supabase/schema.sql so the repo matches the database. Do not invent a different schema.
- Add .env to .gitignore. Add .env.example with the two empty VITE_ variables and a one-line comment that the anon key is public and the service role key must never be added.
- Auth state in one small module or store: session, profile (id, email, full_name, role, active), loading. Load the profile row from public.profiles after login. If active is false, sign out and show “This account is turned off. Ask an admin.”
- /login is a white card: SunnyPlast, email, password, Sign in. Wrong password shows the Supabase error in plain language. No sign-up link. No “create account”.
- A guard wraps every route except /login. While the session is loading, show “Checking login…”. If there is no session, redirect to /login with replace. After a successful sign-in, always go to /.
- Log out calls supabase.auth.signOut and then navigates to /login with replace.
- Header from Prompt 1 stays. Show the person’s email on the right. Show Admin only when profile.role is admin. Account links to /account.
- On /account show this person’s name, email, and id as read-only text, plus a form to set a new password with supabase.auth.updateUser. Minimum 8 characters. Success toast. This is the user page.
- Leave quotes in the current local store for this prompt. Do not rewrite the configurator.

Done when: logged out, opening /, /orders, /quote/anything, /account, and /admin/users all end on /login. Log in and you land on /. Log out from any page and you are on /login. Refresh keeps the session. npm run build and npm test pass.
```

**Done when**

- Logged out, every app URL ends on `/login`.
- Sign in lands on Home. Log out from Orders, a quote, and Account all land on Login.
- Refresh stays logged in.
- A wrong password does not reveal whether the email exists in a custom way; the message from Supabase is enough.
- Admin link is visible for your admin user.

**You click:** Authentication → Users, and sign in with the admin you created in Part 0.

---

## Prompt 3 — each person’s orders live in Supabase

```text
Read Plan.md decisions 4, 5, and 7. Do only Prompt 3.

Read first: src/store/useAppStore.ts, src/repositories/QuoteRepository.ts, src/repositories/LocalQuoteRepository.ts, src/domain/models.ts, src/domain/factories.ts, src/features/dashboard/DashboardPage.tsx, src/features/configurator/ConfiguratorPage.tsx, src/features/print/PrintPreviewPage.tsx.

Goal: quotes are rows in public.quotes. The screen code keeps using the Quote type and the same buttons. Change where the data is stored, not how an opening is priced or drawn.

Rules:
- Add SupabaseQuoteRepository implementing the existing QuoteRepository interface. list/get/save/remove talk to public.quotes.
- The document jsonb column stores the whole Quote object. Also write job_no, reference, customer_name, status, created_at, updated_at. user_id is always the logged-in user id from the session. Ignore any owner field inside the json.
- New job numbers come from supabase.rpc('next_job_no'), formatted SP-0001. Stop using the local nextJobNo counter.
- On load, fetch this user’s quotes into the zustand list. Remove the sample quote from the initial state. Stop persisting quotes in localStorage (the key measure-order.v1 must not keep quotes). A one-time localStorage.removeItem of that key on boot is fine.
- Save still happens through the existing store actions (create, update, add item, status, delete, duplicate). They must await the repository and surface a toast if Supabase returns an error. Keep the UI responsive: don’t freeze typing. The current debounced draft save can stay, but it must write to Supabase.
- RLS already blocks other users. Still filter list by the session user for the Orders page. If get returns null, the quote page shows the existing empty state.
- Admin does not edit from this prompt. Owners only.
- Remove the “Saved in this browser” text. The save button can say “Saved” after a successful write.
- Do not change pricing.ts, the drawing, or the form fields.

Done when: two different staff users (create the second in the Supabase dashboard, Authentication → Users) each see only their own orders. Create, edit, duplicate, delete, status, and both print pages work after a refresh. npm run build and npm test pass.
```

**You click:** Authentication → Users → Add user, for a second staff email. Leave their role as `user`. Log in as each person in two browsers (or a normal window and a private window).

**Done when**

- User A cannot see User B’s job.
- Refresh keeps the order.
- Job numbers look like `SP-0001` and do not collide.

---

## Prompt 4 — one price list, admin edits it

```text
Read Plan.md decision 6. Do only Prompt 4.

Read first: src/data/pricingDefaults.ts, src/features/configurator/PricingSetupDialog.tsx, src/store/useAppStore.ts, src/domain/pricing.ts (read only, do not change the formulas).

Goal: pricingConfig is loaded from public.pricing_config id = 1 for every logged-in user. Only an admin can save changes. The numbers and the part list stay the ones already in the app.

Build:
- After login, fetch the config row into the existing zustand pricingConfig. If the row is missing, show an error that tells the admin to check the pricing_config table. Do not invent silent fallback prices in production once the row exists. pricingDefaults.ts can remain the TypeScript shape and the reset target.
- New page /admin/prices. Reuse the fields already in PricingSetupDialog (markup, default VAT, material factors, glazing add-ons, part prices). Save writes the jsonb config and updated_by. Reset puts back pricingDefaults and saves that.
- Remove the Pricing setup link from the quote page for everyone. Staff never see those editors.
- Non-admins who open /admin/prices are sent to /.
- A normal user’s quote still calculates with calculateItemPrice and calculateQuoteTotals. Those functions stay. When admin saves, the next fetch (refresh is enough) uses the new rates. You do not need live multiplayer updates.
- Keep local zustand as the in-memory copy the screens already read. Stop persisting pricingConfig to localStorage.

Done when: a staff user has no way to edit rates. An admin can change the frame price, refresh as a staff user, and see the new price on a new opening. Old saved quotes recalculate with the current company rates, which is the current app behaviour — keep that. npm run build and npm test pass.
```

**Done when**

- Staff quote page has no Pricing setup link.
- Admin price change shows up for a staff user after refresh.

---

## Prompt 5 — admin sees every order, print only

```text
Read Plan.md decision 5 and the Pages table. Do only Prompt 5.

Goal: /admin/orders lists every quote in public.quotes for admins: job number, customer, status, owner email, updated time, total. Each row has Print quote and Print work order. There is no edit button and the row does not open the configurator.

Owner email comes from joining profiles (admin select is already allowed by RLS).

If a non-admin opens /admin/orders, send them to /.

Print pages already load a quote by id. Admin RLS select allows that. If the logged-in user is not the owner, the print page still works, and the configurator route /quote/:id for someone else’s id shows a short message: “Only the owner can change this order” plus links to the two print pages. Do not let the form save over another user’s row.

Do not redesign the print sheets.

Done when: admin sees both users’ jobs and can print them. A staff URL to another user’s /quote/:id does not show the editor. npm run build and npm test pass.
```

---

## Prompt 6 — admin page for who is allowed in

Creating a user from inside the website is Prompt 7. This prompt only lists people and lets admin change role and turn someone off. You can still add users in the Supabase dashboard.

```text
Read Plan.md “Passwords” and the Pages table. Do only Prompt 6.

Goal: /admin/users is a plain table of public.profiles for admins. Columns: name, email, user id, role, active, created date. No password column. No attempt to read a password.

Actions on each row, admin only:
- Role select: user or admin. Save with a normal update to profiles. The protect_profile trigger allows this because the caller is admin.
- Active toggle. Turning someone off makes is_active_user() false, so their quotes and prices stop loading. Also, the app already signs them out when it next loads their profile; if they are currently logged in, their next navigation or refresh must hit the “account is turned off” path. Do not let an admin turn off their own row.
- A staff member opening /admin/users goes to /.

/account from Prompt 2: let the person edit full_name and save it on their own profile row. They must not be able to change role, active, or email from that form (the database trigger already blocks it; the form should not send those fields).

Header Admin link goes to /admin/users. On that page, add text links to Prices and All orders.

Empty and error states are one sentence each. Loading is “Loading people…”.

Do not add a sign-up form. Do not store passwords.

Done when: admin sees both users with ids. Demoting and turning off works. The turned-off user cannot keep using the app after refresh. npm run build and npm test pass.
```

**You click to add someone before Prompt 7:** Authentication → Users → Add user. The new row appears on `/admin/users` by itself because of the `handle_new_user` trigger.

---

## Prompt 7 — admin creates a login from the website

This is the first time you use the Supabase CLI. The function runs on Supabase, not on Vercel. Your hosting is still frontend-only.

The function code to create is below the prompt. The model should copy it, not invent a different API.

```text
Read Plan.md “Passwords” and the edge function in Prompt 7. Do only Prompt 7.

Create supabase/functions/admin-users/index.ts with the function code written in Plan.md. Do not change the actions.

Frontend, on /admin/users, admin only:
- A form: full name, email, role, password (min 8). Submit calls supabase.functions.invoke('admin-users', { body: { action: 'create', ... } }).
- On success, show a dialog with the email and the password, and the sentence “This password is shown once. It is not stored.” A Copy button is fine. Closing the dialog removes it from the page. Refreshing the users table must not show the password.
- Each row gets “Set a new password”. Same function, action set-password. Same one-time dialog.
- Do not add a column that remembers passwords. Do not put the service role key in any VITE_ variable.

Wire invoke errors to a toast with the error string from the function.

Done when: from the admin page you can create a third user, see the password once, log in as them in a private window, and see an empty Orders page. npm run build passes.
```

### Edge function code

`supabase/functions/admin-users/index.ts`

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing login' }, 401)

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not logged in' }, 401)

    const admin = createClient(url, service)
    const { data: profile } = await admin
      .from('profiles')
      .select('role, active')
      .eq('id', userData.user.id)
      .single()

    if (profile?.role !== 'admin' || profile?.active !== true) {
      return json({ error: 'Admin only' }, 403)
    }

    const body = await req.json()
    const action = String(body.action ?? '')

    if (action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const fullName = String(body.fullName ?? '').trim()
      const role = body.role === 'admin' ? 'admin' : 'user'
      if (!email.includes('@')) return json({ error: 'Enter a valid email' }, 400)
      if (password.length < 8) return json({ error: 'Password needs at least 8 characters' }, 400)

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      })
      if (error) return json({ error: error.message }, 400)

      if (data.user) {
        await admin.from('profiles').update({ full_name: fullName, role, email }).eq('id', data.user.id)
      }

      return json({
        id: data.user?.id ?? '',
        email,
        fullName,
        role,
        temporaryPassword: password,
      })
    }

    if (action === 'set-password') {
      const password = String(body.password ?? '')
      const userId = String(body.userId ?? '')
      if (password.length < 8) return json({ error: 'Password needs at least 8 characters' }, 400)
      const { data: target } = await admin.from('profiles').select('email').eq('id', userId).single()
      if (!target) return json({ error: 'User not found' }, 404)
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message }, 400)
      return json({ email: target.email, temporaryPassword: password })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
```

### You deploy it

Install nothing global if you can avoid it. From the project folder:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy admin-users
```

`YOUR_PROJECT_REF` is the bit before `.supabase.co` in the project URL.

Hosted functions already receive `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Do not copy the service role key into `.env.local`.

In the dashboard open **Edge Functions** and confirm `admin-users` is there. Then use the form on `/admin/users`.

If the browser says the function failed to send, open the function’s **Logs** in the Supabase dashboard and paste that log into Cursor with: “Fix the admin-users function. Here is the log.”

---

## Prompt 8 — home, phones, and a production pass

```text
Read Plan.md “Look” and “Pages”. Do only Prompt 8. This is a finish pass. Do not add features that are not listed.

Home (/):
- Heading with the person’s name from their profile.
- One line: internal order desk for SunnyPlast staff.
- Boxes: New quote, My orders (count of their quotes), and if admin: People, Prices, All orders.
- A short list of their 5 latest orders linking to /quote/:id.

Navigation:
- Every private route uses the same guard from Prompt 2. Logout from Home, Orders, Account, Admin, a quote, and a print page goes to /login with replace.
- Opening a private URL while logged out goes to /login with replace.
- Signing in always opens /.

Responsive and calm UI:
- Check 390px and a desktop width for Home, Login, Orders, Account, Admin users, Admin prices, and the quote page.
- Menu button under 800px closes after a link click.
- Loading, empty, and failed-save states are plain sentences. Buttons show a busy state while a save is in flight so a double click does not create two quotes.
- Focus states stay visible. Form labels stay attached to inputs.

Production:
- Confirm the service role key is not referenced anywhere under src/ or in Vite env.
- Confirm .env.local is not imported into git status.
- npm run build and npm test pass.
- Leave the domain pricing tests green. If a test fails because the sample quote moved, update the test setup only.

Do not restyle the print sheets into the gray app theme. Paper stays white.
```

**Done when**

- You can click through Home → new quote → add opening → print quote → log out, and you are on Login.
- Pasting `/orders` into the address bar while logged out shows Login.
- The phone width is usable, including the quote form.

---

## Prompt 9 — only if you attach the print screenshot later

```text
A screenshot of the SunnyPlast quotation / draft PDF is attached. Update only src/features/print/ and src/theme/print.css so the printed quotation and the work order match that sheet: same blocks, same labels, same order of figures. Keep the data coming from the Quote object and calculateQuoteTotals. Do not change auth, routes, or pricing formulas. Prices, customer, job number, and openings must still print. npm run build passes.
```

Skip this if you do not have the screenshot.

---

## Put it on Vercel

The repo already has `vercel.json` for a Vite single-page app. You deploy the `dist` frontend only.

1. In Vercel, import this project.
2. Environment variables (Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Nothing else.
3. Deploy.
4. Back in Supabase → Authentication → URL Configuration, set Site URL to `https://your-domain.vercel.app` and add redirect `https://your-domain.vercel.app/**`. You can keep the localhost redirects too.

Then log in on the live URL as admin, create one staff user, and repeat the two-browser check.

---

## Final click-through before you call it done

Use an admin and a normal user.

1. Logged out, visit `/`, `/orders`, `/account`, `/admin/users`. Each one shows Login.
2. Admin signs in and lands on Home.
3. Admin opens People, creates a user, copies the one-time password, closes the dialog, refreshes, and the password is gone.
4. That user signs in (private window), lands on Home, creates a quote, adds a window, marks it quoted, prints the quote and the work order.
5. Admin’s All orders shows that job and can print it. Admin’s own Orders list does not mix it into the editor.
6. The staff user cannot open Admin, cannot see the admin’s quotes, and cannot find Pricing setup.
7. Admin changes a part price. Staff refreshes and a new opening uses the new price.
8. Admin turns the staff user off. Staff refreshes and sees the turned-off message on Login.
9. Admin logs out from a quote URL and is on Login. Browser Back does not show the quote.

---

## If you want one single paste instead of eight chats

Only do this after Part 0 is finished. Tell the model:

```text
Read Plan.md and implement Prompts 1 through 8 in that order. Stop after each prompt and run npm run build and npm test before the next prompt. Follow every locked decision. Do not merge the pages back into one screen. Do not store passwords. Do not put a service role key in the frontend. Leave the pricing formulas and the drawing alone.
```

Eight short chats still work better on Grok 4.7 High and Fast. Use the single paste only if you will watch each step and stop it when it wanders.
