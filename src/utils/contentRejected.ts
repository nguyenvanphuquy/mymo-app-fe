export function isContentRejected(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  return lower.includes('thuần phong') || lower.includes('content_rejected') || lower.includes('không thể đăng');
}
