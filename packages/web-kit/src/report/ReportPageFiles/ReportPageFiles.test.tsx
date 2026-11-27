import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { pageView } from '@ab/web-kit/report/page.fixture';
import { ReportPageFiles } from './ReportPageFiles';

const s = () => t.reportPage;

describe('ReportPageFiles: the teacher files, then the PDF', () => {
  it('numbers each file, opens it in a new tab and links the PDF', () => {
    render(<ReportPageFiles view={pageView()} />);
    expect(screen.getByRole('heading', { name: s().files })).toBeTruthy();
    const file = screen.getByRole('link', { name: s().file.replace('{n}', '1') });
    expect(file.getAttribute('href')).toBe('https://files.example/a');
    expect(file.getAttribute('target')).toBe('_blank');
    const pdf = screen.getByRole('link', { name: s().downloadPdf });
    expect(pdf.getAttribute('href')).toBe('https://files.example/report.pdf');
  });

  it('no files: no heading; no PDF yet: the wait line instead of the link', () => {
    render(<ReportPageFiles view={pageView({ attachments: [], pdf: null })} />);
    expect(screen.queryByRole('heading', { name: s().files })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(s().pdfPending)).toBeTruthy();
  });
});
