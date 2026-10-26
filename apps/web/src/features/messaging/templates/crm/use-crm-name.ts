import type { TemplateView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { setCrmName, templateErrorText, templatesQuery } from '../api';
import { templateName } from '../template-cells';
import type { Notice } from '../use-template-actions';

/**
 * A crm line's template name / language in the CRM (docs/19): `editing` opens CrmNameDialog; the saved row
 * replaces its old one and the dialog closes; every outcome is one toast.
 */
export function useCrmName(onNotice: (notice: Notice) => void) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TemplateView | null>(null);
  const save = useMutation({
    mutationFn: setCrmName,
    onSuccess: (saved: TemplateView) => {
      queryClient.setQueryData(templatesQuery.queryKey, (old) => old?.map((r) => (r.key === saved.key ? saved : r)));
      setEditing(null);
      onNotice({ message: t.templates.crmName.saved.replace('{name}', templateName(saved.key)) });
    },
    onError: (e) => onNotice({ message: templateErrorText(e), tone: 'error' }),
  });
  return { editing, setEditing, save };
}
