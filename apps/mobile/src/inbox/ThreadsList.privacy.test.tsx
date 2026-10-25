import type { ThreadView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { readable, SHOWN } from './screens/privacy.helpers';
import { thread } from './shared/thread-fixtures';
import { ThreadModeProvider } from './thread/hooks/thread-mode';
import { ThreadsList } from './ThreadsList';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const base: ThreadView = { ...thread, guardian_id: 'g-1', lead_id: null, lead_status: null, lead_source: null };
const named: ThreadView = { ...base, display_name: 'أم يوسف' };
const unnamed: ThreadView = { ...base, phone_e164: '+966552147731', display_name: null };

function renderAs(teacher: boolean, items: ThreadView[]) {
  mockApiFetch.mockResolvedValue({ items, total: items.length, page: 1, pageSize: 25 });
  const mode = teacher ? ({ kind: 'teacher', teacherId: 't-abrar' } as const) : ({ kind: 'admin' } as const);
  return renderWithQuery(
    <ThreadModeProvider value={mode}>
      <ThreadsList />
    </ThreadModeProvider>,
  );
}

test('teacher: a named thread shows the name, never the number', async () => {
  await renderAs(true, [named]);
  await screen.findByText('أم يوسف');
  for (const s of SHOWN) expect(readable()).not.toContain(s);
});

test('teacher: an unnamed thread says who it is, never the number', async () => {
  await renderAs(true, [unnamed]);
  await screen.findAllByText(t.inbox.kind.guardian);
  for (const s of [...SHOWN, '7731']) expect(readable()).not.toContain(s);
});

test('admin: the number stays beside the name and instead of a missing one', async () => {
  await renderAs(false, [named, unnamed]);
  await screen.findByText('أم يوسف');
  expect(readable()).toContain('+966 55 214 7730');
  expect(readable()).toContain('+966 55 214 7731');
});
