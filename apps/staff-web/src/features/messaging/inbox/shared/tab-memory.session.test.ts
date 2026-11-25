import { forgetTabMemories } from '@ab/web-kit';
import { describe, expect, it } from 'vitest';
import { getDraft, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { lastOwnSend, recordOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { registerDrafts, type RegisterDraft } from '@/features/messaging/inbox/sales/register-drafts';
import { rememberUntilSessionEnd } from './tab-memory';

const PHONE = '+966501234567';

describe('the inbox tab memories end with the session (round 2 D)', () => {
  it('once registered, the kit’s session end forgets drafts, own sends and registrations', () => {
    rememberUntilSessionEnd();
    setDraft(PHONE, { text: 'مسودة', failed: null });
    recordOwnSend(PHONE, 'm-1');
    registerDrafts.set(PHONE, {} as RegisterDraft);
    forgetTabMemories();
    expect(getDraft(PHONE).text).toBe('');
    expect(lastOwnSend(PHONE)).toBeUndefined();
    expect(registerDrafts.get(PHONE)).toBeUndefined();
  });
});
