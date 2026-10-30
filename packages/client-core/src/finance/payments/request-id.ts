/** The clientRequestId of a form: made on the first send, re-sent on every retry until `settle()`. */
export interface PendingRequestId {
  current: () => string;
  /** After the API recorded it: the next send is a new payment with a new id. */
  settle: () => void;
}

/** One idempotency id per attempt, re-sent until the API answers (rule 8): a lost reply returns the payment already recorded. */
export function pendingRequestId(make: () => string): PendingRequestId {
  let id: string | null = null;
  return {
    current: () => (id ??= make()),
    settle: () => {
      id = null;
    },
  };
}
