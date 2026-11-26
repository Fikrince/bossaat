-- BOŞSAAT production MVP schema. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, phone text,
 role text not null default 'customer' check(role in ('customer','business','admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null, category text not null, description text, district text not null,
 address text, phone text, image_url text,
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 created_at timestamptz not null default now()
);
create table if not exists public.offers (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 title text not null, category text not null, district text not null, description text,
 starts_at timestamptz not null, ends_at timestamptz,
 original_price numeric(10,2) not null check(original_price >= 0),
 offer_price numeric(10,2) not null check(offer_price >= 0 and offer_price <= original_price),
 image_url text, status text not null default 'draft' check(status in ('draft','published','paused','expired')),
 created_at timestamptz not null default now()
);
create table if not exists public.reservations (
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null references public.offers(id) on delete cascade,
 customer_id uuid not null references public.profiles(id) on delete cascade,
 customer_name text not null, customer_phone text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','completed')),
 created_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses(owner_id);
create index if not exists offers_business_id_idx on public.offers(business_id);
create index if not exists offers_status_starts_at_idx on public.offers(status,starts_at);
create index if not exists reservations_customer_id_idx on public.reservations(customer_id);
create index if not exists reservations_offer_id_idx on public.reservations(offer_id);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.offers enable row level security;
alter table public.reservations enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;

-- Auth signup creates the profile and, for business accounts, the pending business record.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare user_role text;
begin
 user_role := case when new.raw_user_meta_data->>'role'='business' then 'business' else 'customer' end;
 insert into public.profiles(id,full_name,phone,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),user_role)
 on conflict (id) do nothing;
 if user_role='business' and nullif(trim(new.raw_user_meta_data->>'business_name'),'') is not null then
  insert into public.businesses(owner_id,name,category,district,phone,status)
  values(new.id,trim(new.raw_user_meta_data->>'business_name'),coalesce(nullif(new.raw_user_meta_data->>'category',''),'Diğer'),coalesce(nullif(new.raw_user_meta_data->>'district',''),'Belirtilmedi'),coalesce(new.raw_user_meta_data->>'phone',''),'pending');
 end if;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Prevent privilege escalation and owner-side approval/status tampering.
create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if auth.uid() is not null and old.role is distinct from new.role and not public.is_admin() then
  raise exception 'Profil rolünü yalnızca yönetici değiştirebilir';
 end if;
 return new;
end; $$;
drop trigger if exists guard_profile_changes on public.profiles;
create trigger guard_profile_changes before update on public.profiles for each row execute function public.guard_profile_changes();

create or replace function public.guard_business_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if auth.uid() is not null and not public.is_admin() then
  if tg_op='INSERT' then
   if new.owner_id is distinct from auth.uid() or new.status <> 'pending' then raise exception 'İşletme kaydı onay beklemelidir'; end if;
  else
   if old.owner_id is distinct from auth.uid() then raise exception 'Yetkisiz işletme işlemi'; end if;
   if new.owner_id is distinct from old.owner_id or new.status is distinct from old.status then raise exception 'İşletme sahibi onay durumunu değiştiremez'; end if;
  end if;
 end if;
 return new;
end; $$;
drop trigger if exists guard_business_changes on public.businesses;
create trigger guard_business_changes before insert or update on public.businesses for each row execute function public.guard_business_changes();

create or replace function public.guard_offer_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
declare b public.businesses;
begin
 select * into b from public.businesses where id=new.business_id;
 if not found then raise exception 'İşletme bulunamadı'; end if;
 if not public.is_admin() then
  if b.owner_id is distinct from auth.uid() then raise exception 'Bu işletmeye ait işlem yapamazsınız'; end if;
  if new.status='published' and b.status <> 'approved' then raise exception 'Yalnızca onaylı işletmeler fırsat yayınlayabilir'; end if;
  if tg_op='UPDATE' and new.business_id is distinct from old.business_id then raise exception 'Fırsat başka işletmeye taşınamaz'; end if;
 end if;
 return new;
end; $$;
drop trigger if exists guard_offer_changes on public.offers;
create trigger guard_offer_changes before insert or update on public.offers for each row execute function public.guard_offer_changes();

create or replace function public.guard_reservation_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
declare owns_offer boolean;
begin
 if public.is_admin() then return new; end if;
 select exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=old.offer_id and b.owner_id=auth.uid()) into owns_offer;
 if not owns_offer then raise exception 'Rezervasyon yalnızca ilgili işletme tarafından güncellenebilir'; end if;
 if new.id is distinct from old.id or new.offer_id is distinct from old.offer_id or new.customer_id is distinct from old.customer_id or new.customer_name is distinct from old.customer_name or new.customer_phone is distinct from old.customer_phone or new.created_at is distinct from old.created_at then
  raise exception 'Rezervasyonun müşteri ve fırsat bilgileri değiştirilemez';
 end if;
 return new;
