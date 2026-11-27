import type { TemplateAuthorInput, TemplateView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { templatesQuery } from '@/features/messaging/templates/api';
import { authoredTemplatesQuery, createAuthoredTemplate } from '@/features/messaging/templates/edit/edit-api';

/** The author's list (the chat allow-list and their own), every status. */
export const useAuthoredTemplates = () => useQuery(authoredTemplatesQuery);

export function useCreateAuthored(onCreated: (tpl: TemplateView) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateAuthorInput) => createAuthoredTemplate(input),
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authoredTemplatesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey, exact: true }),
      ]);
      onCreated(saved);
    },
  });
}
