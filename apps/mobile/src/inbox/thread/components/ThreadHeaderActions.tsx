import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { CheckRegistrationButton } from '@/registration-check/components/CheckRegistrationButton';
import { ThreadListsButton } from '../../lists/ThreadListsButton';
import { CopyPhoneButton } from './CopyPhoneButton';
import type { ThreadCache } from '../hooks/thread-cache';

export interface ThreadHeaderActionsProps {
  phone: string;
  /** The cached thread: its newest page carries the chat's `lists`. */
  data: ThreadCache | undefined;
  /** A salesperson (self.sales): «تحقق من التسجيل» too. */
  sales: boolean;
}

/**
 * The icon actions of an admin or assistant chat header (never a teacher's): «نسخ الرقم», «القوائم» with
 * inbox.lists (docs/22), and a salesperson's «تحقق من التسجيل» for this number.
 */
export function ThreadHeaderActions({ phone, data, sales }: ThreadHeaderActionsProps) {
  const base = useTreeBase();
  return (
    <>
      <CopyPhoneButton phone={phone} />
      <ThreadListsButton phone={phone} member={data?.pages[0]?.lists} />
      {sales ? (
        <CheckRegistrationButton icon href={inTree(base, { pathname: '/inbox/registration-check', params: { phone } })} />
      ) : null}
    </>
  );
}
