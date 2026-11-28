-- Counts the rows the GET /leads answer schema would refuse (docs/62 Decisions, read-only).
-- count: leads_follow_up_note_unknown
select count(*) from public.leads
where follow_up_note is not null
  and follow_up_note not in ('queued', 'waiting_template', 'no_slots');

-- count: leads_follow_up_paused_by_unknown
select count(*) from public.leads
where follow_up_paused_by is not null and follow_up_paused_by not in ('lead', 'admin');

-- count: leads_qualification_not_an_object
select count(*) from public.leads where jsonb_typeof(qualification) <> 'object';

