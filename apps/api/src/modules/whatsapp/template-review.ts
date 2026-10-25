import { ar } from '../../common/i18n/server-text';
import { paramNames } from './messages/wa-json';
import type { SampleFile, TemplateRow } from './whatsapp.types';

// What Meta's template review gets besides the text (docs/12 §3.4): a realistic value for every
// {{n}}, report_ready's sample PDF, and the body rules Meta rejects a submission on.

/**
 * By message_templates.params name (migration 141), shaped like what the producers send. The values
 * live in ar.json templates.reviewSamples (the templates are Arabic, so their samples are too).
 */
const samples = (): Readonly<Record<string, string>> => ar.templates.reviewSamples;

/** example.body_text[0]: one value per {{n}}, in order; an unknown name is its own sample. */
export function bodyExamples(row: TemplateRow): string[] {
  return paramNames(row.params).map((name) => samples()[name] ?? name);
}

const VAR = /\{\{(\d+)\}\}/g;

/**
 * Why Meta would reject this body, or null: a variable at the very start or end, two variables
 * side by side, numbering that skips ({{1}} {{3}}), or a variable without a sample value.
 */
export function templateProblem(row: TemplateRow): string | null {
  const body = row.body_ar.trim();
  const used = new Set([...body.matchAll(VAR)].map((m) => Number(m[1])));
  const count = Math.max(0, ...used);
  const names = paramNames(row.params).length;
  if (/^\{\{\d+\}\}/.test(body) || /\{\{\d+\}\}$/.test(body)) return 'a variable at the start or end of the body';
  if (/\}\}\s*\{\{/.test(body)) return 'two variables side by side';
  if (used.size !== count) return 'variables must be numbered 1..n';
  if (names !== count) return `${count} variables but ${names} sample values`;
  return null;
}

// «نموذج تقرير حلقة»: a 1 KB one-page PDF, built once by hand (Latin text: the PDF base fonts have
// no Arabic glyphs, and embedding one would be tens of KB). Meta only shows it to the reviewer.
const SAMPLE_REPORT_B64 = [
  'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUg',
  'L1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAg',
  'UiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA0IDAgUiA+PiA+PiAvQ29udGVudHMg',
  'NSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNh',
  'IC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNDM3ID4+CnN0cmVhbQpCVAov',
  'RjEgMjAgVGYgNTYgNzcwIFRkIChBeWF0IEFsLUJheWFuIEFjYWRlbXkpIFRqCi9GMSAxNCBUZiAwIC0zMCBUZCAoTGVzc29uIHJl',
  'cG9ydCAtIHNhbXBsZSkgVGoKL0YxIDExIFRmIDE2IFRMIDAgLTM0IFRkCihTdHVkZW50OiBBaG1lZCkgVGogVCoKKExlc3Nvbjog',
  'U3VuZGF5IDQgT2N0b2JlciwgNTowMCBQTSkgVGogVCoKKFJlY2l0YXRpb246IEFsLU11bGsgMS0xMCwgZXhjZWxsZW50KSBUaiBU',
  'KgooTmV3IG1lbW9yaXphdGlvbjogQWwtTXVsayAxMS0xNSkgVGogVCoKKFJldmlzaW9uOiBKdXogQW1tYSkgVGogVCoKKFRhandl',
  'ZWQ6IG5vb24gc2FraW5haCBhbmQgdGFud2VlbikgVGogVCoKKFRlYWNoZXIgbm90ZXM6IHN0ZWFkeSBwcm9ncmVzcywga2VlcCBy',
  'ZXZpc2luZyBkYWlseS4pIFRqIFQqCihOZXh0IGhvbWV3b3JrOiBBbC1NdWxrIDE2LTIwKSBUagpFVAplbmRzdHJlYW0KZW5kb2Jq',
  'CnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAw',
  'MDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MSAwMDAwMCBuIAowMDAwMDAwMzM4IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAv',
  'Um9vdCAxIDAgUiA+PgpzdGFydHhyZWYKODI2CiUlRU9GCg==',
].join('');

/** The header sample of a document-header template (report_ready), uploaded at each submit. */
export const SAMPLE_REPORT: SampleFile = {
  name: 'lesson-report-sample.pdf',
  mime: 'application/pdf',
  bytes: new Uint8Array(Buffer.from(SAMPLE_REPORT_B64, 'base64')),
};
