// notification.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor() {}

  requestPermission() {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }

  showNotification(title: string, options?: NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
}