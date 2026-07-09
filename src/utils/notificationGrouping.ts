import type { Lang } from '../i18n';
import type { NotificationItem, NotificationSender, NotificationUiType } from '../services/notificationsApi';

const GROUPABLE_TYPES: NotificationUiType[] = ['like', 'comment'];

function dedupeSenders(items: NotificationItem[]): NotificationSender[] {
  const seen = new Set<string>();
  const result: NotificationSender[] = [];

  for (const item of items) {
    const userId = item.senderId || item.id;
    if (seen.has(userId)) continue;
    seen.add(userId);
    result.push({
      userId,
      displayName: item.senderName || item.title || 'Someone',
      avatarUrl: item.avatarUrl ?? null,
    });
  }

  return result;
}

function formatGroupedBody(
  lang: Lang,
  type: NotificationUiType,
  senders: NotificationSender[],
): string {
  const names = senders.map(s => s.displayName).filter(Boolean);
  const a = names[0] || '';
  const b = names[1] || '';
  const others = Math.max(0, names.length - 2);

  if (type === 'like') {
    if (lang === 'vi') {
      if (others > 0) return `${a}, ${b} và ${others} người khác đã thả tim bài đăng của bạn`;
      if (names.length >= 2) return `${a} và ${b} đã thả tim bài đăng của bạn`;
    } else {
      if (others > 0) return `${a}, ${b} and ${others} others liked your post`;
      if (names.length >= 2) return `${a} and ${b} liked your post`;
    }
  }

  if (type === 'comment') {
    if (lang === 'vi') {
      if (others > 0) return `${a}, ${b} và ${others} người khác đã bình luận bài đăng của bạn`;
      if (names.length >= 2) return `${a} và ${b} đã bình luận bài đăng của bạn`;
    } else {
      if (others > 0) return `${a}, ${b} and ${others} others commented on your post`;
      if (names.length >= 2) return `${a} and ${b} commented on your post`;
    }
  }

  return '';
}

export function groupNotifications(items: NotificationItem[], lang: Lang = 'vi'): NotificationItem[] {
  const groupMap = new Map<string, NotificationItem[]>();
  const standalone: NotificationItem[] = [];

  for (const item of items) {
    if (GROUPABLE_TYPES.includes(item.type) && item.postId) {
      const key = `${item.type}:${item.postId}`;
      const bucket = groupMap.get(key) ?? [];
      bucket.push(item);
      groupMap.set(key, bucket);
    } else {
      standalone.push(item);
    }
  }

  const grouped: NotificationItem[] = [];

  for (const [key, members] of groupMap) {
    members.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );

    if (members.length === 1) {
      grouped.push(members[0]);
      continue;
    }

    const senders = dedupeSenders(members);
    const body = formatGroupedBody(lang, members[0].type, senders);

    grouped.push({
      id: `group-${key}`,
      type: members[0].type,
      body,
      title: senders[0]?.displayName,
      senderName: senders[0]?.displayName,
      avatarUrl: senders[0]?.avatarUrl ?? null,
      createdAt: members[0].createdAt,
      isRead: members.every(m => m.isRead),
      senderId: senders[0]?.userId,
      postId: members[0].postId ?? null,
      referenceId: members[0].referenceId,
      groupIds: members.map(m => m.id),
      senders,
      isGrouped: true,
      count: senders.length,
    });
  }

  return [...standalone, ...grouped].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}
