import React, { useEffect } from 'react';
import { DarkTheme as NavigationDarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

const customDarkTheme = {
  ...PaperDarkTheme,
  colors: {
    ...PaperDarkTheme.colors,
    primary: '#176c3a',
    background: '#232428',
    surface: '#232428',
    elevation: { ...PaperDarkTheme.colors.elevation, level2: '#232428' },
    onSurface: '#fff',
    onBackground: '#fff',
    outline: '#444',
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuth();

  // Скрываем экран загрузки после определения состояния авторизации и загрузки шрифтов (предполагается, что loaded передается или проверяется здесь)
  useEffect(() => {
    if (!isLoading) { // Предполагается, что проверка isLoading достаточна, или объединяется с проверкой загрузки шрифтов, если необходимо
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Показываем пустой экран во время проверки авторизации
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#232428' }} />;
  }

  return (
    <ThemeProvider value={NavigationDarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="login" />
        ) : (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="create-delivery" />
          </>
        )}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

// Предотвращаем автоматическое скрытие экрана загрузки до завершения загрузки ресурсов.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });


  // Обрабатываем ошибку загрузки шрифтов
  useEffect(() => {
    if (error) {
      console.error("Error loading fonts:", error); 
    }
  }, [error]);

  if (!loaded && !error) { // Показываем экран загрузки (или null) только если загружается и нет ошибки
    return null; // Возвращаем null или компонент экрана загрузки пока загружается
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={customDarkTheme}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
