import type { AuthorTemplate } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesQuery } from '@/features/messaging/templates/api';
import { authoredTemplatesQuery, editTemplate } from './edit-api';

/**
 * «حفظ التعديل»: PATCH the admin's or the author's route, then both lists read again (the API has
 * already re-synced that number, so the status shows «قيد المراجعة»).
 */
export function useEditTemplate(onSaved: (tpl: AuthorTemplate) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editTemplate,
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: authoredTemplatesQuery.queryKey }),
      ]);
      onSaved(saved);
    },
  });
}
