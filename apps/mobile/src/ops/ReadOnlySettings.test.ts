import { t } from '@/lib/i18n';
import { readOnlyNoteText } from './ReadOnlySettings';

test('the web note alone, or with a caller line folded into it', () => {
  const note = t.mobileAdmin.settings.readOnlyNote;
  expect(readOnlyNoteText()).toBe(note);
  expect(readOnlyNoteText('')).toBe(note);
  expect(readOnlyNoteText(t.communicationsHub.webOnly)).toBe(`${note} ${t.communicationsHub.webOnly}`);
});
