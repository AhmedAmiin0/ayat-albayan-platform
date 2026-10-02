-- Reserve AB-0001..AB-0999 for the legacy codes the old registration form issued (R-MIG-01,
-- rule 7). The identity started at 183, but the export already holds codes up to 187 and the old
-- form keeps issuing codes until cut-over; a student created in the app first would take one of
-- them and the import would have to give the legacy student a new code. App-created students now
-- start at AB-1000 (or after the highest existing code, if that is higher). Forward only.
select setval(
  pg_get_serial_sequence('public.students', 'code_seq'),
  greatest(999, coalesce((select max(code_seq) from public.students), 0))
);
