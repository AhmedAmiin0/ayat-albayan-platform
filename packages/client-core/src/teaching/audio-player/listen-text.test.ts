import { describe, expect, it } from 'vitest';
import { listenText } from '.';

const words = { isNew: 'جديد', stoppedAt: 'توقفت عند {at}', heard: 'استمعت' };

describe('listenText', () => {
  it('writes each listen state', () => {
    expect(listenText({ kind: 'new' }, words)).toBe('جديد');
    expect(listenText({ kind: 'partial', at: 760 }, words, (c) => `[${c}]`)).toBe('توقفت عند [12:40]');
    expect(listenText({ kind: 'done' }, words)).toBe('استمعت');
  });
});
