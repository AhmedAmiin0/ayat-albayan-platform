import { PUBLIC_SETTING_DEFAULTS, type LessonView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { publicConfigQuery } from '@/core/lib/query/public-config';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { lesson } from '@/today/testing/fixtures';
import type { ReportAction } from '../lib/day';
import { TeacherLessonCard } from './TeacherLessonCard';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

const LINK = 'https://meet.google.com/abc';
const light = palette.light;
const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
const cellTexts = () =>
  within(screen.getByTestId('teacher-lesson-actions'))
    .getAllByTestId('button-row-cell')
    .map((c) => within(c).getByRole('button').props.accessibilityLabel ?? within(c).getAllByText(/.+/)[0]?.props.children);

async function show(l: LessonView, report: ReportAction | null) {
  const client = createTestQueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: false });
  const noop = () => undefined;
  await renderWithQuery(
    <TeacherLessonCard lesson={l} tz="Africa/Cairo" report={report} busy={false} onConfirm={noop} onReport={noop} />,
    client,
  );
}

test('docs/07 §6: «تأكيد» is the ONE filled button, alone; the link and the report are secondary peers', async () => {
  await show(lesson({ id: 'a', meeting_link: LINK, platform_classroom: false }), 'open');
  expect(styleOf(t.today.confirm)).toMatchObject({ backgroundColor: light.lapisFill });
  expect(cellTexts()).toEqual([t.teacherDash.join, t.reports.open]);
  expect(styleOf(t.reports.open)).toMatchObject({ borderWidth: 1, borderColor: light.ruleInput, backgroundColor: light.raised });
});

test('confirmed: writing the report leads (filled), the link sits in the row', async () => {
  await show(lesson({ id: 'b', status: 'confirmed', meeting_link: LINK, platform_classroom: false }), 'edit');
  expect(screen.queryByRole('button', { name: t.today.confirm })).toBeNull();
  expect(styleOf(t.reports.resume)).toMatchObject({ backgroundColor: light.lapisFill });
  expect(cellTexts()).toEqual([t.teacherDash.join]);
});

test('a sent report «عرض» is an outlined peer, never a ghost beside the outlined link', async () => {
  await show(lesson({ id: 'c', status: 'confirmed', meeting_link: LINK, platform_classroom: false }), 'view');
  expect(cellTexts()).toEqual([t.teacherDash.join, t.reports.view]);
  expect(styleOf(t.reports.view)).toMatchObject({ borderWidth: 1, borderColor: light.ruleInput });
});
