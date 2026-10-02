import { describe, expect, it, vi } from 'vitest';
import type { ReportPdfJob } from '../report-pdf/report-pdf.job';
import { PendingPdfQueue } from './report-pdf.queue';
import type { ReportsQueries } from './reports.queries';

describe('PendingPdfQueue', () => {
  it('marks the report pending, then kicks the PDF job', async () => {
    const order: string[] = [];
    const queries = { requestPdf: vi.fn(async () => void order.push('pending')) };
    const job = { kick: vi.fn(async () => void order.push('kick')) };
    const queue = new PendingPdfQueue(queries as unknown as ReportsQueries, job as unknown as ReportPdfJob);
    await queue.enqueue('r1');
    expect(queries.requestPdf).toHaveBeenCalledWith('r1');
    expect(order).toEqual(['pending', 'kick']);
  });

  it('does not kick when the pending write fails', async () => {
    const queries = { requestPdf: vi.fn().mockRejectedValue(new Error('db')) };
    const job = { kick: vi.fn() };
    const queue = new PendingPdfQueue(queries as unknown as ReportsQueries, job as unknown as ReportPdfJob);
    await expect(queue.enqueue('r1')).rejects.toThrow('db');
    expect(job.kick).not.toHaveBeenCalled();
  });
});
