-- Run once in your Supabase SQL editor. No public database access is granted.
create table if not exists public.club_state (
  id integer primary key check (id = 1),
  revision integer not null default 0,
  data jsonb not null
);
alter table public.club_state enable row level security;
revoke all on public.club_state from anon, authenticated;
grant all on public.club_state to service_role;

create table if not exists public.club_attempts (
  key text primary key,
  started timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.club_attempts enable row level security;
revoke all on public.club_attempts from anon, authenticated;

create or replace function public.club_check_attempt(attempt_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.club_attempts as a(key) values(attempt_key)
  on conflict(key) do update set
    attempts = case when a.started < now()-interval '15 minutes' then 1 else a.attempts+1 end,
    started = case when a.started < now()-interval '15 minutes' then now() else a.started end
  returning attempts into n;
  delete from public.club_attempts where started < now()-interval '1 day';
  return n <= 8;
end;
$$;
revoke all on function public.club_check_attempt(text) from public, anon, authenticated;
grant execute on function public.club_check_attempt(text) to service_role;
