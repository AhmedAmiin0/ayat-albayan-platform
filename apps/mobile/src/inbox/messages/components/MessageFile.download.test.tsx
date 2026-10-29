import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageFile } from './MessageFile';
import { message, PHONE } from '../../shared/thread-fixtures';
import { ThreadModeProvider } from '../../thread/hooks/thread-mode';

// «تنزيل» on the file chip (owner 2026-10-26).
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const pdf = message({ id: 'f1', direction: 'inbound', body: null, media_mime: 'application/pdf', media_name: 'خطة الحفظ.pdf' });
const name = t.inbox.download.label.replace('{name}', 'خطة الحفظ.pdf');
const openURL = jest.spyOn(Linking, 'openURL');

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue({ url: 'https://storage.test/f1.pdf?download=x', mime: 'application/pdf', expires_at: '' });
  openURL.mockReset().mockResolvedValue(true);
});

test('the PDF card’s «تنزيل»: a family’s PDF signs nothing on render (not even page 1), then it asks ?download=1 and opens it', async () => {
  await renderWithQuery(<MessageFile message={pdf} phone={PHONE} />);
  expect(screen.getByText(t.inbox.pdf.tapToPreview)).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name }));
  expect(mockApiFetch).toHaveBeenCalledWith('/threads/%2B966552147730/messages/f1/file?download=1');
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://storage.test/f1.pdf?download=x'));
});

test('a teacher: today’s «غير مسموح» label and no «تنزيل»', async () => {
  await renderWithQuery(
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't1' }}>
      <MessageFile message={pdf} phone={PHONE} />
    </ThreadModeProvider>,
  );
  expect(screen.queryByRole('button', { name })).toBeNull();
  expect(screen.getByText(`${t.inbox.media.document} · ${t.inbox.mediaNotAllowed}`)).toBeTruthy();
});
