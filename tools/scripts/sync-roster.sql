-- sync-roster.sql — compares the academy's latest schedule/report ("who is subscribed, with whom, when")
-- with the database, for the teachers أبرار, ربيعة, هند and أسماء حسين. The roster below is the owner's list of
-- 2026-10-03: a student on it is SUBSCRIBED, a student of these teachers who is not on it is not.
--
-- WHAT IT DOES (one transaction, ends with ROLLBACK; read the output, then change the LAST line to COMMIT):
--   1. matches every roster name to exactly ONE student (names are normalised: alef/yaa/taa-marbuta,
--      diacritics, extra spaces; a name that matches 0 or more than 1 is reported and skipped, never guessed);
--   2. sets the matched students to status 'active' (subscribed);
--   3. REPORTS, for review: roster names not found, students of these teachers who are not on the roster
--      (candidates for "not subscribed"), and each matched student's current schedule rule vs the roster days/time.
--   4. only if you set apply_unlisted = true below: students of these teachers who are 'active' but not on the
--      roster become 'paused' (never deleted; their rules and lessons are NOT touched here: use
--      fix-teacher-data.sql for that, run per student, or end the rule in the app).
-- Weekday numbering as schedule_rules.byday: 0 = الأحد, 1 = الاثنين, 2 = الثلاثاء, 3 = الأربعاء, 4 = الخميس, 5 = الجمعة, 6 = السبت.
-- Times are the teacher's local time as written in the report; "9" in رانيا's line has no am/pm in the source.
begin;

create temp table roster_cfg on commit drop as select false as apply_unlisted;

create function pg_temp.norm(t text) returns text language sql immutable as $$
  select btrim(regexp_replace(lower(translate(
    regexp_replace(coalesce(t, ''), '[ً-ٟـ]', '', 'g'),
    'أإآٱىةؤئ', 'اااايهوي')), '\s+', ' ', 'g'))
$$;

-- teacher: a fragment of display_name_ar / display_name_en; days: byday numbers; at: as written (null = not fixed)
create temp table roster (teacher_like text, student text, days int[], at text, note text) on commit drop;
insert into roster values
  ('أبرار', 'مرام يحيى',   '{6,2,4}',   '10:00 صباحًا', null),
  ('أبرار', 'أم جودى',     null,        null,           'ليس ثابت (not fixed)'),
  ('أبرار', 'جودى',        '{0,3}',     '15:00 / 16:00', 'الأحد 3، الأربعاء 4'),
  ('أبرار', 'سهيلة',       '{0,3}',     '17:00',        null),
  ('أبرار', 'صباح',        '{0,4}',     '16:00',        'صباح الحبيب: no Tuesday'),
  ('أبرار', 'حواء يحيى',   '{0,2,4}',   '21:00',        null),
  ('ربيعة', 'رانيا الجهني', '{5,6}',    '9',            'am/pm not stated'),
  ('هند',   'أم إيمان',    '{3,5,6}',   '15:00',        null),
  ('هند',   'وفاء قدس',    '{0,2}',     '13:00',        null),
  ('هند',   'أم مشاري',    '{6,2}',     '18:15',        null),
  ('هند',   'أم أحمد',     '{0,2}',     '16:00',        null),
  ('هند',   'رغد',         '{1,3}',     '11:00',        null),
  ('هند',   'ماريا',       '{0,3}',     '16:00 or 21:00', null),
  ('أسماء حسين', 'علياء المحمدي', '{0,1,2}', '15:00',      null),
  ('أسماء حسين', 'أمل جاسم',   '{0,2,4}',   '11:00',        null),
  ('أسماء حسين', 'ثمراء الحامد', '{3}',     '11:00',        null);

-- a roster row gets a number so every report can say which one it talks about
alter table roster add column rn serial;

-- STEP 0: each roster row must name exactly one teacher.
do $$
declare r record;
begin
  for r in
    select ro.rn, ro.teacher_like,
           (select count(*) from public.teachers t
             where pg_temp.norm(t.display_name_ar) like '%' || pg_temp.norm(ro.teacher_like) || '%'
                or lower(coalesce(t.display_name_en, '')) like '%' || lower(ro.teacher_like) || '%') as n
    from roster ro
  loop
    if r.n <> 1 then
      raise exception 'roster row %: teacher "%" matches % teachers (needs exactly 1). Fix teacher_like.', r.rn, r.teacher_like, r.n;
    end if;
  end loop;
end $$;

create temp table roster_t on commit drop as
select ro.*, (select t.id from public.teachers t
               where pg_temp.norm(t.display_name_ar) like '%' || pg_temp.norm(ro.teacher_like) || '%'
                  or lower(coalesce(t.display_name_en, '')) like '%' || lower(ro.teacher_like) || '%') as teacher_id
from roster ro;

