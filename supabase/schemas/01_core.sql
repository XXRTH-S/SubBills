-- Declarative target schema. Review and generate a migration in a test project first.
-- No email/password copies: identity lives in auth.users.
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  issuer text not null default '' check (length(issuer) <= 60),
  last4 text not null default '' check (last4 ~ '^([0-9]{4})?$'),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  cents integer not null check (cents between 1 and 999999900),
  currency text not null default 'THB' check (currency = 'THB'),
  cycle text not null check (cycle in ('monthly', 'yearly')),
  anchor_date date not null check (anchor_date between date '2000-01-01' and date '2100-12-31'),
  card_id uuid,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, card_id) references public.cards(user_id, id)
);
create index subscriptions_card_idx on public.subscriptions(user_id, card_id);

-- Snapshot values must be supplied when generating a bill, never recalculated
-- from an edited subscription. Client roles may only mark it paid/read.
create table public.billing_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null,
  due_date date not null check (due_date between date '2000-01-01' and date '2100-12-31'),
  service_name text not null check (length(btrim(service_name)) between 1 and 80),
  cents integer not null check (cents between 1 and 999999900),
  currency text not null default 'THB' check (currency = 'THB'),
  card_name text check (length(card_name) between 1 and 60),
  card_last4 text check (card_last4 ~ '^([0-9]{4})?$'),
  paid_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, subscription_id, due_date),
  foreign key (user_id, subscription_id) references public.subscriptions(user_id, id)
);
create index billing_due_idx on public.billing_occurrences(user_id, due_date);

alter table public.cards enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_occurrences enable row level security;

revoke all on public.cards, public.subscriptions, public.billing_occurrences from public, anon, authenticated;
grant select, insert, update, delete on public.cards, public.subscriptions to authenticated;
grant select on public.billing_occurrences to authenticated;
grant update (paid_at, read_at) on public.billing_occurrences to authenticated;

create policy cards_owner on public.cards for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy subscriptions_owner on public.subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy bills_read on public.billing_occurrences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy bills_status on public.billing_occurrences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
