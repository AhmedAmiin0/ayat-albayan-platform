import { describe, expect, it } from 'vitest';
import {
  mayEndForAll,
  mayMuteMic,
  mayRemove,
  mayStopCam,
  muteAllTargets,
  type HostPerson,
} from './room-host';

const person = (over: Partial<HostPerson> = {}): HostPerson => ({
  identity: 'guest-0123456789ab',
  role: 'guest',
  local: false,
  micOn: true,
  camOn: true,
  ...over,
});

describe('the host rules', () => {
  it('mutes or stops someone below, only with that device on, never oneself', () => {
    expect(mayMuteMic('teacher', person())).toBe(true);
    expect(mayMuteMic('teacher', person({ micOn: false }))).toBe(false);
    expect(mayStopCam('teacher', person({ camOn: false }))).toBe(false);
    expect(mayMuteMic('teacher', person({ role: 'admin' }))).toBe(false);
    expect(mayMuteMic('teacher', person({ local: true }))).toBe(false);
    expect(mayMuteMic('guest', person())).toBe(false);
  });

  it('removes as the web room does: not oneself, not an unknown role', () => {
    expect(mayRemove('teacher', person())).toBe(true);
    expect(mayRemove('teacher', person({ role: null }))).toBe(false);
    expect(mayRemove('teacher', person({ local: true }))).toBe(false);
    expect(mayRemove(null, person())).toBe(false);
  });

  it('«كتم الجميع» takes the guests with the microphone on; the end is the teacher’s or admin’s', () => {
    const people = [person(), person({ identity: 'g2', micOn: false }), person({ role: 'assistant' })];
    expect(muteAllTargets('teacher', people).map((p) => p.identity)).toEqual(['guest-0123456789ab']);
    expect(muteAllTargets('assistant', people)).toEqual([]);
    expect(mayEndForAll('teacher')).toBe(true);
    expect(mayEndForAll('admin')).toBe(true);
    expect(mayEndForAll('assistant')).toBe(false);
  });
});
