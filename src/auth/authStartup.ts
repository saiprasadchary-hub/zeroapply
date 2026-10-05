export const AUTH_STARTUP_TIMEOUT_MS = 5_000;

/** A slow auth restore must not prevent access to the login/guest interface. */
export function watchAuthStartup(
  onTimeout: () => void,
  timeoutMs: number = AUTH_STARTUP_TIMEOUT_MS,
): () => void {
  const timer: ReturnType<typeof setTimeout> = setTimeout(onTimeout, timeoutMs);
  return (): void => clearTimeout(timer);
}
