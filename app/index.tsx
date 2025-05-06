import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { isAuthenticated } = useAuth();
  // Перенаправляем:
  // - если авторизован → на главный экран (вкладки)
  // - иначе → на экран входа
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/login"} />;
} 