import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { notificationItem } from './notifications.mapper';

const ROW = {
  id: '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d',
  kind: 'new_lead' as const,
  title: 'عميل جديد',
  body: 'رسالة',
  data: { phone: '+966500000001', retries: 2 },
  created_at: '2026-11-27T21:00:00.123+00:00',
  read_at: null,
};

describe('notificationItem', () => {
  it('keeps only the string fields of data', () => {
    expect(notificationItem(ROW)).toEqual({ ...ROW, data: { phone: '+966500000001' } });
  });

  it('500 response_invalid for a row whose time has no offset', () => {
    const bad = { ...ROW, created_at: '2026-11-27 21:00:00' };
    expect(() => notificationItem(bad)).toThrow(InternalServerErrorException);
  });
});
