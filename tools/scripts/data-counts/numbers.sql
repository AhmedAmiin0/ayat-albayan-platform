-- Counts the wa_numbers rows the number view answer would refuse (docs/62 Decisions, read-only).
-- count: numbers_total
select count(*) from public.wa_numbers;

-- count: numbers_unknown_purpose
select count(*) from public.wa_numbers
where purpose::text not in ('notifications', 'chat', 'calls');

-- count: numbers_missing_text
select count(*) from public.wa_numbers
where label is null or phone_number_id is null or updated_at is null;

-- count: numbers_negative_rank
select count(*) from public.wa_numbers where fallback_rank is null or fallback_rank < 0;
