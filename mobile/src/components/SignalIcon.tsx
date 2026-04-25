// Pequeño indicador de fuerza WiFi/BLE.

import React from 'react';
import { View } from 'react-native';

import { colors } from '@/lib/colors';

export function SignalIcon({ rssi }: { rssi: number }) {
    // -30 muy fuerte, -90 muy débil
    const lvl = rssi > -55 ? 4 : rssi > -65 ? 3 : rssi > -75 ? 2 : rssi > -85 ? 1 : 0;
    const heights = [4, 7, 10, 13];
    return (
        <View className="flex-row items-end" style={{ height: 14 }}>
            {heights.map((h, i) => (
                <View
                    key={i}
                    style={{
                        width: 3,
                        height: h,
                        marginRight: 1.5,
                        borderRadius: 1.5,
                        backgroundColor: i < lvl ? colors.primary : 'rgba(255,255,255,0.18)',
                    }}
                />
            ))}
        </View>
    );
}
