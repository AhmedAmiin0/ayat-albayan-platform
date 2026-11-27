import { describe, expect, it } from 'vitest';
import { recordingRow } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { toRecordingView } from '@/modules/teaching/classroom/recordings/recording.mapper';

describe('toRecordingView', () => {
  it('an unknown status reads as failed, without a link', () => {
    const view = toRecordingView(recordingRow({ status: 'weird' }), 'u');
    expect(view).toMatchObject({ status: 'failed', url: null });
  });

  it('keeps the link of a finished file and drops the storage path', () => {
    const view = toRecordingView(recordingRow({ status: 'done' }), 'u');
    expect(view.url).toBe('u');
    expect(Object.keys(view).sort()).toEqual(['ended_at', 'id', 'started_at', 'status', 'url']);
  });


  it('gives no link while recording, even when one was signed', () => {
    expect(toRecordingView(recordingRow({ status: 'recording' }), 'u').url).toBeNull();
  });
});
