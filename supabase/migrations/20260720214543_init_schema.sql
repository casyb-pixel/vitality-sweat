-- Vitality Sweat / Vitality Engine — initial production schema
-- Covers auth profiles, Sweatlife Chronicles posts, and storefront order tracking.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared timestamp helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (application roles: user | creator | admin)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user'
    check (role in ('user', 'creator', 'admin')),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Prevent non-admins from changing their own role via client updates.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Allow service-role / SQL-editor updates (no JWT subject).
  if auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role then
    if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin'
       and not exists (
         select 1
         from public.profiles p
         where p.id = auth.uid()
           and p.role = 'admin'
       )
    then
      raise exception 'Only admins can change profile roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row
  execute function public.protect_profile_role();

-- Auth signup → profiles row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  incoming_role text;
begin
  incoming_role := coalesce(new.raw_app_meta_data ->> 'role', 'user');
  if incoming_role not in ('user', 'creator', 'admin') then
    incoming_role := 'user';
  end if;

  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    incoming_role,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'member'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for accounts that already exist in Auth.
insert into public.profiles (id, email, role, display_name)
select
  u.id,
  u.email,
  case
    when coalesce(u.raw_app_meta_data ->> 'role', 'user') in ('user', 'creator', 'admin')
      then coalesce(u.raw_app_meta_data ->> 'role', 'user')
    else 'user'
  end,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, 'member'), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;

-- Staff helpers (security definer avoids RLS recursion on profiles)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'creator')
    )
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'creator');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
  on public.profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ---------------------------------------------------------------------------
-- posts (Hunter / Creator Studio blog pipeline)
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  excerpt text not null default '',
  body_markdown text not null default '',
  body_blocks jsonb,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null default 'Hunter',
  cover_image text,
  cover_alt text,
  keywords text[] not null default '{}',
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_slug_unique unique (slug)
);

create index if not exists posts_status_idx on public.posts (status);
create index if not exists posts_published_at_idx
  on public.posts (published_at desc nulls last);
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_featured_idx
  on public.posts (featured)
  where featured = true;

comment on column public.posts.body_markdown is
  'Primary markdown body authored in Creator Studio.';
comment on column public.posts.body_blocks is
  'Archive-compatible BlogBlock[] JSON used by /blog/[slug] renderer.';

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();

alter table public.posts enable row level security;

drop policy if exists "Public read published posts" on public.posts;
create policy "Public read published posts"
  on public.posts
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Staff select posts" on public.posts;
create policy "Staff select posts"
  on public.posts
  for select
  to authenticated
  using (
    public.is_admin()
    or (public.is_staff() and author_id = auth.uid())
  );

drop policy if exists "Staff insert posts" on public.posts;
create policy "Staff insert posts"
  on public.posts
  for insert
  to authenticated
  with check (
    public.is_staff()
    and author_id = auth.uid()
  );

drop policy if exists "Staff update posts" on public.posts;
create policy "Staff update posts"
  on public.posts
  for update
  to authenticated
  using (
    public.is_admin()
    or (public.is_staff() and author_id = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.is_staff() and author_id = auth.uid())
  );

drop policy if exists "Staff delete posts" on public.posts;
create policy "Staff delete posts"
  on public.posts
  for delete
  to authenticated
  using (
    public.is_admin()
    or (public.is_staff() and author_id = auth.uid())
  );

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- ---------------------------------------------------------------------------
-- Storefront product lookup cache (Printful / Printify sync snapshots)
-- ---------------------------------------------------------------------------

create table if not exists public.storefront_products (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'printful'
    check (provider in ('printful', 'printify', 'manual')),
  external_id text not null,
  slug text,
  name text not null,
  description text,
  thumbnail_url text,
  currency text not null default 'USD',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storefront_products_provider_external_unique
    unique (provider, external_id)
);

create index if not exists storefront_products_active_idx
  on public.storefront_products (is_active)
  where is_active = true;

create table if not exists public.storefront_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null
    references public.storefront_products (id) on delete cascade,
  external_id text not null,
  sku text,
  name text,
  size text,
  color text,
  retail_price_cents integer not null check (retail_price_cents >= 0),
  currency text not null default 'USD',
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storefront_variants_product_external_unique
    unique (product_id, external_id)
);

