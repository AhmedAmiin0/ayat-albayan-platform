import { describe, expect, it } from 'vitest';
import { STUB_ASSETS } from '../report-pdf.fakes';
import { FAMILY_CSS } from './family-css';
import { content, familyModel } from './family.fakes';
import { familyHtml } from './family-template';

const html = (over: Parameters<typeof familyModel>[0] = {}) => familyHtml(familyModel(over), STUB_ASSETS);

describe('familyHtml — the v2 report the family receives (ParentReport.dc.html)', () => {
  it('Quran, attended: matches the reviewed HTML', async () => {
    await expect(html()).toMatchFileSnapshot('__snapshots__/family-quran.html');
  });

  it('is an RTL Arabic page: header, attendance chip, then the design’s sections in order', () => {
    const page = html();
    expect(page).toContain('<html lang="ar" dir="rtl" data-theme="light">');
    expect(page).toContain('<h1>تقرير حلقة يوسف</h1>');
    expect(page).toContain('<span class="chip tone-ok">حضر في الموعد</span>');
    const order = ['<h2>ما أنجزه اليوم', '>التقدير العام<', '<h2>التقدّم في الحفظ', '<h2>الواجب قبل الحلقة القادمة', '<h2>ملاحظة المعلم/ة', '<h2>الحلقة القادمة'];
    const at = order.map((t) => page.indexOf(t));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('done today: each part with its range and grade, the tajweed line, the overall grade', () => {
    const page = html();
    expect(page).toContain('<span class="k">الحفظ الجديد</span><span class="v">سورة الملك 16–22</span></div><span class="pill">جيد جدًا</span>');
    expect(page).toContain('<span class="k">المراجعة</span><span class="v">سورة القلم 1–20</span></div><span class="pill">جيد</span>');
    expect(page).toContain('الدرس النظري: أحكام النون الساكنة والتنوين');
    expect(page).toContain('<span class="w">جيد جدًا</span>');
  });

  it('juz progress, completed juz, homework, note with the quick notes, next lesson and lessons left', () => {
    const page = html();
    expect(page).toContain('<span>الجزء 29 (تبارك)</span><span>2 من 20 صفحة</span>');
    expect(page).toContain('style="width:10%"');
    expect(page).toContain('أتمّ حفظ: جزء عم');
    expect(page).toContain('مراجعة سورة الملك من الآية 1 إلى 22 يوميًا.');
    expect(page).toContain('أحسنت، استمر. تحسّنت المدود كثيرًا هذا الأسبوع.');
    expect(page).toContain('الخميس <bdi dir="ltr" class="ltr">2026-10-29</bdi>');
    expect(page).toContain('الحفظ الجديد: سورة الملك 23–30');
    expect(page).toContain('باقي في الباقة: بقيت 3 حلقات');
    expect(page).toContain('الحلقة <bdi dir="ltr" class="ltr">9</bdi> من <bdi dir="ltr" class="ltr">12</bdi>');
  });

  it('Arabic and Islamic studies: their own rows, no juz progress', () => {
    const arabic = html({ program: 'arabic', progress: null, content: content({ arabic: { topic: 'الجملة الاسمية', skills: { reading: 'excellent', writing: 'good' } } }) });
    expect(arabic).toContain('موضوع الدرس: الجملة الاسمية');
    expect(arabic).toContain('<span class="k">الكتابة</span></div><span class="pill">جيد</span>');
    expect(arabic).not.toContain('التقدّم في الحفظ');
    const islamic = html({ program: 'islamic_studies', progress: null, content: content({ islamic: { domain: 'fiqh', topic: 'أركان الوضوء', memorized: 'حديث: إنما الأعمال بالنيات', rates: { comprehension: 'excellent' } } }) });
    expect(islamic).toContain('الفقه: أركان الوضوء');
    expect(islamic).toContain('المحفوظ: حديث: إنما الأعمال بالنيات');
    expect(islamic).toContain('<span class="k">الاستيعاب</span></div><span class="pill">ممتاز</span>');
  });

  it('absent: one attendance line, the note and the next lesson; no content, grades or homework', async () => {
    const page = html({ attendance: 'absent', content: content({}), overall: null, homework: null, progress: null, nextPlan: null, notes: 'نرجو إبلاغنا مسبقًا.' });
    await expect(page).toMatchFileSnapshot('__snapshots__/family-absent.html');
    expect(page).toContain('لم تُعقد الحلقة: غياب بدون إشعار.');
    expect(page).toContain('<span class="chip tone-bad">غياب بدون إشعار</span>');
    for (const hidden of ['ما أنجزه اليوم', 'التقدير العام', 'التقدّم في الحفظ', 'الواجب قبل']) expect(page).not.toContain(hidden);
    expect(page).toContain('نرجو إبلاغنا مسبقًا.');
  });

  it('escapes what the teacher typed and uses Western digits only', () => {
    const page = html({ notes: '<script>x</script>' });
    expect(page).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(page).not.toContain('<script>');
    expect(page).not.toMatch(/[٠-٩]/);
  });

  it('sets nothing below 12px', () => {
    const sizes = [...FAMILY_CSS.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
  });
});
