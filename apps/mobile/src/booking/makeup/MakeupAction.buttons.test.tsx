import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { palette } from '@/theme';
import { jana, lesson, yusuf } from '@/today/testing/fixtures';
import { MakeupAction } from './MakeupAction';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-03T10:00:00Z'), advanceTimers: true }));
afterEach(() => jest.useRealTimers());

test('docs/07 «الأزرار»: one outlined, full-width «حجز تعويضي» per student (no ghost, no wrapped row)', async () => {
  const group = lesson({
    id: 'm2',
    status: 'excused',
    starts_at: '2026-09-30T13:00:00.000Z',
    ends_at: '2026-09-30T13:45:00.000Z',
    students: [yusuf, jana],
  });
  await render(<MakeupAction lesson={group} />);
  const buttons = screen.getAllByRole('button');
  expect(buttons).toHaveLength(2);
  buttons.forEach((b) => {
    expect(StyleSheet.flatten(b.props.style)).toMatchObject({ borderColor: palette.light.ruleInput, borderWidth: 1 });
    const parent = StyleSheet.flatten(b.parent?.props.style ?? {});
    expect(parent.flexWrap).toBeUndefined();
  });
});
