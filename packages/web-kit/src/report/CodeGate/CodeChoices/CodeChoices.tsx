import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { CodeEntry } from '@ab/web-kit/report/CodeEntry';
import { gateProblem } from '@ab/web-kit/report/public-api';
import type { CodeChoicesProps } from './CodeChoices.types';
import { useCodeChoices } from './use-code-choices';

/** One button per masked number; a sent code opens the entry for its six digits. */
export function CodeChoices({ publicId, access, onVerified }: CodeChoicesProps) {
  const { g, send, sent, ask, notice } = useCodeChoices({ publicId, access });
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
