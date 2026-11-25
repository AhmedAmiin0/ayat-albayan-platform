import { fillSlots, sendCounts } from '@ab/client-core';
import type { ShortLinkDetail } from '@ab/shared';
import { Cartouche, Icon, Button, PageHead, t } from '@ab/web-kit';
import { StateChip } from '@/features/platform/short-links/shared/LinkChips';
import type { LinkDialog } from '@/features/platform/short-links/edit/use-link-actions';

const D = t.shortLinks.detail;

interface DetailHeadProps {
  link: ShortLinkDetail;
  onDialog: (dialog: LinkDialog) => void;
  onResend: () => void;
  pending: boolean;
}

export function DetailHead({ link, onDialog, onResend, pending }: DetailHeadProps) {
  const live = link.status !== 'revoked';
  const failed = sendCounts(link.userList).failed;
  return (
    <PageHead className="mb-3">
      <Cartouche>{link.title}</Cartouche>
      <StateChip row={link} size="md" />
      {live && (
        <div className="flex flex-wrap gap-2 sm:ms-auto">
          <Button variant="secondary" size="sm" onClick={() => onDialog('extend')}>
            <Icon name="calendar" />
            {D.extend}
          </Button>
          {failed > 0 && (
            <Button variant="secondary" size="sm" disabled={pending} onClick={onResend}>
              <Icon name="send" />
              {fillSlots(D.resendFailed, { n: failed })}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => onDialog('edit')}>
            {t.common.edit}
          </Button>
          <Button variant="danger-quiet" size="sm" onClick={() => onDialog('revoke')}>
            <Icon name="x" />
            {D.revoke}
          </Button>
        </div>
      )}
    </PageHead>
  );
}
