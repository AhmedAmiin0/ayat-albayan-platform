import { describe, expect, it } from 'vitest';
import {
  assetRecording,
  assetReport,
  lessonFileView,
  portalLessonFile,
} from './lesson-files.mapper';
import type { AssetReportRow } from './lesson-assets.repo';
import { fileRow } from './lesson-files.fakes';

const rec = {
  id: 'R',
  lesson_id: 'L',
  meeting_id: null,
  egress_id: 'E',
  error: null,
  deleted_at: null,
  file_path: 'L/r.mp3',
  started_at: '2026-11-16T16:00:00.000Z',
  ended_at: '2026-11-16T16:42:10.000Z',
  size_bytes: 19_000_000,
  status: 'done',
  visible_to_student: false,
};

describe('lesson files mapper', () => {
  it('drops the storage path; an unknown kind reads as material', () => {
    const view = lessonFileView(fileRow({ kind: 'odd' }));
    expect(view.kind).toBe('material');
    expect(view.media).toBe('image');
    expect(JSON.stringify(view)).not.toContain('a.png');
  });

  it('gives the family no visibility flag', () => {
    expect(Object.keys(portalLessonFile(fileRow()))).not.toContain('visible_to_family');
  });

  it('a finished recording keeps its link and duration; a failed one has no link', () => {
    expect(assetRecording(rec, 'u')).toMatchObject({
      url: 'u',
      duration_seconds: 2530,
      media: 'audio',
    });
    expect(assetRecording({ ...rec, status: 'failed' }, 'u').url).toBeNull();
  });

  it('names a report by its student', () => {
    const row: AssetReportRow = {
      id: 'P',
      student_id: 'S',
      pdf_status: 'ready',
      sent_at: null,
      status: 'submitted',
    };
    expect(assetReport(row, [{ id: 'S', name: 'سلمى', code: 'AB-0123' }])).toEqual({
      id: 'P',
      student_name: 'سلمى',
      pdf_ready: true,
      sent_at: null,
    });
  });
});
