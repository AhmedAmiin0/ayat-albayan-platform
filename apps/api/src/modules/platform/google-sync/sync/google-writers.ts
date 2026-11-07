import { Injectable } from '@nestjs/common';
import type { GoogleSyncKind } from '@ab/shared';
import { CalendarWriter } from '@/modules/platform/google-sync/writers/calendar/calendar.writer';
import { ReportPdfWriter } from '@/modules/platform/google-sync/writers/drive/report-pdf.writer';
import { SheetRowsWriter } from '@/modules/platform/google-sync/writers/sheets/sheet-rows.writer';
import type { ItemWriter } from './write-context';

/** The writer of each item kind. */
@Injectable()
export class GoogleWriters {
  constructor(
    private readonly calendar: CalendarWriter,
    private readonly pdf: ReportPdfWriter,
    private readonly rows: SheetRowsWriter,
  ) {}

  of(kind: GoogleSyncKind): ItemWriter {
    if (kind === 'teacher_event' || kind === 'main_event') return this.calendar;
    return kind === 'report_pdf' ? this.pdf : this.rows;
  }
}
