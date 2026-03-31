import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import React, { useEffect, useState } from "react";
import { Platform, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { MaterialCommunityIcons } from '@expo/vector-icons';

LogBox.ignoreLogs(['timeout exceeded']);

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event?.reason?.message?.includes('timeout exceeded')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

const fontesPromesa = Font.loadAsync({
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  ...MaterialCommunityIcons.font,
}).catch(() => {});

function RootLayoutNav() {
  const { cargando, autenticado } = useAuth();
  const segmentos = useSegments();

  useEffect(() => {
    if (cargando) return;

    const enLogin = segmentos[0] === 'login';

    if (!autenticado && !enLogin) {
      router.replace('/login');
    } else if (autenticado && enLogin) {
      router.replace('/(tabs)');
    }
  }, [cargando, autenticado, segmentos]);

  if (cargando) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="agregar-mascota" options={{ headerShown: false }} />
      <Stack.Screen name="detalle-mascota" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let montado = true;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));

    Promise.race([fontesPromesa, timeout])
      .catch(() => {})
      .finally(() => {
        if (montado) {
          setListo(true);
          SplashScreen.hideAsync();
        }
      });

    return () => { montado = false; };
  }, []);

  if (!listo) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
