import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import type { PdfRenderer } from './pdf-renderer';
import { sampleSource } from './report-pdf.fakes';
import { ReportPdfPublisher } from './report-pdf.publisher';
import type { ReportPdfSource } from './report-pdf.source';

const NOW = new Date('2026-09-29T15:12:00Z');

function setup(found = true) {
  const source = { load: vi.fn(async () => (found ? sampleSource() : null)) };
  const renderer = {
    render: vi.fn<(html: string) => Promise<Uint8Array>>(async () => new Uint8Array([37, 80, 68, 70])),
    close: vi.fn(async () => undefined),
  };
  const storage = { upload: vi.fn(async () => undefined) };
  const publisher = new ReportPdfPublisher(
    source as unknown as ReportPdfSource,
    renderer as unknown as PdfRenderer,
    storage as unknown as StorageService,
  );
  return { publisher, renderer, storage };
}

describe('ReportPdfPublisher — render and store one report', () => {
  it('renders the report HTML and overwrites reports/{student_id}/{lesson_id}.pdf', async () => {
    const { publisher, renderer, storage } = setup();
    const out = await publisher.publish('r1', NOW);
    const html = renderer.render.mock.calls[0]?.[0] ?? '';
    expect(html).toContain('سلمى عبد الرحمن');
    expect(html).toContain('@font-face');
    expect(storage.upload).toHaveBeenCalledWith({
      bucket: 'reports',
      path: 's1/l1.pdf',
      body: new Uint8Array([37, 80, 68, 70]),
      contentType: 'application/pdf',
    });
    expect(out.path).toBe('s1/l1.pdf');
    expect(out.message.dedup_key).toBe('report_ready:r1');
    expect(out.message.template_params.document.path).toBe('s1/l1.pdf');
  });

  it('a report deleted since the claim is an error (the job marks it failed, a no-op)', async () => {
    const { publisher, storage } = setup(false);
    await expect(publisher.publish('r1', NOW)).rejects.toThrow('report not found');
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('close frees the browser', async () => {
    const { publisher, renderer } = setup();
    await publisher.close();
    expect(renderer.close).toHaveBeenCalled();
  });
});
