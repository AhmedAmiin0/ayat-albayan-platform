import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { Props } from './FileButtons.types';
import { LABEL, ICON } from './file-buttons.helpers';
import { useFileButtons } from './use-file-buttons';

/**
 * A sent report's PDF or a visible recording: each opens by a signed link minted on the tap, into
 * a tab opened inside the tap (open-file.ts); a failure closes the tab and says so.
 */
export function FileButtons({ studentId, files, icons = false }: Props) {
  const { open } = useFileButtons({ studentId });
  if (files.length === 0) return null;
  return (
    <div className="grid gap-2">
      {open.isError && <FormAlert>{t.portal.fileFailed}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <Button
            key={file.kind}
            type="button"
            variant="secondary"
            size="sm"
            disabled={open.isPending}
            onClick={() => open.mutate(file)}
          >
            {icons && <Icon name={ICON[file.kind]} />}
            {LABEL[file.kind]()}
          </Button>
        ))}
      </div>
    </div>
  );
}
