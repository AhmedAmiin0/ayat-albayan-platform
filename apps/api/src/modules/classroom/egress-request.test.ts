import { describe, expect, it } from 'vitest';
import { egressIdOf, egressRequest, recordingPath } from './egress-request';
import { S3 } from './moderation.fakes';

const LESSON = '00000000-0000-4000-8000-0000000000d1';

describe('recordingPath', () => {
  it('is lessons/<lesson>/<UTC timestamp>.mp3, safe as an object name', () => {
    expect(recordingPath({ kind: 'lesson', id: LESSON }, new Date('2026-10-05T16:01:02.345Z'))).toBe(`lessons/${LESSON}/2026-10-05T16-01-02-345Z.mp3`);
    expect(recordingPath({ kind: 'meeting', id: LESSON }, new Date('2026-10-05T16:01:02.345Z'))).toBe(`meetings/${LESSON}/2026-10-05T16-01-02-345Z.mp3`);
  });
});

describe('egressRequest', () => {
  it('mixes the whole room into one 64 kbps MP3 to the Storage S3 endpoint (path style)', () => {
    expect(egressRequest({ room: `lesson-${LESSON}`, filepath: 'lessons/x/y.mp3', s3: S3 })).toEqual({
      room_name: `lesson-${LESSON}`,
      audio_only: true,
      advanced: { audio_bitrate: 64 },
      file_outputs: [
        {
          file_type: 'MP3',
          filepath: 'lessons/x/y.mp3',
          s3: {
            access_key: 'access',
            secret: 'secret',
            region: 'eu-central-1',
            endpoint: S3.endpoint,
            bucket: 'recordings',
            force_path_style: true,
          },
        },
      ],
    });
  });

  it('sets no layout and no custom_base_url, so egress records without headless Chrome', () => {
    const body = egressRequest({ room: 'r', filepath: 'p.mp3', s3: S3 });
    expect(body).not.toHaveProperty('layout');
    expect(body).not.toHaveProperty('custom_base_url');
  });
});

describe('egressIdOf', () => {
  it('reads snake_case and camelCase', () => {
    expect(egressIdOf({ egress_id: 'EG_1' })).toBe('EG_1');
    expect(egressIdOf({ egressId: 'EG_2' })).toBe('EG_2');
  });

  it('null when absent or empty', () => {
    expect(egressIdOf({})).toBeNull();
    expect(egressIdOf({ egress_id: '' })).toBeNull();
    expect(egressIdOf({ egress_id: 7 })).toBeNull();
  });
});
