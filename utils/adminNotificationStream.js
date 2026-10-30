const adminStreams = new Set();

export function publishAdminNotification(notification) {
  if (!notification) return;

  const payload = JSON.stringify(
    typeof notification.toObject === "function"
      ? notification.toObject()
      : notification,
  );

  for (const response of adminStreams) {
    if (response.destroyed || response.writableEnded) {
      adminStreams.delete(response);
      continue;
    }

    try {
      response.write(`event: notification\ndata: ${payload}\n\n`);
    } catch (error) {
      adminStreams.delete(response);
    }
  }
}

export function addAdminNotificationStream(response) {
  adminStreams.add(response);
  return () => adminStreams.delete(response);
}
