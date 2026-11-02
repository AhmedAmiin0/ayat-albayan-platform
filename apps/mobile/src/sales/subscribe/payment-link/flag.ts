// «رابط دفع» exists only in a Stripe build (docs/30): the build flag lives in core (the chats use it
// too); the Stripe screens import it from here, so their tests mock './flag'.
export { STRIPE_FEATURE } from '@/core/lib/stripe-flag';
