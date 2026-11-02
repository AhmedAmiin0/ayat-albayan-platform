import '@/test/warm-rn';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { EditTimeSheet } from './components/EditTimeSheet';
import { GRID, NOW, SAT_17, SUN_17, result, upcoming } from './testing/fixtures';
import { lesson } from '@/today/testing/fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const lessonsKey = ['lessons', 'day', { date: '2026-10-01', tz: 'Asia/Riyadh' }];

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(GRID);
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

async function open(l = upcoming) {
  const onClose = jest.fn();
  const client = createTestQueryClient();
  client.setQueryData(lessonsKey, [l]);
  await renderWithQuery(<EditTimeSheet lesson={l} onClose={onClose} />, client);
  await screen.findByRole('radio', { name: '17:00' });
  return { onClose, client };
}

const submit = () => screen.getByRole('button', { name: t.editTime.submit });

test('the sheet asks 15-minute starts for this lesson’s own length and students, never counting the lesson against itself', async () => {
  await open();
  const [path] = mockApiFetch.mock.calls[0] as [string];
  expect(path).toContain('/booking/slots?teacherId=t1');
  expect(path).toContain('durationMin=45');
  expect(path).toContain('studentIds=s1');
  expect(path).toContain('stepMin=15');
  expect(path).toContain('excludeLessonId=l-up');
  expect(screen.getByRole('header', { name: t.editTime.title })).toBeTruthy();
  expect(screen.getByText(t.reschedule.current.replace('{when}', 'الأحد 4 أكتوبر 17:00 بتوقيتك'))).toBeTruthy();
  expect(screen.getByRole('radio', { name: t.enums.duration['45'], checked: true })).toBeTruthy();
  // Nothing changed yet: nothing to save, nothing to confirm, and the disabled button says why.
  expect(submit()).toBeDisabled();
  expect(screen.queryByText(t.editTime.sameLesson)).toBeNull();
  expect(screen.getByText(t.editTime.unchanged)).toBeTruthy();
  // «غيّر الموعد» is the one for a series, said from the first screen (not only after a change).
  expect(screen.getByText(t.editTime.vsReschedule)).toBeTruthy();
  expect(screen.getByText(t.editTime.currentLength.replace('{len}', t.enums.duration['45']))).toBeTruthy();
});

test('a free start: the change line, the teacher’s clock, the guardian toggle (on), and the body', async () => {
  mockApiSend.mockResolvedValue(result({ lesson: { ...upcoming, starts_at: SAT_17 }, notified: 1 }));
  const { onClose, client } = await open();
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  expect(screen.getByText('الأحد 4 أكتوبر 17:00 · 45 دقيقة ← السبت 3 أكتوبر 17:00 · 45 دقيقة')).toBeTruthy();
  expect(screen.getByText(t.booking.teacherClock.replace('{time}', '17:00').replace('{city}', 'القاهرة'))).toBeTruthy();
  expect(screen.getByRole('switch', { name: t.editTime.notify }).props.value).toBe(true);
  expect(screen.getByText(t.editTime.sameLesson)).toBeTruthy();
  await fireEvent.press(submit());

  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-up/time', {
    expectedStartsAt: SUN_17,
    expectedEndsAt: upcoming.ends_at,
    startsAt: SAT_17,
    durationMin: 45,
    notify: true,
  });
  expect(await screen.findByText(t.editTime.saved)).toBeTruthy();
  // A short headline; the new time and the WhatsApp line are body text under it.
  expect(screen.getByText(t.editTime.notifiedLine)).toBeTruthy();
  expect(screen.getByText(t.reschedule.newWhen.replace('{when}', 'السبت 3 أكتوبر 17:00 بتوقيتك'))).toBeTruthy();
  expect(client.getQueryState(lessonsKey)?.isInvalidated).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: t.reschedule.done }));
  expect(onClose).toHaveBeenCalled();
});

test('switching the toggle off sends notify false', async () => {
  mockApiSend.mockResolvedValue(result());
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  await fireEvent(screen.getByRole('switch', { name: t.editTime.notify }), 'valueChange', false);
  await fireEvent.press(submit());
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-up/time', expect.objectContaining({ notify: false }));
  expect(await screen.findByText(t.editTime.saved)).toBeTruthy();
});

test('a new length alone: the start stays, the toggle is not offered, no notify is sent; the slots are asked again for it', async () => {
  mockApiSend.mockResolvedValue(result());
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.duration['60'] }));
  expect(screen.queryByRole('switch')).toBeNull();
  expect(mockApiFetch).toHaveBeenLastCalledWith(expect.stringContaining('durationMin=60'));
  await fireEvent.press(submit());
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/lessons/l-up/time', {
    expectedStartsAt: SUN_17,
    expectedEndsAt: upcoming.ends_at,
    startsAt: SUN_17,
    durationMin: 60,
  });
});

test('a pick made for the old length is dropped when the length changes', async () => {
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  expect(submit()).toBeEnabled();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.duration['90'] }));
  expect(screen.getByText(t.lessons.newTimeHint)).toBeTruthy();
});

test('a lesson that cannot be edited says so and offers no form', async () => {
  await renderWithQuery(<EditTimeSheet lesson={lesson({ id: 'plain' })} onClose={jest.fn()} />);
  expect(screen.getByText(t.editTime.error.time_edit_not_allowed)).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('a recorded length outside 30 / 45 / 60 / 90: no slots asked and nothing to save until a length is picked', async () => {
  const odd = { ...upcoming, ends_at: '2026-10-04T14:50:00.000Z' };
  await renderWithQuery(<EditTimeSheet lesson={odd} onClose={jest.fn()} />);
  expect(screen.getByText(t.editTime.pickLength)).toBeTruthy();
  // No length pill is selected for it, so the header names the recorded one, with its unit.
  expect(screen.getByText(t.editTime.currentLength.replace('{len}', t.editTime.durationOther.replace('{n}', '50')))).toBeTruthy();
  expect(screen.queryByText(t.editTime.unchanged)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
  expect(submit()).toBeDisabled();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.duration['45'] }));
  expect(await screen.findByRole('radio', { name: '17:00' })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('durationMin=45'));
  expect(screen.queryByText(t.editTime.pickLength)).toBeNull();
});

test('closed: nothing renders and nothing is asked', async () => {
  await renderWithQuery(<EditTimeSheet lesson={null} onClose={jest.fn()} />);
  expect(screen.queryByRole('header', { name: t.editTime.title })).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
