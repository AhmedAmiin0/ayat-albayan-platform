import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import { ADMIN, ASSISTANT, LESSON_ID, OTHER_TEACHER, queries, TEACHER } from './classroom.fakes';
import { recordingQueries, recordingRow, rolesOf } from './moderation.fakes';
import { RecordingListService, recordingView, RecordingViews } from './recording-list.service';
import type { RecordingQueries } from './recording.queries';

let rq: ReturnType<typeof recordingQueries>;
const storage = { signedDownload: vi.fn() };
const views = () => new RecordingViews(rq as unknown as RecordingQueries, storage as unknown as StorageService);
const service = () => new RecordingListService(rolesOf({ q: queries() }), views());
const list = (user = ADMIN) => service().list({ user, lessonId: LESSON_ID });

beforeEach(() => {
  rq = recordingQueries();
  storage.signedDownload.mockReset().mockResolvedValue({ url: 'https://signed.example.test/a.mp4', expires_at: '' });
});

describe('GET /lessons/:id/recordings', () => {
  it('done rows get a 1-hour signed link to their file in the recordings bucket', async () => {
    expect(await list()).toEqual([
      { id: recordingRow().id, status: 'done', started_at: recordingRow().started_at, ended_at: recordingRow().ended_at, url: 'https://signed.example.test/a.mp4' },
    ]);
    expect(storage.signedDownload).toHaveBeenCalledWith({ bucket: 'recordings', path: recordingRow().file_path, seconds: 3600 });
  });

  it('running and failed rows have no link (and sign nothing)', async () => {
    rq.forTarget.mockResolvedValue([recordingRow({ status: 'recording', ended_at: null }), recordingRow({ status: 'failed' })]);
    const views = await list();
    expect(views.map((v) => [v.status, v.url])).toEqual([['recording', null], ['failed', null]]);
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('the lesson teacher may see them', async () => {
    expect(await list(TEACHER)).toHaveLength(1);
  });

  it('not another teacher, nor an assistant', async () => {
    await expect(list(OTHER_TEACHER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(list(ASSISTANT)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('recordingView', () => {
  it('an unknown status reads as failed, without a link', () => {
    expect(recordingView(recordingRow({ status: 'weird' }), 'u')).toMatchObject({ status: 'failed', url: null });
  });
});
