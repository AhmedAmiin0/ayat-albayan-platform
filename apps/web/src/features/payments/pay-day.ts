/** Today in Riyadh (YYYY-MM-DD): the payment date field's default and its latest day. */
export function paidAtDay(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}
