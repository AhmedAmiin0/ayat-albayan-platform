import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { CodeGateProps } from './CodeGate.types';
import { CodeChoices } from './CodeChoices';
import { useCodeGate } from './use-code-gate';

/** The code goes to a masked number on file; the page never says whose. */
export function CodeGate({ publicId, onVerified }: CodeGateProps) {
  const { g, access } = useCodeGate({ publicId });
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
