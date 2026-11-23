/**
 * The region the browser's language tag names («ar-QA» → QA, «en-GB» → GB), the web's stand-in
 * for the phone's region (#752). A bare «ar» or «en» names none, so no guess: the number then
 * starts in Saudi Arabia (client-core defaultCountry), and the picker lists the usual ones first.
 */
export function browserRegion(language: string | undefined): string | null {
  return language ? (new Intl.Locale(language).region ?? null) : null;
}
