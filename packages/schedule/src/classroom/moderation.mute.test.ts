import { describe, expect, it } from 'vitest';
import { canMute, canMuteAll } from './moderation.js';
import { muteSchema } from './schemas.js';

describe('canMute / canMuteAll', () => {
  it('staff mute anyone of lower rank: admin > teacher > assistant > sales > guest', () => {
    expect(canMute('admin', 'teacher')).toBe(true);
    expect(canMute('admin', 'admin')).toBe(false);
    expect(canMute('teacher', 'assistant')).toBe(true);
    expect(canMute('teacher', 'guest')).toBe(true);
    expect(canMute('teacher', 'teacher')).toBe(false);
    expect(canMute('teacher', 'admin')).toBe(false);
    expect(canMute('assistant', 'guest')).toBe(true);
    expect(canMute('assistant', 'sales')).toBe(true);
    expect(canMute('assistant', 'teacher')).toBe(false);
    expect(canMute('assistant', 'assistant')).toBe(false);
  });

  it('sales, guests and unknown roles mute nobody', () => {
    expect(canMute('sales', 'guest')).toBe(false);
    expect(canMute('guest', 'guest')).toBe(false);
    expect(canMute(null, 'guest')).toBe(false);
    expect(canMute('admin', null)).toBe(false);
  });

  it('«كتم الجميع» is the teacher’s and the admin’s; the body names a source', () => {
    expect([canMuteAll('teacher'), canMuteAll('admin'), canMuteAll('assistant'), canMuteAll(null)]).toEqual([true, true, false, false]);
    expect(muteSchema.safeParse({ source: 'microphone' }).success).toBe(true);
    expect(muteSchema.safeParse({ source: 'camera' }).success).toBe(true);
    expect(muteSchema.safeParse({ source: 'screen' }).success).toBe(false);
    expect(muteSchema.safeParse({}).success).toBe(false);
  });
});
