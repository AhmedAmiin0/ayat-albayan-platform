import { fireEvent, screen } from '@testing-library/react-native';
import { AppText, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { OptionsRow } from './OptionsRow';

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: jest.fn(),
  apiFetch: jest.fn(),
}));

const now = new Date('2026-11-16T10:00:00.000Z');
const clock = { tz: 'Asia/Riyadh', cycle: '12', locale: 'ar' } as const;
const A = t.portal.actions;
const show = (group: boolean) =>
  renderWithQuery(
    <OptionsRow
      lesson={lesson(now, 24 * 60, { status: 'scheduled', family: { group, counts: false, request: null } })}
      student={student()}
      clock={clock}
      now={now}
    >
      <AppText>6:30 م</AppText>
    </OptionsRow>,
    freshQueryClient(),
  );

test('a row opens «خيارات الحلقة» with its time in the label, and the excuse title says the day', async () => {
  await show(false);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${A.optionsFor.replace('{when}', '')}`) }));
  expect(screen.getByText(new RegExp(`^${A.lessonTomorrow}`))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: A.decline }));
  expect(screen.getByText(A.declineTitleOf.replace('{lesson}', A.lessonTomorrow))).toBeTruthy();
});

test('a group lesson row is plain text: no options', async () => {
  await show(true);
  expect(screen.getByText('6:30 م')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
