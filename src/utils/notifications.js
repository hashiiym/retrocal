// Notification manager for Web Push API, HTML5 notifications, and in-app retro alerts
import { sound } from './audio';

class NotificationManager {
  constructor() {
    this.permission = typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default';
    this.alertListeners = new Set();
    this.notifiedTaskIds = new Set();
    this.timerId = null;
  }

  // Request browser notification permission
  async requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      if (result === 'granted') {
        this.sendNotification({
          title: 'RETROCAL SYSTEM ALERT',
          body: 'Browser push notifications active. You will be alerted for scheduled tasks.',
          icon: '/favicon.svg'
        });
      }
      return result;
    } catch (e) {
      console.warn('Notification permission error:', e);
      return 'denied';
    }
  }

  // Register listener for in-app retro pop-ups
  onAlert(callback) {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  triggerAlert(alert) {
    sound.playAlarm();
    this.alertListeners.forEach(cb => cb(alert));
  }

  // Send native browser notification
  sendNotification({ title, body, icon }) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><rect width="24" height="24" fill="black"/><text x="12" y="17" fill="white" font-family="monospace" font-size="16" text-anchor="middle">!</text></svg>',
          badge: icon,
        });
      } catch (e) {
        console.warn('Native notification failed:', e);
      }
    }
  }

  // Start background task reminder checker
  startTaskReminderCheck(getTasks) {
    if (this.timerId) clearInterval(this.timerId);

    const check = () => {
      const tasks = getTasks();
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTotalMins = currentHours * 60 + currentMins;

      tasks.forEach(task => {
        if (task.completed || !task.date || !task.time || !task.reminder || task.reminder === 'none') {
          return;
        }

        // Only check today's tasks
        if (task.date !== currentDateStr) return;

        const [th, tm] = task.time.split(':').map(Number);
        const taskTotalMins = th * 60 + tm;

        // Reminder offsets
        let offsetMins = 0;
        if (task.reminder === '5m') offsetMins = 5;
        if (task.reminder === '15m') offsetMins = 15;
        if (task.reminder === '30m') offsetMins = 30;
        if (task.reminder === '1h') offsetMins = 60;

        const triggerTimeMins = taskTotalMins - offsetMins;
        const alertKey = `${task.id}-${task.reminder}-${task.date}`;

        // Check if within 1 minute of trigger
        if (Math.abs(currentTotalMins - triggerTimeMins) <= 1 && !this.notifiedTaskIds.has(alertKey)) {
          this.notifiedTaskIds.add(alertKey);

          const timeDisplay = task.time;
          const alertMessage = offsetMins > 0 
            ? `Reminder: "${task.title}" is due in ${offsetMins} minutes (${timeDisplay})!`
            : `Time for: "${task.title}" (${timeDisplay})!`;

          // In-app alert
          this.triggerAlert({
            id: alertKey,
            title: 'TASK REMINDER',
            message: alertMessage,
            task,
            timestamp: new Date().toLocaleTimeString(),
          });

          // System browser notification
          this.sendNotification({
            title: `[RETROCAL] ${task.title}`,
            body: alertMessage,
          });
        }
      });
    };

    // Check every 15 seconds
    this.timerId = setInterval(check, 15000);
    check();
  }

  stopTaskReminderCheck() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const notifications = new NotificationManager();
