import { describe, expect, it } from 'vitest';
import { RECORDING_TONE, recordingTime } from './recording-format';

describe('recording format', () => {
  it('shows the start in the viewer’s zone, 24 h, Western digits', () => {
    const iso = '2026-10-03T15:05:00Z';
    expect(recordingTime(iso, 'Asia/Riyadh')).toContain('18:05');
    expect(recordingTime(iso, 'America/New_York')).toContain('11:05');
    expect(recordingTime(iso, 'Asia/Riyadh')).toMatch(/3/);
  });

  it('maps each status to a tone', () => {
    expect(RECORDING_TONE).toEqual({ recording: 'act', done: 'ok', failed: 'bad' });
  });
});