end; $$;
drop trigger if exists guard_reservation_changes on public.reservations;
create trigger guard_reservation_changes before update on public.reservations for each row execute function public.guard_reservation_changes();

-- Profiles: users can read/update their own profile, but cannot change role.
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Admins read profiles" on public.profiles;
drop policy if exists "Admins update profiles" on public.profiles;
create policy "Users read own profile" on public.profiles for select using(auth.uid()=id);
create policy "Users update own profile" on public.profiles for update using(auth.uid()=id or public.is_admin()) with check(auth.uid()=id or public.is_admin());
create policy "Admins read profiles" on public.profiles for select using(public.is_admin());

-- Businesses: only approved records are public; owners see their own pending records.
drop policy if exists "Public can read approved businesses" on public.businesses;
drop policy if exists "Owners read own businesses" on public.businesses;
drop policy if exists "Owners create business" on public.businesses;
drop policy if exists "Owners update own businesses" on public.businesses;
drop policy if exists "Admins manage businesses" on public.businesses;
create policy "Public can read approved businesses" on public.businesses for select using(status='approved');
create policy "Owners read own businesses" on public.businesses for select to authenticated using(auth.uid()=owner_id);
create policy "Owners create business" on public.businesses for insert to authenticated with check(auth.uid()=owner_id and status='pending');
create policy "Owners update own businesses" on public.businesses for update to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);
create policy "Admins manage businesses" on public.businesses for all using(public.is_admin()) with check(public.is_admin());

-- Offers: published offers are public; owners manage offers belonging to their businesses.
drop policy if exists "Public can read published offers" on public.offers;
drop policy if exists "Owners manage own offers" on public.offers;
drop policy if exists "Admins manage offers" on public.offers;
create policy "Public can read published offers" on public.offers for select using(status='published');
create policy "Owners manage own offers" on public.offers for all to authenticated
using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()))
with check(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
create policy "Admins manage offers" on public.offers for all using(public.is_admin()) with check(public.is_admin());

-- Reservations: customers create/read their own; business owners read/update requests for their offers.
drop policy if exists "Customers create own reservation" on public.reservations;
drop policy if exists "Customers read own reservations" on public.reservations;
drop policy if exists "Owners read reservations for own offers" on public.reservations;
drop policy if exists "Owners update reservations for own offers" on public.reservations;
drop policy if exists "Admins manage reservations" on public.reservations;
create policy "Customers create own reservation" on public.reservations for insert to authenticated
with check(customer_id=auth.uid() and exists(select 1 from public.offers o where o.id=offer_id and o.status='published' and o.starts_at>now()));
create policy "Customers read own reservations" on public.reservations for select to authenticated using(customer_id=auth.uid());
create policy "Owners read reservations for own offers" on public.reservations for select to authenticated
using(exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=offer_id and b.owner_id=auth.uid()));
create policy "Owners update reservations for own offers" on public.reservations for update to authenticated
using(exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=offer_id and b.owner_id=auth.uid()))
with check(exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=offer_id and b.owner_id=auth.uid()));
create policy "Admins manage reservations" on public.reservations for all using(public.is_admin()) with check(public.is_admin());

