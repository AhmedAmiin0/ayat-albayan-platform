import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { student } from '@/portal/portal.fixtures';
import { PrepareCard } from '@/lessons/PrepareCard/PrepareCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const prepare = (homework: string | null, next_plan: string | null) => ({
  lessons: [],
  prepare: {
    homework,
    next_plan,
    report_id: 'rep-1',
    lesson_starts_at: '2026-11-14T15:00:00.000Z',
  },
});
const L = t.portal.app.lesson;

test('no homework and no plan: no card', async () => {
  await render(<PrepareCard lessons={prepare(null, null)} student={student()} />);
  expect(screen.queryByText(t.portal.prepareTitle)).toBeNull();
});

test('the home card: its title and only the first part, without part titles or a link', async () => {
  await render(<PrepareCard lessons={prepare('سورة الملك', 'سورة القلم')} student={student()} />);
  expect(screen.getByText(t.portal.prepareTitle)).toBeTruthy();
  expect(screen.getByText('سورة الملك')).toBeTruthy();
  expect(screen.queryByText('سورة القلم')).toBeNull();
  expect(screen.queryByText(t.portal.homework)).toBeNull();
  expect(screen.queryByRole('link')).toBeNull();
});

test('only a plan: the plan is the part shown', async () => {
  await render(<PrepareCard lessons={prepare(null, 'سورة القلم')} student={student()} />);
  expect(screen.getByText('سورة القلم')).toBeTruthy();
});

test('the full card: both parts under their titles and the report link opens it', async () => {
  await render(
    <PrepareCard lessons={prepare('سورة الملك', 'سورة القلم')} student={student()} full />,
  );
  expect(screen.getByText(L.prepare)).toBeTruthy();
  expect(screen.getByText(t.portal.homework)).toBeTruthy();
  expect(screen.getByText(t.portal.nextPlan)).toBeTruthy();
  expect(screen.getByText('سورة القلم')).toBeTruthy();
  await fireEvent.press(screen.getByRole('link'));
  expect(router.push).toHaveBeenCalledTimes(1);
});

test('the student’s own full card is titled for them', async () => {
  await render(<PrepareCard lessons={prepare('سورة الملك', null)} student={student()} full own />);
  expect(screen.getByText(L.prepareSelf)).toBeTruthy();
});

test('a full card without the lesson time: no report link', async () => {
  const lessons = {
    lessons: [],
    prepare: { ...prepare('سورة الملك', null).prepare, lesson_starts_at: null },
  };
  await render(<PrepareCard lessons={lessons} student={student()} full />);
  expect(screen.queryByRole('link')).toBeNull();
});
