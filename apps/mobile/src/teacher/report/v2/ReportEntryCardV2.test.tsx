import { emptyContent, type ReportFormResponse } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { formResponseV2 } from '../testing/fixtures';
import { ReportEntryCardV2 } from './ReportEntryCardV2';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));

const v2 = t.reports.v2;

async function open(form: ReportFormResponse = formResponseV2()) {
  const [entry] = form.entries;
  if (!entry) throw new Error('no entry');
  await renderWithQuery(<ReportEntryCardV2 form={form} entry={entry} tz="Africa/Cairo" />);
}

beforeEach(() => jest.clearAllMocks());

test('the head: student · code, «الحلقة 9 من 12», the teacher, and that it is filled from the schedule', async () => {
  await open();
  expect(screen.getByText(/يوسف أحمد/)).toBeTruthy();
  expect(screen.getByText(v2.lessonOf.replace('{n}', '9').replace('{total}', '12'))).toBeTruthy();
  expect(screen.getByText(v2.teacherChip.replace('{name}', 'أبرار'))).toBeTruthy();
  expect(screen.getByText(v2.autoFilled)).toBeTruthy();
});

test('a Quran lesson: four attendance buttons, three programs, the three tracks, tajweed, then the wrap-up', async () => {
  await open();
  for (const a of Object.values(v2.attendance))
    expect(screen.getByRole('radio', { name: a })).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.enums.program.quran, checked: true })).toBeTruthy();
  for (const k of Object.values(v2.segment)) expect(screen.getByText(k)).toBeTruthy();
  expect(screen.getAllByText(v2.pickRange)).toHaveLength(3);
  expect(screen.getByText(new RegExp(v2.tajweedTitle))).toBeTruthy();
  for (const label of [v2.overall, v2.nextTitle, v2.send, v2.saveDraft, v2.sendHint])
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText(v2.homework).length).toBeGreaterThan(0);
  expect(screen.getByText(v2.attach)).toBeTruthy();
});

test('grade chips: a part is graded once it has a range, and the overall follows the suggestion', async () => {
  const content = {
    ...emptyContent(),
    segments: [{ kind: 'recited' as const, surah: 67, from: 1, to: 15, grade: null }],
  };
  await open(formResponseV2({ report: { content } }));
  expect(screen.getByText(/سورة الملك · الآيات 1–15/)).toBeTruthy();
  expect(
    screen.getByText(`15 آية · ${v2.pageRange.replace('{first}', '562').replace('{last}', '563')}`),
  ).toBeTruthy();
  const recited = within(screen.getByLabelText(v2.rateOf.replace('{title}', v2.segment.recited)));
  await fireEvent.press(recited.getByRole('radio', { name: t.enums.grade.very_good }));
  expect(recited.getByRole('radio', { name: t.enums.grade.very_good, checked: true })).toBeTruthy();
  expect(screen.getByText(v2.suggested.replace('{grade}', t.enums.grade.very_good))).toBeTruthy();
  const overall = within(screen.getByLabelText(v2.rateOf.replace('{title}', v2.overall)));
  expect(overall.getByRole('radio', { name: t.enums.grade.very_good, checked: true })).toBeTruthy();
  // An empty track cannot be graded yet.
  const fresh = within(screen.getByLabelText(v2.rateOf.replace('{title}', v2.segment.new)));
  expect(
    fresh.getByRole('radio', { name: t.enums.grade.excellent }).props.accessibilityState,
  ).toMatchObject({ disabled: true });
});

test('tajweed: one topic, tapping it again clears it', async () => {
  await open();
  const madd = () => screen.getByRole('radio', { name: v2.tajweed.madd });
  await fireEvent.press(madd());
  expect(madd().props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.press(madd());
  expect(madd().props.accessibilityState).toMatchObject({ checked: false });
});

test('absent: every content section is hidden; the card says it counts against the package', async () => {
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.absent }));
  expect(screen.getByText(v2.absentHint)).toBeTruthy();
  expect(screen.getByText(v2.charged)).toBeTruthy();
  expect(screen.getByLabelText(v2.absentNote)).toBeTruthy();
  expect(screen.queryByText(new RegExp(v2.tajweedTitle))).toBeNull();
  for (const gone of [v2.segment.recited, v2.overall, v2.nextTitle, v2.attach])
    expect(screen.queryByText(gone)).toBeNull();
  expect(screen.queryByLabelText(v2.homework)).toBeNull();
});

test('excused: «اعتذر الطالب مسبقًا», not counted against the package', async () => {
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.excused }));
  expect(screen.getByText(v2.excusedTitle)).toBeTruthy();
  expect(screen.getByText(v2.notCharged)).toBeTruthy();
  expect(screen.queryByText(v2.charged)).toBeNull();
});

test('switching the program shows the Arabic skills, then the Islamic studies fields', async () => {
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.program.arabic }));
  expect(screen.queryByText(v2.segment.recited)).toBeNull();
  expect(screen.getByLabelText(v2.topic)).toBeTruthy();
  for (const k of Object.values(v2.skills)) expect(screen.getByText(k)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.program.islamic_studies }));
  expect(screen.getByRole('radio', { name: v2.domains.fiqh })).toBeTruthy();
  expect(screen.getByLabelText(`${v2.memorized} ${v2.optional}`)).toBeTruthy();
  for (const k of Object.values(v2.islamicRates)) expect(screen.getByText(k)).toBeTruthy();
  expect(screen.queryByText(v2.skills.reading)).toBeNull();
});

test('quick notes: any number, each toggles', async () => {
  await open();
  await fireEvent.press(screen.getByRole('checkbox', { name: v2.quick.keep_going }));
  await fireEvent.press(screen.getByRole('checkbox', { name: v2.quick.daily_revision }));
  expect(screen.getByRole('checkbox', { name: v2.quick.keep_going, checked: true })).toBeTruthy();
  expect(
    screen.getByRole('checkbox', { name: v2.quick.daily_revision, checked: true }),
  ).toBeTruthy();
});
