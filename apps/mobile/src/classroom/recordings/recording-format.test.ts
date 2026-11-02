import { RECORDING_CHIP, recordingsPath, recordingTime } from './recording-format';

test('the start is date + 24 h time on the Riyadh clock, Western digits', () => {
  expect(recordingTime('2026-10-01T13:05:00.000Z', '24', 'Asia/Riyadh')).toMatch(/16:05/);
  expect(recordingTime('2026-10-01T13:05:00.000Z', '24', 'UTC')).toMatch(/13:05/);
  expect(recordingTime('2026-10-01T13:05:00.000Z', '24', 'Asia/Riyadh')).not.toMatch(/[٠-٩]/);
});

test('each status has its own tone: under way act, ready ok, failed bad', () => {
  expect(RECORDING_CHIP.recording.tone).toBe('act');
  expect(RECORDING_CHIP.done.tone).toBe('ok');
  expect(RECORDING_CHIP.failed.tone).toBe('bad');
});

test('the path follows the source kind', () => {
  expect(recordingsPath({ kind: 'lesson', id: 'x' })).toBe('/lessons/x/recordings');
  expect(recordingsPath({ kind: 'meeting', id: 'y' })).toBe('/meetings/y/recordings');
});
