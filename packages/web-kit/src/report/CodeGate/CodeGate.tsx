import type { ReportAccessView, ReportCodeTarget } from '@ab/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CodeEntry } from '@ab/web-kit/report/CodeEntry';
import { accessQuery, gateProblem, requestCode } from '@ab/web-kit/report/public-api';

export interface CodeGateProps {
  publicId: string;
  /** The code was right: the page reads the report with its new cookie. */
  onVerified: () => void;
}

type Notice = 'unavailable' | 'noPhone';

/** Why no number can be chosen, or null when some can. */
const noticeOf = (access: ReportAccessView): Notice | null =>
  [
    { when: !access.available, notice: 'unavailable' as const },
    { when: access.to.length === 0, notice: 'noPhone' as const },
  ].find((r) => r.when)?.notice ?? null;

/** The code goes to a masked number on file; the page never says whose. */
export function CodeGate({ publicId, onVerified }: CodeGateProps) {
  const g = t.reportPage.gate;
  const access = useQuery(accessQuery(publicId));
  return (
    <section className="grid gap-3" aria-label={g.title}>
      <p className="text-body text-ink-2">{g.intro}</p>
      {access.isPending && <ListSkeleton />}
      {access.isError && <FormAlert>{t.reportPage.notFound}</FormAlert>}
      {access.data && (
        <CodeChoices publicId={publicId} access={access.data} onVerified={onVerified} />
      )}
    </section>
  );
}

function CodeChoices({
  publicId,
  access,
  onVerified,
}: CodeGateProps & { access: ReportAccessView }) {
  const g = t.reportPage.gate;
  const send = useMutation({ mutationFn: requestCode });
  const [sent, setSent] = useState(false);
  const ask = (to: ReportCodeTarget) =>
    send.mutate({ publicId, to }, { onSuccess: () => setSent(true) });
  const notice = noticeOf(access);
  if (notice) return <FormAlert>{g[notice]}</FormAlert>;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {access.to.map((c) => (
          <Button
            key={c.to}
            type="button"
            variant="secondary"
            disabled={send.isPending || sent}
            onClick={() => ask(c.to)}
          >
            {g.sendTo.replace('{masked}', c.masked)}
          </Button>
        ))}
      </div>
      {send.isError && <FormAlert>{g[gateProblem(send.error)]}</FormAlert>}
      {sent && <CodeEntry publicId={publicId} onVerified={onVerified} />}
    </>
  );
}
