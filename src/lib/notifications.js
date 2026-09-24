const STORAGE_KEY = "lichhoc_notifications";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function seedNotifications() {
  const defaultList = [
    {
      id: "seed-1",
      title: "Cập nhật lịch học",
      message: "Lịch học của bạn đã được đồng bộ thành công cho tuần này.",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      read: false,
      kind: "success",
      recipient: "admin@lichhoc.local",
      actor: "Hệ thống",
    },
    {
      id: "seed-2",
      title: "Bảo mật tài khoản",
      message: "Admin đã cập nhật mật khẩu và xác thực mới cho tài khoản của bạn.",
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      read: false,
      kind: "security",
      recipient: "admin@lichhoc.local",
      actor: "Admin",
    },
    {
      id: "seed-3",
      title: "Ưu đãi học tập",
      message: "Bạn đang ở trong giai đoạn ưu tiên đổi lịch học; hệ thống hỗ trợ miễn phí 1 lần chỉnh sửa lịch.",
      createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      read: true,
      kind: "promo",
      recipient: "admin@lichhoc.local",
      actor: "LichHoc",
    },
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultList));
  window.dispatchEvent(new CustomEvent("lichhoc:notificationsChanged"));
  return defaultList;
}

export function getNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seedNotifications();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedNotifications();
    }

    return parsed;
  } catch {
    return seedNotifications();
  }
}

export function addNotification(notification) {
  const nextList = [
    {
      id: notification.id || createId(),
      title: notification.title || "Thông báo hệ thống",
      message: notification.message || "Bạn có một thông báo mới.",
      createdAt: notification.createdAt || new Date().toISOString(),
      read: notification.read ?? false,
      kind: notification.kind || "info",
      recipient: notification.recipient || "all",
      actor: notification.actor || "Hệ thống",
    },
    ...getNotifications(),
  ].slice(0, 12);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  window.dispatchEvent(new CustomEvent("lichhoc:notificationsChanged"));
  return nextList;
}

export function markAllNotificationsRead() {
  const nextList = getNotifications().map((item) => ({ ...item, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  window.dispatchEvent(new CustomEvent("lichhoc:notificationsChanged"));
  return nextList;
}

export function getUnreadNotificationsCount() {
  return getNotifications().filter((item) => !item.read).length;
}
