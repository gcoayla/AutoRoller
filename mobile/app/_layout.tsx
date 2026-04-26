// Layout raíz: estilo del header, gestor de toasts, status bar.

import 'react-native-gesture-handler';
import '../global.css';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { ToastHost } from '@/components/Toast';
import { colors } from '@/lib/colors';

SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle:        { backgroundColor: colors.bg },
                    headerTitleStyle:   { color: colors.fg, fontWeight: '600' },
                    headerTintColor:    colors.fg,
                    headerShadowVisible: false,
                    contentStyle:       { backgroundColor: colors.bg },
                    animation:          'slide_from_right',
                }}
            >
                <Stack.Screen name="index"    options={{ headerShown: false }} />
                <Stack.Screen name="add"      options={{ title: 'Añadir dispositivo' }} />
                <Stack.Screen name="ble-setup" options={{ title: 'Configuración inicial', presentation: 'card' }} />
                <Stack.Screen name="settings" options={{ title: 'Ajustes de la app' }} />
                <Stack.Screen name="device/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="rooms/index"   options={{ title: 'Habitaciones' }} />
                <Stack.Screen name="presets/index" options={{ title: 'Presets' }} />
                <Stack.Screen name="presets/[id]"  options={{ title: 'Editor de preset' }} />
            </Stack>
            <ToastHost />
        </GestureHandlerRootView>
    );
}
