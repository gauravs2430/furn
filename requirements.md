# SunnyPlast internal order desk — rebuild brief

This is the product as it works today. Hand this to a developer and they should be able to rebuild the same website: same screens, same rules, same documents. It is an internal tool for SunnyPlast staff. Customers do not log in.

Company details on every printed document:

- Name: SunnyPlast
- Tagline: Doors and windows
- Address: Strada Depozitelor Nr.30, Targu Mures, Romania
- Phone: +40756100649 / +40756103101
- Email: office@sunnyplast.ro
- Money is shown in British pounds (GBP), for example £1,234.56
- Quote terms: the quotation is provisional and valid for 30 days. A survey may change sizes and the final price. Lead times are confirmed when the order is booked.

---

## What the website is for

A salesperson sits with a customer, builds one or more openings (a window, a door, a patio door, or a bi-fold), sees a drawing and a live price, then saves the job. They can mark it as quoted, book it, and print a customer quotation (or invoice once booked) and a factory work order.

An admin looks after the people who can log in, the catalogue of products and parts, and the prices. Admins can see every staff job, but they can only print someone else’s job. They cannot edit it.

---

## Who can use it

There are two kinds of login.

| Role | What they can do |
| --- | --- |
| Staff user | Their own quotes and orders. Change their name and password. |
| Admin | Everything a staff user can do, plus users, prices, catalogue, and every order in the company. |

There are two login screens, and they are not interchangeable.

- Staff sign in at `/login`. The screen says “Welcome back” and “Sign in to continue to SunnyPlast”.
- Admins sign in at `/admin/login`. The screen says “Welcome back, Admin”.
- If an admin uses the staff screen, they are told to use the admin screen, and they are signed out.
- If a staff user uses the admin screen, they are told to use the user screen, and they are signed out.
- A refresh of an already-open session does not force this check again. The check only happens on the login they just submitted.
- There is no public sign-up. An admin creates every account and chooses the password (at least 8 characters).
- Passwords can be shown or hidden on the login form.
- The footer on the staff screen says “SunnyPlast Internal Portal”. The admin screen says “SunnyPlast Administration”.

---

## Look and layout

Once logged in, every page shares one shell.

- A top bar with the SunnyPlast logo, the company name, the tagline, and a Log out button.
- A left sidebar. On a narrow screen (860px and below) the sidebar becomes a drawer opened from a menu button. Escape or tapping the dimmed background closes it. The page behind the drawer does not scroll.
- The sidebar groups stay open by default. The group that matches the current page opens when you navigate.
- Home is a link to the welcome page, with one action under it: New quote.
- Orders and quotes contains Drafts, Orders, and Booked.
- Admin Panel is visible only to admins. It contains All orders, Users & admins, Add new user, and a Manage group with Prices and Catalogue.
- The bottom of the sidebar is the person’s account: initials, name, and either “Admin” or “Account”. It opens the account page.
- The home page itself is only a welcome. It shows “Admin” or “Staff”, “Welcome back, {name}”, and “Internal order desk for SunnyPlast staff.” New work starts from New quote in the sidebar, not from a big button on the home page.
- Small toast messages confirm saves, errors, and other results. They disappear on their own.
- Unknown addresses inside the app send the person back to Home.

---

## A quote, from start to finish

### Starting a job

New quote creates a draft and opens it. Each job gets the next number in the form `SP-0001`, `SP-0002`, and so on. Numbers are unique across the whole company.

A quote stores:

- Job number
- Customer name, phone, email, address, and salesperson
- Reference (a free text note, often a site or room reference)
- Supply: either “Supply & fit” or “Supply only”. New quotes start as Supply & fit.
- Requested date
- Status: Draft, Quoted, or Booked
- Created and updated times, plus the time it was quoted or booked
- A discount percent and a tax percent, copied from the company price settings when the quote is created
- The list of openings
- The opening currently being configured, so a refresh does not lose the form

The customer form can be filled while the opening is being designed. Customer name is required before Mark quoted or Book order. Email can be blank; if it is filled in, it must be a real email address.

### The opening being designed

The quote page is two columns on a wide screen: forms on the left, a sticky preview on the right. On a small screen the preview follows the forms. A bar at the bottom repeats the current opening’s line price and the Add or Update button.

