import { describe, expect, it } from 'vitest';
import { seqChunks, seqMap } from '@/modules/teaching/lessons/lesson-seq';

describe('seqChunks', () => {
  it('no ids: no chunk', () => {
    expect(seqChunks([])).toEqual([]);
  });

  it('250 ids: chunks of 100, 100 and 50 in order', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `l${i}`);
    const chunks = seqChunks(ids);
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
    expect(chunks.flat()).toEqual(ids);
  });
});

describe('seqMap', () => {
  it('keys each number by lesson and student', () => {
    const map = seqMap([{ lesson_id: 'l1', student_id: 's1', seq: 3 }]);
    expect(map.get('l1:s1')).toBe(3);
  });

  it('keeps a zero number and leaves out rows with a missing part', () => {
    const map = seqMap([
      { lesson_id: 'l1', student_id: 's1', seq: 0 },
      { lesson_id: null, student_id: 's1', seq: 1 },
      { lesson_id: 'l2', student_id: null, seq: 1 },
      { lesson_id: 'l3', student_id: 's3', seq: null },
    ]);
    expect([...map]).toEqual([['l1:s1', 0]]);
  });
});
