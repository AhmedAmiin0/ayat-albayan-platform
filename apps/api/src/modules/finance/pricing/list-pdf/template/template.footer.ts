import { AR, esc, ltr } from '@/modules/reporting/report-pdf';
import type { PdfFooterContact } from '@/modules/finance/pricing/list-pdf/price-list-pdf.types';

/** The call to book a trial, the academy's WhatsApp and its site, both from the settings. */
export function footerHtml(c: PdfFooterContact): string {
  const cta = AR.pricing.pdf.cta;
  const site = c.site === undefined ? '' : `<span class="pill site">${ltr(c.site)}</span>`;
  return [
    '<footer class="foot"><div>',
    `<h2>${esc(cta.title)}</h2><p>${esc(cta.sub)}</p></div>`,
    `<p class="contact"><span class="pill wa">${esc(cta.whatsapp)} ${ltr(c.whatsapp)}</span>`,
    `${site}</p></footer>`,
  ].join('');
}
