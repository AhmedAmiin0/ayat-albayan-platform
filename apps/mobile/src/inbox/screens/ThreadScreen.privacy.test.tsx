import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { readable, SHOWN } from './privacy.helpers';
import { detail, inbound, NOW, thread } from '../shared/thread-fixtures';
import { ThreadModeProvider } from '../thread/hooks/thread-mode';
import { ThreadScreen } from './ThreadScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => false, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const family = { ...thread, guardian_id: 'g-1', lead_id: null, lead_status: null, lead_source: null };

function render(teacher: boolean, name: string | null) {
  const body = detail([inbound], { thread: { ...family, display_name: name } });
  mockApiFetch.mockImplementation(async (p: string) => (p.startsWith('/threads') ? body : { open: true }));
  const mode = teacher ? ({ kind: 'teacher', teacherId: 't-abrar' } as const) : ({ kind: 'admin' } as const);
  return renderWithQuery(
    <ThreadModeProvider value={mode}>
      <ThreadScreen />
    </ThreadModeProvider>,
  );
}

beforeEach(() => {
  fakeNow(NOW);
  mockApiFetch.mockReset();
});

test('teacher: header, bubbles and composer of a named thread have no digits of the number', async () => {
  await render(true, 'أم يوسف');
  await screen.findAllByText(t.inbox.kind.guardian);
  expect(screen.getByText('أم يوسف')).toBeTruthy();
  for (const s of SHOWN) expect(readable()).not.toContain(s);
});

test('teacher: an unnamed thread is titled by who it is', async () => {
  await render(true, null);
  await screen.findAllByText(t.inbox.kind.guardian);
  for (const s of SHOWN) expect(readable()).not.toContain(s);
});

test('admin: an unnamed thread still shows the number as its title', async () => {
  await render(false, null);
  await screen.findAllByText(t.inbox.kind.guardian);
  expect(readable()).toContain('+966 55 214 7730');
});