The left side has four forms.

**1. Customer.** Name, phone, email, address, salesperson, reference, supply, and requested date.

**2. Opening.** Product, overall width and height in millimetres, quantity, location (for example “Kitchen”), and the layout of panels.

**3. Appearance.** Material, outside colour, inside colour, and glazing. Changing these updates the drawing colour and the technical defaults that depend on them.

**4. Technical.** The factory options printed on the work order: frame profile, mullion, cill, joint, bead, sash type, locking, handle, hinge, glass group, glazing method, glass type, gas fill, component type, drainage, and horizontal split. These start from sensible defaults and can be typed over.

The preview shows:

- A scale drawing of the opening, in the outside colour, with width and height dimensions
- The area in square metres and the perimeter in metres
- A parts list for this one opening, with quantities and prices
- Validation problems, in plain language
- Add to order, or Update opening when an existing line is being edited

Under that, the order lists every opening already added. Each line can be edited, duplicated, or deleted. Delete asks for confirmation. Editing loads that opening back into the form and scrolls to the top. Cancelling an edit clears the form back to a fresh window.

A totals card shows subtotal, discount, tax, and grand total. Discount can be 0 to 100 percent. Tax can be 0 to 40 percent. Both are per quote, so one job can differ from the company default.

### Status

- Save draft writes the job immediately and the button reads Saved until something changes.
- Mark quoted is allowed only when there is at least one opening and the customer name is valid. Status becomes Quoted.
- Book order asks “Book this order?” and then sets status to Booked. The quote can still be printed afterwards. The customer document title changes from Quotation to Invoice.
- Print quote and Print work order both refuse to open if the order has no openings.

### Size rules

These limits must be enforced. The person should see the message, not a silent failure.

| Rule | Limit |
| --- | --- |
| Width | 200 mm to 6000 mm |
| Height | 200 mm to 3000 mm |
| Quantity | whole number from 1 to 99 |
| Panels in one opening | 1 to 6 |
| Panel widths | each greater than 0, and together they must equal the overall width |
| Single solid or half-glazed door | cannot be wider than 1100 mm. Wider than that needs a pair or a different style. |
| Accessory products | only the quantity is checked. They have no drawing. |

If the panels add up short, say how many millimetres are remaining. If they add up long, say how many millimetres they are over.

### Products and layouts that ship with the site

Four drawn products:

| Product | What it is | Starts at | Default layout |
| --- | --- | --- | --- |
| Window | Casement, fixed, and sliding lights | 1815 × 1130 mm | Casement + Fixed + Casement, panel widths 600, 615, 600 |
| Door | Single leaf or French pair | 900 × 2100 mm | Single half glazed |
| Patio Door | In-line sliding panels | 2400 × 2100 mm | Sliding 2-panel |
| Bi-fold Door | Folding door sets | 3000 × 2100 mm | 3-panel bi-fold |

An admin can also add an accessory product. Accessories are priced items with a quantity and no drawing.

Panel types, and which product can use them:

- Window: Fixed, Left casement, Right casement, Tilt & turn left, Tilt & turn right, Sliding
- Door: Solid, Half glazed, Left casement, Right casement, Fixed
- Patio: Sliding, Fixed
- Bi-fold: Bi-fold, Fixed

Ready-made layouts the form can apply in one click:

- Window: Fixed, Left Casement, Right Casement, Tilt & Turn Left, Tilt & Turn Right, Fixed + Casement, Casement + Fixed, Casement + Fixed + Casement, Fixed + Fixed + Fixed, Sliding 2-panel, Sliding 3-panel
- Door: Single solid, Single half glazed, French pair
- Patio: Sliding 2-panel, Sliding 3-panel
- Bi-fold: 3-panel, 4-panel

The person can also change one panel’s type, change one panel’s width, add a panel, or remove a panel, as long as the rules above still hold. Widths should be adjusted so they still add up to the overall width.

### Drawing

The drawing is a front elevation, to scale, of the frame and the panels.

