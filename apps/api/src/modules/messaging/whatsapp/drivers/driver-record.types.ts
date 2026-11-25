/** What a driver does that callers outside drivers/ used to decide by provider name. */
export interface DriverTraits {
  /** Meta's 131042 (payment) can come back, so the payment hold applies to its lane. */
  paymentHold: boolean;
  /** Its media ids can be fetched by our client. */
  fetchesMedia: boolean;
  /** The connection part of a lane key when the driver has one fixed connection. */
  fixedConn: string | null;
}
