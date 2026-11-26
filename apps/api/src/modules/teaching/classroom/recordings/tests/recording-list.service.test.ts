import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { ADMIN, ASSISTANT, LESSON_ID, OTHER_TEACHER, queries, TEACHER } from '@/modules/teaching/classroom/classroom.fakes';
import { recordingQueries, recordingRow, rolesOf } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { RecordingListService, recordingView, RecordingViews } from '@/modules/teaching/classroom/recordings/recording-list.service';
import type { RecordingRepo } from '@/modules/teaching/classroom/recordings/recording.repo';

let rq: ReturnType<typeof recordingQueries>;
const storage = { signedDownloads: vi.fn() };
const SIGNED = 'https://signed.example.test/a.mp4';
const signAll = async (input: { paths: readonly string[] }) =>
  new Map(input.paths.map((p) => [p, SIGNED]));
const views = () => new RecordingViews(rq as unknown as RecordingRepo, storage as unknown as StorageService);
const service = () => new RecordingListService(rolesOf({ q: queries() }), views());
const list = (user = ADMIN) => service().list({ user, lessonId: LESSON_ID });

beforeEach(() => {
  rq = recordingQueries();
  storage.signedDownloads.mockReset().mockImplementation(signAll);
});

describe('GET /lessons/:id/recordings', () => {
  it('done rows get a 1-hour signed link to their file in the recordings bucket', async () => {
    expect(await list()).toEqual([
      { id: recordingRow().id, status: 'done', started_at: recordingRow().started_at, ended_at: recordingRow().ended_at, url: 'https://signed.example.test/a.mp4' },
    ]);
    const one = { bucket: 'recordings', paths: [recordingRow().file_path], seconds: 3600 };
    expect(storage.signedDownloads).toHaveBeenCalledWith(one);
  });

  it('running and failed rows have no link (and sign nothing)', async () => {
    rq.forTarget.mockResolvedValue([recordingRow({ status: 'recording', ended_at: null }), recordingRow({ status: 'failed' })]);
    const views = await list();
    expect(views.map((v) => [v.status, v.url])).toEqual([['recording', null], ['failed', null]]);
    expect(storage.signedDownloads).not.toHaveBeenCalled();
  });

  it('signs every finished file of the list in one call', async () => {
    const row = (id: string, file_path: string) => recordingRow({ id, file_path });
    const two = [row('r1', 'a.mp4'), row('r2', 'b.mp4')];
    rq.forTarget.mockResolvedValue(two);
    expect((await list()).map((v) => v.url)).toEqual([SIGNED, SIGNED]);
    expect(storage.signedDownloads).toHaveBeenCalledTimes(1);
    expect(storage.signedDownloads.mock.calls[0]?.[0].paths).toEqual(['a.mp4', 'b.mp4']);
  });

  it('a finished file that cannot be signed fails the list, as a refused single link did', async () => {
    storage.signedDownloads.mockResolvedValue(new Map());
    await expect(list()).rejects.toThrow('not signed');
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
