import type { ReportCodeTarget } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { requestCode } from '@ab/web-kit/report/public-api';
import { noticeOf } from './code-choices.helpers';
import type { CodeChoicesProps } from './CodeChoices.types';

export function useCodeChoices({
  publicId,
  access,
}: Pick<CodeChoicesProps, 'publicId' | 'access'>) {
  const g = t.reportPage.gate;
  const send = useMutation({ mutationFn: requestCode });
  const [sent, setSent] = useState(false);
  const ask = (to: ReportCodeTarget) =>
    send.mutate({ publicId, to }, { onSuccess: () => setSent(true) });
  const notice = noticeOf(access);
  return { g, send, sent, ask, notice };
}
