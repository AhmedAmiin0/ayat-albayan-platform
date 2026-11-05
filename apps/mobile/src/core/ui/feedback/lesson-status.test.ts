import { lessonStatusStyle } from '@ab/shared';
import { UPCOMING_LESSON_STYLE } from '@ab/client-core';
import { renderHook } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, queryWrapper, seedPublicConfig } from '@/test/query';
import { lessonStatusText, useLessonStatusText } from './lesson-status';

test('required: a row chip says the short «للتأكيد»; every other status keeps its word', () => {
  const text = lessonStatusText(true);
  expect(text.word('scheduled')).toBe(t.today.statusShort.scheduled);
  expect(text.label('scheduled')).toBe(t.enums.lessonStatus.scheduled);
  expect(text.look('scheduled')).toEqual(lessonStatusStyle.scheduled);
  expect(text.word('confirmed')).toBe(t.enums.lessonStatus.confirmed);
});

test('not required: «قادمة» / «مجدولة» in the neutral look, never «يحتاج تأكيد»', () => {
  const text = lessonStatusText(false);
  expect(text.word('scheduled')).toBe(t.lessons.noConfirm.scheduledShort);
  expect(text.label('scheduled')).toBe(t.lessons.noConfirm.scheduled);
  expect(text.look('scheduled')).toEqual(UPCOMING_LESSON_STYLE);
  expect(text.label('completed')).toBe(t.enums.lessonStatus.completed);
});

test('the hook follows the academy setting, ON by default (owner 2026-11-03)', async () => {
  const on = await renderHook(() => useLessonStatusText());
  expect(on.result.current.required).toBe(true);
  const client = createTestQueryClient();
  seedPublicConfig(client, { lesson_confirmation_required: false });
  const wrapper = queryWrapper(client);
  const { result } = await renderHook(() => useLessonStatusText(), { wrapper });
  expect(result.current.word('scheduled')).toBe(t.lessons.noConfirm.scheduledShort);
});
