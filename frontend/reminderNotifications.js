
const deliveredThisSession = new Set();

export function notificationsSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    window.isSecureContext
  );
}

export function notificationPermission() {
  return notificationsSupported()
    ? Notification.permission
    : "unsupported";
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) {
    return "unsupported";
  }

  return Notification.requestPermission();
}

export function checkDueReminders(tasks, accountKey) {
  if (!accountKey || notificationPermission() !== "granted") {
    return [];
  }

  const storageKey =
    `snapback:reminder-delivery:${encodeURIComponent(accountKey)}`;

  let delivered = [];

  try {
    delivered = JSON.parse(localStorage.getItem(storageKey) || "[]");

    if (!Array.isArray(delivered)) {
      delivered = [];
    }
  } catch {
    delivered = [];
  }

  const deliveredSet = new Set(delivered);
  const newlyDelivered = [];
  const now = Date.now();

  for (const task of tasks) {
    if (
      task.completed ||
      !task.reminderAt ||
      typeof task.description !== "string"
    ) {
      continue;
    }

    const reminderTime = new Date(task.reminderAt).getTime();

    if (!Number.isFinite(reminderTime) || reminderTime > now) {
      continue;
    }

    const key = `${task.task}:${task.reminderAt}`;

    if (
      deliveredSet.has(key) ||
      deliveredThisSession.has(`${accountKey}:${key}`)
    ) {
      continue;
    }

    try {
      new Notification("SnapBack Reminder", {
        body: task.description,
        tag: key,
      });

      deliveredThisSession.add(`${accountKey}:${key}`);
      deliveredSet.add(key);
      newlyDelivered.push(task);
    } catch (error) {
      console.warn("Could not display reminder notification:", error);
    }
  }

  if (newlyDelivered.length) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify([...deliveredSet].slice(-500))
      );
    } catch {
      // Session-only deduplication still applies.
    }
  }

  return newlyDelivered;
}
