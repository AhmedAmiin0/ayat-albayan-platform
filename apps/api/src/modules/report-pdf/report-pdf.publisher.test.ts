import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { fakeSettings } from '../../common/settings/settings.fakes';
import type { StorageService } from '../../common/storage/storage.service';
import type { PdfRenderer } from './render/pdf-renderer';
import { sampleSource } from './report-pdf.fakes';
import { ReportPdfPublisher } from './report-pdf.publisher';
import { ReportPdfSettings } from './report-pdf.settings';
import type { ReportPdfSource } from './report-pdf.source';

const NOW = new Date('2026-09-29T15:12:00Z');

function setup(found = true, store = fakeSettings()) {
  const source = { load: vi.fn(async () => (found ? sampleSource() : null)) };
  const renderer = {
    render: vi.fn<(html: string, footer?: string) => Promise<Uint8Array>>(async () => new Uint8Array([37, 80, 68, 70])),
    close: vi.fn(async () => undefined),
  };
  const storage = { upload: vi.fn(async () => undefined) };
  const publisher = new ReportPdfPublisher(
    source as unknown as ReportPdfSource,
    renderer as unknown as PdfRenderer,
    storage as unknown as StorageService,
  );
  // The settings arrive by property injection (the constructor stays at three parameters).
  Object.assign(publisher, { settings: new ReportPdfSettings(store) });
  return { publisher, renderer, storage };
}

describe('ReportPdfPublisher — render and store one report', () => {
  it('renders the report HTML and overwrites reports/{student_id}/{lesson_id}.pdf', async () => {
    const { publisher, renderer, storage } = setup();
    const out = await publisher.publish('r1', NOW);
    const html = renderer.render.mock.calls[0]?.[0] ?? '';
    expect(html).toContain('سلمى عبد الرحمن');
    expect(html).toContain('@font-face');
    // Used only when the report runs past one page: code and the lesson's local date, ASCII.
    expect(renderer.render.mock.calls[0]?.[1]).toMatch(/^AB-\d{4} \| \d{4}-\d{2}-\d{2}$/);
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

  it('the footer prints the site from academy_contact and the number from academy_whatsapp_e164', async () => {
    const store = fakeSettings({ academy_contact: { site: 'example.org' }, academy_whatsapp_e164: '+201001234567' });
    const { publisher, renderer } = setup(true, store);
    await publisher.publish('r1', NOW);
    const html = renderer.render.mock.calls[0]?.[0] ?? '';
    expect(html).toContain('example.org');
    expect(html).toContain('+20 10 0123 4567');
  });

  it('a failed settings read is logged and the built-in contact is printed; the PDF is still made', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const store = fakeSettings();
    vi.mocked(store.all).mockRejectedValue(new Error('db down'));
    const { publisher, renderer, storage } = setup(true, store);
    await publisher.publish('r1', NOW);
    expect(renderer.render.mock.calls[0]?.[0]).toContain('+966 56 610 1447');
    expect(storage.upload).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('db down'));
    warn.mockRestore();
  });

  it('close frees the browser', async () => {
    const { publisher, renderer } = setup();
    await publisher.close();
    expect(renderer.close).toHaveBeenCalled();
  });
});
