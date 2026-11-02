/** A supabase read or write failed: one error naming the step (the threads repositories). */
export function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}
