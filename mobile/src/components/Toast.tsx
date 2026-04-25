// Renderizador global de toasts (montado en _layout).

import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';

import { colors } from '@/lib/colors';
import { useUi } from '@/store/ui';

const tints = {
    ok:    { bg: 'rgba(78,255,177,0.16)',  fg: colors.success, icon: 'checkmark-circle' as const },
    error: { bg: 'rgba(255,78,120,0.18)',  fg: colors.danger,  icon: 'alert-circle'      as const },
    info:  { bg: 'rgba(78,161,255,0.18)',  fg: colors.primary, icon: 'information-circle'as const },
};

export function ToastHost() {
    const toasts = useUi((s) => s.toasts);
    return (
        <View
            pointerEvents="none"
            className="absolute left-0 right-0 px-5"
            style={{ bottom: 24 }}
        >
            {toasts.map((t) => {
                const c = tints[t.kind];
                return (
                    <Animated.View
                        key={t.id}
                        entering={SlideInUp.duration(180)}
                        exiting={FadeOut.duration(150)}
                        className="rounded-2xl border border-border mb-2 flex-row items-center px-3 py-2.5"
                        style={{ backgroundColor: c.bg }}
                    >
                        <Ionicons name={c.icon} size={18} color={c.fg} />
                        <Text className="text-fg text-sm ml-2 flex-1">{t.text}</Text>
                    </Animated.View>
                );
            })}
        </View>
    );
}
