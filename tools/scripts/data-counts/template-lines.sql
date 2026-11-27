-- Counts the stored line syncs the template line view would refuse (docs/62 Decisions, read-only).
-- count: template_line_syncs_total
select count(*) from public.wa_template_line_syncs;

-- count: template_line_syncs_unknown_line_or_provider
select count(*) from public.wa_template_line_syncs
where result->>'line' is null or result->>'line' not in ('notifications', 'chat')
  or result->>'provider' is null
  or result->>'provider' not in ('meta', 'kapso', 'crm', 'evolution');

-- count: template_line_syncs_missing_fields
select count(*) from public.wa_template_line_syncs
where not (result ? 'configured' and result ? 'ok' and result ? 'checked_at'
  and result ? 'meta_count' and result ? 'synced' and result ? 'imported' and result ? 'skipped'
  and result ? 'waba_id' and result ? 'phone_number_id');

-- count: template_line_syncs_unknown_skip_code
select count(*) from public.wa_template_line_syncs s,
  jsonb_array_elements(coalesce(s.result->'skipped', '[]'::jsonb)) as k
where k->'reason'->>'code' not in (
  'category', 'too_many_vars', 'bad_key', 'media_header', 'no_body', 'named_vars',
  'button_value', 'key_taken'
);
