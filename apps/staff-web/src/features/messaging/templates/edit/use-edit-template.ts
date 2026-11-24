import type { AuthorTemplate } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesQuery } from '@/features/messaging/templates/api';
import { authoredTemplatesQuery, editTemplate } from './edit-api';

/** The API has already re-synced that number, so the status shows under review. */
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
