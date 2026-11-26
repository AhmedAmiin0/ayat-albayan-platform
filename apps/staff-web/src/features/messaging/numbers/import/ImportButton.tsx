import type { ImportResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Dialog, FormAlert, t } from '@ab/web-kit';
import { numberErrorText } from '@/features/messaging/numbers/form/number-errors';
import { importNumbers } from '@/features/messaging/numbers/numbers-api';
import { ImportRoles } from './ImportRoles';
import { useNumbersMutation } from '@/features/messaging/numbers/use-numbers-mutation';

const im = t.numbers.import;

/** docs/23 §2e step 2: a dry run first, secrets never shown. */
export function ImportButton() {
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const dry = useMutation({ mutationFn: () => importNumbers(true), onSuccess: setPreview });
  const apply = useNumbersMutation(() => importNumbers(false), {
    onDone: () => setPreview(null),
    note: im.done,
  });
  const close = () => {
    setPreview(null);
    apply.reset();
  };
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" disabled={dry.isPending} onClick={() => dry.mutate()}>
          {im.title}
        </Button>
        <p className="max-w-[70ch] text-xs text-ink-3">{im.hint}</p>
      </div>
      {dry.isError && <FormAlert>{numberErrorText(dry.error)}</FormAlert>}
      {preview && (
        <Dialog
          title={im.preview}
          layout="center"
          onClose={close}
          actions={
            <>
              <Button variant="ghost" onClick={close}>
                {t.numbers.actions.cancel}
              </Button>
              {preview.changed && (
                <Button disabled={apply.isPending} onClick={() => apply.mutate()}>
                  {im.confirm}
                </Button>
              )}
            </>
          }
        >
          <div className="grid gap-3">
            {!preview.changed && <p className="text-sm font-semibold">{im.nothing}</p>}
            <ImportRoles roles={preview.roles} />
            {apply.isError && <FormAlert>{numberErrorText(apply.error)}</FormAlert>}
          </div>
        </Dialog>
      )}
    </div>
  );
}
