/**
 * Opens a link that is only known after an await (a signed URL minted per tap). A tab opened after the
 * await is blocked as a pop-up on phones, so the blank tab opens inside the tap and is pointed at the URL
 * once it arrives; it closes again when the link could not be had.
 */
export async function openAfter(getUrl: () => Promise<string>): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const url = await getUrl();
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
