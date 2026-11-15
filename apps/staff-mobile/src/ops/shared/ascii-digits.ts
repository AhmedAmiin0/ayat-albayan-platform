/** Western digits in, however they were typed (Arabic-Indic ٠-٩ allowed), trimmed. */
export const ascii = (v: string): string =>
  v.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
