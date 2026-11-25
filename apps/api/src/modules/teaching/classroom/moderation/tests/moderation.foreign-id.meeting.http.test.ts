import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MEETING_ID } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const room = (action: string) => `/meetings/${MEETING_ID}/participants/guest-0123456789ab/${action}`;
const ROUTES = [
  { action: 'share', body: { allow: true } },
  { action: 'mute', body: { source: 'microphone' } },
] as const;

describe('meeting room moderation by a salesperson in another login’s meeting', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => h.reset());

  it.each(ROUTES)('another login’s meeting is 403 on $action for sales; nothing sent', async ({ action, body }) => {
    const res = await h.call({ method: 'POST', url: room(action), token: 'sales', body });
    expect(res.statusCode).toBe(403);
    expect(h.http).not.toHaveBeenCalled();
  });
});