-- İlk yönetici hesabını oluşturduktan sonra SQL Editor'da e-posta adresinizi değiştirerek çalıştırın:
-- update public.profiles p set role='admin' from auth.users u where p.id=u.id and lower(u.email)=lower('SENIN_EPOSTAN');

-- Grant authenticated access only through RLS-protected policies.
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.businesses to authenticated;
grant select, insert, update, delete on public.offers to authenticated;
grant select, insert, update on public.reservations to authenticated;


-- 2026-11-26: consolidated RLS policies.
-- Keeps anonymous reads public-only while combining authenticated owner/admin
-- permissions into one policy per table/action to avoid overlapping permissive policies.
drop policy if exists "Admins manage businesses" on public.businesses;
drop policy if exists "Owners create business" on public.businesses;
drop policy if exists "Owners read own businesses" on public.businesses;
drop policy if exists "Public can read approved businesses" on public.businesses;
drop policy if exists "Owners update own businesses" on public.businesses;
create policy "Anonymous read approved businesses" on public.businesses for select to anon using (status='approved');
create policy "Authenticated read permitted businesses" on public.businesses for select to authenticated using (status='approved' or owner_id=(select auth.uid()) or private.is_admin());
create policy "Authenticated create own pending or admin businesses" on public.businesses for insert to authenticated with check ((owner_id=(select auth.uid()) and status='pending') or private.is_admin());
create policy "Authenticated update own or admin businesses" on public.businesses for update to authenticated using (owner_id=(select auth.uid()) or private.is_admin()) with check (owner_id=(select auth.uid()) or private.is_admin());

drop policy if exists "Admins manage offers" on public.offers;
drop policy if exists "Owners manage own offers" on public.offers;
drop policy if exists "Public can read published offers from approved businesses" on public.offers;
create policy "Anonymous read published approved offers" on public.offers for select to anon using (status='published' and exists(select 1 from public.businesses b where b.id=offers.business_id and b.status='approved'));
create policy "Authenticated read permitted offers" on public.offers for select to authenticated using (
 (status='published' and exists(select 1 from public.businesses b where b.id=offers.business_id and b.status='approved'))
 or exists(select 1 from public.businesses b where b.id=offers.business_id and b.owner_id=(select auth.uid()))
 or private.is_admin()
);
create policy "Authenticated insert own or admin offers" on public.offers for insert to authenticated with check (
 exists(select 1 from public.businesses b where b.id=offers.business_id and b.owner_id=(select auth.uid())) or private.is_admin()
);
create policy "Authenticated update own or admin offers" on public.offers for update to authenticated using (
 exists(select 1 from public.businesses b where b.id=offers.business_id and b.owner_id=(select auth.uid())) or private.is_admin()
) with check (
 exists(select 1 from public.businesses b where b.id=offers.business_id and b.owner_id=(select auth.uid())) or private.is_admin()
);
create policy "Authenticated delete own or admin offers" on public.offers for delete to authenticated using (
 exists(select 1 from public.businesses b where b.id=offers.business_id and b.owner_id=(select auth.uid())) or private.is_admin()
);

drop policy if exists "Admins read profiles" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;
create policy "Authenticated read own or admin profiles" on public.profiles for select to authenticated using (id=(select auth.uid()) or private.is_admin());

