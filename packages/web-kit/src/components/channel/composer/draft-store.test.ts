import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftKey, readDraft, writeDraft } from './draft-store';

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('draft-store: the unsent text per chat', () => {
  it('each audience and student keeps its own draft; empty removes it', () => {
    const sales = draftKey({ audience: 'sales', studentId: 's1' });
    const teacher = draftKey({ audience: 'teacher', studentId: 's1' });
    writeDraft(sales, 'مسودة');
    expect(readDraft(sales)).toBe('مسودة');
    expect(readDraft(teacher)).toBe('');
    writeDraft(sales, '');
    expect(readDraft(sales)).toBe('');
    expect(sessionStorage.length).toBe(0);
  });

  it('blocked storage: the memory copy carries on, nothing throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    writeDraft('portal:s9', 'نص');
    expect(readDraft('portal:s9')).toBe('نص');
  });
});
