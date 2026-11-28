import { studentCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { studentKeys } from '@/core/lib/keys';

const students = studentCalls({ apiFetch, apiSend });

/** PATCH /students/:id with only `contact_is_self`; the student's cache is read again after. */
export function useContactSelfSave(studentId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (next: boolean) => students.update(studentId, { contact_is_self: next }),
    onSettled: () => client.invalidateQueries({ queryKey: studentKeys.one(studentId) }),
  });
}
