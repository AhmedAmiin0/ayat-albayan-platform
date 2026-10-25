import { render, screen } from '@testing-library/react-native';
import type { LessonView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { lesson } from '@/today/fixtures';
import { AgendaLessonRow } from './AgendaLessonRow';

const makeup: LessonView = { ...lesson({ id: 'a' }), makeup: true };

test('a makeup lesson wears «تعويضية» beside its status; an ordinary one and a trial do not', async () => {
  const { rerender } = await render(
    <AgendaLessonRow lesson={makeup} onReschedule={jest.fn()} />,
  );
  expect(screen.getByText(t.booking.makeup.tag)).toBeTruthy();
  expect(screen.queryByText(t.schedule.trialTag)).toBeNull();
  await rerender(<AgendaLessonRow lesson={lesson({ id: 'b' })} onReschedule={jest.fn()} />);
  expect(screen.queryByText(t.booking.makeup.tag)).toBeNull();
  await rerender(<AgendaLessonRow lesson={lesson({ id: 'c', trial: true })} onReschedule={jest.fn()} />);
  expect(screen.queryByText(t.booking.makeup.tag)).toBeNull();
  expect(screen.getByText(t.schedule.trialTag)).toBeTruthy();
});
