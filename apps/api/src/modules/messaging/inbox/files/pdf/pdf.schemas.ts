import { z } from 'zod';

export const popplerToolSchema = z.enum(['pdfinfo', 'pdftoppm']);
export type PopplerTool = z.infer<typeof popplerToolSchema>;

export const pdfFailureSchema = z.enum(['busy', 'failed', 'unavailable']);
export type PdfFailure = z.infer<typeof pdfFailureSchema>;
