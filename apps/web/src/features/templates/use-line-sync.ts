import type { TemplateLineSync, WaLine } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { CATALOGUE_QUERY_KEY } from '../notification-catalogue/catalogue-api';
import { checkTemplateHealth, lineSyncErrorText, templateErrorText, templatesQuery } from './api';
import type { Notice } from './use-template-actions';

export interface LineSyncOptions {
  line: WaLine;
  onNotice: (notice: Notice) => void;
}

/** «تعذّرت مزامنة {line}: {error}» as an error toast. */
const failed = (line: WaLine, error: string): Notice => ({
  message: t.templates.perNumber.syncFailed.replace('{line}', t.enums.waLine[line]).replace('{error}', error),
  tone: 'error',
});

/**
 * «مزامنة مع Meta» for one number (owner 2026-10-18): only its rows against its own WABA. The answer
 * replaces the registry cache (and refetches the catalogue) and stays shown; the success toast only when this line's read was ok
 * (the API answers 200 with ok:false when Meta or Kapso refused that line).
 */
export function useLineSync({ line, onNotice }: LineSyncOptions) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<TemplateLineSync | null>(null);
  const sync = useMutation({
    mutationFn: () => checkTemplateHealth(line),
    onSuccess: (view) => {
      queryClient.setQueryData(templatesQuery.queryKey, view.templates);
      // «ماذا يُرسل ومتى» shows each row's template status: refetch it on the same page (#134 item 10).
      void queryClient.invalidateQueries({ queryKey: CATALOGUE_QUERY_KEY });
      const mine = view.lines.find((l) => l.line === line) ?? null;
      setResult(mine);
      if (mine?.ok) onNotice({ message: t.templates.perNumber.synced.replace('{line}', t.enums.waLine[line]) });
      else onNotice(failed(line, mine ? lineSyncErrorText(mine) : t.common.error));
    },
    onError: (e) => onNotice(failed(line, templateErrorText(e))),
  });
  return { result, syncing: sync.isPending, sync: () => sync.mutate() };
}
