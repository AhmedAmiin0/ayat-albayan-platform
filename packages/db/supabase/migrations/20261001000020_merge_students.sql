-- Atomic student merge (R-STU-03, R-NFR-03): every reference to the merged student moves to the
-- kept one, the merged row is snapshotted into student_merges + audit_log, then deleted.
-- Called by the API (service role) via rpc('merge_students'); never by end users.
create function public.merge_students(p_kept uuid, p_merged uuid, p_actor uuid)
  returns uuid language plpgsql set search_path = '' as $$
declare
  kept public.students;
  merged public.students;
  merge_id uuid;
  ref record;
begin
  if p_kept = p_merged then
    raise exception 'cannot merge a student into itself' using errcode = '22023';
  end if;
  select * into kept from public.students where id = p_kept for update;
  select * into merged from public.students where id = p_merged for update;
  if kept.id is null or merged.id is null then
    raise exception 'student not found' using errcode = 'P0002';
  end if;

  -- Re-point every single-column FK to students (lessons, reports, subscriptions… as they are
  -- added), so this function never needs editing per table.
  -- TODO(R-STU-03): composite keys such as lesson_students(lesson_id, student_id) raise a unique
  -- violation when both students sit in the same lesson; the merge then rolls back as a whole.
  for ref in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.students'::regclass
      and array_length(c.conkey, 1) = 1
  loop
    execute format('update %s set %I = $1 where %I = $2', ref.tbl, ref.col, ref.col)
      using p_kept, p_merged;
  end loop;

  insert into public.student_merges (kept_id, merged_id, merged_by, snapshot)
    values (p_kept, p_merged, p_actor, to_jsonb(merged))
    returning id into merge_id;
  insert into public.audit_log (actor_id, entity, entity_id, action, before, after)
    values (p_actor, 'students', p_kept, 'merge',
            jsonb_build_object('kept', to_jsonb(kept), 'merged', to_jsonb(merged)),
            jsonb_build_object('merge_id', merge_id, 'merged_id', p_merged));
  delete from public.students where id = p_merged;
  return merge_id;
end $$;

revoke execute on function public.merge_students(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_students(uuid, uuid, uuid) to service_role;
