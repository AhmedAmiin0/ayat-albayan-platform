import type { AuthorTemplate } from '@ab/client-core';
import type { TemplateAuthorInput } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { templatesQuery } from '@/features/messaging/templates/api';
import { authoredTemplatesQuery, createAuthoredTemplate } from '@/features/messaging/templates/edit/edit-api';

/** The author's list (the chat allow-list and their own), every status. */
export const useAuthoredTemplates = () => useQuery(authoredTemplatesQuery);

/** «إرسال إلى ميتا»: the new template, then both lists read again. */
export function useCreateAuthored(onCreated: (tpl: AuthorTemplate) => void) {
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
