import { PUBLIC_SETTING_DEFAULTS, type LessonView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { publicConfigQuery } from '@/core/lib/query/public-config';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { lesson } from '@/today/testing/fixtures';
import type { ReportAction } from '@/teacher/lib/day';
import { TeacherLessonCard } from './TeacherLessonCard';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));
// The fixture lessons start at 13:00Z: an hour before, then twenty minutes after.
const BEFORE = new Date('2026-10-01T12:00:00Z');
const AFTER = new Date('2026-10-01T13:20:00Z');
let mockNow = BEFORE;
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => mockNow }));

const LINK = 'https://meet.google.com/abc';
const light = palette.light;
const w = t.teacherBoard;
const styleOf = (name: string) =>
  StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
const cellTexts = () =>
  within(screen.getByTestId('teacher-lesson-actions'))
    .getAllByTestId('button-row-cell')
    .map(
      (c) =>
        within(c).getByRole('button').props.accessibilityLabel ??
        within(c).getAllByText(/.+/)[0]?.props.children,
    );

async function show(l: LessonView, report: ReportAction | null) {
  const client = createTestQueryClient();
  client.setQueryData(publicConfigQuery.queryKey, {
    ...PUBLIC_SETTING_DEFAULTS,
    custom: {},
    meeting_link_auto: false,
    lesson_confirmation_required: true,
  });
  const noop = () => undefined;
  await renderWithQuery(
    <TeacherLessonCard
      lesson={l}
      tz="Africa/Cairo"
      report={report}
      onNotice={noop}
      onReport={noop}
    />,
    client,
  );
}

beforeEach(() => {
  mockNow = BEFORE;
});

test('docs/07 §6: «سأحضر» is the ONE filled button before the start; the link and «إلغاء الحلقة» are peers', async () => {
  await show(lesson({ id: 'a', meeting_link: LINK, platform_classroom: false }), null);
  expect(styleOf(w.confirm)).toMatchObject({ backgroundColor: light.lapisFill });
  expect(cellTexts()).toEqual([t.teacherDash.join, w.cancel]);
  expect(styleOf(w.cancel)).toMatchObject({ borderWidth: 1, borderColor: light.bad });
  // The family-style «تأكيد» is gone from the teacher's card (docs/46 D1).
  expect(screen.queryByRole('button', { name: t.today.confirm })).toBeNull();
});

test('a family-confirmed lesson still offers «سأحضر»: hers is apart from the status (D1)', async () => {
  await show(lesson({ id: 'b', status: 'confirmed', platform_classroom: false }), null);
  expect(screen.getByRole('button', { name: w.confirm })).toBeTruthy();
});

test('she already said «سأحضر»: the chip, no button; the cancel stays', async () => {
  await show(
    lesson({ id: 'c', teacher_confirmed_at: '2026-10-01T10:00:00Z', platform_classroom: false }),
    null,
  );
  expect(screen.getByText(w.confirmedChip)).toBeTruthy();
  expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
  expect(cellTexts()).toEqual([w.cancel]);
});

test('started: writing the report leads (filled), the link sits in the row, no «سأحضر» or cancel', async () => {
  mockNow = AFTER;
  await show(
    lesson({ id: 'd', status: 'confirmed', meeting_link: LINK, platform_classroom: false }),
    'edit',
  );
  expect(screen.queryByRole('button', { name: w.confirm })).toBeNull();
  expect(styleOf(t.reports.resume)).toMatchObject({ backgroundColor: light.lapisFill });
  expect(cellTexts()).toEqual([t.teacherDash.join]);
});

test('a sent report «عرض» is an outlined peer, never a ghost beside the outlined link', async () => {
  mockNow = AFTER;
  await show(
    lesson({ id: 'e', status: 'confirmed', meeting_link: LINK, platform_classroom: false }),
    'view',
  );
  expect(cellTexts()).toEqual([t.teacherDash.join, t.reports.view]);
  expect(styleOf(t.reports.view)).toMatchObject({ borderWidth: 1, borderColor: light.ruleInput });
});
