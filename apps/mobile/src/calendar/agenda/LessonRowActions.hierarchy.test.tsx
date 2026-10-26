import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { OVERVIEW } from '../overview/overview-fixtures';
import { LessonRowActions } from './LessonRowActions';
import { t } from '@/core/lib/i18n/i18n';

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
