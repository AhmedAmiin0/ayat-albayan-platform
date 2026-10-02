-- Report attachments go up only through the API's signed upload URL (R7, docs/11 §4), which
-- checks the teacher's edit window first; a signed upload does not need an insert policy. The
-- direct teacher insert policy of migration 122 let a teacher drop objects into their report's
-- folder at any time (orphaned files, storage cost), so it is removed (Phase 3 verifier fix).
drop policy if exists storage_attachments_teacher_insert on storage.objects;
