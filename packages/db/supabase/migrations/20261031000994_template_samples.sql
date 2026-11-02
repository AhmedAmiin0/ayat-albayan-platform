-- Templates made from the admin (owner 2026-10-31: «add ability to create and sync templates from the
-- admin»): one review sample per {{n}}, in order, sent with the submission as Meta's example.body_text.
-- null = the samples by param name (ar.json templates.reviewSamples), as for every seeded or imported
-- row. Expand-only and idempotent: an older API never reads the column.
alter table public.message_templates
  add column if not exists samples jsonb
  check (samples is null or jsonb_typeof(samples) = 'array');

comment on column public.message_templates.samples is
  'Review samples by {{n}} position (admin-made templates); null = by param name (templates.reviewSamples).';
