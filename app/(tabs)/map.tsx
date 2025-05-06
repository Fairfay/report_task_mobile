import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Appbar } from 'react-native-paper';
import { Stack } from 'expo-router';
import React from 'react';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Appbar.Header style={{ backgroundColor: '#232428' }}>
        <Appbar.Content title="Карта" titleStyle={{ color: '#fff' }} />
      </Appbar.Header>
      <View style={styles.content}>
        <ThemedText>Карта (Placeholder)</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#232428',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

}); 