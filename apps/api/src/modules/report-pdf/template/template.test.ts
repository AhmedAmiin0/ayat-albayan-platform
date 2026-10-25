import { describe, expect, it } from 'vitest';
import { absentModel, sampleModel, STUB_ASSETS } from '../report-pdf.fakes';
import { reportHtml } from './template';
import { REPORT_CSS } from './template.css';

describe('reportHtml — the lesson report page (R-REP-03, docs/07 §13)', () => {
  it('attended lesson: matches the reviewed HTML', async () => {
    await expect(reportHtml(sampleModel(), STUB_ASSETS)).toMatchFileSnapshot(
      '__snapshots__/report-attended.html',
    );
  });

  it('absent student: dashes, no pips, no package line', async () => {
    const html = reportHtml(absentModel(), STUB_ASSETS);
    await expect(html).toMatchFileSnapshot('__snapshots__/report-absent.html');
    expect(html).not.toContain('class="pip');
    expect(html).not.toContain('class="pkg"');
    expect(html).toContain('غياب بدون إشعار');
  });

  it('is an RTL Arabic page with the cartouche, the six rubrics and the overall grade', () => {
    const html = reportHtml(sampleModel(), STUB_ASSETS);
    expect(html).toContain('<html lang="ar" dir="rtl" data-theme="light">');
    expect(html).toContain('<div class="cartouche">تقرير الحلقة</div>');
    for (const rubric of ['التلاوة والنطق', 'الحفظ الجديد', 'المراجعة', 'التجويد', 'الاستيعاب والتفاعل', 'الالتزام والحضور']) {
      expect(html).toContain(`<span class="k">${rubric}</span>`);
    }
    expect(html).toContain('<span class="w">جيد جدًا</span>');
  });

  it('derives the identity: code, local date, zone, duration and «6 من 8»', () => {
    const html = reportHtml(sampleModel(), STUB_ASSETS);
    expect(html).toContain('<bdi dir="ltr" class="ltr">AB-0183</bdi>');
    expect(html).toContain('<bdi dir="ltr" class="ltr">2026-09-29</bdi>');
    expect(html).toContain('<bdi dir="ltr" class="ltr">17:00</bdi> بتوقيت الرياض');
    expect(html).toContain('<div class="sub">60 دقيقة</div>');
    expect(html).toContain('<bdi dir="ltr" class="ltr">6</bdi> من <bdi dir="ltr" class="ltr">8</bdi>');
    expect(html).toContain('الباقة: بقيت حلقتان');
  });

  it('shows the time in the guardian zone, with that zone named', () => {
    const html = reportHtml(sampleModel({ tz: 'Africa/Cairo' }), STUB_ASSETS);
    expect(html).toContain('<bdi dir="ltr" class="ltr">17:00</bdi> بتوقيت القاهرة');
  });

  it('pips: ممتاز fills 5, يحتاج إلى مراجعة fills 1 (greyscale-safe shapes)', () => {
    const html = reportHtml(sampleModel(), STUB_ASSETS);
    const commitment = /الالتزام والحضور<\/span><span class="pips"[^>]*>(.*?)<\/span>/.exec(html)?.[1] ?? '';
    expect(commitment.match(/pip on/g)).toHaveLength(1);
    expect(commitment.match(/<i /g)).toHaveLength(5);
  });

  it('escapes what the teacher typed and keeps their line breaks', () => {
    const html = reportHtml(sampleModel({ notes: '<script>x</script> & "y"\nسطر' }), STUB_ASSETS);
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt; &amp; &quot;y&quot;<br>سطر');
    expect(html).not.toContain('<script>');
  });

  it('uses Western digits only (docs/07 §2)', () => {
    expect(reportHtml(sampleModel(), STUB_ASSETS)).not.toMatch(/[٠-٩]/);
  });

  it('sets nothing below 12px (docs/07 principle 5)', () => {
    const sizes = [...REPORT_CSS.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(10);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
  });
});
