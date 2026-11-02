import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SearchableBody } from './SearchableBody';
import { ChatSearchContext, type ChatSearchValue } from './search-context';

const withQ = (q: string) =>
  ({ q, state: { open: true, text: q, index: 0 } }) as Partial<ChatSearchValue> as ChatSearchValue;

it('outside a search: the text and its links as written, nothing marked', () => {
  render(<SearchableBody text="مدرسة https://x.test" />);
  expect(document.querySelector('mark')).toBeNull();
  expect(screen.getByRole('link').textContent).toBe('https://x.test');
});

it('while searching: the folded words marked, tashkeel kept, links still links', () => {
  render(
    <ChatSearchContext value={withQ('مدرسه')}>
      <SearchableBody text="المَدْرَسَة قريبة https://madrasa.test/مدرسة" />
    </ChatSearchContext>,
  );
  const marks = [...document.querySelectorAll('mark')].map((m) => m.textContent);
  expect(marks).toEqual(['مَدْرَسَة', 'مدرسة']);
  expect(screen.getByRole('link').querySelector('mark')).toBeTruthy();
});
