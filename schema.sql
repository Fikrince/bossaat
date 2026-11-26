-- BOŞSAAT MVP veritabani semasi. Supabase SQL Editor'da calistirin.
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

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.offers enable row level security;
alter table public.reservations enable row level security;

drop policy if exists "Public can read approved businesses" on public.businesses;
create policy "Public can read approved businesses" on public.businesses for select using(status='approved');
drop policy if exists "Public can read published offers" on public.offers;
create policy "Public can read published offers" on public.offers for select using(status='published');

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using(auth.uid()=id);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check(auth.uid()=id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id);

drop policy if exists "Owners read own businesses" on public.businesses;
create policy "Owners read own businesses" on public.businesses for select using(auth.uid()=owner_id);
drop policy if exists "Owners create business" on public.businesses;
create policy "Owners create business" on public.businesses for insert with check(auth.uid()=owner_id);
drop policy if exists "Owners update own businesses" on public.businesses;
create policy "Owners update own businesses" on public.businesses for update using(auth.uid()=owner_id) with check(auth.uid()=owner_id);

drop policy if exists "Owners manage own offers" on public.offers;
create policy "Owners manage own offers" on public.offers for all using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())) with check(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));

drop policy if exists "Customers create own reservation" on public.reservations;
create policy "Customers create own reservation" on public.reservations for insert to authenticated with check(customer_id=auth.uid());
drop policy if exists "Customers read own reservations" on public.reservations;
create policy "Customers read own reservations" on public.reservations for select using(customer_id=auth.uid());
drop policy if exists "Owners read reservations for own offers" on public.reservations;
create policy "Owners read reservations for own offers" on public.reservations for select using(exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=offer_id and b.owner_id=auth.uid()));
drop policy if exists "Owners update reservations for own offers" on public.reservations;
create policy "Owners update reservations for own offers" on public.reservations for update using(exists(select 1 from public.offers o join public.businesses b on b.id=o.business_id where o.id=offer_id and b.owner_id=auth.uid()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.profiles(id,full_name,phone,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),case when new.raw_user_meta_data->>'role'='business' then 'business' else 'customer' end);
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Yönetici ataması: kendi kullanıcı UUID'nizi doğruladıktan sonra SQL Editor'da elle çalıştırın.
-- update public.profiles set role='admin' where id='AUTH_USER_UUID';


-- Admin helper runs with the function owner's privileges to avoid RLS recursion.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;

drop policy if exists "Admins manage businesses" on public.businesses;
create policy "Admins manage businesses" on public.businesses for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage offers" on public.offers;
create policy "Admins manage offers" on public.offers for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage reservations" on public.reservations;
create policy "Admins manage reservations" on public.reservations for all
using (public.is_admin()) with check (public.is_admin());
