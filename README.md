# Continental Bridge Freight Line – website

Website for **continentalbridgefreightline.com**. It is built with plain HTML, CSS and JavaScript, hosted free on **GitHub Pages**, and stores tracking data in a free **Supabase** database.

| Page | File |
|---|---|
| Home (track / quote / tools panel) | `index.html` |
| About us (our story since 2011) | `about.html` |
| Services + transport comparison | `services.html` |
| Industries | `industries.html` |
| Shipping tools (CBM and volumetric weight calculators, container sizes, Incoterms, documents, restricted items) | `tools.html` |
| Help centre with searchable FAQ | `help.html` |
| Track a shipment (up to 10 at once) | `track.html` |
| Contact and detailed quote form | `contact.html` |
| Fraud awareness | `fraud.html` |
| Privacy policy / Terms | `privacy.html` / `terms.html` |
| Staff admin (update tracking) | `admin.html` |

**Settings you edit:** `config.js` holds the database keys, emails, office addresses and `FOUNDED` (the year shown as “Since 2011” across the site; the years-in-business figure updates itself each year).

**Staff login:** there is no built-in username or password. Each staff login is created in Supabase (Step 3, items 4–5 below), then signs in at `admin.html`.

**Legal pages:** `privacy.html` and `terms.html` are general starting points. Have them checked against your own trading conditions before relying on them.

**Database code:** `database-setup.sql` is run once in Supabase.

**All files are in one folder** (no sub-folders), so you can upload everything to GitHub in one go. **Logo and pictures:** `logo.png`, `favicon.png`, `apple-touch-icon.png` and the company photos (`ocean-freight.jpg`, `air-freight.jpg`, `road-freight.jpg`, `warehouse.jpg`, `customs.jpg`, `door-to-door.jpg`).

---

## Before you start: the three accounts

```
Visitor → www.continentalbridgefreightline.com (GoDaddy domain)
             ↓
        GitHub Pages (these website files)
             ↓ JavaScript
        Supabase (shipments, tracking updates, quote requests, staff login)
```

The website works right away in **demo mode**. On the Track page, enter `CBDEMO2026` to see an example. Live tracking starts after Step 3.

---

## Step 1: Put the website on GitHub

1. Create a free account at **github.com**.
2. Click **+** (top right) → **New repository**.
   - Name: `continentalbridgefreightline`
   - Visibility: **Public**. GitHub Pages is free for public repositories.
   - Click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Drag **all the files from this folder** into the box: the HTML, CSS, JS, JPG, PNG, SQL and TS files, plus `CNAME`, `robots.txt` and `sitemap.xml`. Everything is in one folder, so select all and drag.
5. Click **Commit changes**.

## Step 2: Turn on GitHub Pages

1. In the repository, go to **Settings** → **Pages** (left menu).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, set **Branch** to **main**, choose **/ (root)**, and click **Save**.
3. Wait 1–2 minutes and refresh. GitHub shows the address of your live site.
4. Under **Custom domain**, `www.continentalbridgefreightline.com` should already be filled in because of the `CNAME` file. If not, type it and click **Save**.

## Step 3: Set up the database (Supabase)

1. Go to **supabase.com**, sign up and click **New project**.
   - Name: `cbfl`
   - Set a strong database password and keep it safe.
   - Region: choose the one closest to most customers, e.g. **West EU (London)** or **Central EU (Frankfurt)**.
   - Click **Create new project** and wait about 2 minutes.
2. Left menu → **SQL Editor** → **+ New query**.
   - Open `database-setup.sql`, copy **everything** in it, paste it in and click **Run**.
   - You should see **Success**.
3. Left menu → **Authentication** → **Sign In / Providers** → switch **off** "Allow new users to sign up" and click **Save**. This stops strangers from creating accounts.
4. Left menu → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Enter the staff email (e.g. `martijnschwartz@continentalbridgefreightline.com`) and a strong password.
   - Tick **Auto Confirm User** and click **Create user**.
5. **SQL Editor** → **New query** → run the following, using the same email:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'martijnschwartz@continentalbridgefreightline.com';
   ```
   Repeat steps 4–5 for each staff member who updates shipments.
6. Copy the two keys the website needs:
   - **Project Settings → Data API**: copy the **Project URL** (`https://xxxx.supabase.co`).
   - **Project Settings → API Keys**: copy the **Publishable key** (`sb_publishable_…`). Older projects call it the **anon public** key.
   - ⚠️ Never use the **secret** or **service_role** key in the website.
7. **Authentication → URL Configuration** → set **Site URL** to `https://www.continentalbridgefreightline.com` and click **Save**.

