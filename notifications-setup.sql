-- NEW-REQUEST NOTIFICATIONS
-- Run once in Supabase → SQL Editor. Safe to run again.

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
