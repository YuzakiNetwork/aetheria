create extension if not exists pgcrypto;

create table if not exists public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	email text,
	display_name text,
	avatar_url text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_links (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	whatsapp_jid text not null unique,
	display_name text,
	linked_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint whatsapp_links_user_id_key unique (user_id)
);

create table if not exists public.account_link_tokens (
	token_hash text primary key,
	whatsapp_jid text not null,
	display_name text,
	purpose text not null default 'link' check (purpose in ('link', 'restore')),
	completed_user_id uuid,
	completed_at timestamptz,
	restored_at timestamptz,
	expires_at timestamptz not null,
	used_at timestamptz,
	created_at timestamptz not null default now()
);

create table if not exists public.rpg_profiles (
	user_id uuid primary key references auth.users(id) on delete cascade,
	whatsapp_jid text,
	character_name text not null,
	class_key text not null,
	class_name text not null,
	level integer not null default 1 check (level >= 1),
	xp integer not null default 0 check (xp >= 0),
	xp_next integer not null default 1 check (xp_next > 0),
	gold integer not null default 0 check (gold >= 0),
	hp integer not null default 0 check (hp >= 0),
	max_hp integer not null default 1 check (max_hp > 0),
	energy integer not null default 0 check (energy >= 0),
	max_energy integer not null default 1 check (max_energy > 0),
	attack integer not null default 0,
	defense integer not null default 0,
	agility integer not null default 0,
	wins integer not null default 0 check (wins >= 0),
	losses integer not null default 0 check (losses >= 0),
	jobs integer not null default 0 check (jobs >= 0),
	zone_name text,
	gear jsonb not null default '{}'::jsonb,
	items jsonb not null default '{}'::jsonb,
	raw_player jsonb not null default '{}'::jsonb,
	snapshot jsonb not null default '{}'::jsonb,
	synced_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.rpg_players (
	id uuid primary key default gen_random_uuid(),
	whatsapp_jid text unique,
	user_id uuid,
	display_name text,
	character_name text not null,
	class_key text not null,
	class_name text not null,
	level integer not null default 1 check (level >= 1),
	xp integer not null default 0 check (xp >= 0),
	xp_next integer not null default 1 check (xp_next > 0),
	gold integer not null default 0 check (gold >= 0),
	hp integer not null default 0 check (hp >= 0),
	max_hp integer not null default 1 check (max_hp > 0),
	energy integer not null default 0 check (energy >= 0),
	max_energy integer not null default 1 check (max_energy > 0),
	attack integer not null default 0,
	defense integer not null default 0,
	agility integer not null default 0,
	wins integer not null default 0 check (wins >= 0),
	losses integer not null default 0 check (losses >= 0),
	jobs integer not null default 0 check (jobs >= 0),
	zone_name text,
	gear jsonb not null default '{}'::jsonb,
	items jsonb not null default '{}'::jsonb,
	raw_player jsonb not null default '{}'::jsonb,
	snapshot jsonb not null default '{}'::jsonb,
	synced_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index if not exists rpg_players_user_id_unique
on public.rpg_players (user_id)
where user_id is not null;

create table if not exists public.premium_entitlements (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references auth.users(id) on delete set null,
	whatsapp_jid text not null,
	type text not null check (type in ('supporter', 'aether_pass')),
	status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
	tier text not null default 'standard',
	cycle_key text not null default 'preseason',
	starts_at timestamptz not null default now(),
	expires_at timestamptz,
	source text not null default 'manual',
	granted_by text,
	note text,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint premium_entitlements_expiry_check check (
		expires_at is null or expires_at > starts_at
	)
);

create table if not exists public.guild_memberships (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references auth.users(id) on delete set null,
	whatsapp_jid text not null,
	display_name text,
	guild_key text not null check (guild_key in ('adventurer', 'merchant')),
	status text not null default 'active' check (status in ('active', 'left', 'suspended')),
	rank text not null default 'bronze',
	points integer not null default 0 check (points >= 0),
	joined_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index if not exists guild_memberships_active_key
on public.guild_memberships (whatsapp_jid, guild_key)
where status = 'active';

create index if not exists guild_memberships_user_idx
on public.guild_memberships (user_id, guild_key, status)
where user_id is not null;

create table if not exists public.squads (
	id uuid primary key default gen_random_uuid(),
	code text not null unique,
	name text not null,
	leader_whatsapp_jid text not null,
	leader_user_id uuid references auth.users(id) on delete set null,
	status text not null default 'active' check (status in ('active', 'disbanded')),
	max_members integer not null default 4 check (max_members between 2 and 8),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.squad_members (
	id uuid primary key default gen_random_uuid(),
	squad_id uuid not null references public.squads(id) on delete cascade,
	user_id uuid references auth.users(id) on delete set null,
	whatsapp_jid text not null,
	display_name text,
	role text not null default 'member' check (role in ('leader', 'member')),
	status text not null default 'active' check (status in ('active', 'left')),
	joined_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create unique index if not exists squad_members_active_whatsapp_key
on public.squad_members (whatsapp_jid)
where status = 'active';

create index if not exists squad_members_squad_idx
on public.squad_members (squad_id, status);

create index if not exists squads_leader_user_idx
on public.squads (leader_user_id)
where leader_user_id is not null;

create index if not exists squad_members_user_idx
on public.squad_members (user_id)
where user_id is not null;

create index if not exists premium_entitlements_whatsapp_type_idx
on public.premium_entitlements (whatsapp_jid, type, status, expires_at desc);

create index if not exists premium_entitlements_user_type_idx
on public.premium_entitlements (user_id, type, status, expires_at desc)
where user_id is not null;

alter table public.profiles enable row level security;
alter table public.whatsapp_links enable row level security;
alter table public.account_link_tokens enable row level security;
alter table public.rpg_profiles enable row level security;
alter table public.rpg_players enable row level security;
alter table public.premium_entitlements enable row level security;
alter table public.guild_memberships enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "whatsapp_links_select_own" on public.whatsapp_links;
create policy "whatsapp_links_select_own"
on public.whatsapp_links
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop policy if exists "account_link_tokens_no_client_access" on public.account_link_tokens;
create policy "account_link_tokens_no_client_access"
on public.account_link_tokens
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "rpg_profiles_select_own" on public.rpg_profiles;
create policy "rpg_profiles_select_own"
on public.rpg_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

grant select on public.rpg_profiles to authenticated;

drop policy if exists "rpg_players_select_own" on public.rpg_players;
create policy "rpg_players_select_own"
on public.rpg_players
for select
to authenticated
using (user_id = (select auth.uid()));

grant select on public.rpg_players to authenticated;

drop policy if exists "premium_entitlements_select_own" on public.premium_entitlements;
create policy "premium_entitlements_select_own"
on public.premium_entitlements
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.premium_entitlements from anon, authenticated;
grant select on table public.premium_entitlements to authenticated;

drop policy if exists "guild_memberships_select_own" on public.guild_memberships;
create policy "guild_memberships_select_own"
on public.guild_memberships
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.guild_memberships from anon, authenticated;
grant select on table public.guild_memberships to authenticated;

drop policy if exists "squads_select_own_member" on public.squads;
create policy "squads_select_own_member"
on public.squads
for select
to authenticated
using (
	exists (
		select 1
		from public.squad_members sm
		where sm.squad_id = squads.id
			and sm.user_id = (select auth.uid())
			and sm.status = 'active'
	)
);

drop policy if exists "squad_members_select_own_squad" on public.squad_members;
drop policy if exists "squad_members_select_own" on public.squad_members;
create policy "squad_members_select_own"
on public.squad_members
for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.squads from anon, authenticated;
revoke all on table public.squad_members from anon, authenticated;
grant select on public.squads to authenticated;
grant select on public.squad_members to authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists whatsapp_links_set_updated_at on public.whatsapp_links;
create trigger whatsapp_links_set_updated_at
before update on public.whatsapp_links
for each row execute function public.set_updated_at();

drop trigger if exists rpg_profiles_set_updated_at on public.rpg_profiles;
create trigger rpg_profiles_set_updated_at
before update on public.rpg_profiles
for each row execute function public.set_updated_at();

drop trigger if exists rpg_players_set_updated_at on public.rpg_players;
create trigger rpg_players_set_updated_at
before update on public.rpg_players
for each row execute function public.set_updated_at();

drop trigger if exists premium_entitlements_set_updated_at on public.premium_entitlements;
create trigger premium_entitlements_set_updated_at
before update on public.premium_entitlements
for each row execute function public.set_updated_at();

drop trigger if exists guild_memberships_set_updated_at on public.guild_memberships;
create trigger guild_memberships_set_updated_at
before update on public.guild_memberships
for each row execute function public.set_updated_at();

drop trigger if exists squads_set_updated_at on public.squads;
create trigger squads_set_updated_at
before update on public.squads
for each row execute function public.set_updated_at();

drop trigger if exists squad_members_set_updated_at on public.squad_members;
create trigger squad_members_set_updated_at
before update on public.squad_members
for each row execute function public.set_updated_at();
