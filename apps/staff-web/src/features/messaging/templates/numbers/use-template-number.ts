import type { TemplateView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { setTemplateNumber, templateErrorText, templatesQuery } from '@/features/messaging/templates/api';
import { templateName } from '@/features/messaging/templates/template-cells';
import type { Notice } from '@/features/messaging/templates/use-template-actions';

/** Null means the role's default. */
export interface NumberPick {
  template: TemplateView;
  numberId: string | null;
}

/** A number the template is not yet approved on is saved with a warning (docs/23c decision 9). */
export function useTemplateNumber(onNotice: (notice: Notice) => void) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState<NumberPick | null>(null);
  const save = useMutation({
    mutationFn: setTemplateNumber,
    onSuccess: async (answer, { key }) => {
      const s = t.templates.sendFrom;
      if (answer.not_approved_on_number) onNotice({ message: s.notApproved, tone: 'info' });
      else onNotice({ message: s.saved.replace('{name}', templateName(key)) });
      await queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey, exact: true });
    },
    onError: (e) => onNotice({ message: templateErrorText(e), tone: 'error' }),
    // Only the pick that was saved: a newer one (if any) keeps its dialog.
    onSettled: (_a, _e, { key, number_id }) =>
      setPicking((cur) => (cur?.template.key === key && cur.numberId === number_id ? null : cur)),
  });
  const confirm = () =>
    picking && save.mutate({ key: picking.template.key, number_id: picking.numberId });
  return { picking, setPicking, confirm, busy: save.isPending };
}
