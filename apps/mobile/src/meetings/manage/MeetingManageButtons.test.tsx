import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { MeetingManageButtons } from './MeetingManageButtons';

const L = t.meetings.internal;
const M = t.meetingInvites.list;
const styleOf = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
const DANGER = { borderWidth: 1, borderColor: palette.light.bad };

test('docs/07 «الأزرار»: a scheduled meeting: reschedule | new link | cancel (danger) in one ButtonRow', async () => {
  const onAsk = jest.fn();
  await render(<MeetingManageButtons scheduled onAsk={onAsk} onMove={jest.fn()} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(3);
  expect(styleOf(M.cancel)).toMatchObject(DANGER);
  expect(styleOf(L.newLink)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput });
  await fireEvent.press(screen.getByRole('button', { name: M.cancel }));
  expect(onAsk).toHaveBeenCalledWith('cancel');
});

test('an instant one: new link | «إنهاء» (danger)', async () => {
  await render(<MeetingManageButtons scheduled={false} onAsk={jest.fn()} onMove={jest.fn()} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(2);
  expect(styleOf(L.end)).toMatchObject(DANGER);
  expect(screen.queryByRole('button', { name: M.reschedule })).toBeNull();
});
