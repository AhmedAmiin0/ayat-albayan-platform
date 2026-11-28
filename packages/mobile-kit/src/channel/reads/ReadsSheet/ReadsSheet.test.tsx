import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { ReadsSheet } from './ReadsSheet';

const mockApiFetch = jest.fn();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const r = t.studentChannel.reads;
const refs = { audience: 'teacher', studentId: 's1' } as const;
const sheet = (messageId: string | null, onClose = jest.fn()) =>
  renderWithQuery(
    <ReadsSheet refs={refs} messageId={messageId} onClose={onClose} />,
    freshQueryClient(),
  );

test('lists who read the message with their role, then who has not', async () => {
  mockApiFetch.mockResolvedValue({
    read: [{ name: 'Abrar', role: 'teacher', at: new Date().toISOString() }],
    unread: [{ name: 'Mona', role: 'guardian' }],
  });
  await sheet('m1');
  expect(await screen.findByText(`Abrar · ${t.studentChannel.roles.teacher}`)).toBeTruthy();
  expect(screen.getByText(`Mona · ${t.studentChannel.roles.guardian}`)).toBeTruthy();
  expect(screen.getByRole('header', { name: r.read })).toBeTruthy();
  expect(screen.getByRole('header', { name: r.unread })).toBeTruthy();
});

test('a failed read shows an alert', async () => {
  mockApiFetch.mockRejectedValue(new Error('down'));
  await sheet('m1');
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText(r.failed)).toBeTruthy();
});

test('no message: nothing is read and no list shows', async () => {
  mockApiFetch.mockClear();
  await sheet(null);
  expect(mockApiFetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('header', { name: r.read })).toBeNull();
});

test('while reading, a spinner; the close button closes the sheet', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  const onClose = jest.fn();
  await sheet('m1', onClose);
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
