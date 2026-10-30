import { act, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { setClockPref } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { renderWithQuery } from '@/test/query';
import { meetingError } from './meeting-text';
import { useEnterMeeting } from './use-enter-meeting';
import { useMeetingManage } from './use-meeting-manage';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const early = new ApiError(403, { code: 'join_not_open_yet', opens_at: '2026-10-05T11:30:00.000Z' });
const line = (cycle: '12' | '24') => meetingError(early, cycle, 'Asia/Riyadh');

function Enter({ go }: { go: (run: (id: string) => Promise<void>) => void }) {
  const enter = useEnterMeeting('Asia/Riyadh');
  go(enter.run);
  return <Text>{enter.error ?? '-'}</Text>;
}

function Manage({ go }: { go: (ask: () => void) => void }) {
  const m = useMeetingManage('m1');
  go(() => m.confirm?.run());
  return <Text onPress={() => m.ask('end')}>{m.error ?? '-'}</Text>;
}

beforeEach(async () => {
  mockApiSend.mockReset().mockRejectedValue(early);
  await act(async () => setClockPref('24'));
});

test('«ادخل الاجتماع»: the refusal re-words its opening time after a 24 → 12 h switch', async () => {
  let run: (id: string) => Promise<void> = async () => undefined;
  await renderWithQuery(<Enter go={(r) => (run = r)} />);
  await act(() => run('m1'));
  expect(screen.getByText(line('24'))).toBeTruthy();

  await act(async () => setClockPref('12'));
  expect(screen.getByText(line('12'))).toBeTruthy();
  expect(line('12')).not.toBe(line('24'));
});

test('end / new link: the refusal line follows the switch too (useMeetingManage)', async () => {
  let confirm: () => void = () => undefined;
  await renderWithQuery(<Manage go={(c) => (confirm = c)} />);
  await act(async () => screen.getByText('-').props.onPress());
  await act(async () => confirm());
  expect(await screen.findByText(line('24'))).toBeTruthy();

  await act(async () => setClockPref('12'));
  expect(screen.getByText(line('12'))).toBeTruthy();
});
