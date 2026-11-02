import { describe, expect, it } from 'vitest';
import {
  durationSeconds,
  mediaOfPath,
  recordingVisibilitySchema,
  studentRecordingsQuerySchema,
} from './student-recordings.js';

describe('studentRecordingsQuerySchema', () => {
  it('defaults to page 1 of 10 and accepts the filters', () => {
    expect(studentRecordingsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 10 });
    const q = { from: '2026-10-01', to: '2026-10-31', teacherId: '00000000-0000-4000-8000-0000000000b1', page: '2' };
    expect(studentRecordingsQuerySchema.parse(q)).toMatchObject({ page: 2, from: '2026-10-01' });
  });

  it('rejects a bad day, a bad teacher id and a page size over 100', () => {
    expect(studentRecordingsQuerySchema.safeParse({ from: '1/10/2026' }).success).toBe(false);
    expect(studentRecordingsQuerySchema.safeParse({ teacherId: 'x' }).success).toBe(false);
    expect(studentRecordingsQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
});

describe('recordingVisibilitySchema', () => {
  it('needs a boolean', () => {
    expect(recordingVisibilitySchema.safeParse({ visible: true }).success).toBe(true);
    expect(recordingVisibilitySchema.safeParse({ visible: 'yes' }).success).toBe(false);
    expect(recordingVisibilitySchema.safeParse({}).success).toBe(false);
  });
});

describe('mediaOfPath / durationSeconds', () => {
  it('MP4 (rows before audio-only) is video, a sound file (the egress MP3) is audio', () => {
    expect(mediaOfPath('lessons/a/2026.mp4')).toBe('video');
    expect(mediaOfPath('lessons/a/2026-10-06T16-00-00-000Z.mp3')).toBe('audio');
    expect(mediaOfPath('meetings/m/2026.mp3')).toBe('audio');
    expect(mediaOfPath('lessons/a/2026.M4A')).toBe('audio');
  });

  it('the duration is the whole seconds between start and end, null while running', () => {
    expect(durationSeconds('2026-10-05T16:00:00.000Z', '2026-10-05T17:00:30.400Z')).toBe(3630);
    expect(durationSeconds('2026-10-05T16:00:00.000Z', null)).toBeNull();
    expect(durationSeconds('2026-10-05T17:00:00.000Z', '2026-10-05T16:00:00.000Z')).toBeNull();
  });
});
