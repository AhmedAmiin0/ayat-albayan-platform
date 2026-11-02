import type { TemplateCreateInput, TemplateView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTemplate, templatesQuery } from '@/features/messaging/templates/api';

/** «حفظ القالب»: POST /messaging/templates, then the table reads the registry again. */
export function useCreateTemplate(onCreated: (tpl: TemplateView) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateCreateInput) => createTemplate(input),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey, exact: true });
      onCreated(saved);
    },
  });
}
