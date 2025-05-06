import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
// Компонент кнопки вкладки с тактильной обратной связью (только iOS)
export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        // Активация легкой вибрации на iOS при нажатии
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        // Вызов оригинального обработчика нажатия, если задан
        props.onPressIn?.(ev);
      }}
    />
  );
}
