// Meta WhatsApp Cloud API error codes the platform reacts to, by name (docs/12 §3). The sender,
// the inbox and the webhook compare against these instead of bare numbers.

export const WA_ERROR = {
  // Throttling and Meta-side outages: worth another try.
  apiUnknown: 1,
  apiService: 2,
  appRateLimit: 4,
  accountRateLimit: 80007,
  throughputLimit: 130429,
  somethingWentWrong: 131000,
  serviceUnavailable: 131016,
  spamRateLimit: 131048,
  ecosystemLimit: 131049,
  pairRateLimit: 131056,
  maintenance: 131057,
  serverUnavailable: 133004,
  // The access token expired or lost its permissions.
  permissionDenied: 10,
  tokenExpired: 190,
  permissionError: 200,
  // The account, until an admin fixes it in Meta.
  paymentIssue: 131042,
  accountLocked: 131031,
  policyBlocked: 368,
  certificateError: 131045,
  numberNotRegistered: 133010,
  displayNameNotApproved: 131037,
  // This message.
  invalidParameter: 100,
  undeliverable: 131026,
  recipientNotAllowed: 131030,
  sameSenderRecipient: 131021,
  reEngagement: 131047,
  marketingOptOut: 131050,
  mediaType: 131053,
  unavailable: 131060,
  outsideWindow: 470,
  paramCountMismatch: 132000,
  templateMissing: 132001,
  paramFormatMismatch: 132012,
  templatePaused: 132015,
  templateDisabled: 132016,
} as const;

export type WaErrorName = keyof typeof WA_ERROR;
export type WaErrorCode = (typeof WA_ERROR)[WaErrorName];