- Fixed lights are plain glass.
- Casement and tilt-and-turn lights show the hinge side and the opening direction.
- Sliding and bi-fold panels show that they move.
- Solid door leaves are filled, not glazed. Half-glazed doors show glass in the upper part.
- Woodgrain oak is a grain finish. Other colours are flat.
- Windows can show a cill. Doors, patios, and bi-folds do not, unless the technical cill is set.
- The same drawing appears large in the configurator, as a small thumbnail in the order list, and on the printed quotation.

This drawing is a sales picture. It is not a machining drawing. The factory detail is the printed work order.

### Technical defaults

When the product, material, glazing, or panel layout changes, fill the technical fields from these rules unless the person has already typed their own value for that field on this opening. A brand-new opening always starts from the defaults.

Frame and mullion by material:

- uPVC: frame `SPQ-6-11252  68mm 6 Chamber`, mullion `SPQ-05-20252/SPQ-005-30252 67mm`
- Aluminium: frame `AL-58mm Thermal Break`, mullion `AL-58mm Transom / Mullion`
- Timber: frame `Softwood 68mm Section`, mullion `Softwood 68mm Mullion`

Other defaults:

- Mullion is “None” when there is only one panel.
- Cill is `GL-1-00150 150mm` on a window, and “None” on everything else.
- Joint is “Mechanical (Standard)” for timber, otherwise “Welded (Standard)”.
- Bead is 36 mm for triple glazing, otherwise 28 mm.
- Sash type is described from the panels: Fixed light, Solid door leaf, Half glazed door, Tilt and turn, Casement left hung, Casement right hung, Casement left and right hung, Sliding sash, Bi-fold sash, or Mixed.
- No opening panels: locking, handle, and hinge are “None”, and the glass method is Unglazed with glass type and gas “None” when every panel is solid.
- Sliding or bi-fold: locking is “Sliding hook lock”, hinge is “None”.
- An opening window otherwise uses Espag Locking, a White Inline Handle, and a Standard hinge.
- An opening door otherwise uses a Multi-point lock, a Lever handle, and a Butt hinge.
- Glass display group is Standard. Component type is Glass. Drainage is Concealed Drainage. Horizontal split is By Dimensions.
- Glass type and gas come from the chosen glazing option.

---

## How the price is worked out

The price of one opening is the cost of its parts, plus a company markup, times the quantity.

```
line total = round(parts cost × (1 + markup% / 100)) × quantity
```

The quote total is:

```
subtotal = sum of line totals
discount = subtotal × discount%          (discount is capped at 0–100)
net      = subtotal − discount
tax      = net × tax%                    (tax is capped at 0–40 on the quote)
grand    = net + tax
```

Money is rounded to the nearest penny at each of those steps.

Company defaults when the database is first filled:

- Markup 30%
- Tax 20%
- Materials: uPVC ×1, Aluminium ×1.8, Timber ×2.3
- Glazing add-on per m²: Double £0, Triple £45, Acoustic £60
- Product factors: Window ×1, Door ×1.35, Patio ×1.6, Bi-fold ×2.2

A part’s unit price starts from the catalogue price, or from a price override on that product if one is set. Then:

- If the part is marked “applies material factor”, multiply by the material factor.
- If the part is marked “applies product factor”, multiply by the product factor.
- If the part is marked “applies glazing add-on”, add the glazing add-on per m².

### How many of each part

Area is `(width mm × height mm) / 1,000,000` square metres. Perimeter is `2 × (width + height) / 1,000` metres. Quantities are rounded to 2 decimal places.

Every part has a quantity rule:

| Rule | Quantity |
| --- | --- |
| Built-in | The special table below. Only the original parts use this. |
| Perimeter | The perimeter in metres |
| Area | The area in square metres |
| Width | The width in metres |
| Per opening | How many panels are not Fixed |
| Per sash | How many panels are casement or tilt-and-turn |
| Per panel | How many panels |
| One | Always 1 |
| Fixed | A number typed for that opening, or the number stored on the product link. Accessories always use a typed quantity. |

If the quantity comes out at 0 or less, that part is left off the bill.

The built-in quantities for the original parts are:

