import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN } from './classroom.fakes';
import { MEETING_ID, meetingRow } from './internal-meetings.fakes';
import { recordingRow } from './moderation.fakes';
import { classroomApp } from './test-app';

// «I need all the meetings to be recorded» (owner, 2026-10-05): internal meetings are recorded on
// join like lessons, listed for the admin and the creator; the panels can ask whether recording works.

const list = `/meetings/${MEETING_ID}/recordings`;
const meetingRec = recordingRow({ lesson_id: null, meeting_id: MEETING_ID, file_path: `meetings/${MEETING_ID}/a.mp4` });

describe('meeting recordings routes', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.recordings.forTarget.mockResolvedValue([meetingRec]);
  });

  it('GET …/recordings: the creator and an admin get signed links to the finished files', async () => {
    const res = await h.call({ method: 'GET', url: list, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([expect.objectContaining({ id: meetingRec.id, status: 'done', url: 'https://signed.example.test/r.mp4' })]);
    expect(h.recordings.forTarget).toHaveBeenCalledWith({ kind: 'meeting', id: MEETING_ID });
    expect(h.storage.signedDownload).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'recordings', path: meetingRec.file_path }));
    expect((await h.call({ method: 'GET', url: list, token: 'admin' })).statusCode).toBe(200);
  });

  it('GET …/recordings: 403 for other staff, 404 for an unknown meeting, 400 for a bad id', async () => {
    expect((await h.call({ method: 'GET', url: list, token: 'assistant' })).statusCode).toBe(403);
    expect((await h.call({ method: 'GET', url: list, token: 'guardian' })).statusCode).toBe(403);
    h.meetings.byId.mockResolvedValueOnce(null);
    expect((await h.call({ method: 'GET', url: list })).json().code).toBe('meeting_not_found');
    expect((await h.call({ method: 'GET', url: '/meetings/x/recordings' })).statusCode).toBe(400);
  });

  it('a meeting join starts its recording (meetings/<id>/…) and says recording is on', async () => {
    h.meetings.byId.mockResolvedValue(meetingRow({ created_by: ADMIN.id }));
    const res = await h.call({ method: 'POST', url: `/meetings/${MEETING_ID}/join`, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(res.json().recording).toBe('on');
    await vi.waitFor(() => expect(h.recordings.claim).toHaveBeenCalledWith(expect.objectContaining({ target: { kind: 'meeting', id: MEETING_ID } })));
    const claim = h.recordings.claim.mock.calls[0]?.[0] as { filePath: string };
    expect(claim.filePath).toMatch(new RegExp(`^meetings/${MEETING_ID}/`));
  });

  it('GET /recordings/status: configured for any staff login', async () => {
    const res = await h.call({ method: 'GET', url: '/recordings/status', token: 'sales' });
    expect([res.statusCode, res.json()]).toEqual([200, { configured: true }]);
    expect((await h.call({ method: 'GET', url: '/recordings/status', token: 'guardian' })).statusCode).toBe(403);
  });
});
