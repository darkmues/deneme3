// ============================================================
// HAYAT Mobile — Push Notifications Setup
// ============================================================
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications only work on physical devices');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return null;
  }

  // Get Expo push token
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id', // Replace with your EAS project ID
  });

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'HAYAT Bildirimler',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8A838',
    });

    await Notifications.setNotificationChannelAsync('habits', {
      name: 'Alışkanlık Hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150],
      lightColor: '#34D399',
    });

    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Görev Hatırlatmaları',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#60A5FA',
    });
  }

  return token;
}

// Schedule a local notification
export async function scheduleLocalNotification(title, body, trigger, channelId = 'default') {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId } : {}),
    },
    trigger,
  });
}

// Schedule daily habit reminder
export async function scheduleHabitReminder(habitName, hour, minute) {
  return await scheduleLocalNotification(
    '🔥 Alışkanlık Zamanı!',
    `"${habitName}" alışkanlığını tamamlamayı unutma!`,
    {
      hour,
      minute,
      repeats: true,
    },
    'habits'
  );
}

// Cancel all notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Add notification response listener
export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export default {
  register: registerForPushNotifications,
  schedule: scheduleLocalNotification,
  scheduleHabitReminder,
  cancelAll: cancelAllNotifications,
  addResponseListener: addNotificationResponseListener,
};
