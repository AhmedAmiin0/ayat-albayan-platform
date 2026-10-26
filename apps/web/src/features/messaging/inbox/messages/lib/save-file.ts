// The browser side of «نسخ» and «تنزيل» (owner 2026-10-26).

/** Puts `text` on the clipboard; false when the browser refuses (http, old browser, denied). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a signed URL: the API signs it with Content-Disposition (the file's name), so the click
 * downloads without leaving the chat. A link click, not window.open: nothing for a popup blocker.
 */
export function saveUrl(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  a.download = '';
  document.body.append(a);
  a.click();
  a.remove();
}
