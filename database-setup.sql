-- =====================================================================
-- Continental Bridge Freight Line – database setup (Supabase)
-- Run ONCE: Supabase → SQL Editor → New query → paste ALL of this → Run
-- =====================================================================
-- 1. SHIPMENTS: one row per parcel / container
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique not null default 'CB' || upper(substr(md5(random()::text), 1, 8)),
  sender_name text,
  receiver_name text,
  receiver_email text,
  receiver_phone text,
  origin text,
  destination text,
  description text,
  status text not null default 'Received',
  current_location text,
  eta date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipments
add column if not exists receiver_email text;

-- 2. TRACKING EVENTS: every location update = one row (builds the timeline)
create table public.tracking_events (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  location text not null,
  status text not null,
  note text,
  event_time timestamptz not null default now()
);

create index on public.tracking_events (shipment_id, event_time desc);

-- New update → copy its status and location onto the shipment automatically
create or replace function public.apply_tracking_event () returns trigger language plpgsql
set
  search_path = public as $$
begin
  update public.shipments
     set status = new.status, current_location = new.location, updated_at = now()
   where id = new.shipment_id;
  return new;
end $$;

create trigger trg_apply_tracking_event
after insert on public.tracking_events for each row
execute function public.apply_tracking_event ();

-- 3. QUOTE REQUESTS from the Contact page
create table public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  phone text check (char_length(phone) <= 40),
  service text check (char_length(service) <= 60),
  origin text check (char_length(origin) <= 120),
  destination text check (char_length(destination) <= 120),
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- 4. ADMIN LIST (staff who may update shipments)
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- 5. SECURITY (row level security)
alter table public.shipments enable row level security;

alter table public.tracking_events enable row level security;

alter table public.contact_messages enable row level security;

alter table public.admins enable row level security;

create or replace function public.is_admin () returns boolean language sql stable security definer
set
  search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create policy "Admins manage shipments" on public.shipments for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "Admins manage events" on public.tracking_events for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "Admins see own admin row" on public.admins for
select
  to authenticated using (user_id = auth.uid ());

-- Visitors may SEND a quote request but never read them; admins read and delete
create policy "Anyone can send a quote request" on public.contact_messages for insert to anon,
authenticated
with
  check (true);

create policy "Admins read quote requests" on public.contact_messages for
select
  to authenticated using (public.is_admin ());

create policy "Admins delete quote requests" on public.contact_messages for delete to authenticated using (public.is_admin ());

-- 6. PUBLIC TRACKING LOOKUP: one shipment, exact number only, no personal data
create or replace function public.track_shipment (code text) returns json language sql stable security definer
set
  search_path = public as $$
  select json_build_object(
    'tracking_code',    s.tracking_code,
    'origin',           s.origin,
    'destination',      s.destination,
    'description',      s.description,
    'status',           s.status,
    'current_location', s.current_location,
    'eta',              s.eta,
    'updated_at',       s.updated_at,
    'events', coalesce((
        select json_agg(json_build_object(
                 'location', e.location, 'status', e.status,
                 'note', e.note, 'time', e.event_time)
               order by e.event_time desc)
          from public.tracking_events e
         where e.shipment_id = s.id), '[]'::json)
  )
  from public.shipments s
  where upper(s.tracking_code) = upper(trim(code));
$$;

revoke all on function public.track_shipment (text)
from
  public;

grant
execute on function public.track_shipment (text) to anon,
authenticated;

-- =====================================================================
-- AFTER creating the admin user (README step 3.4), run this separately,
-- with the real admin email:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'martijnschwartz@continentalbridgefreightline.com';
-- =====================================================================

-- 7. NEW-REQUEST NOTIFICATIONS (same as notifications-setup.sql)

-- 1. Remember which quote requests staff have already read
alter table public.contact_messages
add column if not exists is_read boolean not null default false;

-- 2. Admins may mark requests as read / unread
drop policy if exists "Admins update quote requests" on public.contact_messages;

create policy "Admins update quote requests" on public.contact_messages
for update to authenticated
using (public.is_admin ())
with check (public.is_admin ());

-- 3. Visitors may still send requests, but cannot mark them as read
drop policy if exists "Anyone can send a quote request" on public.contact_messages;

create policy "Anyone can send a quote request" on public.contact_messages
for insert to anon, authenticated
with check (is_read = false);

-- 4. Send new requests live to the admin page
do $$
begin
  alter publication supabase_realtime add table public.contact_messages;
exception
  when duplicate_object then null;
end $$;
