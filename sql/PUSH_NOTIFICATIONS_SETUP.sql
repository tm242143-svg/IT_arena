-- MZ Arena: admin block notifications + web-push token storage.
-- Run in Supabase SQL Editor. This does not contain or expose any service credentials.
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete set null,
  student_name text,
  student_email text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.admin_notifications add column if not exists student_email text;

create table if not exists public.admin_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_notifications enable row level security;
alter table public.admin_push_tokens enable row level security;

drop policy if exists "Admins read notifications" on public.admin_notifications;
create policy "Admins read notifications" on public.admin_notifications
for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "Admins mark notifications read" on public.admin_notifications;
create policy "Admins mark notifications read" on public.admin_notifications
for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "Admins manage own push tokens" on public.admin_push_tokens;
create policy "Admins manage own push tokens" on public.admin_push_tokens
for all to authenticated using (
  user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
) with check (
  user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create or replace function public.insert_admin_block_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- A warning increase creates one notification, including the third warning
  -- that blocks the student. This avoids duplicate warning + block emails.
  if new.warnings > coalesce(old.warnings, 0) then
    insert into public.admin_notifications(student_id, student_name, student_email, message)
    values (
      new.id,
      coalesce(new.name, 'Student'),
      coalesce(new.email, ''),
      case
        when new.blocked then coalesce(new.name, 'A student') || ' received warning ' || new.warnings || ' of 3 and was blocked.'
        else coalesce(new.name, 'A student') || ' received warning ' || new.warnings || ' of 3.'
      end
    );
  elsif old.blocked is distinct from true and new.blocked is true then
    -- Also cover a manual block that did not increment warnings.
    insert into public.admin_notifications(student_id, student_name, student_email, message)
    values (new.id, coalesce(new.name, 'Student'), coalesce(new.email, ''), coalesce(new.name, 'A student') || ' was blocked.');
  end if;
  return new;
end;
$$;
drop trigger if exists mz_admin_block_notification on public.profiles;
create trigger mz_admin_block_notification
after update of warnings, blocked on public.profiles
for each row execute function public.insert_admin_block_notification();

-- Enable Realtime for the dashboard panel (safe to run if already enabled).
do $$ begin
  alter publication supabase_realtime add table public.admin_notifications;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
