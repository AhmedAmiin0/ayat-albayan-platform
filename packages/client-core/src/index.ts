// @ab/client-core (docs/27 §3.4, D3): code shared by web and mobile only. No DOM and no React
// Native imports; react and @tanstack/react-query join as peers with the first hook (Wave E).
export * from './core/http/index.js';
export * from './core/keys/index.js';
export * from './core/auth/index.js';
export * from './people/users/index.js';
export * from './finance/payments/index.js';
export * from './people/assistants/index.js';
export * from './teaching/reports/index.js';
export * from './teaching/booking/index.js';
export * from './core/errors/index.js';
export * from './messaging/channels/index.js';
export * from './messaging/calls/index.js';
export * from './messaging/inbox/index.js';
export * from './messaging/chat-send/index.js';