## Step 4: Connect the website to the database

1. On GitHub, open `config.js` and click the ✏️ pencil icon (Edit).
2. Replace `PASTE-YOUR-PROJECT-URL-HERE` and `PASTE-YOUR-PUBLISHABLE-KEY-HERE` with the two values from Step 3.6.
3. While you're there, add the office street addresses and phone numbers in `OFFICES`.
4. Click **Commit changes**. The live site updates in about a minute.

## Step 5: Point the GoDaddy domain to GitHub

1. Sign in at **godaddy.com** → **My Products** → next to the domain click **DNS** (or **Manage DNS**).
2. **Delete** these if they exist:
   - the **A** record with name **@** that points to "Parked" or a GoDaddy IP;
   - the **CNAME** record with name **www**.
3. **Add** these records:

   | Type | Name | Value | TTL |
   |---|---|---|---|
   | A | @ | 185.199.108.153 | 1 hour |
   | A | @ | 185.199.109.153 | 1 hour |
   | A | @ | 185.199.110.153 | 1 hour |
   | A | @ | 185.199.111.153 | 1 hour |
   | CNAME | www | YOUR-GITHUB-USERNAME.github.io | 1 hour |

4. **Do not touch the MX, TXT (SPF) or email CNAME records.** They make `info@` and `martijnschwartz@` work. Change only the records above.
5. Wait 15 minutes to a few hours. Then in GitHub **Settings → Pages**, tick **Enforce HTTPS** (it appears once the certificate is ready).
6. Test both `continentalbridgefreightline.com` and `www.continentalbridgefreightline.com`.

## Step 6: Daily use

**Create a shipment**
1. Go to `www.continentalbridgefreightline.com/admin.html` and sign in.
2. Click **+ New shipment**, enter the customer's email and shipment details, then click **Create and get tracking number**. A tracking number such as `CB4DAF1430` is made automatically.
3. WhatsApp opens with a draft containing the tracking number, route, first location, and customer tracking link. Review it and tap **Send**; if a customer phone number was entered with its country code, the chat is addressed to that number. If email notifications are enabled below, an email is also sent.

**Move a shipment to a new place**
1. Open the shipment and fill in **Add a location update**: the new location, the status and an optional note.
2. Click **Save update**. The customer sees the change straight away on the Track page.

**Edit shipment details**
- Open a shipment, change the receiver, contact, route, description, or estimated delivery fields, then click **Save shipment details**. Use **Add a location update** to change its current status or location.

**Export a shipment report**
- In the **Shipments** tab, click **Export CSV** to download a spreadsheet-friendly report of all shipments, including customer contact details, route, status, timestamps, and tracking history.
- The export includes personal contact information; store and share the downloaded file securely.

**Delete a shipment**
- Open the shipment, click **Delete shipment**, and confirm. This permanently deletes the shipment and its tracking history.

**Quote requests**
- Open the **Quote requests** tab. This shows the messages sent from the Contact page.

**Status steps shown to customers:** Received → In Transit → At Port → Customs Clearance → Out for Delivery → Delivered. There is also **On Hold** for delays.

---

## Optional: email customers when a shipment is created

The staff form sends one email after creating a shipment and its first tracking update. It does not send emails for later tracking updates.

1. In Supabase **SQL Editor**, run this one-time migration for an existing database:
   ```sql
   alter table public.shipments add column if not exists receiver_email text;
   ```
   The same migration is included in `database-setup.sql` for new projects. Do not rerun the full setup script on a database where the tables already exist.
