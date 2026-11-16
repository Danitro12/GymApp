import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './context/LanguageContext';
import { TabProvider } from './context/TabContext';
import { ExercisesProvider } from './context/ExercisesContext';
import { WorkoutProvider } from './context/WorkoutContext';
import TabNavigator from './navigation/TabNavigator';
import { COLORS } from './data/theme';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.card,
    primary: COLORS.orange,
    border: COLORS.border,
  },
};

export default function App() {
  // En la web, pide al navegador que no borre el almacenamiento local de la
  // app (rutinas, historial, ejercicios propios y entreno en curso).
  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ExercisesProvider>
          <WorkoutProvider>
            <TabProvider>
              <NavigationContainer theme={navTheme} documentTitle={{ formatter: () => 'GymApp' }}>
                <StatusBar style="light" backgroundColor={COLORS.background} />
                <TabNavigator />
              </NavigationContainer>
            </TabProvider>
          </WorkoutProvider>
        </ExercisesProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
