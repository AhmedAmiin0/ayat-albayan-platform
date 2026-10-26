import { localDate } from './pdf-text';

// R-REP-03 / docs/07 §13 want one A4 page. A short report fits with ~100pt to spare; seven
// fields of ~165 characters, or notes of ~660, already flow onto a second page. Such a report is
// printed again with a footer on every page: the student code, the lesson date and «n / total»,
// so a loose page 2 still says whose it is.

/** Page objects in a PDF Chromium printed (not the /Pages tree). */
export function pageCount(pdf: Uint8Array): number {
  return Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

/** «AB-0183 | 2026-09-29»: ASCII only, the footer template cannot use the embedded fonts. */
export function footerLabel(input: { code: string; startsAt: Date; tz: string }): string {
  return `${input.code} | ${localDate(input.startsAt, input.tz)}`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** Chromium footerTemplate: 12px (docs/07 floor), centred in the 10mm bottom margin. */
export function footerTemplate(label: string): string {
  return (
    '<div style="width:100%;text-align:center;direction:ltr;font:12px sans-serif;color:#5f5a50">' +
    `${escapeHtml(label)} | <span class="pageNumber"></span> / <span class="totalPages"></span></div>`
  );
}