| Part | Unit | Price | Quantity |
| --- | --- | --- | --- |
| Frame profile | m | 15 | Perimeter. Uses material factor and product factor. |
| Sealed glass unit | m² | 55 | Area × glass factor, or 0 if every panel is solid. Uses the glazing add-on. Glass factor is 0.9 for windows. For a door: 0.5 if any panel is half-glazed, 0.75 if there are 2 or more panels, otherwise 0.5. |
| Door leaf panel | m² | 70 | For a single door that is not a French pair: area × 0.95 if the leaf is solid, otherwise area × 0.5. Otherwise 0. |
| French door leaf | each | 120 | 2 when the product is a door with 2 or more panels and every panel is glazed. Otherwise 0. |
| Sliding or folding panel frame | each | 85 | The number of panels on a patio or bi-fold, at least 1. Otherwise 0. |
| Track and runner set | each | 95 | 1 for a patio, a bi-fold, or any opening that has a sliding or bi-fold panel. Otherwise 0. |
| Opening sash | each | 38 | Count of casement and tilt-and-turn panels. |
| Hinge | each | 9 | French pair: 6. Other opening door: 3. Casement or tilt-and-turn: 2 per sash. Bi-fold panels and no casement sash: number of bi-fold panels + 1. Otherwise 0. |
| Multi-point lock | each | 35 | 1 if any panel opens. Otherwise 0. |
| Handle set | each | 18 | 0 if nothing opens. French pair: 2. More than 2 opening panels: 1. Otherwise the number of opening panels, at least 1. |
| Euro cylinder | each | 16 | 0 on a window. Otherwise 1 if anything opens. |
| Threshold | m | 22 | 0 on a window. Otherwise the width in metres. |
| Cill | m | 12 | On a window, the width in metres, unless the technical cill is “None”. Otherwise 0. |
| Weather seals | m | 1.6 | Perimeter. |
| Glazing beads | m | 2.5 | Perimeter if there is any glass, otherwise 0. |
| Fixings and sundries | each | 8 | 1 |
| Fabrication labour | hr | 28 | `1.5 + area × 0.8`. Uses the product factor. |

Frame and labour are the parts that use the product factor. Frame also uses the material factor. Glass is the part that uses the glazing add-on.

### Parts on one opening

Each product has a list of parts that are included by default. On a single opening the salesperson can:

- Remove an included part from this opening only
- Add a part from the inventory that is not on this product
- For a part whose rule is Fixed, type how many

Those choices belong to that opening. They do not change the catalogue. Older quotes that were saved before this existed still price correctly: missing lists mean “nothing removed” and “nothing added”.

---

## Orders list

The orders page is titled from the filter: Drafts, Booked, or Quotes & orders.

Three figures sit at the top, always for the whole list, not just the search:

- How many drafts
- How many quoted
- The total value of booked jobs

A search box matches customer name, reference, job number, or status. The list is newest first. Each row shows the job, the customer, the status, when it was last updated, the grand total, and actions: open, duplicate, print, delete. Delete asks for confirmation. Duplicate makes a new job with a new job number and copies the openings. New quote is also on this page.

A staff user only sees their own jobs. They cannot open another person’s job for editing.

---

## Printing

Both documents open on their own page with Back to quote and Print / Save as PDF. The browser print dialog is used. The on-screen toolbar must not appear on the paper.

### Quotation or invoice

The title is QUOTATION until the job is Booked, then it is INVOICE.

It shows the company block, the document number and date, supply type, the customer, the site address, the reference, who prepared it, and the requested or booked date. Each opening is a row: a small drawing, the description (product, size, material, colour, glazing, layout), quantity, unit price, and line total. Then discount, tax, and grand total, and the 30-day terms.

### Work order

One section per opening. It is a factory sheet, not a customer price list.

Main options, in this order: outside colour, inside colour, frame on all four sides, mullion, cill, joint, bead, sash type, locking, handle, hinge, glass display group, glazing method, glass type, gas fill, component type, drainage, location (or “Please Specify”), and horizontal split. Colours are printed as the colour name plus `[SP]`. The frame name on the sheet is “Frame 6 Chamber”, “Aluminium Frame”, or “Timber Frame”.

Then a cut list of sections (vertical or horizontal, section name, description, quantity, length, end prep, reinforcing, reinforcing length), an accessories list, and a glass list (reference, quantity, width, length).

