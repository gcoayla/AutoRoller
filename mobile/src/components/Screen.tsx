// Wrapper de pantalla con fondo gradiente futurista y safe-area.

import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
    children: React.ReactNode;
    /** Si true, el contenido va sin padding lateral (para FlatList full-bleed). */
    flush?: boolean;
};

export function Screen({ children, flush }: Props) {
    return (
        <View className="flex-1 bg-bg">
            <LinearGradient
                colors={['#050811', '#080F22', '#050811']}
                locations={[0, 0.4, 1]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Halo decorativo (blob) */}
            <View
                pointerEvents="none"
                className="absolute -top-32 -right-20 w-72 h-72 rounded-full"
                style={{ backgroundColor: 'rgba(177, 78, 255, 0.12)' }}
            />
            <View
                pointerEvents="none"
                className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full"
                style={{ backgroundColor: 'rgba(78, 161, 255, 0.10)' }}
            />
            <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
                <View className={`flex-1 ${flush ? '' : 'px-5'}`}>{children}</View>
            </SafeAreaView>
        </View>
    );
}
