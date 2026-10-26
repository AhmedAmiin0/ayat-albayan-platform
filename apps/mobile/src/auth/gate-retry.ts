const listeners = new Set<() => void>();

/** «إعادة المحاولة» on the startup screen: the gate asks for the session and its role again. */
export function retryGate(): void {
  listeners.forEach((listener) => listener());
}

/** useAuthGate listens while mounted. */
export function onGateRetry(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
