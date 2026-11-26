import { describe, expect, it } from 'vitest';
import { pdfFailureSchema, popplerToolSchema } from '@/modules/messaging/inbox/files/pdf/pdf.schemas';

describe('pdf schemas', () => {
  it('names the two poppler tools and nothing else', () => {
    expect(popplerToolSchema.options).toEqual(['pdfinfo', 'pdftoppm']);
    expect(popplerToolSchema.safeParse('pdftotext').success).toBe(false);
  });

  it('names the three failure reasons and nothing else', () => {
    expect(pdfFailureSchema.options).toEqual(['busy', 'failed', 'unavailable']);
    expect(pdfFailureSchema.safeParse('timeout').success).toBe(false);
  });
});
