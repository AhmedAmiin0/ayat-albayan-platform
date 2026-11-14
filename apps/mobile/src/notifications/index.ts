export { NotificationsScreen, type NotificationsScreenProps } from './NotificationsScreen';
// «محفظتي» refreshes when the bell gets a new «عمولة جديدة» (owner 2026-10-29).
export { useBellSignal } from './use-bell-signal';
// The teacher's «تنبيهات اليوم» reads the bell's query and marks rows read (owner 2026-11-14).
export { notificationsListQuery, useMarkRead } from './use-notifications';
