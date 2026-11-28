import { screen } from '@testing-library/react-native';
import { t, pathKey } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { SessionActions } from './SessionActions';
import { mockCall } from '@ab/testing/mock-call';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
function show(permissions: string[], group: 'now' | 'ended', id: string) {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { permissions }); // the role is known before the card paints
  return renderWithQuery(<SessionActions lesson={lesson({ id })} group={group} />, client);
}
const links = () => screen.queryAllByRole('button', { name: t.classroom.sendLink });
const copy = () => screen.queryAllByRole('button', { name: t.classroom.copyLink });

test('an ended session offers neither send nor copy, only the recordings', async () => {
  mockApi.onRead(() => ({ permissions: ['classroom.links', 'classroom.host'] }));
  await show(['classroom.links', 'classroom.host'], 'ended', 'old');
  expect(links()).toHaveLength(0);
  expect(copy()).toHaveLength(0);
  expect(screen.getByRole('button', { name: t.classroom.recordings.title })).toBeTruthy();
});

test('send needs classroom.links and copy needs classroom.host', async () => {
  mockApi.onRead(() => ({ permissions: ['classroom.host'] }));
  await show(['classroom.host'], 'now', 'now');
  expect(await screen.findAllByRole('button', { name: t.classroom.copyLink })).toHaveLength(1);
  expect(links()).toHaveLength(0);
});

test('with classroom.links only, the copy button is hidden', async () => {
  mockApi.onRead(() => ({ permissions: ['classroom.links'] }));
  await show(['classroom.links'], 'now', 'now');
  expect(await screen.findAllByRole('button', { name: t.classroom.sendLink })).toHaveLength(1);
  expect(copy()).toHaveLength(0);
});
