import { afterEach, describe, expect, it } from 'vitest';
import { clearAllDrafts, getDraft, setDraft } from './draft-store';
import { PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { clearOwnSends, lastOwnSend } from './own-send';
import { sendStart, settleOwnSend } from './send-start';

const failed = { text: 'تمام', id: 'id-1', code: 'send_failed' };

afterEach(() => {
  clearAllDrafts();
  clearOwnSends();
});

describe('settleOwnSend (template and rating sends, round 3)', () => {
  it('records her own send and settles a failed text attempt, keeping the typed text', () => {
    setDraft(PHONE, { text: 'تمام', failed });
    settleOwnSend(PHONE, 'm-1', sendStart());
    expect(lastOwnSend(PHONE)).toBe('m-1');
    expect(getDraft(PHONE)).toEqual({ text: 'تمام', failed: null });
  });

  it('a send started before a sign-out writes nothing into the next user\'s tab', () => {
    const start = sendStart();
    clearOwnSends();
    clearAllDrafts();
    setDraft(PHONE, { text: 'نص المستخدم التالي', failed });
    settleOwnSend(PHONE, 'm-1', start);
    expect(lastOwnSend(PHONE)).toBeUndefined();
    expect(getDraft(PHONE).failed).toEqual(failed);
  });
});
