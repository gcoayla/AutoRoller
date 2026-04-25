// Píldora de estado animada con punto pulsante.

import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import type { DeviceState } from '@/lib/types';

const map: Record<DeviceState, { label: string; color: string; bg: string; pulse: boolean }> = {
    idle:        { label: 'En reposo',  color: '#4EFFB1', bg: 'rgba(78,255,177,0.12)',  pulse: false },
    moving_up:   { label: 'Subiendo',   color: '#4EA1FF', bg: 'rgba(78,161,255,0.16)',  pulse: true  },
    moving_down: { label: 'Bajando',    color: '#4EA1FF', bg: 'rgba(78,161,255,0.16)',  pulse: true  },
    homing:      { label: 'Homing',     color: '#FFB04E', bg: 'rgba(255,176,78,0.16)',  pulse: true  },
    calibrating: { label: 'Calibrando', color: '#FFB04E', bg: 'rgba(255,176,78,0.16)',  pulse: true  },
    fault:       { label: 'Fallo',      color: '#FF4E78', bg: 'rgba(255,78,120,0.18)',  pulse: false },
    unknown:     { label: 'Desconocido',color: '#7B89A6', bg: 'rgba(123,137,166,0.12)', pulse: false },
};

export function StatusPill({ state, online }: { state?: DeviceState; online?: boolean }) {
    const k = (online === false ? 'unknown' : (state ?? 'unknown')) as DeviceState;
    const cfg = map[k];

    const scale = useSharedValue(1);
    useEffect(() => {
        if (cfg.pulse) {
            scale.value = withRepeat(
                withTiming(1.6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
                -1,
                true,
            );
        } else {
            scale.value = withTiming(1);
        }
    }, [cfg.pulse, scale]);

    const ring = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: 1.6 - scale.value,
    }));

    return (
        <View
            className="flex-row items-center px-2.5 py-1 rounded-full"
            style={{ backgroundColor: cfg.bg }}
        >
            <View className="w-2 h-2 mr-2 relative">
                <View
                    className="w-2 h-2 rounded-full absolute top-0 left-0"
                    style={{ backgroundColor: cfg.color }}
                />
                <Animated.View
                    style={[
                        {
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: cfg.color,
                            position: 'absolute',
                        },
                        ring,
                    ]}
                />
            </View>
            <Text className="text-xs font-semibold" style={{ color: cfg.color }}>
                {online === false ? 'Sin conexión' : cfg.label}
            </Text>
        </View>
    );
}
