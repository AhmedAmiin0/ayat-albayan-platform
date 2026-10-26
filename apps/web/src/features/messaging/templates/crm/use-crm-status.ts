import type { TemplateView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { t } from '@/lib/i18n/i18n';
import { setCrmStatus, templateErrorText, templatesQuery, type CrmTemplateStatus } from '../api';
import { templateName } from '../template-cells';
import type { Notice } from '../use-template-actions';

/**
 * A crm line's template status by hand (docs/19): «معتمد في نظام CRM» / «غير متاح في نظام CRM». The saved
 * row replaces its old one; every outcome is one toast. `busyKey` = the row being saved.
 */
export function useCrmStatus(onNotice: (notice: Notice) => void) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: setCrmStatus,
    onSuccess: (saved: TemplateView) => {
      queryClient.setQueryData(templatesQuery.queryKey, (old) => old?.map((r) => (r.key === saved.key ? saved : r)));
      const status = saved.status === 'approved' ? t.enums.templateStatus.approved : t.templates.crmStatus.missingChip;
      onNotice({ message: t.templates.crmStatus.saved.replace('{name}', templateName(saved.key)).replace('{status}', status) });
    },
    onError: (e) => onNotice({ message: templateErrorText(e), tone: 'error' }),
  });
  const { mutate } = save;
  const onSet = useCallback((tpl: TemplateView, status: CrmTemplateStatus) => mutate({ key: tpl.key, status }), [mutate]);
  return { busyKey: save.isPending ? (save.variables?.key ?? null) : null, onSet };
}
