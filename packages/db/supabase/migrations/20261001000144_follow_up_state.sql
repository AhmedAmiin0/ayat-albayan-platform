-- Phase 4 verifier fixes (R-LEAD-05, docs/12 §7): what the admin sees about a lead's follow-ups.
-- follow_up_note: why the due follow-up has not gone out, written by the follow-up job each tick:
--   queued (waiting for the sender), waiting_template (follow_up_slots not approved on Meta),
--   no_slots (fewer than two free starts). null = nothing pending.
-- follow_up_paused_by: who paused them. 'lead' = they sent «وقف الرسايل» (a marketing opt-out the
--   admin must not undo by accident); 'admin' = the per-lead pause (L2).
alter table public.leads
  add column follow_up_note text check (follow_up_note in ('queued', 'waiting_template', 'no_slots')),
  add column follow_up_paused_by text check (follow_up_paused_by in ('lead', 'admin'));

-- Existing pauses: the webhook audits a lead's own «وقف» as follow_up_paused (system:whatsapp).
update public.leads l
set follow_up_paused_by = case
  when exists (
    select 1 from public.audit_log a
    where a.entity = 'leads' and a.entity_id = l.id and a.action = 'follow_up_paused'
  ) then 'lead'
  else 'admin'
end
where l.follow_up_paused;
