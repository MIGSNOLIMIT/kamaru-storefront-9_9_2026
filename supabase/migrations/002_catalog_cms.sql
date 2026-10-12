-- Catalog CMS extensions (run after 001_initial.sql)

alter table articles add column if not exists title text not null default '';
alter table articles add column if not exists excerpt text not null default '';
alter table articles add column if not exists category text not null default '';
alter table articles add column if not exists published_at date not null default current_date;
alter table articles add column if not exists image jsonb not null default '{}';

create table if not exists colors (
  id text primary key,
  name text not null,
  hex text not null
);

create table if not exists pages (
  id text primary key,
  content jsonb not null default '{}'
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  email text primary key,
  consent boolean not null default true,
  created_at timestamptz not null default now()
);

alter table colors enable row level security;
alter table pages enable row level security;
alter table media_assets enable row level security;
alter table newsletter_subscribers enable row level security;

create policy "Public read colors" on colors for select using (true);
create policy "Public read about page" on pages for select using (id = 'about');
create policy "Public read published articles" on articles for select using (status = 'published');

create policy "Anyone subscribe newsletter" on newsletter_subscribers for insert with check (true);
