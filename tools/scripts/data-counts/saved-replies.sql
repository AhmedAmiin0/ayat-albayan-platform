-- Counts the saved reply rows the reply answer schema would refuse (docs/62 Decisions, read-only).
-- count: saved_replies_total
select count(*) from public.saved_replies;

-- count: saved_replies_missing_text
select count(*) from public.saved_replies where title is null or body is null;

-- count: saved_replies_missing_place
select count(*) from public.saved_replies where position is null or updated_at is null;
