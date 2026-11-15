import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { configWrapper } from './confirmation-testing';
import { lessonStatusText, useLessonStatusText } from './lesson-status-text';

describe('lessonStatusText (settings.lesson_confirmation_required, owner 2026-11-02)', () => {
  it('off: a scheduled lesson is «مجدولة», neutral; the other statuses keep their words', () => {
    const s = lessonStatusText(false);
    expect(s.label('scheduled')).toBe(t.lessons.noConfirm.scheduled);
    expect(s.chip('scheduled')).toEqual({ tone: 'neutral', glyph: 'hollow', label: t.lessons.noConfirm.scheduled });
    expect(s.label('confirmed')).toBe(t.enums.lessonStatus.confirmed);
  });

  it('on: «يحتاج تأكيد» in the «دورك» tone, as before', () => {
    const s = lessonStatusText(true);
    expect(s.chip('scheduled')).toMatchObject({ tone: 'act', label: t.enums.lessonStatus.scheduled });
  });

  it('the hook reads the public setting (default off)', () => {
    const off = renderHook(() => useLessonStatusText(), { wrapper: configWrapper() });
    expect(off.result.current.required).toBe(false);
    const on = renderHook(() => useLessonStatusText(), { wrapper: configWrapper(true) });
    expect(on.result.current.label('scheduled')).toBe(t.enums.lessonStatus.scheduled);
  });
});
