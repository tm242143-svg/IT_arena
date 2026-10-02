-- =====================================================================
-- MZ ARENA - Supabase setup (safe to run more than once)
-- Supabase > SQL Editor > New query > paste everything > Run
-- =====================================================================

-- ---------- TABLES ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  role       text not null default 'student' check (role in ('student','admin')),
  warnings   int  not null default 0,
  blocked    boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id             bigint generated always as identity primary key,
  category       text not null,
  question       text not null,
  option_a       text not null,
  option_b       text not null,
  option_c       text not null,
  option_d       text not null,
  correct_answer text not null check (correct_answer in ('A','B','C','D')),
  created_at     timestamptz not null default now()
);

create table if not exists public.quiz_results (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  subject    text not null,
  score      int  not null,
  total      int  not null,
  percentage numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_category on public.questions(category);
create index if not exists idx_results_user on public.quiz_results(user_id);

-- ---------- REGISTRATION TRIGGER ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
          new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ADMIN CHECK ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles     enable row level security;
alter table public.questions    enable row level security;
alter table public.quiz_results enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
-- (no insert/update/delete policies: students can never change their own role or warnings)

drop policy if exists questions_admin_all on public.questions;
create policy questions_admin_all on public.questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- (students never read the questions table directly, so they can't see correct answers)

drop policy if exists results_select on public.quiz_results;
create policy results_select on public.quiz_results
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- STUDENT FUNCTIONS ----------
create or replace function public.get_subjects()
returns table (category text, question_count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  return query
    select q.category, count(*)::bigint
    from public.questions q
    group by q.category
    order by q.category;
end $$;

create or replace function public.get_quiz_questions(p_subject text)
returns table (id bigint, question text, option_a text, option_b text, option_c text, option_d text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.blocked) then
    raise exception 'You are blocked from taking quizzes. Please contact the admin.';
  end if;
  return query
    select q.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d
    from public.questions q
    where q.category = p_subject
    order by random();
end $$;

create or replace function public.submit_quiz(p_subject text, p_answers jsonb)
returns table (out_score int, out_total int, out_percentage numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_total int; v_answered int; v_score int; v_pct numeric;
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.blocked) then
    raise exception 'You are blocked from taking quizzes. Please contact the admin.';
  end if;

  select count(*) into v_total from public.questions q where q.category = p_subject;
  if v_total = 0 then raise exception 'No questions found for this subject.'; end if;

  select count(*) into v_answered from public.questions q
   where q.category = p_subject and jsonb_exists(p_answers, q.id::text);
  if v_answered < v_total then
    raise exception 'Answer every question before submitting.';
  end if;

  select count(*) into v_score from public.questions q
   where q.category = p_subject and upper(p_answers->>(q.id::text)) = q.correct_answer;

  v_pct := round(v_score * 100.0 / v_total, 2);

  insert into public.quiz_results (user_id, subject, score, total, percentage)
  values (auth.uid(), p_subject, v_score, v_total, v_pct);

  return query select v_score, v_total, v_pct;
end $$;

create or replace function public.record_warning()
returns table (out_warnings int, out_blocked boolean)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  return query
    update public.profiles p
       set warnings = p.warnings + 1,
           blocked  = (p.warnings + 1) >= 3
     where p.id = auth.uid()
    returning p.warnings, p.blocked;
end $$;

create or replace function public.get_leaderboard()
returns table (out_name text, out_subject text, out_score int, out_total int,
               out_percentage numeric, out_completed timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please login first.'; end if;
  return query
    select t.pname, t.subj, t.sc, t.tot, t.pct, t.done
    from (
      select distinct on (r.user_id, r.subject)
             p.name as pname, r.subject as subj, r.score as sc,
             r.total as tot, r.percentage as pct, r.created_at as done
      from public.quiz_results r
      join public.profiles p on p.id = r.user_id
      order by r.user_id, r.subject, r.percentage desc, r.created_at asc
    ) t
    order by t.pct desc, t.done asc
    limit 100;
end $$;

-- ---------- ADMIN FUNCTIONS ----------
create or replace function public.admin_get_results()
returns table (out_name text, out_email text, out_subject text, out_score int,
               out_total int, out_percentage numeric, out_completed timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin only.'; end if;
  return query
    select p.name, p.email, r.subject, r.score, r.total, r.percentage, r.created_at
    from public.quiz_results r
    join public.profiles p on p.id = r.user_id
    order by r.created_at desc;
end $$;

create or replace function public.admin_get_students()
returns table (out_id uuid, out_name text, out_email text, out_warnings int, out_blocked boolean)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin only.'; end if;
  return query
    select p.id, p.name, p.email, p.warnings, p.blocked
    from public.profiles p
    where p.role = 'student'
    order by p.blocked desc, p.warnings desc, p.name;
end $$;

create or replace function public.admin_reset_student(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin only.'; end if;
  update public.profiles set warnings = 0, blocked = false where id = p_id;
end $$;

-- ---------- PERMISSIONS ----------
revoke all on function public.get_subjects()                 from public, anon;
revoke all on function public.get_quiz_questions(text)       from public, anon;
revoke all on function public.submit_quiz(text, jsonb)       from public, anon;
revoke all on function public.record_warning()               from public, anon;
revoke all on function public.get_leaderboard()              from public, anon;
revoke all on function public.admin_get_results()            from public, anon;
revoke all on function public.admin_get_students()           from public, anon;
revoke all on function public.admin_reset_student(uuid)      from public, anon;

grant execute on function public.get_subjects()              to authenticated;
grant execute on function public.get_quiz_questions(text)    to authenticated;
grant execute on function public.submit_quiz(text, jsonb)    to authenticated;
grant execute on function public.record_warning()            to authenticated;
grant execute on function public.get_leaderboard()           to authenticated;
grant execute on function public.admin_get_results()         to authenticated;
grant execute on function public.admin_get_students()        to authenticated;
grant execute on function public.admin_reset_student(uuid)   to authenticated;

-- After registering your own account, make yourself admin:
-- update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
