import { describe, expect, it } from 'vitest';
import { PRICES } from './fixture';
import { insertAt } from '@/features/messaging/inbox/saved-replies/components/PlaceholderChips';
import { createBody, draftOf, fileName, updateBody } from './reply-draft';

const NEW = { kind: 'new' as const, path: 'saved/u/x.png', attachment: { name: 'x.png', mime: 'image/png' as const, size: 9 } };

describe('reply-draft', () => {
  it('create sends a new file only', () => {
    expect(createBody({ title: ' أ ', body: ' ب ', file: { kind: 'none' } }, 'mine')).toEqual({ scope: 'mine', title: 'أ', body: 'ب' });
    expect(createBody({ title: 'أ', body: 'ب', file: NEW }, 'shared').attachment).toEqual({ path: 'saved/u/x.png', name: 'x.png' });
  });

  it('update leaves a kept file out, nulls a removed one, sends a new one', () => {
    const kept = draftOf(PRICES);
    expect(updateBody(kept, true)).toEqual({ title: PRICES.title, body: PRICES.body });
    expect(updateBody({ ...kept, file: { kind: 'none' } }, true).attachment).toBeNull();
    expect('attachment' in updateBody({ ...kept, file: { kind: 'none' } }, false)).toBe(false);
    expect(updateBody({ ...kept, file: NEW }, true).attachment).toEqual({ path: 'saved/u/x.png', name: 'x.png' });
  });

  it('file names lose slashes and keep their end', () => {
    expect(fileName(new File(['x'], 'a/b.pdf'))).toBe('a_b.pdf');
  });

  it('insertAt puts the token at the caret or the end', () => {
    expect(insertAt({ value: 'أهلًا  كيف', token: '{name}', at: 6 })).toEqual({ text: 'أهلًا {name} كيف', caret: 12 });
    expect(insertAt({ value: 'أ', token: '{x}', at: null }).text).toBe('أ{x}');
  });
});
