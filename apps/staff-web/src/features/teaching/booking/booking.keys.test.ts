import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { bookingKeys, invoiceKeys, isCourseChangeCheck, threadMediaKeys } from './booking.keys';

describe('booking keys', () => {
  it('keeps the key shapes the booking screens already cache under', () => {
    expect(bookingKeys.teachers('admin', 'g=f')).toEqual(['booking', 'admin', 'teachers', 'g=f']);
    expect(bookingKeys.check('sales', '{}')).toEqual(['booking', 'sales', 'check', '{}']);
    expect(bookingKeys.trialDateCheck('admin', '{}')).toEqual([
      'booking',
      'admin',
      'trial-date-check',
      '{}',
    ]);
    expect(bookingKeys.courseChange('sub1')).toEqual(['booking', 'admin', 'course-change', 'sub1']);
    expect(bookingKeys.courseChangeCheck('sales', '/b', '{}')).toEqual([
      'booking',
      'sales',
      'course-change-check',
      '/b',
      '{}',
    ]);
    expect(bookingKeys.makeupCandidates('s1')).toEqual(['booking', 'makeup-candidates', 's1']);
  });

  it('keeps the invoice and chat media shapes', () => {
    expect(invoiceKeys.list('q=1')).toEqual(['invoices', 'q=1']);
    expect(invoiceKeys.download('i1')).toEqual(['invoices', 'download', 'i1']);
    expect(threadMediaKeys.list('+9665')).toEqual(['threads', '+9665', 'media']);
    expect(threadMediaKeys.url('+9665', 'm1')).toEqual(['threads', '+9665', 'media', 'm1']);
  });

  it('tells the mounted series check apart from the other booking reads', () => {
    expect(isCourseChangeCheck(bookingKeys.courseChangeCheck('admin', '/b', '{}'))).toBe(true);
    expect(isCourseChangeCheck(bookingKeys.courseChange('sub1'))).toBe(false);
    expect(isCourseChangeCheck(bookingKeys.check('admin', '{}'))).toBe(false);
  });

  it('re-reads the chat media when a lead write refreshes the chats', async () => {
    const media = [threadMediaKeys.list('+9665'), threadMediaKeys.url('+9665', 'm1')];
    expect(await staleAfter([...media, invoiceKeys.list('q')], ['threads'])).toEqual(media);
  });
});
