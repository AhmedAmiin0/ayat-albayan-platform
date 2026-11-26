import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { GoogleMapQueries } from '@/modules/platform/google-sync/map/google-map.queries';

describe('GoogleMapQueries.students', () => {
  it('filter syntax in the search text cannot widen the or filter', async () => {
    const { db, argsOf } = fakeDb({ students: [{ data: [] }] });
    await new GoogleMapQueries(db).students(' a*b:"c"\\ ');
    expect(argsOf('students', 'or')).toEqual(['name.ilike.%a b  c%,code.ilike.%a b  c%']);
  });

  it('a failed read answers through the default db error map', async () => {
    const { db } = fakeDb({ students: [{ error: PG_ERRORS.other }, { error: PG_ERRORS.unique }] });
    await expect(new GoogleMapQueries(db).students('')).rejects.toThrow('db error XX000: boom');
    expect((await answerOfRejection(new GoogleMapQueries(db).students(''))).status).toBe(409);
  });
});
