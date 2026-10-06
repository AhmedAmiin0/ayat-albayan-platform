import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { lesson } from '@/today/fixtures';
import { SessionActions } from './SessionActions';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));
function show(permissions: string[], group: 'now' | 'ended', id: string) {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { permissions }); // the role is known before the card paints
  return renderWithQuery(<SessionActions lesson={lesson({ id })} group={group} />, client);
}
const links = () => screen.queryAllByRole('button', { name: t.classroom.sendLink });
const copy = () => screen.queryAllByRole('button', { name: t.classroom.copyLink });

test('an ended session offers neither send nor copy, only the recordings', async () => {
  mockApiFetch.mockResolvedValue({ permissions: ['classroom.links', 'classroom.host'] });
  await show(['classroom.links', 'classroom.host'], 'ended', 'old');
  expect(links()).toHaveLength(0);
  expect(copy()).toHaveLength(0);
  expect(screen.getByRole('button', { name: t.classroom.recordings.title })).toBeTruthy();
});

test('send needs classroom.links and copy needs classroom.host', async () => {
  mockApiFetch.mockResolvedValue({ permissions: ['classroom.host'] });
  await show(['classroom.host'], 'now', 'now');
  expect(await screen.findAllByRole('button', { name: t.classroom.copyLink })).toHaveLength(1);
  expect(links()).toHaveLength(0);
});

test('with classroom.links only, the copy button is hidden', async () => {
  mockApiFetch.mockResolvedValue({ permissions: ['classroom.links'] });
  await show(['classroom.links'], 'now', 'now');
  expect(await screen.findAllByRole('button', { name: t.classroom.sendLink })).toHaveLength(1);
  expect(copy()).toHaveLength(0);
});
