import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { isLoaded } from 'expo-font';
import { Slot } from 'expo-router';
import { fireEvent, render, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { freshQueryClient } from '../../../testing/query';
import { CrashScreen } from './CrashScreen';
import { restartAfterCrash } from '../restart-after-crash';

jest.mock('expo-font', () => ({ ...jest.requireActual<object>('expo-font'), isLoaded: jest.fn() }));
jest.mock('../restart-after-crash', () => ({ restartAfterCrash: jest.fn(async () => undefined) }));

interface Lesson {
  id: string;
  student: { name: string };
}

const client = freshQueryClient();

function Layout() {
  return (
    <QueryClientProvider client={client}>
      <Slot />
    </QueryClientProvider>
  );
}

function LessonScreen() {
  const lesson = useQuery<Lesson>({ queryKey: ['lesson'], enabled: false });
  return <Text>{lesson.data?.student.name}</Text>;
}

async function openWithRestored(saved: unknown) {
  client.setQueryData(['lesson'], saved);
  const _layout = { default: Layout, ErrorBoundary: CrashScreen };
  await renderRouter({ _layout, index: LessonScreen });
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('restored data of an older shape: the crash screen, not an unmounted app', async () => {
  await openWithRestored({ id: 'l1' });
  expect(screen.getByRole('header', { name: t.crash.title })).toBeTruthy();
  expect(screen.getByText(t.crash.body)).toBeTruthy();
});

test('«إعادة المحاولة» restarts with the router retry as the fallback', async () => {
  await openWithRestored({ id: 'l1' });
  await fireEvent.press(screen.getByRole('button', { name: t.crash.retry }));
  expect(restartAfterCrash).toHaveBeenCalledTimes(1);
  expect(jest.mocked(restartAfterCrash).mock.calls[0]?.[0]).toEqual(expect.any(Function));
});

test('restored data that fits: the screen renders', async () => {
  await openWithRestored({ id: 'l1', student: { name: 'يوسف' } });
  expect(screen.getByText('يوسف')).toBeTruthy();
  expect(screen.queryByRole('header', { name: t.crash.title })).toBeNull();
});

test.each([
  { loaded: true, family: expect.any(String) },
  { loaded: false, family: undefined },
])('the Arabic font loaded: $loaded → the title font follows it', async ({ loaded, family }) => {
  jest.mocked(isLoaded).mockReturnValue(loaded);
  await render(<CrashScreen error={new Error('x')} retry={jest.fn()} />);
  expect(screen.getByRole('header', { name: t.crash.title })).toHaveStyle({ fontFamily: family });
});
