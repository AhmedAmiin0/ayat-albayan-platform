import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { openV2, pick, v2Content } from './v2-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const v2 = t.reports.v2;
const region = (name: string) => screen.queryByRole('region', { name });

describe('the new report form (form_version 2): sections', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('header: student · code, lesson n of total, teacher, auto-filled hint', async () => {
    const article = await openV2({ apiFetch });
    expect(article.textContent).toContain('سهيلة');
    expect(article.textContent).toContain('AB-0183');
    expect(screen.getByText('الحلقة 2 من 4')).toBeTruthy();
    expect(screen.getByText('المعلم/ة: أبرار')).toBeTruthy();
    expect(screen.getByText(v2.autoFilled)).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.reports.identity })).toBeNull();
  });

  it('Quran: the three tracks, tajweed, overall, homework, next lesson and the note', async () => {
    await openV2({ apiFetch });
    for (const name of [v2.segment.recited, v2.segment.new, v2.segment.revision, v2.tajweedTitle, v2.overall, v2.homework, v2.nextTitle, v2.note]) {
      expect(region(name)).toBeTruthy();
    }
    expect(screen.getAllByRole('button', { name: v2.pickRange })).toHaveLength(3);
    expect(screen.getByRole('button', { name: v2.send })).toBeTruthy();
    expect(screen.getByRole('button', { name: v2.saveDraft })).toBeTruthy();
  });

  it('saved parts show their range, meta and grade; the homework and plan are suggested', async () => {
    const content = v2Content({ segments: [{ kind: 'new', surah: 67, from: 16, to: 22, grade: 'very_good' }] });
    await openV2({ apiFetch, report: { content } });
    const part = region(v2.segment.new);
    expect(part?.textContent).toContain('سورة الملك · الآيات 16–22');
    expect(part?.textContent).toContain('7 آيات · ص 563');
    expect(within(screen.getByRole('group', { name: 'تقييم الحفظ الجديد' })).getByRole('radio', { name: t.enums.grade.very_good })).toHaveProperty('checked', true);
    expect(screen.getByText('مقترح من التقييمات: جيد جدًا')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: v2.homework })).toHaveProperty('value', 'مراجعة سورة الملك من الآية 16 إلى 22 يوميًا.');
    expect(region(v2.nextTitle)?.textContent).toContain('الحفظ الجديد: سورة الملك 23–29');
    expect(screen.getByRole('button', { name: v2.addSegment })).toBeTruthy();
  });

  it('a full form (9 parts) offers no add on any track and says why', async () => {
    const segments = Array.from({ length: 9 }, (_, i) => ({ kind: 'revision' as const, surah: 78 + i, from: 1, to: 5, grade: 'good' as const }));
    await openV2({ apiFetch, report: { content: v2Content({ segments }) } });
    expect(screen.queryByRole('button', { name: v2.pickRange })).toBeNull();
    expect(screen.queryByRole('button', { name: v2.addSegment })).toBeNull();
    expect(screen.getAllByText('الحد الأقصى 9 مقاطع')).toHaveLength(3);
  });

  it('«تعديل الخطة» makes the next lesson editable', async () => {
    await openV2({ apiFetch });
    screen.getByRole('button', { name: v2.editPlan }).click();
    expect(await screen.findByLabelText(v2.nextTitle)).toBeTruthy();
  });

  it('Arabic: the topic and the four skills; Islamic: area, topic, memorized and two rates', async () => {
    await openV2({ apiFetch });
    pick(v2.programTitle, t.enums.program.arabic);
    expect(screen.getByLabelText(new RegExp(v2.topic))).toBeTruthy();
    for (const skill of Object.values(v2.skills)) expect(screen.getByRole('group', { name: skill })).toBeTruthy();
    expect(region(v2.segment.recited)).toBeNull();
    pick(v2.programTitle, t.enums.program.islamic_studies);
    expect(screen.getByRole('group', { name: new RegExp(v2.domainTitle) })).toBeTruthy();
    expect(screen.getByLabelText(new RegExp(v2.memorized))).toBeTruthy();
    for (const rate of Object.values(v2.islamicRates)) expect(screen.getByRole('group', { name: rate })).toBeTruthy();
  });

  it('absent hides every content section: one card, charged, optional note', async () => {
    await openV2({ apiFetch });
    pick(v2.attendanceTitle, v2.attendance.absent);
    const card = region(v2.attendance.absent);
    expect(card?.textContent).toContain(v2.absentHint);
    expect(card?.textContent).toContain(v2.charged);
    expect(screen.getByLabelText(v2.absentNote)).toBeTruthy();
    for (const name of [v2.segment.recited, v2.tajweedTitle, v2.overall, v2.homework, v2.note]) expect(region(name)).toBeNull();
    pick(v2.attendanceTitle, v2.attendance.excused);
    expect(region(v2.excusedTitle)?.textContent).toContain(v2.notCharged);
  });

  it('a form_version 1 entry still renders the old form', async () => {
    await openV2({ apiFetch, report: { form_version: 1, content: null } });
    expect(screen.getByRole('region', { name: t.reports.identity })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.reports.submit })).toBeTruthy();
    expect(region(v2.segment.recited)).toBeNull();
  });

  it('a closed edit window disables the form and hides the send', async () => {
    await openV2({ apiFetch, report: { status: 'submitted', version: 1, attendance: 'on_time', can_edit: false } });
    expect(screen.getAllByRole('button', { name: v2.pickRange })[0]?.matches(':disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: v2.saveEdit })).toBeNull();
    expect(screen.getByText(t.reports.editClosed)).toBeTruthy();
  });
});
