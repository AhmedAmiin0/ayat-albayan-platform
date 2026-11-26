import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { EditorActionsProps } from './EditorActions.types';

/** Cancel, and with users.write Save: off while saving or while the new role has no record. */
export function EditorActions(props: EditorActionsProps) {
  const { formId, canWrite, saving, recordMissing, onClose } = props;
  return (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        {t.common.cancel}
      </Button>
      {canWrite && (
        <Button type="submit" form={formId} disabled={saving || recordMissing}>
          {t.users.detail.save}
        </Button>
      )}
    </>
  );
}
