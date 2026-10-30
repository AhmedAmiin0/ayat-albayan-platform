import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { ApiError } from '../http/index.js';
import {
  coursePauseBanner,
  coursePauseErrorCode,
  coursePausePreviewPath,
  coursePausePreviewText,
  coursePauseResumePath,
  coursePauseUntilPath,
} from './course-pause.js';

const words = ar.coursePause;
const fmt = (d: string) => `«${d}»`;

describe('course pause paths', () => {
  it('builds the routes of docs/11 §7b', () => {
    expect(coursePauseResumePath('s1')).toBe('/students/s1/course-pause/resume');
    expect(coursePauseUntilPath('s1')).toBe('/students/s1/course-pause/until');
    expect(coursePausePreviewPath({ studentId: 's1', from: '2026-11-01', until: null })).toBe('/students/s1/course-pause/preview?from=2026-11-01');
    expect(coursePausePreviewPath({ studentId: 's1', from: '2026-11-01', until: '2026-11-10' })).toBe('/students/s1/course-pause/preview?from=2026-11-01&until=2026-11-10');
  });
});

describe('course pause lines (MSA)', () => {
  it('previews zero, one, two, few and many lessons', () => {
    expect(coursePausePreviewText(words.preview, 0)).toBe(words.preview.zero);
    expect(coursePausePreviewText(words.preview, 1)).toBe('ستُلغى حلقة واحدة، وتُمدَّد الباقة بعدد أيام الإيقاف');
    expect(coursePausePreviewText(words.preview, 2)).toBe('ستُلغى حلقتان، وتُمدَّد الباقة بعدد أيام الإيقاف');
    expect(coursePausePreviewText(words.preview, 4)).toBe('ستُلغى 4 حلقات، وتُمدَّد الباقة بعدد أيام الإيقاف');
    expect(coursePausePreviewText(words.preview, 12)).toBe('ستُلغى 12 حلقة، وتُمدَّد الباقة بعدد أيام الإيقاف');
  });

  it('the banner says until when, or until resumed, and when a future pause starts', () => {
    const open = coursePauseBanner({ pause: { from_date: '2026-10-28', until_date: null }, today: '2026-10-28', words, formatDate: fmt });
    expect(open).toEqual({ title: 'الدورة موقوفة مؤقتًا حتى الاستئناف', starts: null });
    const later = coursePauseBanner({ pause: { from_date: '2026-11-01', until_date: '2026-11-10' }, today: '2026-10-28', words, formatDate: fmt });
    expect(later).toEqual({ title: 'الدورة موقوفة مؤقتًا حتى «2026-11-10»', starts: 'يبدأ الإيقاف في «2026-11-01»' });
  });

  it('maps the API codes to their lines, anything else to generic', () => {
    expect(coursePauseErrorCode(new ApiError(409, { code: 'already_paused' }))).toBe('already_paused');
    expect(coursePauseErrorCode(new ApiError(400, { code: 'date_in_past' }))).toBe('date_in_past');
    expect(coursePauseErrorCode(new ApiError(500, 'oops'))).toBe('generic');
    expect(coursePauseErrorCode(new Error('net'))).toBe('generic');
    for (const k of ['date_in_past', 'invalid_range', 'already_paused', 'pause_not_open', 'student_not_found', 'generic'] as const) expect(words.errors[k]).toBeTruthy();
  });
});
