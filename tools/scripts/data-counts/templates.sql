-- Counts the message_templates rows the template view answer would refuse (docs/62 Decisions,
-- read-only).
-- count: templates_total
select count(*) from public.message_templates;

-- count: templates_unknown_status
select count(*) from public.message_templates
where status::text not in (
  'not_submitted', 'pending', 'approved', 'rejected', 'paused', 'disabled', 'missing'
);

-- count: templates_unknown_category
select count(*) from public.message_templates
where category::text not in ('utility', 'marketing', 'authentication');

-- count: templates_unknown_line
select count(*) from public.message_templates
where line::text not in ('notifications', 'chat');

-- count: templates_missing_text
select count(*) from public.message_templates
where key is null or meta_name is null or language is null or body_ar is null
  or sales_starter is null;

-- count: template_numbers_unknown_status
select count(*) from public.message_template_numbers
where status::text not in (
  'not_submitted', 'pending', 'approved', 'rejected', 'paused', 'disabled', 'missing'
);
