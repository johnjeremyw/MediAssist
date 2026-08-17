import { Platform } from 'react-native';

/**
 * Backend base URL.
 *
 * - Android emulator: 10.0.2.2 is the host machine's loopback.
 * - iOS simulator / web: localhost works directly.
 * - Physical device via Expo Go: neither of the above reaches your
 *   computer — replace this with your machine's LAN IP, e.g.
 *   'http://192.168.1.42:4000/api' (find it with `ipconfig`).
 *
 * Override at build time with EXPO_PUBLIC_API_URL if set.
 */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEV_HOST}:4000/api`;
