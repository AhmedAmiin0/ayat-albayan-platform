import ar from '@ab/shared/i18n/ar.json';
import { resendText } from './resend-side.helpers';

// Arabic UI (jest.setup: RTL): the Arabic text sits at the start ('left', which RN swaps to the right).
test('Arabic: the exact Arabic text, at the start', async () => {
  expect(await resendText()).toEqual({ align: 'left', text: ar.inbox.resend.text });
});
