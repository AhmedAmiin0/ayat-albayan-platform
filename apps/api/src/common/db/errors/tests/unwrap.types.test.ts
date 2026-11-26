import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { describe, expectTypeOf, it } from 'vitest';
import { maybe, one, rows } from '@/common/db/errors';

interface Row {
  id: string;
}

describe('the helpers take their data type from the supabase response', () => {
  it('a list read gives its rows, maybe keeps null, one drops it', () => {
    expectTypeOf(rows<PostgrestSingleResponse<Row[]>>).returns.toEqualTypeOf<Row[]>();
    expectTypeOf(maybe<PostgrestSingleResponse<Row | null>>).returns.toEqualTypeOf<Row | null>();
    expectTypeOf(one<PostgrestSingleResponse<Row | null>>).returns.toEqualTypeOf<Row>();
    expectTypeOf(one<PostgrestSingleResponse<Row>>).returns.toEqualTypeOf<Row>();
  });
});
