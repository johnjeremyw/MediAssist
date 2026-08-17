import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pushTokens } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // F2: audio alert alongside the push
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission and registers the device's Expo push
 * token with the backend (F2/F4 rely on this to reach the patient/caregiver).
 * Best-effort: failures (web platform, no physical device, EAS project not
 * configured, permission denied) are swallowed by the caller.
 */
export async function registerForPushNotifications() {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  await pushTokens.register(token, Platform.OS);
  return token;
}
