import { fillSlots, userLook, visitOf } from '@ab/client-core';
import type { ShortLinkDetail, ShortLinkUser } from '@ab/shared';
import { counted } from '@ab/core';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SendChip } from '@/features/platform/short-links/shared/LinkChips';
import { PersonLine } from '@/features/platform/short-links/shared/PersonLine';
import { useLinkDates } from '@/features/platform/short-links/shared/use-link-dates';
import { LinkTable } from '@/features/platform/short-links/shared/LinkTable';

const D = t.shortLinks.detail;
const SEND_ERRORS: Readonly<Record<string, string>> = {
  template_not_approved: D.sendErrors.template_not_approved,
  no_phone: D.sendErrors.no_phone,
};

/** Why a send failed, in words («لم يُعتمد قالب الإشعارات بعد»), or the code itself. */
const sendErrorText = (code: string): string =>
  SEND_ERRORS[code] ?? fillSlots(D.sendErrors.unknown, { code });

interface UsersTableProps {
  link: ShortLinkDetail;
  /** «أعد الإرسال» on a failed row (null once the link is revoked). */
  onResend: (() => void) | null;
  pending: boolean;
}

type SendCellProps = { user: ShortLinkUser } & Omit<UsersTableProps, 'link'>;

function SendCell({ user, onResend, pending }: SendCellProps) {
  const failed = user.sendStatus === 'failed';
  return (
    <span className="grid justify-items-start gap-1">
      <SendChip status={user.sendStatus} />
      {user.sendError && (
        <span className="text-xs text-ink-3">{sendErrorText(user.sendError)}</span>
      )}
      {failed && onResend && (
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={onResend}>
          {D.resend}
        </Button>
      )}
    </span>
  );
}

/** «المستخدمون» (board LinkXWebDetail): each listed user, their WhatsApp send and their visit. */
export function UsersTable({ link, onResend, pending }: UsersTableProps) {
  const dates = useLinkDates();
  const rows = link.userList.map((user) => {
    const visit = visitOf(user, link.visitorList);
    return [
      <PersonLine key="who" look={userLook(user)} />,
      <SendCell key="send" user={user} onResend={onResend} pending={pending} />,
      visit ? (
        <span key="opened" className="text-xs tabular-nums">{dates.day(visit.firstAt)}</span>
      ) : (
        <span key="opened" className="text-xs font-semibold text-act">{D.notOpenedYet}</span>
      ),
    ];
  });
  return (
    <LinkTable
      id="link-users"
      title={D.users}
      count={counted(D.usersCount, link.userList.length)}
      hint={link.userList.length > 0 ? D.usersHint : D.noUsers}
      head={[D.columns.person, D.columns.send, D.columns.opened]}
      rows={rows}
      keys={link.userList.map((u) => u.id)}
    />
  );
}
