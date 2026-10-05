-- Every student with their teacher, status, current package and weekly slots (read-only).
-- Run by .github/workflows/roster-report.yml; output is a CSV attached to the run for 1 day.
-- Weekdays as schedule_rules.byday: 0 = الأحد … 6 = السبت. Times are the rule's own wall clock + tz.
create temp view roster as
  select coalesce(t.display_name_ar, t.display_name_en, '—')   as teacher,
         st.code, st.name                                      as student, st.status,
         sub.package, sub.status                               as package_status, b.remaining,
         (select string_agg(array_to_string(r.byday, ',') || ' @ ' || to_char(r.start_time_local, 'HH24:MI')
                            || ' ' || r.tz || ' (' || r.duration_min || 'm)', ' | ' order by r.start_time_local)
            from public.schedule_rules r
            join public.schedule_rule_students rs on rs.rule_id = r.id
           where rs.student_id = st.id and r.status = 'active'
             and (r.ends_on is null or r.ends_on >= current_date)) as weekly_slots
  from public.students st
  left join public.teachers t on t.id = st.teacher_id
  left join lateral (select s.id, s.package, s.status from public.subscriptions s
                      where s.student_id = st.id order by s.starts_on desc, s.created_at desc limit 1) sub on true
  left join public.v_subscription_balance b on b.subscription_id = sub.id
  order by teacher, st.status, student;
-- Only the temp view above is created; the read itself runs read-only.
set default_transaction_read_only = on;
\copy (select * from roster) to 'roster.csv' with (format csv, header true, encoding 'UTF8')
