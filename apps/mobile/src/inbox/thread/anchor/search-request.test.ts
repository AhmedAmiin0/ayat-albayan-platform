import { getComposerText, setComposerText } from '@/inbox/composer/draft-store';
import { clearChatMemory, requestSearch, takeSearchRequest } from './search-request';

// docs/37 NEW 2: «بحث في الرسائل» on the student's details asks the chat under it, once.

const PHONE = '+966500000123';

test('one-shot per phone: taken once, then forgotten; another chat is not asked', () => {
  requestSearch(PHONE);
  expect(takeSearchRequest('+966500000999')).toBe(false);
  expect(takeSearchRequest(PHONE)).toBe(true);
  expect(takeSearchRequest(PHONE)).toBe(false);
});

test('a sign-out forgets a pending ask together with the drafts', () => {
  requestSearch(PHONE);
  setComposerText(PHONE, 'مسوّدة');
  clearChatMemory();
  expect(takeSearchRequest(PHONE)).toBe(false);
  expect(getComposerText(PHONE)).toBe('');
});
