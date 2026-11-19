import { afterEach, describe, expect, it } from 'vitest';
import { jumpToMessage, rowIn } from './jump';

// Two mounted copies of the same chat (the child page and the room's panel), each with a quote.
function twoThreads() {
  document.body.innerHTML = ['one', 'two']
    .map(
      (copy) =>
        `<ol data-channel-thread="" data-copy="${copy}">` +
        '<li data-channel-msg="a1">original</li>' +
        `<li data-channel-msg="c3"><button id="quote-${copy}">quote</button></li></ol>`,
    )
    .join('');
  const quote = (copy: string) => document.getElementById(`quote-${copy}`) as HTMLElement;
  return { one: quote('one'), two: quote('two') };
}

afterEach(() => (document.body.innerHTML = ''));

describe('jumpToMessage', () => {
  it('finds the original inside the quote’s own thread only', () => {
    const { one, two } = twoThreads();
    expect(rowIn(two, 'a1')?.closest('ol')?.dataset.copy).toBe('two');
    jumpToMessage(two, 'a1');
    expect(rowIn(two, 'a1')?.hasAttribute('data-flash')).toBe(true);
    expect(rowIn(one, 'a1')?.hasAttribute('data-flash')).toBe(false);
  });

  it('does nothing for an original that is not loaded', () => {
    const { one } = twoThreads();
    expect(rowIn(one, 'gone')).toBeNull();
    expect(() => jumpToMessage(one, 'gone')).not.toThrow();
  });
});
