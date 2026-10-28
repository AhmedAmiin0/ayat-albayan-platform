import { describe, expect, it, vi } from 'vitest';
import { fakeDb, type FakeResult } from '../../../people/guardians/fake-db';
import { fakeSettings } from '../../../../common/settings/settings.fakes';
import type { StorageService } from '../../../../common/storage/storage.service';
import type { PdfRenderer } from '../render/pdf-renderer';
import { sampleSource } from '../report-pdf.fakes';
import { ReportPdfPublisher } from '../report-pdf.publisher';
import { ReportPdfSettings } from '../report-pdf.settings';
import { ReportPdfSource, type ReportSource } from '../report-pdf.source';
import { familySource } from './family.fakes';

/** A clock before every fixture lesson: «الحلقة القادمة» is read after the lesson itself. */
const EPOCH = new Date(0);

const NOW = new Date('2026-10-27T14:10:00Z');

function publisher(source: ReportSource) {
  const renderer = { render: vi.fn<(html: string) => Promise<Uint8Array>>(async () => new Uint8Array([37])), close: vi.fn() };
  const storage = { upload: vi.fn(async () => undefined) };
  const p = new ReportPdfPublisher({ load: async () => source } as unknown as ReportPdfSource, renderer as unknown as PdfRenderer, storage as unknown as StorageService);
  Object.assign(p, { settings: new ReportPdfSettings(fakeSettings()) });
  return { p, renderer, storage };
}

const tables = (report: object): Record<string, FakeResult[]> => ({
  lesson_reports: [{ data: report }, { data: [] }],
  lessons: [{ data: { starts_at: '2026-10-27T13:00:00Z', ends_at: '2026-10-27T14:00:00Z' } }, { data: null }],
  students: [{ data: { name: 'يوسف', code: 'AB-2041', program: 'quran', guardians: { id: 'g1', phone_e164: '+966551234567', tz: 'Asia/Riyadh' } } }],
  teachers: [{ data: { display_name_ar: 'سارة' } }],
  v_lesson_sequence: [{ data: { seq: 9 } }],
  v_package_lessons: [{ data: null }],
  subscriptions: [{ data: [] }],
});

describe('the family report keeps the same sending path; only the page changes for v2', () => {
  it('v1 report → the v1 page; v2 report → the v2 page; same path, same report_ready message', async () => {
    const v1 = publisher(sampleSource());
    const v2 = publisher(familySource());
    const [a, b] = [await v1.p.publish('r1', NOW), await v2.p.publish('r1', NOW)];
    expect(v1.renderer.render.mock.calls[0]?.[0]).toContain('<div class="cartouche">تقرير الحلقة</div>');
    expect(v2.renderer.render.mock.calls[0]?.[0]).toContain('<h1>تقرير حلقة سلمى عبد الرحمن</h1>');
    expect(v2.renderer.render.mock.calls[0]?.[0]).not.toContain('cartouche');
    expect(b.path).toBe(a.path);
    expect(b.message).toEqual(a.message);
    expect(v2.storage.upload).toHaveBeenCalledWith(expect.objectContaining({ bucket: 'reports', path: a.path }));
  });

  it('ReportPdfSource reads the v2 parts only for a v2 report', async () => {
    const report = { id: 'r1', lesson_id: 'l1', student_id: 's1', teacher_id: 't1', attendance: 'on_time', version: 1 };
    const v1 = fakeDb(tables({ ...report, form_version: 1 }));
    expect((await new ReportPdfSource(v1.db).load('r1', EPOCH))?.family).toBeUndefined();
    expect(v1.trips.filter((t) => t === 'lesson_reports')).toHaveLength(1);
    const v2 = fakeDb(tables({ ...report, form_version: 2, content: { segments: [] }, submitted_at: null }));
    expect((await new ReportPdfSource(v2.db).load('r1', EPOCH))?.family).toEqual({ content: expect.objectContaining({ segments: [] }), history: [], nextLessonAt: null });
  });
});
