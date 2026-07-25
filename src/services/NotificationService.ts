/**
 * Browser Notification Service for Oguri Cap Web App
 * Supports Native Web Notifications API for direct messages & system alerts.
 */

export class NotificationService {
  private static permissionRequested = false;

  /**
   * Request Browser Notification permission if supported
   */
  public static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser Notification API is not supported in this environment.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (!this.permissionRequested) {
      this.permissionRequested = true;
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.error('Error requesting notification permission:', e);
      }
    }

    return (Notification.permission as string) === 'granted';
  }

  /**
   * Send a Browser Desktop/Mobile Notification
   */
  public static sendNotification(
    title: string,
    body: string,
    options: {
      icon?: string;
      tag?: string;
      onClick?: () => void;
    } = {}
  ) {
    if (!('Notification' in window) || (Notification.permission as string) !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: options.icon || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        tag: options.tag || 'oguri_chat_notification',
        silent: false,
      });

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };
    } catch (e) {
      console.error('Failed to trigger notification:', e);
    }
  }
}
