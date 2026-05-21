// Module-level variable — survives within a single JS runtime session
// (i.e. from cold start until app is killed again)
let _pendingScreen: string | null = null;

export function setPendingNotificationScreen(screen: string) {
  _pendingScreen = screen;
}

export function consumePendingNotificationScreen(): string | null {
  const screen = _pendingScreen;
  _pendingScreen = null; // consume once
  return screen;
}
