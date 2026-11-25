import type { TemplateView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { setCrmStatus, templateErrorText, templatesQuery, type CrmTemplateStatus } from '@/features/messaging/templates/api';
import { templateName } from '@/features/messaging/templates/template-cells';
import type { Notice } from '@/features/messaging/templates/use-template-actions';

/** Set by hand on a crm line (docs/19); `busyKey` is the row being saved. */
export function useCrmStatus(onNotice: (notice: Notice) => void) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: setCrmStatus,
    onSuccess: (saved: TemplateView) => {
      queryClient.setQueryData(templatesQuery.queryKey, (old) =>
        old?.map((r) => (r.key === saved.key ? saved : r)),
      );
      const status =
        saved.status === 'approved'
          ? t.enums.templateStatus.approved
          : t.templates.crmStatus.missingChip;
      onNotice({
        message: t.templates.crmStatus.saved
          .replace('{name}', templateName(saved.key))
          .replace('{status}', status),
      });
    },
    onError: (e) => onNotice({ message: templateErrorText(e), tone: 'error' }),
  });
  const { mutate } = save;
  const onSet = useCallback(
    (tpl: TemplateView, status: CrmTemplateStatus) => mutate({ key: tpl.key, status }),
    [mutate],
  );
  return { busyKey: save.isPending ? (save.variables?.key ?? null) : null, onSet };
}