2. Create a [Resend](https://resend.com) account, verify a sender domain you control, and create an API key. The sender address in the next step must use that verified domain.
3. In the Supabase Dashboard, open **Edge Functions → Secrets** and add:
   - `RESEND_API_KEY`: your Resend API key
   - `EMAIL_FROM`: a verified sender, for example `Continental Bridge Freight Line <tracking@your-verified-domain.com>`
   - `SITE_URL`: your website origin, for example `https://www.continentalbridgefreightline.com`

   Keep these values in Edge Function secrets; never add them to `config.js` or frontend code.
4. Create the function in the browser (no Terminal needed): open **Edge Functions → Deploy a new function → Via Editor**. Name it exactly `send-shipment-email`, delete the sample code, paste in everything from the file `send-shipment-email.ts`, and click **Deploy function**.
   Leave **Verify JWT** (“Enforce JWT verification”) **on** for this function.
5. Publish the updated `admin.html` and `admin.js` to GitHub Pages. The SQL change was applied in step 1 and the Edge Function was deployed in step 4. Test with a shipment and an email address you can access.

## Notifications when someone sends a quote request

There are two parts. Part A only needs one SQL query. Part B also sends an email to staff.

### A. Alerts on the admin page

1. In Supabase **SQL Editor** → **New query**, paste everything in `notifications-setup.sql` and click **Run**.
2. Publish the updated website files to GitHub.
3. Sign in at `admin.html`. You will see:
   - an orange number on **Quote requests** showing how many requests are unread (also shown in the browser tab, e.g. “(2) Staff Admin”);
   - a pop-up message and a short sound the moment a new request arrives, while the admin page is open;
   - **🔔 Turn on desktop alerts**: click it once, then click **Allow**. You get a computer notification even when the admin tab is in the background;
   - **New** labels, **Mark read / unread**, **Mark all as read**, **Delete** (click twice to confirm), an **Unread** filter and a **Reply** button that opens your email app.

### B. Email to staff for every new request

This uses the same Resend account as the customer emails above (steps 2–3 of that section).

1. In the Supabase Dashboard, open **Edge Functions → Secrets** and add:
   - `NOTIFY_EMAIL`: who should receive the alerts, e.g. `info@continentalbridgefreightline.com` (separate several addresses with commas)
   - `WEBHOOK_SECRET`: a long random password you make up (for example 40 random letters and numbers). Keep it private.
   - `RESEND_API_KEY`, `EMAIL_FROM` and `SITE_URL`, if you have not added them already.
2. Create the function in the browser: open **Edge Functions → Deploy a new function → Via Editor**. Name it exactly `notify-new-request`, delete the sample code, paste in everything from the file `notify-new-request.ts`, and click **Deploy function**.
   Then open the function’s **Details** (settings) and turn **Verify JWT** (“Enforce JWT verification”) **off**, and save. This is correct here: the database calls this function, and it checks `WEBHOOK_SECRET` instead of a login.
3. In the Supabase Dashboard, open **Database → Webhooks → Create a new hook**:
   - **Name:** `notify-new-request`
   - **Table:** `contact_messages`
   - **Events:** tick **Insert** only
   - **Type:** **Supabase Edge Functions**, then choose `notify-new-request` (method **POST**)
   - **HTTP Headers:** add a header named `x-webhook-secret` with the same value as `WEBHOOK_SECRET`
   - Click **Create webhook**.
4. Send a test request from the Contact page. Within a minute an email arrives with the customer’s details and an **Open admin page** button. Press **Reply** in your email app to answer the customer directly.

If no email arrives, open **Edge Functions → notify-new-request → Logs**. “Not allowed” means the header value does not match `WEBHOOK_SECRET`; “not configured” means a secret is missing.

The quote form also has a hidden spam trap: automated bots that fill in every field are ignored and do not trigger notifications.

## Making changes later

- **Text on a page:** edit the `.html` file on GitHub (✏️ → change → Commit).
- **Colours:** edit the top of `styles.css` (`--navy`, `--orange`, …).
- **Pictures:** to change a photo, upload a new photo with exactly the same file name (it replaces the old one). Larger photos (at least 1600px wide) look sharpest in the big banner at the top of each page.
- **Logo:** `logo.png` is used in the header and footer; `favicon.png` is the browser-tab icon.
- **Header and footer:** edit `site.js` once and the change appears on every page.
- **WhatsApp contact button:** set `WHATSAPP_NUMBER` in `config.js` to your business WhatsApp number in international format, digits only (for example `31612345678`, without `+` or spaces). The floating button appears on public pages and opens a prefilled message; visitors still send it themselves. Leave it empty to hide the button.

## Costs

- GitHub Pages: **free**.
- Supabase free plan: **free**. The project pauses after about a week with no visits; open the Supabase dashboard and click **Restore** if that happens. The Pro plan (around $25 a month) removes this.
- GoDaddy: the yearly domain renewal.

## Troubleshooting

| Problem | Fix |
|---|---|
| Site shows "404 There isn't a GitHub Pages site here" | Wait a few minutes after Step 2; check Pages is on the **main** branch, **/ (root)** |
| Domain shows GoDaddy parked page | DNS not updated yet, or old **A @** record still there (Step 5.2) |
| Track page says "Live tracking is not switched on yet" | `config.js` still has the PASTE placeholders (Step 4) |
| Admin says "not on the admin list" | Run the Step 3.5 query with the exact login email |
| Admin sign-in says wrong password | Reset it in Supabase → Authentication → Users → ⋯ → Send password recovery |
| Emails stopped working after DNS changes | An MX record was deleted; add back the records your email provider gave you |
