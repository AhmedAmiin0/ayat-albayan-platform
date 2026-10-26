import { fireEvent, screen } from '@testing-library/react-native';
import { AgendaLessonRow } from '@/calendar/agenda/AgendaLessonRow';
import { LessonRowActions } from '@/calendar/agenda/LessonRowActions';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { held, upcoming } from './testing/fixtures';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: async () => [] }));

// «عدّل الوقت» (R-SCH-11) shows only where the API offered it (time_edit_mode), beside «غيّر الموعد».

const action = { busyId: null, errorFor: () => null, confirm: jest.fn(), cancel: jest.fn() } as never;
const edit = (who: string) => ({ name: `${t.editTime.action} — ${who}` });
const plain = lesson({ id: 'plain' });

test('«الجدول» row: next to «غيّر الموعد» for an open lesson, and it opens the edit with that lesson', async () => {
  const onEditTime = jest.fn();
  await renderWithQuery(<LessonRowActions lesson={upcoming} action={action} onReschedule={jest.fn()} onEditTime={onEditTime} />);
  expect(screen.getByRole('button', { name: new RegExp(t.lessons.rescheduleSubmit) })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', edit('يوسف أحمد')));
  expect(onEditTime).toHaveBeenCalledWith(upcoming);
});

test('«الجدول» row: a held lesson has no other action, only «عدّل الوقت»', async () => {
  await renderWithQuery(<LessonRowActions lesson={held} action={action} onReschedule={jest.fn()} onEditTime={jest.fn()} />);
  expect(screen.getByRole('button', edit('جودى خالد'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: new RegExp(t.lessons.rescheduleSubmit) })).toBeNull();
});

test('no mode (a teacher, an old cache, a closed lesson): no button', async () => {
  await renderWithQuery(<LessonRowActions lesson={plain} action={action} onReschedule={jest.fn()} onEditTime={jest.fn()} />);
  expect(screen.queryByRole('button', { name: new RegExp(t.editTime.action) })).toBeNull();
  await renderWithQuery(<AgendaLessonRow lesson={plain} onReschedule={jest.fn()} onEditTime={jest.fn()} />);
  expect(screen.queryByRole('button', { name: new RegExp(t.editTime.action) })).toBeNull();
});

test('no handler (a teacher’s own calendar): no button even when the lesson carries a mode', async () => {
  await renderWithQuery(<AgendaLessonRow lesson={upcoming} onReschedule={jest.fn()} />);
  expect(screen.queryByRole('button', { name: new RegExp(t.editTime.action) })).toBeNull();
});

test('a teacher calendar row (no `actions`): «عدّل الوقت» beside «غيّر الموعد»', async () => {
  const onEditTime = jest.fn();
  await renderWithQuery(<AgendaLessonRow lesson={upcoming} onReschedule={jest.fn()} onEditTime={onEditTime} />);
  expect(screen.getByRole('button', { name: new RegExp(t.lessons.rescheduleSubmit) })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', edit('يوسف أحمد')));
  expect(onEditTime).toHaveBeenCalledWith(upcoming);
});

