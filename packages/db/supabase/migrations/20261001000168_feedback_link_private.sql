-- The «رأيك يهمّنا» request message carries the family's signed link in template_params.button.
-- A teacher who could read it could answer for the family, so her messages policy (migration 164)
-- now leaves that template out. Admin and service role (the sender) still read it.
drop policy messages_teacher_read on public.messages;
create policy messages_teacher_read on public.messages for select to authenticated
  using (
    phone_e164::text in (select p.phone_e164 from public.my_thread_phones() p)
    and template_key is distinct from 'lesson_feedback_request'
  );
