/** The signed link answers as an attachment, so the browser saves it and stays on the page. */
export function saveFile(url: string): void {
  window.location.assign(url);
}
