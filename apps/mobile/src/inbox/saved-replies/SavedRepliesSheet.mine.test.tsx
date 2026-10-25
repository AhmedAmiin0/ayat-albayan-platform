import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { pickChatFile } from '../send-file';
import { MINE, REPLIES } from './fixtures';
import { SavedRepliesSheet } from './SavedRepliesSheet';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
const mockUpload = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('@/core/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: mockUpload }) } } }));
jest.mock('../send-file', () => ({ ...jest.requireActual('../send-file'), pickChatFile: jest.fn() }));

const onPick = jest.fn();
async function openMine() {
  await renderWithQuery(<SavedRepliesSheet initialQuery="" onClose={jest.fn()} onPick={onPick} />);
  await screen.findByRole('button', { name: 'ترحيب' });
  await fireEvent.press(screen.getByRole('tab', { name: t.savedReplies.tabMine }));
}
const field = (label: string) => screen.getByLabelText(label);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(REPLIES);
  mockApiSend.mockResolvedValue(MINE);
  mockUpload.mockResolvedValue({ data: {}, error: null });
});

test('«رد جديد»: title, text with a placeholder pill, saved as her own reply', async () => {
  await openMine();
  await fireEvent.press(screen.getByRole('button', { name: t.savedReplies.add }));
  await fireEvent.changeText(field(t.savedReplies.fieldTitle), ' متابعة الدفع ');
  await fireEvent.changeText(field(t.savedReplies.fieldBody), 'أهلًا ');
  await fireEvent.press(screen.getByRole('button', { name: t.savedReplies.placeholders.name }));
  expect(field(t.savedReplies.fieldBody).props.value).toBe('أهلًا {name}');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/saved-replies', { scope: 'mine', title: 'متابعة الدفع', body: 'أهلًا {name}', attachment: null });
  expect(await screen.findByRole('button', { name: 'متابعة' })).toBeTruthy();
  expect(onPick).not.toHaveBeenCalled();
});

test('edit keeps the file untouched unless it changed; a new file is uploaded first', async () => {
  jest.mocked(pickChatFile).mockResolvedValue({ mime: 'application/pdf', bytes: new ArrayBuffer(3), size: 3, filename: 'جدول.pdf' });
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/saved-replies/attachment-upload-url' ? { bucket: 'wa-media', path: 'saved/s1/x.pdf', token: 'tok', signed_url: 'u' } : MINE,
  );
  await openMine();
  await fireEvent.press(screen.getByRole('button', { name: t.savedReplies.editReply.replace('{title}', MINE.title) }));
  await fireEvent.changeText(field(t.savedReplies.fieldTitle), 'متابعة ٢');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attachPdf }));
  await screen.findByTestId('saved-reply-chip');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenLastCalledWith('PATCH', `/saved-replies/${MINE.id}`, {
    title: 'متابعة ٢', body: MINE.body, attachment: { path: 'saved/s1/x.pdf', name: 'جدول.pdf' },
  }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/saved-replies/attachment-upload-url', { mime: 'application/pdf', size: 3 });
});

test('delete asks first, then removes her reply', async () => {
  mockApiSend.mockResolvedValue(undefined);
  await openMine();
  await fireEvent.press(screen.getByRole('button', { name: t.savedReplies.deleteReply.replace('{title}', MINE.title) }));
  await fireEvent.press(screen.getByRole('button', { name: t.savedReplies.deleteYes }));
  expect(mockApiSend).toHaveBeenCalledWith('DELETE', `/saved-replies/${MINE.id}`);
});

test('the shared tab has no edit or delete', async () => {
  await renderWithQuery(<SavedRepliesSheet initialQuery="" onClose={jest.fn()} onPick={onPick} />);
  await screen.findByRole('button', { name: 'ترحيب' });
  expect(screen.queryByRole('button', { name: t.savedReplies.add })).toBeNull();
  expect(screen.queryByRole('button', { name: t.savedReplies.deleteReply.replace('{title}', 'ترحيب') })).toBeNull();
});

test('«حفظ» waits while the file is uploading (the reply is never saved without it)', async () => {
  let finish: (v: unknown) => void = () => undefined;
  jest.mocked(pickChatFile).mockResolvedValue({ mime: 'application/pdf', bytes: new ArrayBuffer(3), size: 3, filename: 'جدول.pdf' });
  mockApiSend.mockImplementation((_m: string, path: string) =>
    path === '/saved-replies/attachment-upload-url' ? new Promise((resolve) => (finish = resolve)) : Promise.resolve(MINE),
  );
  await openMine();
  await fireEvent.press(screen.getByRole('button', { name: t.savedReplies.editReply.replace('{title}', MINE.title) }));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attachPdf }));
  await screen.findByText(t.savedReplies.attachUploading);
  expect(screen.getByRole('button', { name: t.common.save }).props.accessibilityState).toMatchObject({ disabled: true });
  finish({ bucket: 'wa-media', path: 'saved/s1/x.pdf', token: 'tok', signed_url: 'u' });
  await screen.findByTestId('saved-reply-chip');
  expect(screen.getByRole('button', { name: t.common.save }).props.accessibilityState).toMatchObject({ disabled: false });
});
