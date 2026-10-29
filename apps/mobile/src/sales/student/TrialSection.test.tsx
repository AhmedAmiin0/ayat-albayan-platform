import type { TrialOutcome } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { details, trialLesson } from './fixtures';
import { TrialSection } from './TrialSection';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const STUDENT = { ...details().student, status: 'trial' as const };
const AGAIN = t.sales.student.trial.again.replace('{name}', STUDENT.name);
// Newest first: the latest outcome decides, an older miss does not.
const trials = (...outcomes: TrialOutcome[]) => outcomes.map((outcome, i) => ({ ...trialLesson, lesson_id: `tr${i}`, outcome }));

function show(outcomes: TrialOutcome[], over: { student?: typeof STUDENT | null; permissions?: string[] } = {}) {
  const permissions = over.permissions ?? ['self.sales', 'self.sales_money'];
  // /auth/me answered before the render, so a hidden action is hidden for its reason, not still loading.
  const client = createTestQueryClient({ meFromApi: true });
  client.setQueryDefaults(pathKey('/auth/me'), { staleTime: Infinity });
  client.setQueryData(pathKey('/auth/me'), { role: 'sales', permissions });
  const student = over.student === undefined ? STUDENT : over.student;
  return renderWithQuery(<TreeBaseProvider value="/sales"><TrialSection trial={trials(...outcomes)} student={student} /></TreeBaseProvider>, client);
}

beforeEach(() => {
  jest.mocked(router.push).mockClear();
});

test.each<TrialOutcome>(['absent', 'cancelled'])('latest trial %s: «موعد تجريبي جديد» opens the trial-date screen for the student', async (outcome) => {
  await show([outcome, 'attended']);
  await fireEvent.press(await screen.findByRole('button', { name: AGAIN }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/sales/inbox/trial-date', params: { studentId: 'st1', name: STUDENT.name, program: 'quran' } });
});

test.each<TrialOutcome>(['attended', 'upcoming', 'awaiting', 'moved'])('latest trial %s: no new-date action', async (outcome) => {
  await show([outcome, 'absent']);
  expect(screen.getByText(t.sales.student.trial.title)).toBeTruthy();
  expect(screen.queryByRole('button', { name: AGAIN })).toBeNull();
});

test('not hers, a subscriber, or without self.sales_money: no action', async () => {
  const cases = [{ student: null }, { student: { ...STUDENT, status: 'active' as const } }, { permissions: ['self.sales'] }];
  for (const over of cases) {
    const view = await show(['absent'], over);
    expect(screen.queryByRole('button', { name: AGAIN })).toBeNull();
    await view.unmount();
  }
});
