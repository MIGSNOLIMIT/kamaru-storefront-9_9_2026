-- Customer profiles, contact inquiries, payment proofs, and CMS staff records (run after 003_super_admin_role.sql)

-- Every new auth user gets a customer profile, so orders (which reference profiles) can be placed right after signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, age_range, gender, city, province, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Member'),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'age_range',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'province',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Customers may create and edit their own profile, but only the server (service role) can grant staff roles.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'customer';
  elsif new.role is distinct from old.role then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Backfill profiles for auth users created before this trigger existed.
insert into public.profiles (id, email, full_name, role)
select u.id, coalesce(u.email, ''), coalesce(u.raw_user_meta_data ->> 'full_name', 'Member'), 'customer'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Contact form: anyone may send a message; only the server reads them.
drop policy if exists "Anyone send inquiry" on public.inquiries;
create policy "Anyone send inquiry" on public.inquiries
  for insert with check (true);

-- Payment proofs: signed-in customers upload into their own folder (<user id>/file).
drop policy if exists "Customers upload own payment proof" on storage.objects;
create policy "Customers upload own payment proof" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Customers read own payment proof" on storage.objects;
create policy "Customers read own payment proof" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- CMS staff records that must survive server restarts. Server-only (RLS on, no public policies).
create table if not exists public.staff_removed_seeds (
  seed_key text primary key,
  removed_at timestamptz not null default now()
);

create table if not exists public.staff_email_changes (
  token text primary key,
  user_id uuid not null,
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.staff_removed_seeds enable row level security;
alter table public.staff_email_changes enable row level security;
