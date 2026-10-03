import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { classroomErrorKey, classroomErrorText, mediaErrorText, opensAtOf } from './errors';

const named = (name: string) => Object.assign(new Error(name), { name });

describe('classroom error mapping', () => {
  it.each(['join_closed', 'link_expired', 'template_not_approved', 'forbidden', 'too_many_requests'])('%s has its own line', (code) => {
    expect(classroomErrorKey(code)).toBe(code);
    expect(classroomErrorText(new ApiError(400, { code }))).toBe(t.classroom.error[code as keyof typeof t.classroom.error]);
  });

  it('anything else reads «حصلت مشكلة»', () => {
    expect(classroomErrorKey('nope')).toBe('unknown');
    expect(classroomErrorKey(null)).toBe('unknown');
    expect(classroomErrorText(new Error('x'))).toBe(t.classroom.error.unknown);
    expect(classroomErrorText(new ApiError(500, null))).toBe(t.classroom.error.unknown);
  });

  it('words a denied or missing device, per device', () => {
    expect(mediaErrorText('mic', named('NotAllowedError'))).toBe(t.classroom.error.mic_denied);
    expect(mediaErrorText('cam', named('NotAllowedError'))).toBe(t.classroom.error.cam_denied);
    expect(mediaErrorText('cam', named('NotFoundError'))).toBe(t.classroom.error.device_missing);
    expect(mediaErrorText('share', named('NotAllowedError'))).toBe(t.classroom.error.share_failed);
    expect(mediaErrorText('mic', 'weird')).toBe(t.classroom.error.device_missing);
  });

  it('reads opens_at off a 403 body', () => {
    expect(opensAtOf(new ApiError(403, { code: 'join_not_open_yet', opens_at: '2026-10-03T15:45:00.000Z' }))).toBe('2026-10-03T15:45:00.000Z');
    expect(opensAtOf(new ApiError(403, null))).toBeNull();
  });
});
