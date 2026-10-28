import { emptyContent } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { formResponseV2 } from '../../testing/fixtures';
import { ReportEntryCardV2 } from '../ReportEntryCardV2';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: jest.fn(),
}));

const v2 = t.reports.v2;

async function open(memory = formResponseV2().entries[0]?.memory) {
  const form = formResponseV2({ memory });
  const [entry] = form.entries;
  if (!entry) throw new Error('no entry');
  await renderWithQuery(<ReportEntryCardV2 form={form} entry={entry} tz="Africa/Cairo" />);
}

/** The track's card: its range button(s) sit between its title and the next track. */
const pickButtons = () => screen.getAllByText(v2.pickRange);

test('an empty part opens the picker right after the last saved ayah; «تمّ» writes the part', async () => {
  await open();
  const [, newPart] = pickButtons();
  if (!newPart) throw new Error('no new part');
  await fireEvent.press(newPart);
  expect(screen.getByLabelText(v2.picker.from).props.value).toBe('16');
  expect(
    screen.getByText(
      new RegExp(v2.picker.afterLast.replace('{ayah}', '15').replace(/[().]/g, '\\$&')),
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: v2.picker.done }));
  expect(screen.getByText('سورة الملك · الآيات 16–30')).toBeTruthy();
  expect(pickButtons()).toHaveLength(2);
  const grades = within(screen.getByLabelText(v2.rateOf.replace('{title}', v2.segment.new)));
  expect(
    grades.getByRole('radio', { name: t.enums.grade.good }).props.accessibilityState,
  ).toMatchObject({ disabled: false });
  // The plan follows today's new memorization: Al-Mulk is finished, so Al-Qalam comes next.
  expect(screen.getByText(/سورة القلم 1–15/)).toBeTruthy();
});

test('«+ أضف مقطعًا آخر» continues after today’s part; a part can be removed', async () => {
  await open();
  const [, newPart] = pickButtons();
  if (!newPart) throw new Error('no new part');
  await fireEvent.press(newPart);
  await fireEvent.press(screen.getByRole('button', { name: v2.picker.done }));
  await fireEvent.press(screen.getByRole('button', { name: v2.addSegment }));
  expect(screen.getByLabelText(v2.picker.from).props.value).toBe('1');
  await fireEvent.press(screen.getByRole('button', { name: v2.picker.done }));
  expect(screen.getByText('سورة القلم · الآيات 1–15')).toBeTruthy();
  const [first] = screen.getAllByRole('button', {
    name: `${v2.removeSegment} — ${v2.segment.new}`,
  });
  if (!first) throw new Error('no remove');
  await fireEvent.press(first);
  expect(screen.queryByText('سورة الملك · الآيات 16–30')).toBeNull();
  expect(screen.getByText('سورة القلم · الآيات 1–15')).toBeTruthy();
});

test('no history: the picker opens with nothing picked; «إلغاء» leaves the part empty', async () => {
  await open(null);
  const [recited] = pickButtons();
  if (!recited) throw new Error('no part');
  await fireEvent.press(recited);
  expect(
    screen.getByRole('button', { name: v2.picker.done }).props.accessibilityState,
  ).toMatchObject({ disabled: true });
  expect(screen.queryByText(v2.picker.recent)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: v2.picker.cancel }));
  expect(screen.queryByLabelText(v2.picker.search)).toBeNull();
  expect(pickButtons()).toHaveLength(3);
});

test('a full form (9 parts) offers no add on any track and says why', async () => {
  const segments = Array.from({ length: 9 }, (_, i) => ({
    kind: 'revision' as const,
    surah: 78 + i,
    from: 1,
    to: 5,
    grade: 'good' as const,
  }));
  const form = formResponseV2();
  const [entry] = form.entries;
  if (!entry) throw new Error('no entry');
  const full = { ...entry, report: { ...entry.report, content: { ...emptyContent(), segments } } };
  await renderWithQuery(<ReportEntryCardV2 form={form} entry={full} tz="Africa/Cairo" />);
  expect(screen.queryByText(v2.pickRange)).toBeNull();
  expect(screen.queryByText(v2.addSegment)).toBeNull();
  expect(screen.getAllByText('الحد الأقصى 9 مقاطع')).toHaveLength(3);
});