-- STEP 1: the matching student(s) of each roster row. First among that teacher's own students
-- (token subset: 'صباح' finds 'صباح الحبيب'), else an exact normalised name anywhere.
create temp table roster_cand on commit drop as
select r.rn, s.id as student_id, s.name, s.status,
       (s.teacher_id = r.teacher_id or exists (
          select 1 from public.schedule_rule_students rs join public.schedule_rules sr on sr.id = rs.rule_id
           where rs.student_id = s.id and sr.teacher_id = r.teacher_id)) as mine,
       pg_temp.norm(s.name) = pg_temp.norm(r.student) as exact
from roster_t r
join public.students s
  on string_to_array(pg_temp.norm(s.name), ' ') @> string_to_array(pg_temp.norm(r.student), ' ');

create temp table roster_pick on commit drop as
select r.rn, r.student, r.teacher_id,
       (select count(*) from roster_cand c where c.rn = r.rn and (c.mine or c.exact)) as n,
       (select c.student_id from roster_cand c where c.rn = r.rn and (c.mine or c.exact)
         order by c.mine desc, c.exact desc limit 1) as student_id
from roster_t r;

do $$
declare r record;
begin
  raise notice '== STEP 1: roster -> students ==';
  for r in select p.rn, p.student, p.n, s.code, s.name, s.status
             from roster_pick p left join public.students s on s.id = p.student_id order by p.rn
  loop
    raise notice '#% "%": % match(es)%', r.rn, r.student, r.n,
      case when r.n = 1 then format(' -> %s %s (status %s)', r.code, r.name, r.status)
           when r.n = 0 then '  -> NOT FOUND (not in the database; add the student or fix the name)'
           else '  -> AMBIGUOUS, skipped' end;
  end loop;
end $$;

-- STEP 2: matched students are subscribed.
create temp table roster_done (student_id uuid) on commit drop;
with up as (
  update public.students s set status = 'active'
    from roster_pick p
   where p.n = 1 and s.id = p.student_id and s.status <> 'active'
  returning s.id
)
insert into roster_done (student_id) select id from up;

do $$ begin raise notice '== STEP 2: set to active: % student(s) ==', (select count(*) from roster_done); end $$;

-- STEP 3a: students of these teachers who are NOT on the roster (candidates for "not subscribed").
do $$
declare r record; k int := 0;
begin
  raise notice '== STEP 3a: students of these teachers who are not on the roster ==';
  for r in
    select distinct s.code, s.name, s.status, t.display_name_ar as teacher
    from public.students s
    join public.teachers t on t.id in (select teacher_id from roster_t)
    where (s.teacher_id = t.id or exists (
            select 1 from public.schedule_rule_students rs join public.schedule_rules sr on sr.id = rs.rule_id
             where rs.student_id = s.id and sr.teacher_id = t.id and sr.status = 'active'))
      and s.id not in (select student_id from roster_pick where student_id is not null)
    order by t.display_name_ar, s.name
  loop
    k := k + 1;
    raise notice '  % % [%] teacher %', r.code, r.name, r.status, r.teacher;
  end loop;
  if k = 0 then raise notice '  (none)'; end if;
end $$;

-- STEP 3b: the matched students' current rules vs the roster (read-only; schedules are changed in the app).
do $$
declare r record;
begin
  raise notice '== STEP 3b: current active rules vs roster (days 0=Sun..6=Sat) ==';
  for r in
    select p.rn, p.student, ro.days as roster_days, ro.at as roster_at, s.code,
           (select string_agg(format('%s @ %s', sr.byday::text, sr.start_time_local), ' | ')
              from public.schedule_rule_students rs join public.schedule_rules sr on sr.id = rs.rule_id
             where rs.student_id = s.id and sr.status = 'active') as current_rules
    from roster_pick p join roster_t ro on ro.rn = p.rn join public.students s on s.id = p.student_id
    where p.n = 1 order by p.rn
  loop
    raise notice '#% % %: roster % @ %  |  now: %', r.rn, r.code, r.student, r.roster_days, coalesce(r.roster_at, '-'),
      coalesce(r.current_rules, 'no active rule');
  end loop;
end $$;

-- STEP 4 (optional, off by default): active students of these teachers who are not on the roster become 'paused'.
do $$
declare n int;
begin
  if (select apply_unlisted from roster_cfg) then
    with up as (
      update public.students s set status = 'paused'
       where s.status = 'active'
         and s.id not in (select student_id from roster_pick where student_id is not null)
         and (s.teacher_id in (select teacher_id from roster_t) or exists (
               select 1 from public.schedule_rule_students rs join public.schedule_rules sr on sr.id = rs.rule_id
                where rs.student_id = s.id and sr.teacher_id in (select teacher_id from roster_t) and sr.status = 'active'))
      returning 1)
    select count(*) into n from up;
    raise notice '== STEP 4: % unlisted active student(s) paused ==', n;
  else
    raise notice '== STEP 4 skipped (apply_unlisted = false) ==';
  end if;
end $$;

-- Nothing is saved until you change this to COMMIT.
rollback;