create index if not exists storefront_variants_product_id_idx
  on public.storefront_variants (product_id);

drop trigger if exists storefront_products_set_updated_at on public.storefront_products;
create trigger storefront_products_set_updated_at
  before update on public.storefront_products
  for each row
  execute function public.set_updated_at();

drop trigger if exists storefront_variants_set_updated_at on public.storefront_variants;
create trigger storefront_variants_set_updated_at
  before update on public.storefront_variants
  for each row
  execute function public.set_updated_at();

alter table public.storefront_products enable row level security;
alter table public.storefront_variants enable row level security;

drop policy if exists "Public read active storefront products" on public.storefront_products;
create policy "Public read active storefront products"
  on public.storefront_products
  for select
  to anon, authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Staff manage storefront products" on public.storefront_products;
create policy "Staff manage storefront products"
  on public.storefront_products
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "Public read active storefront variants" on public.storefront_variants;
create policy "Public read active storefront variants"
  on public.storefront_variants
  for select
  to anon, authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Staff manage storefront variants" on public.storefront_variants;
create policy "Staff manage storefront variants"
  on public.storefront_variants
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on public.storefront_products to anon, authenticated;
grant select on public.storefront_variants to anon, authenticated;
grant all on public.storefront_products to service_role;
grant all on public.storefront_variants to service_role;
grant insert, update, delete on public.storefront_products to authenticated;
grant insert, update, delete on public.storefront_variants to authenticated;

-- ---------------------------------------------------------------------------
-- Orders / fulfillment tracking (checkout → payment → Printful/Printify)
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'staged'
    check (
      status in (
        'staged',
        'awaiting_payment',
        'paid',
        'fulfillment_queued',
        'fulfilled',
        'cancelled',
        'failed'
      )
    ),
  currency text not null default 'USD',
  payment_provider text
    check (
      payment_provider is null
      or payment_provider in ('stripe', 'paypal', 'mock')
    ),
  fulfillment_provider text
    check (
      fulfillment_provider is null
      or fulfillment_provider in ('printful', 'printify', 'mock')
    ),
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'unsubmitted',
  external_payment_id text,
  external_fulfillment_id text,
  email text,
  shipping_address jsonb,
  subtotal_cents integer check (subtotal_cents is null or subtotal_cents >= 0),
  shipping_cents integer check (shipping_cents is null or shipping_cents >= 0),
  tax_cents integer check (tax_cents is null or tax_cents >= 0),
  total_cents integer check (total_cents is null or total_cents >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.storefront_products (id) on delete set null,
  variant_id uuid references public.storefront_variants (id) on delete set null,
  product_external_id text,
  variant_external_id text,
  sku text,
  name text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer check (unit_price_cents is null or unit_price_cents >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own orders" on public.orders;
create policy "Users insert own orders"
  on public.orders
  for insert
  to authenticated
  with check (user_id = auth.uid() or user_id is null);

drop policy if exists "Users update own staged orders" on public.orders;
create policy "Users update own staged orders"
  on public.orders
  for update
  to authenticated
  using (
    public.is_admin()
    or (user_id = auth.uid() and status in ('staged', 'awaiting_payment'))
  )
  with check (
    public.is_admin()
    or (user_id = auth.uid() and status in ('staged', 'awaiting_payment', 'cancelled'))
  );

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders"
  on public.orders
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items"
  on public.order_items
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own order items" on public.order_items;
create policy "Users insert own order items"
  on public.order_items
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and o.status in ('staged', 'awaiting_payment')
    )
  );

drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items"
  on public.order_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant all on public.orders to service_role;
grant all on public.order_items to service_role;

-- ---------------------------------------------------------------------------
-- Storage: blog-images bucket for Creator Studio Gemini visual aids
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read blog images" on storage.objects;
create policy "Public read blog images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

drop policy if exists "Creators upload blog images" on storage.objects;
create policy "Creators upload blog images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'blog-images'
    and public.is_staff()
  );

drop policy if exists "Creators update blog images" on storage.objects;
create policy "Creators update blog images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'blog-images'
    and public.is_staff()
  )
  with check (
    bucket_id = 'blog-images'
    and public.is_staff()
  );

drop policy if exists "Creators delete blog images" on storage.objects;
create policy "Creators delete blog images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'blog-images'
    and public.is_staff()
  );
