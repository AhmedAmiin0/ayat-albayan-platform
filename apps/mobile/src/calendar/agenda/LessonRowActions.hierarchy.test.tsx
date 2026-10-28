import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { OVERVIEW } from '../overview/overview-fixtures';
import { LessonRowActions } from './LessonRowActions';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';

const action = { busyId: null, errorFor: () => null, confirm: jest.fn(), cancel: jest.fn() } as never;
const pending = OVERVIEW.lessons.find((l) => l.id === 'l-pending');

test('«تأكيد» is the one filled button while the lesson waits for it; «إلغاء» is secondary, not the same look', async () => {
  if (!pending) throw new Error('fixture');
  await render(<LessonRowActions lesson={{ ...pending, status: 'scheduled' }} action={action} onReschedule={jest.fn()} />);
  const look = (name: string) => {
    const style = screen.getByRole('button', { name: new RegExp(name) }).props.style;
    return StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style) as { backgroundColor: string; borderWidth: number };
  };
  const confirm = look(t.today.confirm);
  const cancel = look(t.today.cancel);
  expect(confirm.backgroundColor).not.toBe('transparent');
  expect(cancel.borderWidth).toBe(1);
  expect(confirm.backgroundColor).not.toBe(cancel.backgroundColor);
});

test('a live lesson: «ادخل الحلقة» is the primary, so «تأكيد» steps down to outlined; «إلغاء» is the danger in the row', async () => {
  if (!pending) throw new Error('fixture');
  const now = Date.now();
  const live = { ...pending, status: 'scheduled' as const, starts_at: new Date(now - 60_000).toISOString(), ends_at: new Date(now + 3_600_000).toISOString() };
  await render(<LessonRowActions lesson={live} action={action} onReschedule={jest.fn()} />);
  const look = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name: new RegExp(name) }).props.style);
  expect(look(t.today.confirm)).toMatchObject({ borderWidth: 1, borderColor: palette.light.ruleInput, backgroundColor: palette.light.raised });
  expect(look(t.today.cancel)).toMatchObject({ borderColor: palette.light.bad });
  expect(screen.getAllByTestId('button-row-cell').length).toBeGreaterThan(0);
});
