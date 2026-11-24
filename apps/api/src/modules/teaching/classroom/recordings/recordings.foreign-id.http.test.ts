import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MEETING_ID } from '@/modules/teaching/classroom/internal-meetings/internal-meetings.fakes';
import { recordingRow } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { classroomApp } from '@/modules/teaching/classroom/test-app';

const list = `/meetings/${MEETING_ID}/recordings`;
const rec = recordingRow({ lesson_id: null, meeting_id: MEETING_ID, file_path: `meetings/${MEETING_ID}/a.mp4` });

describe('GET /meetings/:id/recordings with another login’s meeting', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.recordings.forTarget.mockResolvedValue([rec]);
  });

  it.each(['other', 'sales'] as const)('another login’s meeting is 403 for %s; no recording read or signed', async (token) => {
    const res = await h.call({ method: 'GET', url: list, token });
    expect(res.statusCode).toBe(403);
    expect(res.body).not.toContain(rec.id);
    expect(h.recordings.forTarget).not.toHaveBeenCalled();
    expect(h.storage.signedDownload).not.toHaveBeenCalled();
  });
});
