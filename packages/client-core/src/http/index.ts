// The one apiFetch / ApiError for both apps lands here in E1 (docs/27 §5 Wave E).

/** The header that tags each API call with its client (`web/<build>`, `mobile/<build>`; docs/26 §2f). */
export const CLIENT_HEADER = 'X-AB-Client';