Glass size is the panel size minus a deduction. These deductions are chosen so the sample window, 1815 × 1130 with casement, fixed, and casement, matches the original sample work order. They are not a real CNC engine.

- Solid panels: no glass
- Casement, tilt-and-turn, and half-glazed: deduct 174 mm width and 238 mm height
- Sliding and bi-fold: deduct 90 mm width and 180 mm height
- Fixed and other glazed lights: deduct 37 mm width and 136 mm height
- A half-glazed door uses 42% of the height as the glazed height, then deducts 80 mm from that height
- Glass is never smaller than 40 × 40 mm
- If the glass type is “None”, that panel has no glass line
- A cill, when it is not “None”, is the overall width plus 100 mm, with 35 × 15 steel reinforcement

If an admin opens someone else’s job, they see “Only the owner can change this order”, the job number and customer, and the two print links. They do not get the configurator.

---

## Admin: users

The users page has a search across name and email, two lists (users and admins), and a form titled so that Add new user in the sidebar scrolls straight to it.

Creating a person asks for name, email, role (user or admin), and a password of at least 8 characters. The account is created already confirmed, so they do not have to click an email link before the password works. After it is saved:

- The password is shown once, with a button to copy it.
- An email is sent to that address. The subject is “Your SunnyPlast login”. The body says the login is ready, includes the website address, their email, and the password the admin just set.

For each user, an admin can:

- Set an expiry date with a calendar. The date is the last day they can work. The day after that date they are locked. Clearing the date means no expiry. Admins do not have an expiry.
- See a locked state. A user is locked if the lock is on, or if the expiry date is before today. Admins are never locked by these rules.
- Unlock. If the expiry is today or earlier, unlock must also pick a new date after today. Unlocking clears the lock.
- Turn the account active or inactive. Inactive people are signed out and cannot get back in until an admin turns them on. An admin cannot turn off their own account. An email tells the person they were turned on or off.
- Reset the password. Same rules as create: at least 8 characters, show it once, and email “Your SunnyPlast password” with the new password and the login address. Resetting the password also restarts the password-age clock.

When a normal user is locked, they do not see the app. They get a popup: “Account locked. Contact the admin to get full access of your account.” The only action is Log out.

### Password age

A setting stores how many days a staff password lasts. The default is 90 days, and the allowed range if it is changed in the database is 1 to 365. There is no screen for this number yet. It is read from the database.

Staff passwords expire when “password last set” plus that many days is in the past. Admins do not expire. A missing or broken date counts as expired. An expired user is signed out with: “Your password has expired. Ask an admin to set a new one.” The password is not changed for them. An admin sets a new one, or the person can change it on the account page before it expires.

Changing your own password on the account page restarts the clock. The new password still needs at least 8 characters.

Making someone an admin clears their lock and their expiry date. They are not subject to either rule while they are an admin.

---

## Admin: prices

One company price list, not a price list per person. Staff can read it. Only an admin can change it.

The screen edits markup percent and tax percent, then saves. Those become the starting discount is not markup — markup is applied inside every opening price. Tax percent is the starting tax on a new quote. Saving updates every open session the next time prices load.

If the price list cannot be loaded, the app shows a clear notice and does not pretend the demo numbers are the live prices.

---

## Admin: catalogue

This is where the furniture and the prices live. It is in the database, not only in the website code. The code keeps a copy of the original catalogue so the app can still describe products if a row is missing, but the live site reads and writes the database.

An admin can:

- Search and page through products.
- Add a product: name, family (window, door, patio, bi-fold, or accessory), short summary, price factor, default width, default height, default layout, and whether it is active. A new drawn product starts from the matching family’s defaults. An accessory starts at 1000 × 1000 with no layout.
- Edit that product, including turning it off so it no longer appears on a new quote.
- See the parts attached to that product. For each link: include or remove it from the product, override the price, and set a fixed quantity when the rule needs one.
- Create a new part while attaching it, or attach a part that already exists.
- Add and edit materials (name, factor, active).
- Add and edit colours (name, hex colour, solid or oak finish, active).
- Add and edit glazing options (name, add-on per m², description, glass type, gas fill, active).

Turning a material, colour, or glazing option off hides it on a new quote. It does not rewrite old quotes.

