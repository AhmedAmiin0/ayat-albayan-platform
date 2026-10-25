import type { TemplateView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ToastProps } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n';
import { moveTemplateLine, setStarter, submitTemplate, syncFailedText, templateErrorText, templateLinesQuery, templatesQuery } from './api';

/** The one toast of the template section. */
export type Notice = Pick<ToastProps, 'message' | 'tone'>;

/**
 * The per-row actions of template health: submit to Meta (T3, after its dialog), move to the other
 * number (after its dialog), the «متاح للمعلمين والمبيعات» switch. Every outcome is one toast; a move
 * whose re-sync on the new number failed says why (never only «نُقل»).
 */
export function useTemplateActions() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState<TemplateView | null>(null);
  const [moving, setMoving] = useState<TemplateView | null>(null);
  const fail = (e: unknown) => setNotice({ message: templateErrorText(e), tone: 'error' });
  const replaceRow = (saved: TemplateView) =>
    queryClient.setQueryData(templatesQuery.queryKey, (old) => old?.map((r) => (r.key === saved.key ? saved : r)));

  const submit = useMutation({
    mutationFn: submitTemplate,
    onSuccess: async () => {
      setNotice({ message: t.templates.submitted });
      await queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey, exact: true });
    },
    onError: fail,
    onSettled: () => setSubmitting(null),
  });
  const move = useMutation({
    mutationFn: moveTemplateLine,
    onSuccess: async ({ template, sync }) => {
      replaceRow(template);
      if (sync && !sync.ok) setNotice({ message: syncFailedText(sync), tone: 'error' });
      else setNotice({ message: t.templates.moved.replace('{line}', t.enums.waLine[template.line]) });
      // The re-sync may have imported or updated rows, and it is the new number's last sync.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: templatesQuery.queryKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: templateLinesQuery.queryKey }),
      ]);
    },
    onError: fail,
    onSettled: () => setMoving(null),
  });
  const starter = useMutation({
    mutationFn: setStarter,
    onSuccess: (saved) => {
      replaceRow(saved);
      setNotice({ message: saved.sales_starter ? t.templates.starterOn : t.templates.starterOff });
    },
    onError: fail,
  });

  return {
    notice,
    setNotice,
    submitting,
    setSubmitting,
    moving,
    setMoving,
    submit,
    move,
    toggleStarter: starter.mutate,
    savingStarter: starter.isPending ? (starter.variables?.key ?? null) : null,
  };
}
