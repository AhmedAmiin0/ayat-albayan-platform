import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHANNEL_SENDER_ROLES } from '@ab/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';
import { channelApp, ST } from './channel.fakes';

type App = Awaited<ReturnType<typeof channelApp>>;

// Review finding 4: ChannelNotify pushes everyone but the sender, so the unread badge counts every
// message not sent by this profile: a guardian counts the child's message, a substitute teacher
// the regular teacher's, the assistant an earlier seat holder's. channel_summaries (migration 993,
// its latest definition) already skips the viewer's own rows; every role is counted.
const ALL = [...CHANNEL_SENDER_ROLES];
const sql = readFileSync(join(MIGRATIONS_DIR, '20261030000993_chat_edit_delete.sql'), 'utf8');

describe('unread counts match who is pushed', () => {
  let t: App;
  beforeAll(async () => {
    t = await channelApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => vi.clearAllMocks());

  const lastCount = () => t.queries.summaries.mock.calls.at(-1)?.[0];

  it('the guardian and the student count every role (the other family login too)', async () => {
    for (const who of ['guardian', 'student'] as const) {
      await t.call('GET', `/portal/students/${ST}/channel/unread`, who);
      expect(lastCount()?.countRoles).toEqual(ALL);
    }
  });

  it('the teacher (a co-teacher or substitute too) and the assistant count every role', async () => {
    await t.call('GET', '/teachers/me/channels', 'teacher');
    expect(lastCount()?.countRoles).toEqual(ALL);
    await t.call('GET', `/sales/students/${ST}/channel/unread`, 'sales');
    expect(lastCount()).toEqual({ profileId: 'p-sa', studentIds: [ST], countRoles: ALL });
  });

  it("the SQL never counts the viewer's own messages", () => {
    expect(sql).toContain('m.sender_profile_id is distinct from p_profile');
  });
});
