import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { draftFromLead } from '@/features/booking/booking-entries';
import { getDraft, setDraft } from '@/features/inbox/draft-store';
import { lastOwnSend, recordOwnSend } from '@/features/inbox/own-send';
import { registerDrafts } from '@/features/inbox/register-drafts';
import { signOut } from './sign-in';

const auth = vi.hoisted(() => ({ signOut: vi.fn(async () => undefined) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('./session-activity', () => ({ reportSession: vi.fn(async () => undefined) }));
vi.mock('@/features/notifications/web-push', () => ({ forgetWebPush: vi.fn(async () => undefined) }));

const PHONE = '+966501234567';

describe('signOut on a shared PC forgets this tab’s chat memories (m11)', () => {
  it('the reply drafts, her own sends and the registration drafts are gone', async () => {
    setDraft(PHONE, { text: 'السلام عليكم', failed: { text: 'السلام عليكم', id: 'r-1', code: 'send_failed' } });
    recordOwnSend(PHONE, 'm-1');
    registerDrafts.set(PHONE, { draft: draftFromLead({ leadId: 'lead-1', phone: PHONE }, null), step: 'teacher' });
    await signOut(new QueryClient());
    expect(getDraft(PHONE)).toEqual({ text: '', failed: null });
    expect(lastOwnSend(PHONE)).toBeUndefined();
    expect(registerDrafts.get(PHONE)).toBeUndefined();
  });
});
