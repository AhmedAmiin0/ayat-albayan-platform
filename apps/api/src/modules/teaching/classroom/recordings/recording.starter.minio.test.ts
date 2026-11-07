import { beforeEach, describe, expect, it } from 'vitest';
import { CONFIG, LESSON_ID, OPEN } from '@/modules/teaching/classroom/classroom.fakes';
import { LivekitApi } from '@/modules/teaching/classroom/livekit/livekit-api';
import { sentBody } from '@/modules/teaching/classroom/livekit/livekit.fakes';
import { http, recordingQueries } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import type { StorageService } from '@/common/storage/storage.service';
import type { RecordingRepo } from './recording.repo';
import { RecordingStarter } from './recording.starter';
import { MINIO_STORAGE, MINIO_TARGET } from './recording.storage.fakes';
import { lessonTarget } from './recording-target';

let q: ReturnType<typeof recordingQueries>;
let h: ReturnType<typeof http>;
const starter = (storage: StorageService) =>
  new RecordingStarter(q as unknown as RecordingRepo, new LivekitApi(CONFIG, h), null, storage);
const key = `lessons/${LESSON_ID}/2026-10-05T16-05-00-000Z.mp3`;

beforeEach(() => {
  q = recordingQueries();
  h = http({ body: { egress_id: 'EG_new' } });
});

describe('recordings once MinIO keeps new files (docs/45)', () => {
  it('records without RECORDING_S3_*: the egress uploads the bare key to MinIO, the row keeps «minio:»', async () => {
    const s = starter(MINIO_STORAGE);
    expect(s.configured).toBe(true);
    expect(await s.startFor(lessonTarget(LESSON_ID), OPEN)).toBe('started');
    expect(q.claim).toHaveBeenCalledWith({
      target: lessonTarget(LESSON_ID),
      filePath: `minio:${key}`,
      startedAt: OPEN.toISOString(),
    });
    const body = JSON.stringify(h.mock.calls.map(([, init]) => sentBody(init)));
    expect(body).toContain(`"filepath":"${key}"`);
    expect(body).toContain(`"endpoint":"${MINIO_TARGET.endpoint}"`);
  });

  it('MinIO switched on but not configured: the start fails loudly, nothing goes to Supabase', async () => {
    const broken = {
      writesTo: () => 'minio',
      egressTarget: () => {
        throw new Error('storage_not_configured');
      },
    } as unknown as StorageService;
    expect(await starter(broken).startFor(lessonTarget(LESSON_ID), OPEN)).toBe('failed');
    expect(q.claim).not.toHaveBeenCalled();
  });
});
