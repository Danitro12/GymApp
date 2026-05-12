import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './context/LanguageContext';
import { TabProvider } from './context/TabContext';
import TabNavigator from './navigation/TabNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <TabProvider>
          <NavigationContainer>
            <StatusBar style="light" backgroundColor="#1a1a1a" />
            <TabNavigator />
          </NavigationContainer>
        </TabProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
