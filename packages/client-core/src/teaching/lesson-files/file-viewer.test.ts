import type { PortalRecording } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  downloadName, hasVideo, partIdsByLesson, viewableFiles, viewerPage, ZOOM, zoomBy,
} from '.';

describe('zoomBy', () => {
  it('steps a quarter and stays between half size and three times', () => {
    expect(zoomBy(ZOOM.start, 1)).toBe(125);
    expect(zoomBy(ZOOM.start, -1)).toBe(75);
    expect(zoomBy(ZOOM.min, -1)).toBe(ZOOM.min);
    expect(zoomBy(ZOOM.max, 1)).toBe(ZOOM.max);
  });
});

describe('viewer pages', () => {
  const files = [
    { id: 'a', media: 'image' as const },
    { id: 'v', media: 'audio' as const },
    { id: 'b', media: 'pdf' as const },
  ];

  it('pictures and PDFs only, in order', () => {
    expect(viewableFiles(files).map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('«1 من 2» with the neighbours; nothing past the ends or for an unknown id', () => {
    const shown = viewableFiles(files);
    expect(viewerPage(shown, 'a')).toEqual({ number: 1, total: 2, prev: null, next: shown[1] });
    expect(viewerPage(shown, 'b')).toEqual({ number: 2, total: 2, prev: shown[0], next: null });
    expect(viewerPage(shown, 'x')).toEqual({ number: 0, total: 2, prev: null, next: null });
  });
});

describe('downloadName', () => {
  it('the shown title with its type’s extension; characters a file name cannot hold drop', () => {
    expect(downloadName({ title: 'ورقة الواجب', mime: 'image/jpeg' })).toBe('ورقة الواجب.jpg');
    expect(downloadName({ title: 'خطة 1/2', mime: 'application/pdf' })).toBe('خطة 1 2.pdf');
    expect(downloadName({ title: 'ملاحظة', mime: 'audio/mp4' })).toBe('ملاحظة.m4a');
    expect(downloadName({ title: 'ملف', mime: 'text/plain' })).toBe('ملف');
  });
});

describe('recordings of a lesson', () => {
  const rec = (id: string, lesson: string, media: PortalRecording['media'] = 'audio') =>
    ({ id, lesson_id: lesson, media }) as PortalRecording;

  it('collects every part id under its lesson', () => {
    const ids = partIdsByLesson([rec('B', 'L1'), rec('A', 'L1'), rec('C', 'L2')]);
    expect(ids.get('L1')).toEqual(['B', 'A']);
    expect(ids.get('L2')).toEqual(['C']);
  });

  it('knows when a video is among them', () => {
    expect(hasVideo([rec('A', 'L1')])).toBe(false);
    expect(hasVideo([rec('A', 'L1'), rec('B', 'L2', 'video')])).toBe(true);
  });
});
