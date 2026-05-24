// ============================================================
// HAYAT Life OS — Mobile App Entry Point
// React Native + Expo
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  InstrumentSerif_400Regular,
} from '@expo-google-fonts/instrument-serif';

import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import Navigation from './src/navigation';
import { View, Text, ActivityIndicator } from 'react-native';
import { colors, fonts } from './src/theme';

// Keep splash visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    InstrumentSerif_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 40, color: colors.amber, marginBottom: 16 }}>HAYAT</Text>
        <ActivityIndicator size="large" color={colors.amber} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <AuthProvider>
        <AppProvider>
          <Navigation />
        </AppProvider>
      </AuthProvider>
    </>
  );
}
