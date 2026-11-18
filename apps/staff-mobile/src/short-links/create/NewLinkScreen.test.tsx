import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { detail, people } from '@/short-links/testing/link-fixtures';
import { NewLinkScreen } from './NewLinkScreen';

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

const F = t.shortLinks.form;
const created = { ...detail(), send: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue(people);
  mockApiSend.mockResolvedValue(created);
});

async function fillBasics() {
  await fireEvent.changeText(screen.getByLabelText(F.titleLabel), 'لقاء أولياء الأمور');
  await fireEvent.changeText(screen.getByLabelText(F.target), 'https://meet.google.com/xpr-hmkd');
}

test('nothing typed: each field says what is wrong, no request', async () => {
  await renderWithQuery(<NewLinkScreen base="/more/short-links" />);
  await fireEvent.press(screen.getByRole('button', { name: F.create }));
  expect(screen.getByText(F.errors.title_invalid)).toBeTruthy();
  expect(screen.getByText(F.errors.target_invalid)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('open to anyone for the default 7 days: POST /short-links, then the link page', async () => {
  await renderWithQuery(<NewLinkScreen base="/more/short-links" />);
  await fillBasics();
  await fireEvent.changeText(screen.getByLabelText(F.maxUsers), '12');
  await fireEvent.press(screen.getByRole('button', { name: F.create }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/more/short-links/K7q2M9xT'));
  const [method, path, body] = mockApiSend.mock.calls[0] ?? [];
  expect([method, path]).toEqual(['POST', '/short-links']);
  expect(body).toMatchObject({
    title: 'لقاء أولياء الأمور',
    targetUrl: 'https://meet.google.com/xpr-hmkd',
    maxUsers: 12,
    audience: 'anyone',
    profileIds: [],
    phones: [],
    sendWhatsapp: false,
  });
  const days = (Date.parse(String(body.expiresAt)) - Date.now()) / 86_400_000;
  expect(Math.round(days)).toBe(7);
});

test('a host off the allow-list comes back as target_not_allowed on the link field', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'target_not_allowed' }));
  await renderWithQuery(<NewLinkScreen base="/sales/more/short-links" />);
  await fillBasics();
  await fireEvent.press(screen.getByRole('button', { name: F.create }));
  expect(await screen.findByText(F.errors.target_not_allowed)).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
});

test('listed people and a number, sent by WhatsApp: the picks go in the body', async () => {
  await renderWithQuery(<NewLinkScreen base="/sales/more/short-links" />);
  await fillBasics();
  await fireEvent.press(screen.getByRole('radio', { name: t.shortLinks.audience.listed }));
  await fireEvent.press(screen.getByRole('button', { name: F.addPeople }));
  await fireEvent.changeText(screen.getByLabelText(t.shortLinks.people.search), 'أحمد');
  await fireEvent.press(await screen.findByRole('checkbox', { name: 'أحمد علي' }));
  await fireEvent.changeText(
    screen.getByLabelText(t.shortLinks.people.notOnPlatform),
    '0551234567',
  );
  await fireEvent.press(screen.getByRole('button', { name: F.add }));
  const done = t.shortLinks.people.done.replace('{n}', '2');
  await fireEvent.press(screen.getByRole('button', { name: done }));
  expect(screen.getByText(`أحمد علي ${F.andPhone}`)).toBeTruthy();
  await fireEvent(screen.getByRole('switch', { name: F.sendWhatsapp }), 'valueChange', true);
  await fireEvent.press(screen.getByRole('button', { name: F.createAndSend }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(mockApiSend.mock.calls[0]?.[2]).toMatchObject({
    audience: 'listed',
    profileIds: [people[0]?.id],
    phones: ['+966551234567'],
    sendWhatsapp: true,
  });
});
