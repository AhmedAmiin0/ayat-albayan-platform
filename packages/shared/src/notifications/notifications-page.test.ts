import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { NOTIFICATIONS_PAGE_MAX, notificationsQuerySchema } from './views';

describe('GET /notifications page query, pinned before it spreads pageQuery', () => {
  it.each(pageGoldenCases({ size: 20, max: NOTIFICATIONS_PAGE_MAX, lastPage: 10_000 }))(
    'answers $input as today',
    ({ input, expected }) => {
      expect(pageOutcome(notificationsQuerySchema, input)).toEqual(expected);
    },
  );
});