drop policy if exists "Admins manage reservations" on public.reservations;
drop policy if exists "Customers create own reservation" on public.reservations;
drop policy if exists "Customers read own reservations" on public.reservations;
drop policy if exists "Owners read reservations for own offers" on public.reservations;
drop policy if exists "Customers cancel own pending reservations" on public.reservations;
drop policy if exists "Owners update reservations for own offers" on public.reservations;
create policy "Authenticated create customer or admin reservations" on public.reservations for insert to authenticated with check (
 private.is_admin() or (
  customer_id=(select auth.uid())
  and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='customer')
  and exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=reservations.offer_id and o.status='published' and o.starts_at>now() and b.status='approved')
 )
);
create policy "Authenticated read permitted reservations" on public.reservations for select to authenticated using (
 customer_id=(select auth.uid())
 or exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=reservations.offer_id and b.owner_id=(select auth.uid()))
 or private.is_admin()
);
create policy "Authenticated update permitted reservations" on public.reservations for update to authenticated using (
 (customer_id=(select auth.uid()) and status='pending')
 or exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=reservations.offer_id and b.owner_id=(select auth.uid()))
 or private.is_admin()
) with check (
 (customer_id=(select auth.uid()) and status='cancelled')
 or exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=reservations.offer_id and b.owner_id=(select auth.uid()))
 or private.is_admin()
);

-- Keep the privileged helper outside the exposed Data API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
 if auth.uid() is not null and old.role is distinct from new.role and not private.is_admin() then
  raise exception 'Profil rolünü yalnızca yönetici değiştirebilir';
 end if;
 return new;
end; $$;

create or replace function public.guard_business_changes()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
 if auth.uid() is not null and not private.is_admin() then
  if tg_op='INSERT' then
   if new.owner_id is distinct from auth.uid() or new.status <> 'pending' then raise exception 'İşletme kaydı onay beklemelidir'; end if;
  else
   if old.owner_id is distinct from auth.uid() then raise exception 'Yetkisiz işletme işlemi'; end if;
   if new.owner_id is distinct from old.owner_id or new.status is distinct from old.status then raise exception 'İşletme sahibi onay durumunu değiştiremez'; end if;
  end if;
 end if;
 return new;
end; $$;

create or replace function public.guard_offer_changes()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare b public.businesses;
begin
 select * into b from public.businesses where id=new.business_id;
 if not found then raise exception 'İşletme bulunamadı'; end if;
 if new.status='published' and b.status <> 'approved' then raise exception 'Yalnızca onaylı işletmelerin fırsatları yayınlanabilir'; end if;
 if not private.is_admin() then
  if b.owner_id is distinct from auth.uid() then raise exception 'Bu işletmeye ait işlem yapamazsınız'; end if;
  if tg_op='UPDATE' and new.business_id is distinct from old.business_id then raise exception 'Fırsat başka işletmeye taşınamaz'; end if;
 end if;
 return new;
end; $$;

create or replace function public.guard_reservation_changes()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare owns_offer boolean;
begin
 if private.is_admin() then return new; end if;
 if old.customer_id=auth.uid() then
  if new.id is distinct from old.id or new.offer_id is distinct from old.offer_id or new.customer_id is distinct from old.customer_id or new.customer_name is distinct from old.customer_name or new.customer_phone is distinct from old.customer_phone or new.created_at is distinct from old.created_at then
   raise exception 'Rezervasyonun müşteri ve fırsat bilgileri değiştirilemez';
  end if;
  if old.status <> 'pending' or new.status <> 'cancelled' then
   raise exception 'Müşteri yalnızca bekleyen talebini iptal edebilir';
  end if;
  return new;
 end if;
 select exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=old.offer_id and b.owner_id=auth.uid()) into owns_offer;
 if not owns_offer then raise exception 'Rezervasyon yalnızca ilgili müşteri, işletme veya yönetici tarafından güncellenabilir'; end if;
 if new.id is distinct from old.id or new.offer_id is distinct from old.offer_id or new.customer_id is distinct from old.customer_id or new.customer_name is distinct from old.customer_name or new.customer_phone is distinct from old.customer_phone or new.created_at is distinct from old.created_at then
  raise exception 'Rezervasyonun müşteri ve fırsat bilgileri değiştirilemez';
 end if;
 if old.status='pending' and new.status in ('approved','rejected') then return new; end if;
 if old.status='approved' and new.status='completed' then return new; end if;
 raise exception 'İşletme yalnızca bekleyen talebi onaylayabilir/reddedebilir veya onaylanmış randevuyu tamamlayabilir';
end; $$;

drop function if exists public.is_admin();
