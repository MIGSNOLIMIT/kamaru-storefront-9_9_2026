-- Kamaru Supabase schema (run in Supabase SQL editor or via CLI)

create type user_role as enum ('customer', 'content', 'orders', 'admin');
create type content_status as enum ('published', 'draft');
create type payment_method as enum ('qr', 'bank_transfer', 'pickup');
create type fulfillment_method as enum ('lbc', 'lalamove', 'pickup');
create type order_status as enum (
  'pending', 'payment_review', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  age_range text,
  gender text,
  city text,
  province text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table categories (
  id text primary key,
  slug text unique not null,
  name text not null,
  parent_id text references categories(id),
  description text not null default '',
  image jsonb not null default '{}',
  sort_order int not null default 0,
  status content_status not null default 'draft'
);

create table products (
  id text primary key,
  slug text unique not null,
  name text not null,
  price numeric not null,
  currency text not null default 'PHP',
  category_ids text[] not null default '{}',
  images jsonb not null default '[]',
  short_description text not null default '',
  features text[] not null default '{}',
  specs jsonb not null default '{}',
  colors jsonb not null default '[]',
  materials text[] not null default '{}',
  marketplace jsonb not null default '{}',
  sku text,
  in_stock boolean not null default true,
  flags jsonb not null default '{}',
  data_quality text not null default 'placeholder',
  sort_order int not null default 0,
  status content_status not null default 'draft'
);

create table articles (
  id text primary key,
  slug text unique not null,
  body jsonb not null,
  sort_order int not null default 0,
  status content_status not null default 'draft'
);

create table home_sections (
  id text primary key,
  page_key text not null default 'home',
  section jsonb not null,
  sort_order int not null default 0
);

create table site_settings (
  id int primary key default 1 check (id = 1),
  settings jsonb not null
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  items jsonb not null,
  company_name text,
  delivery_address text,
  payment_method payment_method not null,
  fulfillment_method fulfillment_method not null,
  status order_status not null default 'pending',
  payment_proof_url text,
  staff_notes text,
  customer_notes text,
  subtotal numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table products enable row level security;
alter table categories enable row level security;
alter table orders enable row level security;
alter table inquiries enable row level security;
alter table site_settings enable row level security;

create policy "Public read published products" on products for select using (status = 'published');
create policy "Public read published categories" on categories for select using (status = 'published');
create policy "Public read site settings" on site_settings for select using (true);

create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

create policy "Users read own orders" on orders for select using (auth.uid() = user_id);
create policy "Users insert own orders" on orders for insert with check (auth.uid() = user_id);

-- Staff policies: extend with security definer functions checking profiles.role

insert into storage.buckets (id, name, public) values ('brand-assets', 'brand-assets', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false) on conflict do nothing;
