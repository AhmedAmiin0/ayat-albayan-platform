import { describe, expect, it } from 'vitest';
import { listenState, parseResume, resumeAt, withPosition } from '.';

describe('withPosition', () => {
  it('keeps a stop in the middle', () => {
    const map = withPosition({}, { id: 'R', position: 760, duration: 2720 });
    expect(listenState(map, 'R')).toEqual({ kind: 'partial', at: 760 });
    expect(resumeAt(map, 'R')).toBe(760);
  });

  it('counts the last seconds as heard in full, and starts it over', () => {
    const map = withPosition({}, { id: 'R', position: 2718, duration: 2720 });
    expect(listenState(map, 'R')).toEqual({ kind: 'done' });
    expect(resumeAt(map, 'R')).toBe(0);
  });

  it('ignores a stop in the first seconds; an unknown id is new', () => {
    expect(withPosition({}, { id: 'R', position: 3, duration: 2720 })).toEqual({});
    expect(listenState({}, 'X')).toEqual({ kind: 'new' });
  });
});

describe('parseResume', () => {
  it('reads a saved map and treats broken text as none', () => {
    expect(parseResume('{"R":{"at":5,"done":false}}')).toEqual({ R: { at: 5, done: false } });
    expect(parseResume('{oops')).toEqual({});
    expect(parseResume('{"R":1}')).toEqual({});
    expect(parseResume(null)).toEqual({});
  });
});