Original colours: White `#F4F1EA`, Anthracite Grey `#3A4146`, Black `#1C1C1C`, Woodgrain Oak `#A56E3C` (oak finish), Cream `#E7DCC0`.

Original glazing:

- Double, £0 per m², “4-20-4 clear low-E, argon”, glass `4-20-4 Clear Low E`, gas Argon
- Triple, £45 per m², “4-12-4-12-4 clear low-E, argon”, glass `4-12-4-12-4 Clear Low E`, gas Argon
- Acoustic, £60 per m², “Laminated acoustic unit”, glass `6.8 Acoustic Laminate`, gas Air

The four original products start with every original part included.

---

## Admin: all orders

A single list of every job in the company. Search matches job number, customer, the owner’s email, or status. Each row shows the owner, the job, the status, the total, and links to print the quotation and the work order. There is no edit button.

From a user on the users page, the admin can open that person’s orders only.

---

## Account page

Any logged-in person can change their display name and their password. Email and user id are shown and cannot be edited here. A password change updates the “password last set” time.

---

## What must be stored

Use a hosted Postgres database with login (the current build uses Supabase Auth plus Postgres). The browser talks to the database with the logged-in person’s token. The database itself refuses anything that person is not allowed to do. Hiding a button is not enough.

### People

- Id, email, name, role (`user` or `admin`), active yes/no
- Locked yes/no
- Access expiry date, or empty
- When the password was last set
- Created time

A person can change their own name. They cannot change their role, active flag, lock, expiry, email, or password-set time. An admin can change those. New logins create a profile row automatically from the account, including the role the admin chose.

### Quotes

- Id, owner, job number (unique), reference, customer name, status
- The whole quote document (customer, items, totals inputs, draft opening) stored as one document
- Created and updated times

A staff user can read, create, update, and delete only their own quotes, and only while their account is allowed in. An admin can read every quote. An admin cannot insert, update, or delete someone else’s quote. Creating a quote always stamps the logged-in person as the owner.

### Prices

One row for the whole company: markup, tax, and the price maps. Any active user can read it. Only an admin can write it. The write records who saved it and when.

### Catalogue

Products, parts, which parts belong to which product, materials, colours, and glazing options. Any active user can read them. Only an admin can insert, update, or delete them.

### Settings

One row: password maximum age in days, default 90.

### Job numbers

A database sequence. The next number is `SP-` plus the sequence padded to 4 digits. Only an active user can take the next number.

### Access rule used by the database

A person counts as active when their profile is active, and either they are an admin, or they are not locked and their expiry is empty or today or later. Inactive, locked, or expired people cannot read quotes, prices, or the catalogue through the database, even if they still hold an old login token.

### Creating users and sending email

Creating a user, setting their password, turning them on or off, and unlocking them go through a server function that checks the caller is an active admin. The browser never holds the service key. That function also sends the credential emails and the active/inactive emails. If the email fails, the account change still stands, and the screen says the email failed.

---

## How the app is built

These choices are part of “this exact site”, not a suggestion of one possible stack.

- A single-page web app: React, TypeScript, Vite, React Router.
- Deployed as a static site (the current host is Vercel) with every address rewritten to the app, so a refresh on `/quote/...` still loads.
- Login, database, row security, and the admin user function are Supabase.
- The interface state for the open quotes, the price list, and the catalogue is kept in the browser for the session and reloaded from the database on login.
- Prices, areas, validation, and the work-order cut list are calculated in the browser from the catalogue. They are not stored as the source of truth. Reprinting an old quote uses the catalogue as it is now, plus the choices saved on that quote.
- Drawings are drawn in the page as SVG, from the millimetre sizes.
- Print uses the browser print dialog.
- The app must keep working for the sample data already described, including quotes saved before parts could be added or removed.

---

## Not in this version

Do not add these while rebuilding what exists. They were discussed and are not part of the working site.

- A single super-admin who is the only person allowed to create or change admins. Today any admin can create another admin.
- Automatic sign-out after 30–40 minutes of work or inactivity.
- Two-factor login.
- A live “who is logged in right now” activity panel.
- A screen to edit the password lifetime. The number exists in the database and defaults to 90 days.
- Automatic replacement of an expired password. The person is blocked and an admin sets a new one.
