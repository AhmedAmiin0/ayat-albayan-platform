import { qrMatrix, qrPath } from '@ab/client-core';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { detail } from '@/short-links/testing/link-fixtures';
import { LinkDetailScreen } from './LinkDetailScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (mockMethod: string, mockPath: string, mockBody?: unknown) =>
    mockApiSend(mockMethod, mockPath, mockBody),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canDismiss: () => true },
}));

const D = t.shortLinks.detail;
const link = detail();
const render = () => renderWithQuery(<LinkDetailScreen code="K7q2M9xT" base="/more/short-links" />);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(link);
});

test('the page: QR of the short URL, use, the users with their sends, the visitors', async () => {
  await render();
  expect(await screen.findByText(link.title)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/short-links/K7q2M9xT');
  const qr = screen.getByTestId('link-qr');
  expect(qr.props.accessibilityLabel).toBe(D.qr);
  expect(screen.getByTestId('link-qr-path').props.d).toBe(qrPath(qrMatrix(link.shortUrl)));
  expect(screen.getByText(/app\.ayatalbayan\.com\/l\/K7q2M9xT/)).toBeTruthy();
  expect(screen.getByText(D.sendErrors.template_not_approved)).toBeTruthy();
  expect(screen.getByText(t.shortLinks.form.unregistered)).toBeTruthy();
  expect(screen.getByText(D.notOpenedYet)).toBeTruthy();
  expect(screen.getAllByText(t.activity.roles.guardian)).toHaveLength(2);
  expect(screen.getByText(new RegExp(D.via.account))).toBeTruthy();
});

test('resend: POST …/resend and the counts it answers', async () => {
  mockApiSend.mockResolvedValue({ ...link, send: { queued: 1, failed: 1 } });
  await render();
  await fireEvent.press(
    await screen.findByRole('button', { name: D.resendFailed.replace('{n}', '1') }),
  );
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/short-links/K7q2M9xT/resend', undefined),
  );
  const said = D.sendResult.replace('{queued}', '1').replace('{failed}', '1');
  expect(await screen.findByText(said)).toBeTruthy();
});

test('revoke asks first, then POST …/revoke; a revoked link offers no action', async () => {
  mockApiSend.mockResolvedValue({ ...link, status: 'revoked' });
  await render();
  await fireEvent.press(await screen.findByRole('button', { name: D.revoke }));
  expect(mockApiSend).not.toHaveBeenCalled();
  mockApiFetch.mockResolvedValue({ ...link, status: 'revoked' });
  await fireEvent.press(screen.getByRole('button', { name: D.revokeConfirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/short-links/K7q2M9xT/revoke', undefined),
  );
  expect(await screen.findByText(D.revoked)).toBeTruthy();
  expect(screen.queryByRole('button', { name: D.revoke })).toBeNull();
});

test('edit: PATCH the title, the limit and a new lifetime', async () => {
  mockApiSend.mockResolvedValue(link);
  await render();
  await fireEvent.press(await screen.findByRole('button', { name: t.common.edit }));
  await fireEvent.changeText(screen.getByDisplayValue(link.title), 'لقاء جديد');
  await fireEvent.changeText(screen.getByDisplayValue('5'), '');
  await fireEvent.press(
    screen.getByRole('radio', { name: t.shortLinks.form.days.few.replace('{n}', '3') }),
  );
  await fireEvent.press(screen.getByRole('button', { name: D.save }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  const [method, path, body] = mockApiSend.mock.calls[0] ?? [];
  expect([method, path]).toEqual(['PATCH', '/short-links/K7q2M9xT']);
  expect(body).toMatchObject({ title: 'لقاء جديد', maxUsers: null });
  expect(typeof body.expiresAt).toBe('string');
  await waitFor(() => expect(screen.queryByTestId('edit-sheet')).toBeNull());
});

test('a link that is gone says so', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(404, { code: 'short_link_not_found' }));
  await render();
  expect(await screen.findByText(D.errors.not_found)).toBeTruthy();
});
