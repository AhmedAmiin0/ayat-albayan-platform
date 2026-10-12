-- The restricted template allow-list (owner 2026-10-12: «for assistants keep only two templates which
-- is free_trial_invite and welcome_greeting», «this only applies for teacher and assistant», «all roles
-- except the ones allowed to have all templates»). docs/16, docs/12 §3.4.
--
-- 1. message_templates.sales_starter keeps its name (no churn) but widens from «sales chat starter» to
--    «allowed for restricted roles»: every role WITHOUT templates.manage or templates.send_all (teachers
--    in teacher mode, sales, the classroom assistant, custom roles) lists and sends only flagged rows
--    (restrictedMay in packages/shared, used by GET /messaging/templates and the thread send). Teachers
--    no longer send the lesson reminders by hand; the automatic reminders are unchanged.
--    The list starts as exactly free_trial_invite and welcome_greeting; the admin changes it later with
--    the toggle on the templates page (PATCH /messaging/templates/:key/starter). Absent rows (no chat
--    line yet, e.g. staging) simply leave the list empty until the health check imports them flagged.
-- 2. templates.send_all: every template from the inbox. Grantable, no system role but the admin holds
--    it (the system admin holds every grantable key in the API; its row is listed for readers).
--
-- Idempotent: re-running sets the same flags and skips the existing permission row. Note: it resets any
-- flag the admin set before this migration (the owner's rule replaces the previous sales starters).

set local lock_timeout = '5s';

update public.message_templates
set sales_starter = (key in ('free_trial_invite', 'welcome_greeting'))
where sales_starter is distinct from (key in ('free_trial_invite', 'welcome_greeting'));

comment on column public.message_templates.sales_starter is
  'Allowed for restricted roles: the only templates a role without templates.manage or templates.send_all (teachers, sales, classroom assistants, custom roles) may list or send. Defaults: free_trial_invite, welcome_greeting. Toggled by the admin; the health sync never changes it.';

insert into public.role_permissions (role_id, permission)
select r.id, 'templates.send_all' from public.roles r where r.is_system and r.key in ('admin')
on conflict do nothing;

-- MANUAL ROLLBACK (only after the code rollback; the previous flags are not restorable):
--   delete from public.role_permissions where permission = 'templates.send_all';
