import { Platform } from 'react-native';
import { API_URL as ENV_API_URL } from '@env';
// Для реальных устройств используем IP адрес компьютера
// export const API_URL = Platform.select({
//   android: 'http://10.0.2.2:8000',
//   ios: 'http://localhost:8000',
//   default: 'http://10.0.0.2:8000',
// });
export const API_URL = ENV_API_URL || 'https://reporttask.sytes.net';

export const API_ENDPOINTS = {
  LOGIN: '/api/identity/auth/jwt/create/',
  LOGOUT: '/api/identity/auth/jwt/logout/',
} as const; 