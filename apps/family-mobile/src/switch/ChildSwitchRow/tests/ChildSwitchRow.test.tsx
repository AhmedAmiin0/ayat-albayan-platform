import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import type { PortalKind } from '@ab/shared';
import { lesson, student } from '@/portal/portal.fixtures';
import { ChildSwitchRow } from '@/switch/ChildSwitchRow';

const mockAnswers: Record<string, unknown> = {};
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? ''] ?? {}),
}));

const kid = student({ id: 's1', name: 'سارة أحمد' });
const onPress = jest.fn();
const sent = { lesson_id: 'l1', lesson_starts_at: null, teacher: null, recording_id: null };
const P = t.portal.app.pick;
const show = (kind: PortalKind, current: boolean, who = kid) =>
  renderWithQuery(
    <ChildSwitchRow student={who} kind={kind} current={current} onPress={onPress} />,
    freshQueryClient(),
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockAnswers['/portal/students/s1/lessons'] = { lessons: [] };
  mockAnswers['/portal/students/s1/reports'] = { reports: [] };
});

test('the child in view: the name, the code, selected, and a press picks it', async () => {
  await show('guardian', true);
  const row = screen.getByRole('button', { selected: true });
  expect(row).toHaveTextContent(/سارة أحمد/);
  expect(row).toHaveTextContent(new RegExp(kid.code));
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('a coming lesson adds the next line; an unseen report adds the new mark', async () => {
  mockAnswers['/portal/students/s1/lessons'] = { lessons: [lesson(new Date(), 60 * 26)] };
  mockAnswers['/portal/students/s1/reports'] = {
    reports: [{ ...sent, id: 'r-new', sent_at: new Date().toISOString() }],
  };
  await show('guardian', false);
  expect(await screen.findByText(t.portal.newReport)).toBeTruthy();
  const prefix = P.next.split('{when}')[0] ?? '';
  await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent(new RegExp(prefix)));
  expect(screen.getByRole('button', { selected: false })).toBeTruthy();
});

test('a guardian who studies too reads «me», not their own name', async () => {
  await show('guardian', false, student({ id: 's1', name: 'خالد', contact_is_self: true }));
  expect(screen.getByText(P.me)).toBeTruthy();
  expect(screen.queryByText('خالد')).toBeNull();
});
