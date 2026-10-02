// Invented messages. Parents asking for a teacher must not trip the job-seeker hint.
import { describe, expect, it } from 'vitest';
import { jobSeekerHints } from './job-seeker.ts';

describe('jobSeekerHints', () => {
  it('flags self-descriptions and work wording', () => {
    expect(jobSeekerHints(['السلام عليكم، أنا محفظة قرآن عندي خبرة'])).toEqual(['self']);
    expect(jobSeekerHints(['انا معلمة تجويد'])).toEqual(['self']);
    expect(jobSeekerHints(['هل عندكم وظيفة شاغرة؟'])).toEqual(['job']);
    expect(jobSeekerHints(['ممكن ابعت السيرة الذاتية'])).toEqual(['cv']);
    expect(jobSeekerHints(['attached my CV'])).toEqual(['cv']);
    expect(jobSeekerHints(['حابة اشتغل معاكم'])).toEqual(['work']);
    expect(jobSeekerHints(['أرغب في الانضمام إلى فريق المعلمات'])).toEqual(['join']);
  });

  it('lists every matching pattern', () => {
    expect(jobSeekerHints(['انا مدرسة', 'بدور على فرصة عمل'])).toEqual(['self', 'job']);
  });

  it('does not flag parents looking for a teacher', () => {
    for (const t of [
      'عايزة معلمة لبنتي',
      'محتاجين محفظة للأولاد',
      'هل المعلمة مجازة؟',
      'السلام عليكم ابني عنده اجازة',
      'كم سعر الحلقة؟',
    ])
      expect(jobSeekerHints([t])).toEqual([]);
  });

  it('reads only the first three texts', () => {
    expect(jobSeekerHints(['مرحبا', 'كم السعر', 'تمام', 'انا معلمة'])).toEqual([]);
  });

  it('handles no texts', () => {
    expect(jobSeekerHints([])).toEqual([]);
  });
});
